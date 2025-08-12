import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { CloudFrontClient, CreateInvalidationCommand } from "@aws-sdk/client-cloudfront";

const cloudFrontClient = new CloudFrontClient({
  region: process.env.NEXT_PUBLIC_AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// POST - Create CloudFront invalidation
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
    const { businessId, websiteId, distributionId, paths } = body;

    if (!businessId || !websiteId || !distributionId) {
      return NextResponse.json({ message: "Missing required parameters" }, { status: 400 });
    }

    // Authorization check
    const requesterId = decoded.uid;
    let isAuthorized = requesterId === businessId;
    
    if (!isAuthorized) {
      try {
        const userDoc = await adminDb.collection('users').doc(requesterId).get();
        
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

    // Default paths to invalidate all content
    const invalidationPaths = paths || ["/*"];

    console.log("Creating CloudFront invalidation for:", { distributionId, paths: invalidationPaths });

    const invalidationCommand = new CreateInvalidationCommand({
      DistributionId: distributionId,
      InvalidationBatch: {
        CallerReference: `${businessId}-${websiteId}-${Date.now()}`,
        Paths: {
          Quantity: invalidationPaths.length,
          Items: invalidationPaths
        }
      }
    });

    const response = await cloudFrontClient.send(invalidationCommand);
    const invalidation = response.Invalidation;

    console.log("Created CloudFront invalidation:", invalidation.Id);

    // Store invalidation info in Firestore
    try {
      await adminDb
        .collection('businesses')
        .doc(businessId)
        .collection('websites')
        .doc(websiteId)
        .update({
          'cloudfront.lastInvalidation': {
            id: invalidation.Id,
            status: invalidation.Status,
            createdAt: new Date(),
            paths: invalidationPaths
          },
          'cloudfront.updatedAt': new Date()
        });

      console.log("Saved invalidation data to Firestore");
    } catch (error) {
      console.error("Error saving to Firestore:", error);
    }

    return NextResponse.json({
      success: true,
      invalidation: {
        id: invalidation.Id,
        status: invalidation.Status,
        paths: invalidationPaths
      }
    });

  } catch (error) {
    console.error("CloudFront invalidation error:", error);
    return NextResponse.json({ 
      message: "Internal server error", 
      error: error.message 
    }, { status: 500 });
  }
} 