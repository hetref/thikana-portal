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
import { Edit, ExternalLink, Calendar, Clock, Copy, Download, Image, FileText, Video, File } from "lucide-react";
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

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        let bizId = user.uid;
        if (userDoc.exists()) {
          const u = userDoc.data();
          if (u.role === "member" && u.businessId) bizId = u.businessId;
        }
        setBusinessId(bizId);
        
        // Load website data
        const websiteDoc = await getDoc(doc(db, "businesses", bizId, "websites", websiteId));
        if (websiteDoc.exists()) {
          const websiteData = { id: websiteDoc.id, ...websiteDoc.data() };
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

      <Tabs defaultValue="details" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="details">Website Details</TabsTrigger>
          <TabsTrigger value="media" onClick={() => !loadingMedia && mediaFiles.length === 0 && loadMediaFiles()}>
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
                      <span>Created: {website.createdAt?.toDate ? website.createdAt.toDate().toLocaleString() : "Unknown"}</span>
                    </div>
                    
                    {website.updatedAt && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        <span>Last Updated: {website.updatedAt.toDate ? website.updatedAt.toDate().toLocaleString() : "Unknown"}</span>
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