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
import { Trash2, Plus, Globe, Layout } from "lucide-react";
import toast from "react-hot-toast";

function formatDateTime(date) {
  try {
    if (!date) return "-";
    let d = null;
    if (typeof date?.toDate === 'function') {
      d = date.toDate();
    } else if (date instanceof Date) {
      d = date;
    } else if (typeof date === 'object') {
      if (date.type === 'firestore/timestamp/1.0' && date.seconds != null) {
        const secs = Number(date.seconds);
        const nanos = Number(date.nanoseconds || 0);
        d = new Date(secs * 1000 + Math.floor(nanos / 1e6));
      } else if (date.seconds != null) {
        const secs = Number(date.seconds);
        const nanos = Number(date.nanoseconds || 0);
        d = new Date(secs * 1000 + Math.floor(nanos / 1e6));
      } else if (date._seconds != null) {
        const secs = Number(date._seconds);
        const nanos = Number(date._nanoseconds || 0);
        d = new Date(secs * 1000 + Math.floor(nanos / 1e6));
      }
    } else if (typeof date === 'number') {
      d = new Date(date);
    } else if (typeof date === 'string') {
      d = new Date(date);
    }
    if (!d || isNaN(d.getTime())) return "-";
    return d.toLocaleString();
  } catch {
    return "-";
  }
}

export default function WebsitesPage() {
  const router = useRouter();
  const [businessId, setBusinessId] = useState(null);
  const [websites, setWebsites] = useState([]);
  const [domains, setDomains] = useState([]);
  const [newWebsiteName, setNewWebsiteName] = useState("");
  const [newDomainName, setNewDomainName] = useState("");
  const [loading, setLoading] = useState(true);
  const [disablingMap, setDisablingMap] = useState(new Set());
  const [deletingMap, setDeletingMap] = useState(new Set());

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
          const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          console.debug('[Websites] Snapshot rows:', rows.map(r => ({ id: r.id, createdAt: r.createdAt })));
          setWebsites(rows);
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
        // Ensure createdAt is always stored server-side
        createdAt: serverTimestamp(),
        publishedStatus: "pending",
        updatedAt: serverTimestamp(),
      });
      console.debug('[Websites] Created website docId:', docRef.id);
      setNewWebsiteName("");
      toast.success("Website created");
      router.push(`/websites/${docRef.id}`);
    } catch (e) {
      console.error(e);
      toast.error("Failed to create website");
    }
  };

  const disableDistribution = async (website) => {
    if (!businessId || !website?.cloudfront?.distributionId) return;
    try {
      setDisablingMap((prev) => new Set(prev).add(website.id));
      const idToken = await auth.currentUser.getIdToken();
      const url = `/api/websites/cloudfront?businessId=${businessId}&websiteId=${website.id}&distributionId=${website.cloudfront.distributionId}`;
      const res = await fetch(url, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || 'Failed to disable distribution');
      toast.success('Distribution is being disabled. Please wait until status becomes Disabled.');
    } catch (e) {
      console.error(e);
      toast.error(e.message);
    } finally {
      setDisablingMap((prev) => {
        const n = new Set(prev);
        n.delete(website.id);
        return n;
      });
    }
  };

  const handleDeleteWebsite = async (id, website) => {
    if (!businessId || !id) return;
    try {
      // If deployed, block deletion until disabled
      if (website?.cloudfront?.distributionId && (website.cloudfront.enabled ?? true)) {
        toast.error('Disable CloudFront distribution first');
        return;
      }

      setDeletingMap((prev) => new Set(prev).add(id));
      const idToken = await auth.currentUser.getIdToken();
      const res = await fetch('/api/websites/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ businessId, websiteId: id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || 'Failed to delete website');
      toast.success('Website deleted');
    } catch (e) {
      console.error(e);
      toast.error(e.message || 'Failed to delete website');
    } finally {
      setDeletingMap((prev) => {
        const n = new Set(prev);
        n.delete(id);
        return n;
      });
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
                      websites.map((w) => {
                        const isDeployed = !!w.cloudfront?.distributionId;
                        const canDeleteDirect = !isDeployed || (isDeployed && w.cloudfront?.enabled === false);
                        return (
                          <TableRow key={w.id}>
                            <TableCell className="font-medium">{w.name || "Untitled"}</TableCell>
                            <TableCell>{isDeployed ? "Deployed" : "Not Deployed"}</TableCell>
                            <TableCell>
                              {formatDateTime(w.createdAt)}
                            </TableCell>
                            <TableCell className="flex items-center gap-2">
                              <Button variant="outline" size="sm" onClick={() => router.push(`/websites/${w.id}`)}>
                                Open
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => router.push(`/websites/${w.id}/details`)}>
                                Details
                              </Button>
                              {isDeployed && w.cloudfront?.enabled !== false && (
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => disableDistribution(w)}
                                  disabled={disablingMap.has(w.id)}
                                  title="Disable CloudFront distribution before deleting"
                                >
                                  {disablingMap.has(w.id) ? 'Disabling…' : 'Disable CDN'}
                                </Button>
                              )}
                              <Button 
                                variant="outline" 
                                size="icon" 
                                onClick={() => handleDeleteWebsite(w.id, w)}
                                disabled={!canDeleteDirect || deletingMap.has(w.id)}
                                title={canDeleteDirect ? 'Delete website' : 'Disable distribution first'}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
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