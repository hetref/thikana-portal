import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";
import { S3Client, ListObjectsV2Command, GetBucketLocationCommand } from "@aws-sdk/client-s3";

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
  if (cachedBucketRegion) {
    return createS3Client(cachedBucketRegion);
  }
  const discoveryClient = createS3Client("us-east-1");
  const loc = await discoveryClient.send(new GetBucketLocationCommand({ Bucket: bucketName }));
  let region = loc.LocationConstraint || "us-east-1";
  if (region === "EU") region = "eu-west-1";
  cachedBucketRegion = region;
  return createS3Client(region);
}

export async function GET(request) {
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

    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');
    const websiteId = searchParams.get('websiteId');

    if (!businessId || !websiteId) {
      return NextResponse.json({ message: "Missing businessId or websiteId" }, { status: 400 });
    }

    // Authorize: requester must be business owner or member
    const requesterId = decoded.uid;
    
    // Check if the requester is the business owner
    let isAuthorized = requesterId === businessId;
    
    // If not the owner, check if they're a member of this business
    if (!isAuthorized) {
      try {
        const { db } = await import('firebase-admin/firestore');
        const firestore = db();
        const userDoc = await firestore.collection('users').doc(requesterId).get();
        
        if (userDoc.exists) {
          const userData = userDoc.data();
          isAuthorized = userData.role === 'member' && userData.businessId === businessId;
        }
      } catch (error) {
        console.error('Error checking user authorization:', error);
      }
    }
    
    if (!isAuthorized) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const bucket = process.env.AWS_S3_BUCKET;
    if (!bucket) {
      return NextResponse.json({ message: "S3 bucket not configured" }, { status: 500 });
    }

    const s3 = await getS3ClientForBucket(bucket);
    
    // List all files in the website directory (excluding mediaUploads)
    const prefix = `${businessId}/websites/${websiteId}/`;
    console.log("Listing files with prefix:", prefix);
    
    const listCommand = new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
      MaxKeys: 1000
    });

    const response = await s3.send(listCommand);
    console.log("S3 list response:", response.KeyCount, "objects found");

    const files = (response.Contents || [])
      .map(obj => obj.Key.replace(prefix, '')) // Remove prefix to get just filename
      .filter(filename => {
        // Exclude empty strings (the prefix itself) and mediaUploads folder
        return filename && !filename.startsWith('mediaUploads/');
      })
      .sort((a, b) => {
        // Sort so index.html comes first, then others alphabetically
        if (a === 'index.html') return -1;
        if (b === 'index.html') return 1;
        return a.localeCompare(b);
      });

    console.log("Filtered files:", files);

    return NextResponse.json({
      success: true,
      files: files,
      totalCount: files.length
    });

  } catch (error) {
    console.error("List files error:", error);
    return NextResponse.json({ 
      message: "Internal server error", 
      error: error.message 
    }, { status: 500 });
  }
} 