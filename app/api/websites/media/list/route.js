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

function getPublicUrl(businessId, websiteId, filename) {
  const direct = process.env.NEXT_PUBLIC_AWS_S3_BUCKET_PUBLIC_BASE;
  const bucket = process.env.NEXT_PUBLIC_AWS_S3_BUCKET_NAME;
  const region = process.env.NEXT_PUBLIC_AWS_REGION || "us-east-1";

  let baseUrl;
  if (direct) {
    baseUrl = direct.replace(/\/$/, "");
  } else if (bucket) {
    if (region === "us-east-1") {
      baseUrl = `https://${bucket}.s3.amazonaws.com`;
    } else {
      baseUrl = `https://${bucket}.s3.${region}.amazonaws.com`;
    }
  } else {
    return null;
  }

  return `${baseUrl}/${businessId}/websites/${websiteId}/mediaUploads/${filename}`;
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

    console.log("=== S3 DEBUGGING INFO ===");
    console.log("Bucket:", bucket);
    console.log("BusinessId:", businessId);
    console.log("WebsiteId:", websiteId);
    console.log("RequesterId:", requesterId);

    const s3 = await getS3ClientForBucket(bucket);
    
    // First, let's check what's in the entire business folder
    console.log("=== CHECKING BUSINESS FOLDER ===");
    const businessPrefix = `${businessId}/`;
    const businessListCommand = new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: businessPrefix,
      MaxKeys: 100
    });
    
    try {
      const businessResponse = await s3.send(businessListCommand);
      console.log("Business folder contents:", businessResponse.Contents?.map(obj => obj.Key) || []);
      console.log("Business folder KeyCount:", businessResponse.KeyCount);
    } catch (error) {
      console.error("Error listing business folder:", error);
    }

    // Now check the specific website folder
    console.log("=== CHECKING WEBSITE FOLDER ===");
    const websitePrefix = `${businessId}/websites/${websiteId}/`;
    const websiteListCommand = new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: websitePrefix,
      MaxKeys: 100
    });
    
    try {
      const websiteResponse = await s3.send(websiteListCommand);
      console.log("Website folder contents:", websiteResponse.Contents?.map(obj => obj.Key) || []);
      console.log("Website folder KeyCount:", websiteResponse.KeyCount);
    } catch (error) {
      console.error("Error listing website folder:", error);
    }

    // Finally, check the media uploads folder
    console.log("=== CHECKING MEDIA UPLOADS FOLDER ===");
    const prefix = `${businessId}/websites/${websiteId}/mediaUploads/`;
    console.log("Media uploads prefix:", prefix);
    
    const listCommand = new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
      MaxKeys: 1000
    });

    const response = await s3.send(listCommand);
    console.log("Media uploads response:", response);
    console.log("Media uploads KeyCount:", response.KeyCount);
    console.log("Media uploads Contents:", response.Contents?.map(obj => ({
      Key: obj.Key,
      Size: obj.Size,
      LastModified: obj.LastModified
    })) || []);

    // Also try without the trailing slash in case that's the issue
    console.log("=== TRYING WITHOUT TRAILING SLASH ===");
    const altPrefix = `${businessId}/websites/${websiteId}/mediaUploads`;
    const altListCommand = new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: altPrefix,
      MaxKeys: 1000
    });

    try {
      const altResponse = await s3.send(altListCommand);
      console.log("Alt prefix response KeyCount:", altResponse.KeyCount);
      console.log("Alt prefix Contents:", altResponse.Contents?.map(obj => obj.Key) || []);
    } catch (error) {
      console.error("Error with alt prefix:", error);
    }

    const mediaFiles = (response.Contents || [])
      .filter(obj => obj.Key !== prefix) // Exclude the folder itself
      .map(obj => {
        const filename = obj.Key.replace(prefix, '');
        const publicUrl = getPublicUrl(businessId, websiteId, filename);
        
        // Parse file info from filename
        const parts = filename.split('_');
        const extension = filename.split('.').pop()?.toLowerCase() || '';
        const timestamp = parts.length >= 2 ? parseInt(parts[parts.length - 2]) : null;
        const uploadDate = timestamp ? new Date(timestamp) : new Date(obj.LastModified);
        console.log("Processing file:", {
          filename,
          url: publicUrl,
          size: obj.Size,
          uploadDate
        });
        
        return {
          filename,
          url: publicUrl,
          size: obj.Size,
          lastModified: obj.LastModified,
          uploadDate: uploadDate,
          type: getFileType(extension),
          extension
        };
      })
      .sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate));

    console.log("=== FINAL RESULT ===");
    console.log("Total media files found:", mediaFiles.length);

    return NextResponse.json({
      success: true,
      media: mediaFiles,
      totalCount: mediaFiles.length,
      totalSize: mediaFiles.reduce((sum, file) => sum + file.size, 0),
      debug: {
        bucket,
        businessId,
        websiteId,
        prefix,
        keyCount: response.KeyCount,
        rawContents: response.Contents?.map(obj => obj.Key) || []
      }
    });

  } catch (error) {
    console.error("Media list error:", error);
    return NextResponse.json({ 
      message: "Internal server error", 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
}

function getFileType(extension) {
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
  const videoExtensions = ['mp4', 'webm', 'ogg', 'mov', 'avi'];
  const documentExtensions = ['pdf', 'doc', 'docx', 'txt'];
  
  if (imageExtensions.includes(extension)) return 'image';
  if (videoExtensions.includes(extension)) return 'video';
  if (documentExtensions.includes(extension)) return 'document';
  return 'file';
} 