"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Edit, ExternalLink, Calendar, Clock, Copy, Download, Image, FileText, Video, File, Globe, Zap, Power } from "lucide-react";
import toast from "react-hot-toast";

function getPublicBaseUrl() {
  const direct = process.env.NEXT_PUBLIC_AWS_S3_BUCKET_PUBLIC_BASE;
  const bucket = process.env.NEXT_PUBLIC_AWS_S3_BUCKET_NAME;
  const region = process.env.NEXT_PUBLIC_AWS_REGION || "us-east-1";

  if (direct) return direct.replace(/\/$/, "");
  if (bucket) {
    if (region === "us-east-1") return `https://${bucket}.s3.amazonaws.com`;
    return `https://${bucket}.s3.${region}.amazonaws.com`;
  }
  return null;
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDate(date) {
  try {
    if (!date) return 'Unknown';
    const dateObj = date instanceof Date ? date : new Date(date);
    if (isNaN(dateObj.getTime())) return 'Invalid Date';
    return dateObj.toLocaleDateString();
  } catch (error) {
    console.error('Date formatting error:', error);
    return 'Unknown';
  }
}

// Add robust date-time formatter that supports Firestore Timestamp, Date, and string
function formatDateTime(input) {
  try {
    if (!input) return 'Unknown';
    let d = null;
    if (typeof input?.toDate === 'function') {
      d = input.toDate();
    } else if (input instanceof Date) {
      d = input;
    } else if (typeof input === 'object') {
      // Support Firestore REST/serialized timestamp objects
      if (input.type === 'firestore/timestamp/1.0' && input.seconds != null) {
        console.debug('[formatDateTime] Parsing Firestore serialized timestamp', input);
        const secs = Number(input.seconds);
        const nanos = Number(input.nanoseconds || 0);
        d = new Date(secs * 1000 + Math.floor(nanos / 1e6));
      } else if (input.seconds != null) {
        const secs = Number(input.seconds);
        const nanos = Number(input.nanoseconds || 0);
        d = new Date(secs * 1000 + Math.floor(nanos / 1e6));
      } else if (input._seconds != null) {
        const secs = Number(input._seconds);
        const nanos = Number(input._nanoseconds || 0);
        d = new Date(secs * 1000 + Math.floor(nanos / 1e6));
      }
    } else if (typeof input === 'number') {
      d = new Date(input);
    } else if (typeof input === 'string') {
      d = new Date(input);
    }
    if (!d || isNaN(d.getTime())) return 'Unknown';
    return d.toLocaleString();
  } catch (error) {
    console.error('DateTime formatting error:', error);
    return 'Unknown';
  }
}

function getFileIcon(type) {
  switch (type) {
    case 'image':
      return <Image className="w-4 h-4" />;
    case 'video':
      return <Video className="w-4 h-4" />;
    case 'document':
      return <FileText className="w-4 h-4" />;
    default:
      return <File className="w-4 h-4" />;
  }
}

export default function WebsiteDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const websiteId = params.websiteId;
  const [businessId, setBusinessId] = useState(null);
  const [website, setWebsite] = useState(null);
  const [mediaFiles, setMediaFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [deployingCloudFront, setDeployingCloudFront] = useState(false);
  const [invalidatingCache, setInvalidatingCache] = useState(false);
  const [refreshingStatus, setRefreshingStatus] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  const [disablingDistribution, setDisablingDistribution] = useState(false);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        let bizId = user.uid;
        console.log("BUSINESS", bizId, userDoc.data());
        if (userDoc.exists()) {
          const u = userDoc.data();
          if (u.role === "member" && u.businessId) bizId = u.businessId;
        }
        setBusinessId(bizId);

        console.log("BUSINESS", bizId, websiteId);
        
        // Load website data
        const websiteDoc = await getDoc(doc(db, "businesses", bizId, "websites", websiteId));
        console.log("WEBSITE DATE", websiteDoc?.data())
        if (websiteDoc.data()) {
          const websiteData = { id: websiteDoc.id, ...websiteDoc.data() };
          console.debug('[Details] Loaded website doc:', websiteData);
          console.debug('[Details] createdAt raw value:', websiteData?.createdAt);
          // Fallback: if createdAt missing, try to use cloudfront.createdAt (not ideal, but better than Unknown)
          if (!websiteData.createdAt && websiteData.cloudfront?.createdAt) {
            websiteData.createdAt = websiteData.cloudfront.createdAt;
          }
          console.log("WEBSITE CREATED", websiteData.createdAt)
          setWebsite(websiteData);
          
          // Set preview URL
          const base = getPublicBaseUrl();
          if (base) {
            setPreviewUrl(`${base}/${bizId}/websites/${websiteId}/index.html`);
          }
        } else {
          toast.error("Website not found");
          router.push("/websites");
        }
      } catch (error) {
        console.error("Error loading website:", error);
        toast.error("Failed to load website details");
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, [websiteId, router]);

  // Auto-load tab-specific data when a tab is opened
  useEffect(() => {
    if (activeTab === 'media' && !loadingMedia && mediaFiles.length === 0) {
      loadMediaFiles();
    }
    if (activeTab === 'cloudfront' && website?.cloudfront && !refreshingStatus) {
      handleRefreshDistributionStatus();
    }
  }, [activeTab]);

  const loadMediaFiles = async () => {
    if (!businessId) return;
    
    setLoadingMedia(true);
    try {
      const idToken = await auth.currentUser.getIdToken();
      const response = await fetch(`/api/websites/media/list?businessId=${businessId}&websiteId=${websiteId}`, {
        headers: {
          'Authorization': `Bearer ${idToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        // Convert uploadDate strings back to Date objects for proper handling
        const processedMedia = (data.media || []).map(file => ({
          ...file,
          uploadDate: new Date(file.uploadDate),
          lastModified: new Date(file.lastModified)
        }));
        setMediaFiles(processedMedia);
      } else {
        console.error('Failed to load media files');
        toast.error('Failed to load media files');
      }
    } catch (error) {
      console.error('Error loading media:', error);
      toast.error('Failed to load media files');
    } finally {
      setLoadingMedia(false);
    }
  };

  const handleEditWebsite = () => {
    router.push(`/websites/${websiteId}`);
  };

  const handlePreviewWebsite = () => {
    if (previewUrl) {
      window.open(previewUrl, "_blank");
    } else {
      toast.error("Preview not available");
    }
  };

  const copyToClipboard = (text, type = 'URL') => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success(`${type} copied to clipboard`);
    }).catch(() => {
      toast.error(`Failed to copy ${type}`);
    });
  };

  const handleDeployToCloudFront = async () => {
    if (!businessId || !websiteId || deployingCloudFront) return;
    
    try {
      setDeployingCloudFront(true);
      const idToken = await auth.currentUser.getIdToken();
      
      const response = await fetch('/api/websites/cloudfront', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          businessId,
          websiteId,
          websiteName: website?.name
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`CloudFront deployment started! Distribution: ${data.distribution.domainName}`);
        // Normalize and optimistically update local state with returned distribution info
        setWebsite(prev => ({
          ...prev,
          cloudfront: {
            ...(prev?.cloudfront || {}),
            distributionId: data.distribution.id || data.distribution.distributionId,
            domainName: data.distribution.domainName || data.distribution.distributionDomainName,
            status: data.distribution.status || data.distribution.distributionStatus,
            enabled: typeof data.distribution.enabled === 'boolean' ? data.distribution.enabled : true,
            arn: data.distribution.arn,
            createdAt: data.distribution.createdAt || new Date(),
            updatedAt: new Date(),
          }
        }));
        // Optionally poll once to get latest status/enabled without full reload
        setTimeout(() => {
          handleRefreshDistributionStatus();
        }, 1500);
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Deployment failed');
      }
    } catch (error) {
      console.error('CloudFront deployment error:', error);
      toast.error(`Deployment failed: ${error.message}`);
    } finally {
      setDeployingCloudFront(false);
    }
  };

  const handleInvalidateCache = async () => {
    if (!businessId || !websiteId || !website?.cloudfront?.distributionId || invalidatingCache) return;
    
    try {
      setInvalidatingCache(true);
      const idToken = await auth.currentUser.getIdToken();
      
      const response = await fetch('/api/websites/cloudfront/invalidate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          businessId,
          websiteId,
          distributionId: website.cloudfront.distributionId
        }),
      });

      if (response.ok) {
        toast.success('Cache invalidation started!');
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Cache invalidation failed');
      }
    } catch (error) {
      console.error('Cache invalidation error:', error);
      toast.error(`Cache invalidation failed: ${error.message}`);
    } finally {
      setInvalidatingCache(false);
    }
  };

  const handleRefreshDistributionStatus = async () => {
    if (!businessId || !websiteId || !website?.cloudfront?.distributionId || refreshingStatus) return;
    
    try {
      setRefreshingStatus(true);
      const idToken = await auth.currentUser.getIdToken();
      
      const response = await fetch(`/api/websites/cloudfront?businessId=${businessId}&websiteId=${websiteId}&distributionId=${website.cloudfront.distributionId}`, {
        headers: {
          'Authorization': `Bearer ${idToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        // Update local state with latest distribution info without full page reload
        setWebsite(prev => ({
          ...prev,
          cloudfront: {
            ...(prev?.cloudfront || {}),
            ...data.distribution,
            // normalize keys for UI
            distributionId: data.distribution.distributionId || data.distribution.id || prev?.cloudfront?.distributionId,
            domainName: data.distribution.domainName || data.distribution.distributionDomainName || prev?.cloudfront?.domainName,
            status: data.distribution.status || data.distribution.distributionStatus || prev?.cloudfront?.status,
            updatedAt: new Date(),
          }
        }));
        toast.success('Distribution status updated!');
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to refresh status');
      }
    } catch (error) {
      console.error('Status refresh error:', error);
      toast.error(`Failed to refresh status: ${error.message}`);
    } finally {
      setRefreshingStatus(false);
    }
  };

  const handleDisableDistribution = async () => {
    if (!businessId || !websiteId || !website?.cloudfront?.distributionId || disablingDistribution) return;
    const confirmDisable = window.confirm('Disable CloudFront distribution for this website? You can delete once disabled.');
    if (!confirmDisable) return;
    try {
      setDisablingDistribution(true);
      const idToken = await auth.currentUser.getIdToken();
      const res = await fetch(`/api/websites/cloudfront?businessId=${businessId}&websiteId=${websiteId}&distributionId=${website.cloudfront.distributionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${idToken}`,
        },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || 'Failed to disable distribution');
      toast.success(data?.message || 'Distribution disabling started');
      setTimeout(() => handleRefreshDistributionStatus(), 1500);
    } catch (error) {
      console.error('Disable error:', error);
      toast.error(error.message || 'Failed to disable distribution');
    } finally {
      setDisablingDistribution(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-lg">Loading website details...</div>
      </div>
    );
  }

  if (!website) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-lg text-gray-500">Website not found</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6">
      <div className="mb-6">
        <Button 
          variant="outline" 
          onClick={() => router.push("/websites")}
          className="mb-4"
        >
          ← Back to Websites
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="details">Website Details</TabsTrigger>
          <TabsTrigger value="cloudfront">
            <Globe className="w-4 h-4 mr-2" />
            CloudFront CDN
          </TabsTrigger>
          <TabsTrigger value="media">
            Media Files
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="mt-6">
          <div className="grid gap-6">
            {/* Main Website Info */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div>
                  <CardTitle className="text-2xl">{website.name || "Untitled Website"}</CardTitle>
                  <p className="text-muted-foreground mt-1">Website ID: {website.id}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge 
                    variant={website.publishedStatus === "published" ? "default" : "secondary"}
                  >
                    {website.publishedStatus || "pending"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left Column - Details */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span>Created: {formatDateTime(website.createdAt)}</span>
                    </div>
                    
                    {website.updatedAt && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        <span>Last Updated: {formatDateTime(website.updatedAt)}</span>
                      </div>
                    )}

                    <div className="pt-4">
                      <h3 className="font-semibold mb-2">Website URL</h3>
                      {previewUrl ? (
                        <div className="flex items-center gap-2">
                          <code className="text-sm bg-gray-100 px-2 py-1 rounded flex-1 truncate">
                            {previewUrl}
                          </code>
                          <Button size="sm" variant="outline" onClick={() => copyToClipboard(previewUrl)}>
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">Not available</p>
                      )}
                    </div>
                  </div>

                  {/* Right Column - Actions */}
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold mb-3">Actions</h3>
                      <div className="space-y-2">
                        <Button onClick={handleEditWebsite} className="w-full justify-start">
                          <Edit className="w-4 h-4 mr-2" />
                          Edit Website
                        </Button>
                        
                        {previewUrl && (
                          <Button variant="outline" onClick={handlePreviewWebsite} className="w-full justify-start">
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Preview Website
                          </Button>
                        )}
                      </div>
                    </div>

                    <div>
                      <h3 className="font-semibold mb-2">Statistics</h3>
                      <div className="text-sm text-muted-foreground">
                        <p>Status: {website.publishedStatus || "Pending"}</p>
                        <p>Type: Website Builder</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* CloudFront Overview in Details Tab */}
            {website?.cloudfront && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="w-5 h-5" />
                    CloudFront CDN
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Status:</span>
                        <Badge variant={(website.cloudfront.status || website.cloudfront.distributionStatus) === 'Deployed' ? 'default' : 'secondary'}>
                          {website.cloudfront.status || website.cloudfront.distributionStatus || 'Unknown'}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Enabled:</span>
                        <Badge variant={website.cloudfront.enabled ? 'default' : 'secondary'}>
                          {website.cloudfront.enabled ? 'Yes' : 'No'}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Distribution ID:</span>
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                          {website.cloudfront.distributionId}
                        </code>
                      </div>
                      {website.cloudfront.createdAt && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Created:</span>
                          <span className="text-sm">{formatDateTime(website.cloudfront.createdAt)}</span>
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <h3 className="font-semibold mb-1">CDN Domain</h3>
                      <div className="flex items-center gap-2">
                        <code className="text-sm bg-gray-100 px-2 py-1 rounded flex-1 truncate">
                          {`https://${website.cloudfront.domainName || website.cloudfront.distributionDomainName || ''}`}
                        </code>
                        {(website.cloudfront.domainName || website.cloudfront.distributionDomainName) && (
                          <>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => copyToClipboard(`https://${website.cloudfront.domainName || website.cloudfront.distributionDomainName}`, 'CDN URL')}
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => window.open(`https://${website.cloudfront.domainName || website.cloudfront.distributionDomainName}`, '_blank')}
                            >
                              <ExternalLink className="w-3 h-3" />
                            </Button>
                          </>
                        )}
                      </div>
                      <div className="pt-2">
                        <Button 
                          onClick={handleRefreshDistributionStatus}
                          disabled={refreshingStatus}
                          variant="outline"
                        >
                          {refreshingStatus ? (
                            <>
                              <Zap className="w-4 h-4 mr-2 animate-pulse" />
                              Refreshing...
                            </>
                          ) : (
                            <>
                              <Zap className="w-4 h-4 mr-2" />
                              Refresh Status
                            </>
                          )}
                        </Button>
                        {website.cloudfront?.enabled && (
                          <Button
                            onClick={handleDisableDistribution}
                            disabled={disablingDistribution}
                            variant="outline"
                            className="text-red-600 border-red-600 hover:bg-red-50"
                          >
                            <Power className="w-4 h-4 mr-2" />
                            Disable CDN
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {!website?.cloudfront && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="w-5 h-5" />
                    CloudFront CDN
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <p className="text-muted-foreground mb-4">No CloudFront distribution. Deploy to enable CDN.</p>
                    <Button onClick={handleDeployToCloudFront} disabled={deployingCloudFront}>
                      {deployingCloudFront ? (
                        <>
                          <Zap className="w-4 h-4 mr-2 animate-pulse" />
                          Deploying to CloudFront...
                        </>
                      ) : (
                        <>
                          <Zap className="w-4 h-4 mr-2" />
                          Deploy to CloudFront
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Website Preview */}
            {previewUrl && (
              <Card>
                <CardHeader>
                  <CardTitle>Website Preview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="border rounded-lg overflow-hidden bg-white">
                    <iframe
                      src={previewUrl}
                      className="w-full h-96"
                      title="Website Preview"
                      onError={() => {
                        console.log("Preview iframe failed to load");
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Preview may not work if the website hasn't been saved yet or if CORS is not configured.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="cloudfront" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5" />
                CloudFront CDN Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              {website?.cloudfront ? (
                <div className="space-y-6">
                  {/* Distribution Status */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h3 className="font-semibold mb-3">Distribution Status</h3>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Status:</span>
                          <Badge variant={(website.cloudfront.status || website.cloudfront.distributionStatus) === 'Deployed' ? 'default' : 'secondary'}>
                            {website.cloudfront.status || website.cloudfront.distributionStatus || 'Unknown'}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Enabled:</span>
                          <Badge variant={website.cloudfront.enabled ? 'default' : 'secondary'}>
                            {website.cloudfront.enabled ? 'Yes' : 'No'}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Distribution ID:</span>
                          <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                            {website.cloudfront.distributionId}
                          </code>
                        </div>
                        {website.cloudfront.createdAt && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Created:</span>
                            <span className="text-sm">{formatDateTime(website.cloudfront.createdAt)}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <h3 className="font-semibold mb-3">CDN Domain</h3>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <code className="text-sm bg-gray-100 px-2 py-1 rounded flex-1 truncate">
                            https://{website.cloudfront.domainName || website.cloudfront.distributionDomainName}
                          </code>
                          {(website.cloudfront.domainName || website.cloudfront.distributionDomainName) && (
                            <>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => copyToClipboard(`https://${website.cloudfront.domainName || website.cloudfront.distributionDomainName}`, 'CDN URL')}
                              >
                                <Copy className="w-3 h-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => window.open(`https://${website.cloudfront.domainName || website.cloudfront.distributionDomainName}`, '_blank')}
                              >
                                <ExternalLink className="w-3 h-3" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div>
                    <h3 className="font-semibold mb-3">Actions</h3>
                    <div className="flex flex-wrap gap-2">
                      <Button 
                        onClick={handleRefreshDistributionStatus}
                        disabled={refreshingStatus}
                        variant="outline"
                      >
                        {refreshingStatus ? (
                          <>
                            <Zap className="w-4 h-4 mr-2 animate-pulse" />
                            Refreshing...
                          </>
                        ) : (
                          <>
                            <Zap className="w-4 h-4 mr-2" />
                            Refresh Status
                          </>
                        )}
                      </Button>
                      {website.cloudfront?.enabled && (
                        <Button 
                          onClick={handleDisableDistribution}
                          disabled={disablingDistribution}
                          variant="destructive"
                        >
                          {disablingDistribution ? (
                            <>
                              <Power className="w-4 h-4 mr-2 animate-pulse" />
                              Disabling...
                            </>
                          ) : (
                            <>
                              <Power className="w-4 h-4 mr-2" />
                              Disable CDN
                            </>
                          )}
                        </Button>
                      )}
                      <Button 
                        onClick={handleInvalidateCache}
                        disabled={invalidatingCache}
                        variant="outline"
                      >
                        {invalidatingCache ? (
                          <>
                            <Zap className="w-4 h-4 mr-2 animate-pulse" />
                            Invalidating Cache...
                          </>
                        ) : (
                          <>
                            <Zap className="w-4 h-4 mr-2" />
                            Invalidate Cache
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Last Invalidation Info */}
                  {website.cloudfront.lastInvalidation && (
                    <div>
                      <h3 className="font-semibold mb-3">Last Cache Invalidation</h3>
                      <div className="bg-gray-50 p-3 rounded-md">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">Invalidation ID:</span>
                            <code className="ml-2 text-xs bg-white px-2 py-1 rounded">
                              {website.cloudfront.lastInvalidation.id}
                            </code>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Status:</span>
                            <Badge variant="secondary" className="ml-2">
                              {website.cloudfront.lastInvalidation.status}
                            </Badge>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Created:</span>
                            <span className="ml-2">{formatDateTime(website.cloudfront.lastInvalidation.createdAt)}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Paths:</span>
                            <span className="ml-2">{website.cloudfront.lastInvalidation.paths?.join(', ') || '/*'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Globe className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No CloudFront Distribution</h3>
                  <p className="text-muted-foreground mb-4">
                    Deploy your website to CloudFront CDN for faster global delivery and better performance.
                  </p>
                  <Button onClick={handleDeployToCloudFront} disabled={deployingCloudFront}>
                    {deployingCloudFront ? (
                      <>
                        <Zap className="w-4 h-4 mr-2 animate-pulse" />
                        Deploying to CloudFront...
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4 mr-2" />
                        Deploy to CloudFront
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="media" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle>Media Files</CardTitle>
              <Button 
                variant="outline" 
                onClick={loadMediaFiles} 
                disabled={loadingMedia}
              >
                {loadingMedia ? "Loading..." : "Refresh"}
              </Button>
            </CardHeader>
            <CardContent>
              {loadingMedia ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-lg">Loading media files...</div>
                </div>
              ) : mediaFiles.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No media files uploaded yet.</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Upload media files through the website builder to see them here.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{mediaFiles.length} files</span>
                    <span>Total size: {formatFileSize(mediaFiles.reduce((sum, file) => sum + file.size, 0))}</span>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>File</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Size</TableHead>
                          <TableHead>Uploaded</TableHead>
                          <TableHead>URL</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {mediaFiles.map((file, index) => (
                          <TableRow key={index}>
                            <TableCell className="flex items-center gap-2">
                              {getFileIcon(file.type)}
                              <span className="font-medium truncate max-w-[200px]" title={file.filename}>
                                {file.filename}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="capitalize">
                                {file.type}
                              </Badge>
                            </TableCell>
                            <TableCell>{formatFileSize(file.size)}</TableCell>
                            <TableCell>
                              {formatDate(file.uploadDate)}
                            </TableCell>
                            <TableCell>
                              <code className="text-xs bg-gray-100 px-2 py-1 rounded max-w-[300px] truncate block">
                                {file.url}
                              </code>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => copyToClipboard(file.url)}
                                  title="Copy URL"
                                >
                                  <Copy className="w-3 h-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => window.open(file.url, '_blank')}
                                  title="Open in new tab"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                </Button>
                                {file.type === 'image' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      const link = document.createElement('a');
                                      link.href = file.url;
                                      link.download = file.filename;
                                      link.click();
                                    }}
                                    title="Download"
                                  >
                                    <Download className="w-3 h-3" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 