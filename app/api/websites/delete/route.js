import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { CloudFrontClient, GetDistributionCommand, DeleteDistributionCommand } from "@aws-sdk/client-cloudfront";
import { S3Client, GetBucketLocationCommand, ListObjectsV2Command, DeleteObjectsCommand } from "@aws-sdk/client-s3";

function createS3Client(region) {
  return new S3Client({
    region,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });
}

let cachedBucketRegion = null;
async function getS3ClientForBucket(bucketName) {
  if (cachedBucketRegion) return createS3Client(cachedBucketRegion);
  const discoveryClient = createS3Client("us-east-1");
  const loc = await discoveryClient.send(new GetBucketLocationCommand({ Bucket: bucketName }));
  let region = loc.LocationConstraint || "us-east-1";
  if (region === "EU") region = "eu-west-1";
  cachedBucketRegion = region;
  return createS3Client(region);
}

async function listAllKeys(s3, bucket, prefix) {
  let continuationToken = undefined;
  const keys = [];
  do {
    const res = await s3.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix, ContinuationToken: continuationToken }));
    (res.Contents || []).forEach((o) => keys.push(o.Key));
    continuationToken = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (continuationToken);
  return keys;
}

async function deleteKeys(s3, bucket, keys) {
  if (!keys || keys.length === 0) return;
  for (let i = 0; i < keys.length; i += 1000) {
    const chunk = keys.slice(i, i + 1000).map((Key) => ({ Key }));
    await s3.send(new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects: chunk } }));
  }
}

const cloudFrontClient = new CloudFrontClient({
  region: process.env.NEXT_PUBLIC_AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

export async function POST(request) {
  try {
    const authHeader = request.headers.get("authorization") || request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const idToken = authHeader.substring(7);
    const decoded = await adminAuth.verifyIdToken(idToken);
    if (!decoded?.uid) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { businessId, websiteId } = body || {};
    if (!businessId || !websiteId) {
      return NextResponse.json({ message: "Missing businessId or websiteId" }, { status: 400 });
    }

    // Authorization: owner or member of business
    const requesterId = decoded.uid;
    let isAuthorized = requesterId === businessId;
    if (!isAuthorized) {
      try {
        const userDoc = await adminDb.collection('users').doc(requesterId).get();
        if (userDoc.exists) {
          const userData = userDoc.data();
          isAuthorized = userData.role === 'member' && userData.businessId === businessId;
        }
      } catch (e) {
        console.error('Auth check failed:', e);
      }
    }
    if (!isAuthorized) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    // Load website
    const websiteRef = adminDb.collection('businesses').doc(businessId).collection('websites').doc(websiteId);
    const websiteSnap = await websiteRef.get();
    if (!websiteSnap.exists) {
      return NextResponse.json({ message: "Website not found" }, { status: 404 });
    }
    const websiteData = websiteSnap.data() || {};
    const cloudfront = websiteData.cloudfront || {};
    const distributionId = cloudfront.distributionId;

    // If distribution exists, ensure it is disabled, then delete it
    if (distributionId) {
      // Fetch current distribution config
      const getCmd = new GetDistributionCommand({ Id: distributionId });
      const resp = await cloudFrontClient.send(getCmd);
      const enabled = resp?.Distribution?.DistributionConfig?.Enabled;
      const etag = resp?.ETag;

      if (enabled) {
        return NextResponse.json({ message: "CloudFront distribution must be disabled first" }, { status: 400 });
      }

      // Delete distribution when already disabled
      try {
        const delCmd = new DeleteDistributionCommand({ Id: distributionId, IfMatch: etag });
        await cloudFrontClient.send(delCmd);
      } catch (e) {
        // If it's already deleted or not found, continue
        console.warn('CloudFront delete warning:', e?.message);
      }
    }

    // Delete S3 folder
    const bucket = process.env.AWS_S3_BUCKET;
    if (!bucket) {
      return NextResponse.json({ message: "S3 bucket not configured" }, { status: 500 });
    }

    const s3 = await getS3ClientForBucket(bucket);
    const baseKey = `${businessId}/websites/${websiteId}`;

    try {
      const keys = await listAllKeys(s3, bucket, `${baseKey}/`);
      if (keys.length > 0) {
        await deleteKeys(s3, bucket, keys);
      }
    } catch (e) {
      console.error('S3 cleanup error:', e);
    }

    // Finally, delete Firestore doc
    try {
      await websiteRef.delete();
    } catch (e) {
      console.error('Firestore delete error:', e);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Website delete error:', error);
    return NextResponse.json({ message: 'Internal server error', error: error.message }, { status: 500 });
  }
} 