import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";
import { S3Client, PutObjectCommand, GetBucketLocationCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import crypto from "crypto";

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

function getFileExtension(filename) {
  return filename.split('.').pop()?.toLowerCase() || '';
}

function generateUniqueFilename(originalFilename) {
  const timestamp = Date.now();
  const randomString = crypto.randomBytes(8).toString('hex');
  const extension = getFileExtension(originalFilename);
  const baseName = originalFilename.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20);
  return `${baseName}_${timestamp}_${randomString}.${extension}`;
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

    const formData = await request.formData();
    const file = formData.get("file");
    const businessId = formData.get("businessId");
    const websiteId = formData.get("websiteId");

    if (!file || !businessId || !websiteId) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
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

    // Validate file type (images, videos, documents)
    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
      'video/mp4', 'video/webm', 'video/ogg',
      'application/pdf', 'text/plain', 'text/css', 'application/javascript'
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        message: `File type ${file.type} not allowed. Allowed types: images, videos, PDF, text files.` 
      }, { status: 400 });
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json({ 
        message: "File size too large. Maximum size is 10MB." 
      }, { status: 400 });
    }

    const s3 = await getS3ClientForBucket(bucket);
    const uniqueFilename = generateUniqueFilename(file.name);
    const key = `${businessId}/websites/${websiteId}/mediaUploads/${uniqueFilename}`;

    console.log("=== MEDIA UPLOAD DEBUG ===");
    console.log("Bucket:", bucket);
    console.log("BusinessId:", businessId);
    console.log("WebsiteId:", websiteId);
    console.log("Original filename:", file.name);
    console.log("Unique filename:", uniqueFilename);
    console.log("S3 Key:", key);
    console.log("File size:", file.size);
    console.log("File type:", file.type);

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    console.log("Buffer size:", buffer.length);

    // Upload to S3
    try {
      const uploadCommand = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: file.type,
        CacheControl: "public, max-age=31536000", // 1 year cache
        // Removed ACL parameter as bucket doesn't allow ACLs
      });

      console.log("Uploading to S3...");
      const uploadResult = await s3.send(uploadCommand);
      console.log("Upload successful:", uploadResult);
    } catch (uploadError) {
      console.error("S3 upload failed:", uploadError);
      throw uploadError;
    }

    // Generate public URL
    const publicUrl = getPublicUrl(businessId, websiteId, uniqueFilename);
    console.log("Generated public URL:", publicUrl);

    // Verify the file was uploaded by trying to list it
    console.log("=== VERIFYING UPLOAD ===");
    try {
      const verifyCommand = new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: key,
        MaxKeys: 1
      });
      const verifyResult = await s3.send(verifyCommand);
      console.log("Verification result:", verifyResult);
      console.log("File found after upload:", verifyResult.KeyCount > 0);
    } catch (verifyError) {
      console.error("Verification failed:", verifyError);
    }

    return NextResponse.json({
      success: true,
      url: publicUrl,
      filename: uniqueFilename,
      originalName: file.name,
      size: file.size,
      type: file.type
    });

  } catch (error) {
    console.error("Media upload error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
} 