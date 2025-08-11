import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";

// S3 config using AWS SDK v3
import {
  S3Client,
  PutObjectCommand,
  GetBucketLocationCommand,
  ListObjectsV2Command,
  DeleteObjectsCommand,
} from "@aws-sdk/client-s3";

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
  // Discover bucket region
  const discoveryClient = createS3Client("us-east-1");
  const loc = await discoveryClient.send(new GetBucketLocationCommand({ Bucket: bucketName }));
  let region = loc.LocationConstraint || "us-east-1";
  if (region === "EU") region = "eu-west-1";
  cachedBucketRegion = region;
  return createS3Client(region);
}

// Build a complete HTML string with CSS inlined in <style> within <head>
function buildHtmlInline(html, css) {
  const styleTag = css && css.trim() ? `\n  <style>\n${css}\n  </style>` : "";
  const hasHtmlTag = /<html[\s>]/i.test(html);
  const hasHead = /<head[\s>]/i.test(html);
  const hasDoctype = /^<!DOCTYPE/i.test(html.trim());
  let doc = html;
  if (hasHtmlTag) {
    if (hasHead) {
      doc = html.replace(/<head(\s*)>/i, (m) => `${m}${styleTag}`);
    } else {
      doc = html.replace(/<html(\s*)>/i, (m) => `${m}\n<head>${styleTag}\n</head>`);
    }
    if (!hasDoctype) doc = `<!DOCTYPE html>\n${doc}`;
    return doc;
  }
  // No <html>, create minimal shell
  return `<!DOCTYPE html>\n<html>\n<head>${styleTag}\n  <meta charset="utf-8"/>\n</head>\n<body>\n${html}\n</body>\n</html>`;
}

function slugify(input) {
  return (input || "")
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

async function listAllKeys(s3, bucket, prefix) {
  let continuationToken = undefined;
  const keys = [];
  do {
    const res = await s3.send(
      new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix, ContinuationToken: continuationToken })
    );
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
      return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
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
    const baseKey = `${businessId}/websites/${websiteId}`;

    const desiredKeys = new Set();
    const uploadObject = async (Key, Body) => {
      console.log(`Uploading: ${Key}`);
      await s3.send(
        new PutObjectCommand({ 
          Bucket: bucket, 
          Key, 
          Body: Buffer.from(Body, "utf-8"), 
          ContentType: "text/html; charset=utf-8", 
          CacheControl: "no-cache" 
        })
      );
      desiredKeys.add(Key);
      console.log(`Successfully uploaded: ${Key}`);
    };

    if (Array.isArray(body.pages) && body.pages.length > 0) {
      console.log(`Processing ${body.pages.length} pages for website ${websiteId}`);
      const pages = body.pages;
      
      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        console.log(`Processing page ${i + 1}: ${page.name || 'Unnamed'}`);
        
        // First page is always index.html, others use slugified names
        let slug;
        if (i === 0) {
          slug = "index";
        } else {
          const pageName = page.name || `Page ${i + 1}`;
          slug = slugify(pageName) || `page-${i + 1}`;
        }
        
        const htmlDoc = buildHtmlInline(page.html || "", page.css || "");
        const key = `${baseKey}/${slug}.html`;
        
        await uploadObject(key, htmlDoc);
      }

      // Clean up old files that are no longer needed
      console.log('Cleaning up old files...');
      const existingKeys = await listAllKeys(s3, bucket, `${baseKey}/`);
      const toDelete = existingKeys.filter((k) => {
        // Don't delete mediaUploads folder
        if (k.includes('/mediaUploads/')) return false;
        return !desiredKeys.has(k);
      });
      
      if (toDelete.length > 0) {
        console.log(`Deleting ${toDelete.length} old files:`, toDelete);
        await deleteKeys(s3, bucket, toDelete);
      }

      console.log(`Successfully saved ${pages.length} pages for website ${websiteId}`);
      return NextResponse.json({ 
        success: true, 
        message: `Successfully saved ${pages.length} pages`,
        pages: Array.from(desiredKeys)
      }, { status: 200 });
    }

    // Single page fallback → index.html only
    console.log('Processing single page fallback');
    const { html, css } = body || {};
    if (typeof html !== "string") {
      return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
    }
    const htmlDoc = buildHtmlInline(html, css || "");
    await uploadObject(`${baseKey}/index.html`, htmlDoc);

    // Clean up old files except mediaUploads
    const existingKeys = await listAllKeys(s3, bucket, `${baseKey}/`);
    const toDelete = existingKeys.filter((k) => {
      if (k.includes('/mediaUploads/')) return false;
      return !desiredKeys.has(k);
    });
    
    if (toDelete.length > 0) {
      await deleteKeys(s3, bucket, toDelete);
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("S3 upload error:", error);
    return NextResponse.json({ message: "Internal server error", error: error.message }, { status: 500 });
  }
} 