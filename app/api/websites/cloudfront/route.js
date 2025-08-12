import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { 
  CloudFrontClient, 
  CreateDistributionCommand,
  GetDistributionCommand,
  CreateOriginAccessControlCommand,
  CreateInvalidationCommand,
  ListDistributionsCommand,
  DeleteDistributionCommand,
  UpdateDistributionCommand,
  ListOriginAccessControlsCommand
} from "@aws-sdk/client-cloudfront";
import { S3Client, PutBucketPolicyCommand, GetBucketPolicyCommand } from "@aws-sdk/client-s3";

const cloudFrontClient = new CloudFrontClient({
  region: process.env.NEXT_PUBLIC_AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const s3Client = new S3Client({
  region: process.env.NEXT_PUBLIC_AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Helper: find existing OAC by name
async function findOacByName(name) {
  try {
    let Marker = undefined;
    do {
      const res = await cloudFrontClient.send(new ListOriginAccessControlsCommand({ Marker, MaxItems: 100 }));
      const items = res.OriginAccessControlList?.Items || [];
      const found = items.find(it => it.Name === name);
      if (found) return found;
      Marker = res.OriginAccessControlList?.NextMarker;
    } while (Marker);
  } catch (err) {
    console.warn("ListOriginAccessControls failed:", err?.message || err);
  }
  return null;
}

// Helper function to create OAC (idempotent)
async function createOriginAccessControl(businessId, websiteId) {
  const oacName = `oac-${businessId}-${websiteId}`.substring(0, 64);

  // Reuse if already exists
  const existing = await findOacByName(oacName);
  if (existing) {
    return existing;
  }
  
  const command = new CreateOriginAccessControlCommand({
    OriginAccessControlConfig: {
      Name: oacName,
      Description: `Origin Access Control for ${businessId}/${websiteId}`,
      OriginAccessControlOriginType: "s3",
      SigningBehavior: "always",
      SigningProtocol: "sigv4"
    }
  });

  try {
    const response = await cloudFrontClient.send(command);
    return response.OriginAccessControl;
  } catch (err) {
    // If already exists, fetch and return it
    if (err?.name === 'OriginAccessControlAlreadyExists' || err?.Code === 'OriginAccessControlAlreadyExists' || err?.message?.includes('OriginAccessControlAlreadyExists')) {
      const oac = await findOacByName(oacName);
      if (oac) return oac;
    }
    throw err;
  }
}

// Helper function to update S3 bucket policy for CloudFront access
async function updateS3BucketPolicy(bucketName, distributionArn) {
  const bucketPolicyStatement = {
    Version: "2012-10-17",
    Statement: [
      {
        Sid: "AllowCloudFrontServicePrincipal",
        Effect: "Allow",
        Principal: {
          Service: "cloudfront.amazonaws.com"
        },
        Action: "s3:GetObject",
        Resource: `arn:aws:s3:::${bucketName}/*`,
        Condition: {
          StringEquals: {
            "AWS:SourceArn": distributionArn
          }
        }
      }
    ]
  };

  // Try to get existing policy first
  try {
    const getCommand = new GetBucketPolicyCommand({ Bucket: bucketName });
    const existingPolicy = await s3Client.send(getCommand);
    
    if (existingPolicy.Policy) {
      const policy = JSON.parse(existingPolicy.Policy);
      // Check if CloudFront statement already exists
      const hasCloudFrontStatement = policy.Statement.some(stmt => 
        stmt.Principal?.Service === "cloudfront.amazonaws.com"
      );
      
      if (!hasCloudFrontStatement) {
        policy.Statement.push(bucketPolicyStatement.Statement[0]);
        bucketPolicyStatement.Statement = policy.Statement;
      } else {
        return; // Policy already exists
      }
    }
  } catch (error) {
    // No existing policy, use the new one
    console.log("No existing bucket policy, creating new one");
  }

  const putCommand = new PutBucketPolicyCommand({
    Bucket: bucketName,
    Policy: JSON.stringify(bucketPolicyStatement)
  });

  await s3Client.send(putCommand);
}

// POST - Create CloudFront distribution
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
    const { businessId, websiteId, websiteName } = body;

    if (!businessId || !websiteId) {
      return NextResponse.json({ message: "Missing businessId or websiteId" }, { status: 400 });
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

    const bucket = process.env.AWS_S3_BUCKET;
    if (!bucket) {
      return NextResponse.json({ message: "S3 bucket not configured" }, { status: 500 });
    }

    console.log("Creating CloudFront distribution for:", { businessId, websiteId });

    // Step 1: Create Origin Access Control
    const oac = await createOriginAccessControl(businessId, websiteId);
    console.log("Created OAC:", oac.Id);

    // Step 2: Create CloudFront distribution
    const originDomain = `${bucket}.s3.${process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1'}.amazonaws.com`;
    const callerReference = `${businessId}-${websiteId}-${Date.now()}`;

    const distributionConfig = {
      CallerReference: callerReference,
      Comment: `Distribution for ${websiteName || 'Website'} (${businessId}/${websiteId})`,
      Enabled: true,
      Origins: {
        Quantity: 1,
        Items: [
          {
            Id: `S3-${businessId}-${websiteId}`,
            DomainName: originDomain,
            OriginPath: `/${businessId}/websites/${websiteId}`,
            S3OriginConfig: {
              OriginAccessIdentity: ""
            },
            OriginAccessControlId: oac.Id
          }
        ]
      },
      DefaultCacheBehavior: {
        TargetOriginId: `S3-${businessId}-${websiteId}`,
        ViewerProtocolPolicy: "redirect-to-https",
        TrustedSigners: {
          Enabled: false,
          Quantity: 0
        },
        ForwardedValues: {
          QueryString: false,
          Cookies: {
            Forward: "none"
          }
        },
        MinTTL: 0,
        Compress: true
      },
      DefaultRootObject: "index.html",
      PriceClass: process.env.AWS_CLOUDFRONT_PRICE_CLASS || "PriceClass_100",
      CustomErrorResponses: {
        Quantity: 1,
        Items: [
          {
            ErrorCode: 403,
            ResponseCode: "200",
            ResponsePagePath: "/index.html",
            ErrorCachingMinTTL: 300
          }
        ]
      }
    };

    const createDistributionCommand = new CreateDistributionCommand({
      DistributionConfig: distributionConfig
    });

    const distributionResponse = await cloudFrontClient.send(createDistributionCommand);
    const distribution = distributionResponse.Distribution;

    console.log("Created CloudFront distribution:", distribution.Id);

    // Step 3: Update S3 bucket policy
    try {
      await updateS3BucketPolicy(bucket, distribution.ARN);
      console.log("Updated S3 bucket policy");
    } catch (error) {
      console.error("Error updating S3 bucket policy:", error);
      // Continue anyway, as the distribution is created
    }

    // Save CloudFront distribution info to Firestore
    try {
      const distributionData = {
        distributionId: distribution.Id,
        distributionDomainName: distribution.DomainName,
        distributionStatus: distribution.Status,
        distributionArn: distribution.ARN,
        originAccessControlId: oac?.Id || null,
        createdAt: new Date(),
        updatedAt: new Date(),
        bucketName: bucket,
        s3Origin: originDomain
      };

      // Save to businesses/{businessId}/websites/{websiteId}
      await adminDb
        .collection('businesses')
        .doc(businessId)
        .collection('websites')
        .doc(websiteId)
        .update({
          cloudfront: distributionData,
          updatedAt: new Date()
        });

      console.log('CloudFront data saved to Firestore successfully');
    } catch (firestoreError) {
      console.error('Error saving to Firestore:', firestoreError);
      // Don't fail the entire request if Firestore save fails
    }

    return NextResponse.json({
      success: true,
      distribution: {
        id: distribution.Id,
        domainName: distribution.DomainName,
        status: distribution.Status,
        arn: distribution.ARN
      }
    });

  } catch (error) {
    console.error("CloudFront deployment error:", error);
    return NextResponse.json({ 
      message: "Internal server error", 
      error: error.message 
    }, { status: 500 });
  }
}

// GET - Get CloudFront distribution status
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
    const distributionId = searchParams.get('distributionId');

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

    try {
      // Get distribution info from Firestore
      const websiteDoc = await adminDb
        .collection('businesses')
        .doc(businessId)
        .collection('websites')
        .doc(websiteId)
        .get();

      if (!websiteDoc.exists) {
        return NextResponse.json({ message: "Website not found" }, { status: 404 });
      }

      const websiteData = websiteDoc.data();
      const cloudfrontData = websiteData.cloudfront;

      if (!cloudfrontData || !cloudfrontData.distributionId) {
        return NextResponse.json({ 
          message: "No CloudFront distribution found for this website" 
        }, { status: 404 });
      }

      // Get current distribution status from AWS
      const getDistributionCommand = new GetDistributionCommand({
        Id: cloudfrontData.distributionId
      });

      const distributionResponse = await cloudFrontClient.send(getDistributionCommand);
      const distribution = distributionResponse.Distribution;

      // Update status in Firestore if changed
      if (distribution.Status !== cloudfrontData.distributionStatus) {
        await adminDb
          .collection('businesses')
          .doc(businessId)
          .collection('websites')
          .doc(websiteId)
          .update({
            'cloudfront.distributionStatus': distribution.Status,
            'cloudfront.updatedAt': new Date()
          });
      }

      return NextResponse.json({
        success: true,
        distribution: {
          ...cloudfrontData,
          distributionStatus: distribution.Status,
          enabled: distribution.DistributionConfig.Enabled,
          etag: distributionResponse.ETag
        }
      });

    } catch (error) {
      console.error('Error fetching CloudFront distribution:', error);
      return NextResponse.json({ 
        message: "Failed to fetch distribution info",
        error: error.message 
      }, { status: 500 });
    }

  } catch (error) {
    console.error("CloudFront status error:", error);
    return NextResponse.json({ 
      message: "Internal server error", 
      error: error.message 
    }, { status: 500 });
  }
}

// DELETE - Delete CloudFront distribution
export async function DELETE(request) {
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
    const distributionId = searchParams.get('distributionId');

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

    // First disable the distribution, then delete it
    const getDistributionCommand = new GetDistributionCommand({
      Id: distributionId
    });

    const getResponse = await cloudFrontClient.send(getDistributionCommand);
    const currentConfig = getResponse.Distribution.DistributionConfig;
    
    // Disable the distribution first
    if (currentConfig.Enabled) {
      currentConfig.Enabled = false;
      
      const updateCommand = new UpdateDistributionCommand({
        Id: distributionId,
        IfMatch: getResponse.ETag,
        DistributionConfig: currentConfig
      });

      await cloudFrontClient.send(updateCommand);
      
      return NextResponse.json({
        success: true,
        message: "Distribution is being disabled. You can delete it once it's fully disabled.",
        status: "disabling"
      });
    }

    // Delete the distribution
    const deleteCommand = new DeleteDistributionCommand({
      Id: distributionId,
      IfMatch: getResponse.ETag
    });

    await cloudFrontClient.send(deleteCommand);

    // Remove from Firestore
    try {
      const { db } = await import('firebase-admin/firestore');
      const firestore = db();
      
      await firestore
        .collection('businesses')
        .doc(businessId)
        .collection('websites')
        .doc(websiteId)
        .update({
          cloudfront: null
        });
    } catch (error) {
      console.error("Error updating Firestore:", error);
    }

    return NextResponse.json({
      success: true,
      message: "Distribution deleted successfully"
    });

  } catch (error) {
    console.error("CloudFront deletion error:", error);
    return NextResponse.json({ 
      message: "Internal server error", 
      error: error.message 
    }, { status: 500 });
  }
} 