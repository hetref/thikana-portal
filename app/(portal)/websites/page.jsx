"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  getDoc,
} from "firebase/firestore";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Trash2, Plus, Globe, Layout, Rocket, RotateCcw } from "lucide-react";
import toast from "react-hot-toast";

export default function WebsitesPage() {
  const router = useRouter();
  const [businessId, setBusinessId] = useState(null);
  const [websites, setWebsites] = useState([]);
  const [domains, setDomains] = useState([]);
  const [newWebsiteName, setNewWebsiteName] = useState("");
  const [newDomainName, setNewDomainName] = useState("");
  const [loading, setLoading] = useState(true);
  const [deployingWebsites, setDeployingWebsites] = useState(new Set());
  const [invalidatingWebsites, setInvalidatingWebsites] = useState(new Set());

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
        const websitesRef = collection(db, "businesses", bizId, "websites");
        const domainsRef = collection(db, "businesses", bizId, "domains");
        const unsubWeb = onSnapshot(query(websitesRef, orderBy("createdAt", "desc")), (snap) => {
          setWebsites(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        });
        const unsubDom = onSnapshot(query(domainsRef, orderBy("createdAt", "desc")), (snap) => {
          setDomains(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        });
        return () => {
          unsubWeb();
          unsubDom();
        };
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  const handleCreateWebsite = async () => {
    if (!businessId || !newWebsiteName.trim()) return;
    try {
      const websitesRef = collection(db, "businesses", businessId, "websites");
      const docRef = await addDoc(websitesRef, {
        name: newWebsiteName.trim(),
        createdAt: serverTimestamp(),
        publishedStatus: "pending",
        updatedAt: serverTimestamp(),
      });
      setNewWebsiteName("");
      toast.success("Website created");
      router.push(`/websites/${docRef.id}`);
    } catch (e) {
      console.error(e);
      toast.error("Failed to create website");
    }
  };

  const handleDeleteWebsite = async (id) => {
    if (!businessId || !id) return;
    try {
      await deleteDoc(doc(db, "businesses", businessId, "websites", id));
      toast.success("Website deleted");
      // Note: deleting S3 assets is not automatic here. Add a server route if you need that.
    } catch (e) {
      console.error(e);
      toast.error("Failed to delete website");
    }
  };

  const handleAddDomain = async () => {
    if (!businessId || !newDomainName.trim()) return;
    try {
      const domainsRef = collection(db, "businesses", businessId, "domains");
      await addDoc(domainsRef, {
        name: newDomainName.trim().toLowerCase(),
        createdAt: serverTimestamp(),
      });
      setNewDomainName("");
      toast.success("Domain added");
    } catch (e) {
      console.error(e);
      toast.error("Failed to add domain");
    }
  };

  const handleDeleteDomain = async (id) => {
    if (!businessId || !id) return;
    try {
      await deleteDoc(doc(db, "businesses", businessId, "domains", id));
      toast.success("Domain deleted");
    } catch (e) {
      console.error(e);
      toast.error("Failed to delete domain");
    }
  };

  const handleDeployWebsite = async (website) => {
    if (!businessId || !website.id || deployingWebsites.has(website.id)) return;
    
    try {
      setDeployingWebsites(prev => new Set(prev).add(website.id));
      const idToken = await auth.currentUser.getIdToken();
      
      const response = await fetch('/api/websites/cloudfront', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          businessId,
          websiteId: website.id,
          websiteName: website.name
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`Deployment started! Distribution: ${data.distribution.domainName}`);
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Deployment failed');
      }
    } catch (error) {
      console.error('Deployment error:', error);
      toast.error(`Deployment failed: ${error.message}`);
    } finally {
      setDeployingWebsites(prev => {
        const newSet = new Set(prev);
        newSet.delete(website.id);
        return newSet;
      });
    }
  };

  const handleInvalidateCache = async (website) => {
    if (!businessId || !website.id || !website.cloudfront?.distributionId || invalidatingWebsites.has(website.id)) return;
    
    try {
      setInvalidatingWebsites(prev => new Set(prev).add(website.id));
      const idToken = await auth.currentUser.getIdToken();
      
      const response = await fetch('/api/websites/cloudfront/invalidate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          businessId,
          websiteId: website.id,
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
      setInvalidatingWebsites(prev => {
        const newSet = new Set(prev);
        newSet.delete(website.id);
        return newSet;
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">Loading...</div>
    );
  }

  return (
    <div className="max-w-[1100px] mx-auto p-4 sm:p-6">
      <Card>
        <CardHeader>
          <CardTitle>Websites & Domains</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="websites">
            <TabsList>
              <TabsTrigger value="websites" className="flex items-center gap-2">
                <Layout className="w-4 h-4" /> Websites
              </TabsTrigger>
              <TabsTrigger value="domains" className="flex items-center gap-2">
                <Globe className="w-4 h-4" /> Domains
              </TabsTrigger>
            </TabsList>

            <TabsContent value="websites" className="mt-6">
              <div className="flex gap-2 mb-4">
                <Input
                  placeholder="Website name"
                  value={newWebsiteName}
                  onChange={(e) => setNewWebsiteName(e.target.value)}
                  className="max-w-xs"
                />
                <Button onClick={handleCreateWebsite} className="flex items-center gap-1">
                  <Plus className="w-4 h-4" /> Create
                </Button>
              </div>

              <div className="w-full overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {websites.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-sm text-muted-foreground">
                          No websites yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      websites.map((w) => (
                        <TableRow key={w.id}>
                          <TableCell className="font-medium">{w.name || "Untitled"}</TableCell>
                          <TableCell>{w.publishedStatus || "pending"}</TableCell>
                          <TableCell>
                            {w.createdAt?.toDate ? w.createdAt.toDate().toLocaleString() : "-"}
                          </TableCell>
                          <TableCell className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => router.push(`/websites/${w.id}`)}>
                              Open
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => router.push(`/websites/${w.id}/details`)}>
                              Details
                            </Button>
                            {w.cloudfront?.distributionId ? (
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => handleInvalidateCache(w)}
                                disabled={invalidatingWebsites.has(w.id)}
                                title="Clear CloudFront Cache"
                              >
                                {invalidatingWebsites.has(w.id) ? (
                                  <>
                                    <RotateCcw className="w-4 h-4 mr-1 animate-spin" />
                                    Clearing...
                                  </>
                                ) : (
                                  <>
                                    <RotateCcw className="w-4 h-4 mr-1" />
                                    Clear Cache
                                  </>
                                )}
                              </Button>
                            ) : (
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => handleDeployWebsite(w)}
                                disabled={deployingWebsites.has(w.id)}
                                title="Deploy to CloudFront CDN"
                              >
                                {deployingWebsites.has(w.id) ? (
                                  <>
                                    <Rocket className="w-4 h-4 mr-1 animate-pulse" />
                                    Deploying...
                                  </>
                                ) : (
                                  <>
                                    <Rocket className="w-4 h-4 mr-1" />
                                    Deploy
                                  </>
                                )}
                              </Button>
                            )}
                            <Button variant="outline" size="icon" onClick={() => handleDeleteWebsite(w.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="domains" className="mt-6">
              <div className="flex gap-2 mb-4">
                <Input
                  placeholder="example.com"
                  value={newDomainName}
                  onChange={(e) => setNewDomainName(e.target.value)}
                  className="max-w-xs"
                />
                <Button onClick={handleAddDomain} className="flex items-center gap-1">
                  <Plus className="w-4 h-4" /> Add
                </Button>
              </div>

              <div className="w-full overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Domain</TableHead>
                      <TableHead>Added</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {domains.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-sm text-muted-foreground">
                          No domains added yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      domains.map((d) => (
                        <TableRow key={d.id}>
                          <TableCell className="font-medium">{d.name}</TableCell>
                          <TableCell>
                            {d.createdAt?.toDate ? d.createdAt.toDate().toLocaleString() : "-"}
                          </TableCell>
                          <TableCell>
                            <Button variant="outline" size="icon" onClick={() => handleDeleteDomain(d.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
} 