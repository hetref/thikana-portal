"use client";
import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ChevronDown,
  Inbox,
  MessageSquare,
  MoreHorizontal,
  Search,
  ChevronRight,
  Calendar,
  User,
  Clock,
  Check,
  AlertCircle,
  X,
  Phone,
} from "lucide-react";
import { auth, db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import Sidebar from "@/components/Sidebar";

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState("contacts");
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedContact, setSelectedContact] = useState(null);
  const [isContactDetailOpen, setIsContactDetailOpen] = useState(false);
  const [userData, setUserData] = useState(null);

  // Fetch business user data
  useEffect(() => {
    const fetchUserData = async () => {
      const user = auth.currentUser;
      if (!user) return;

      try {
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          setUserData(userDoc.data());
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };

    fetchUserData();
  }, []);

  // Fetch contacts (inquiries)
  useEffect(() => {
    const fetchContacts = async () => {
      const user = auth.currentUser;
      if (!user) return;

      setLoading(true);

      try {
        console.log("Fetching inquiries for user:", user.uid);

        // Query inquiries for the current user
        const inquiriesRef = collection(db, "users", user.uid, "inquiries");

        // Create a query with ordering but without the where clause since we're already in the user's collection
        const q = query(inquiriesRef, orderBy("createdAt", "desc"));

        console.log("Query created, fetching documents...");
        const querySnapshot = await getDocs(q);
        console.log("Documents fetched:", querySnapshot.size);

        const inquiriesData = [];

        // First collect all inquiry data
        querySnapshot.forEach((doc) => {
          try {
            const data = doc.data();
            inquiriesData.push({
              id: doc.id,
              ...data,
              createdAtFormatted: data.createdAt
                ? new Date(data.createdAt.toDate()).toLocaleString()
                : "Unknown",
            });
          } catch (err) {
            console.error("Error processing inquiry document:", err);
          }
        });

        console.log("Collected inquiry data, fetching customer details...");

        // Then fetch customer data for valid inquiries with customerIds
        const updatedInquiries = await Promise.all(
          inquiriesData.map(async (inquiry) => {
            if (!inquiry.customerId) return inquiry;

            try {
              const userDoc = await getDoc(
                doc(db, "users", inquiry.customerId)
              );
              if (userDoc.exists()) {
                return {
                  ...inquiry,
                  customerData: userDoc.data(),
                };
              }
            } catch (err) {
              console.error(
                `Error fetching customer data for ${inquiry.customerId}:`,
                err
              );
            }
            return inquiry;
          })
        );

        console.log("All data fetched successfully");
        setContacts(updatedInquiries);
      } catch (error) {
        console.error("Error fetching inquiries:", error);
        toast.error("Failed to fetch contact inquiries");
      } finally {
        setLoading(false);
      }
    };

    fetchContacts();
  }, []);

  // Handle status update
  const handleStatusUpdate = async (contactId, newStatus) => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const contactRef = doc(db, "users", user.uid, "inquiries", contactId);
      await updateDoc(contactRef, {
        status: newStatus,
        updatedAt: Timestamp.now(),
      });

      // Update local state
      setContacts(
        contacts.map((contact) =>
          contact.id === contactId ? { ...contact, status: newStatus } : contact
        )
      );

      if (selectedContact && selectedContact.id === contactId) {
        setSelectedContact({ ...selectedContact, status: newStatus });
      }

      toast.success(`Status updated to ${newStatus}`);
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status");
    }
  };

  // Get contact badge color based on status
  const getStatusBadge = (status) => {
    switch (status) {
      case "pending":
        return (
          <Badge
            variant="outline"
            className="bg-amber-50 text-amber-700 border-amber-200"
          >
            Pending
          </Badge>
        );
      case "in-progress":
        return (
          <Badge
            variant="outline"
            className="bg-blue-50 text-blue-700 border-blue-200"
          >
            In Progress
          </Badge>
        );
      case "completed":
        return (
          <Badge
            variant="outline"
            className="bg-green-50 text-green-700 border-green-200"
          >
            Completed
          </Badge>
        );
      case "cancelled":
        return (
          <Badge
            variant="outline"
            className="bg-gray-50 text-gray-700 border-gray-200"
          >
            Cancelled
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-gray-100 text-gray-700">
            {status || "Unknown"}
          </Badge>
        );
    }
  };

  // Filter contacts based on status filter and search query
  const filteredContacts = contacts.filter((contact) => {
    const matchesStatus =
      statusFilter === "all" || contact.status === statusFilter;
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch =
      !searchQuery ||
      (contact.customerName &&
        contact.customerName.toLowerCase().includes(searchLower)) ||
      (contact.serviceName &&
        contact.serviceName.toLowerCase().includes(searchLower)) ||
      (contact.message && contact.message.toLowerCase().includes(searchLower));
    return matchesStatus && matchesSearch;
  });

  // Open contact detail modal
  const openContactDetail = (contact) => {
    setSelectedContact(contact);
    setIsContactDetailOpen(true);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto py-8 px-4">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left Sidebar */}
          <aside className="hidden lg:block w-80">
            <Sidebar />
          </aside>

          {/* Main content */}
          <main className="flex-1 space-y-6">
            <div className="mb-8">
              <h1 className="text-2xl font-bold mb-2">
                Welcome, {userData?.businessName || "Business Owner"}
              </h1>
              <p className="text-muted-foreground">
                Manage your business inquiries and appointments
              </p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <div className="flex justify-between items-center mb-6">
                <TabsList>
                  <TabsTrigger
                    value="contacts"
                    className="flex items-center gap-2"
                  >
                    <MessageSquare className="h-4 w-4" />
                    Contacts
                  </TabsTrigger>
                  {/* Additional tabs can be added here */}
                </TabsList>
              </div>

              <TabsContent value="contacts" className="space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle>Service Inquiries</CardTitle>
                    <CardDescription>
                      View and manage inquiries from potential customers
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-center mb-6">
                      <div className="flex gap-2">
                        <Select
                          value={statusFilter}
                          onValueChange={setStatusFilter}
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Filter by status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Statuses</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="in-progress">
                              In Progress
                            </SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search contacts..."
                          className="pl-8 w-[250px]"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                      </div>
                    </div>

                    {filteredContacts.length === 0 ? (
                      <div className="text-center py-10">
                        <Inbox className="mx-auto h-12 w-12 text-gray-300" />
                        <h3 className="mt-4 text-lg font-medium">
                          No inquiries found
                        </h3>
                        <p className="mt-2 text-sm text-gray-500">
                          {contacts.length === 0
                            ? "You haven't received any inquiries yet."
                            : "No inquiries match your current filters."}
                        </p>
                      </div>
                    ) : (
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-[250px]">
                                Customer
                              </TableHead>
                              <TableHead>Service</TableHead>
                              <TableHead>Date</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead className="text-right">
                                Actions
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredContacts.map((contact) => (
                              <TableRow
                                key={contact.id}
                                className="cursor-pointer hover:bg-muted/50"
                                onClick={() => openContactDetail(contact)}
                              >
                                <TableCell className="font-medium">
                                  <div className="flex items-center space-x-3">
                                    <Avatar className="h-8 w-8">
                                      <AvatarImage
                                        src={
                                          contact.customerData?.photoURL || ""
                                        }
                                        alt={contact.customerName || "Customer"}
                                      />
                                      <AvatarFallback>
                                        {(contact.customerName || "A").charAt(
                                          0
                                        )}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div>
                                      <div className="font-medium">
                                        {contact.customerName || "Anonymous"}
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        {contact.customerEmail ||
                                          "No email provided"}
                                      </div>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {contact.serviceName || "General Inquiry"}
                                </TableCell>
                                <TableCell>
                                  {contact.createdAtFormatted}
                                </TableCell>
                                <TableCell>
                                  {getStatusBadge(contact.status)}
                                </TableCell>
                                <TableCell className="text-right">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        className="h-8 w-8 p-0"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <MoreHorizontal className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleStatusUpdate(
                                            contact.id,
                                            "pending"
                                          );
                                        }}
                                      >
                                        Mark as Pending
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleStatusUpdate(
                                            contact.id,
                                            "in-progress"
                                          );
                                        }}
                                      >
                                        Mark as In Progress
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleStatusUpdate(
                                            contact.id,
                                            "completed"
                                          );
                                        }}
                                      >
                                        Mark as Completed
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleStatusUpdate(
                                            contact.id,
                                            "cancelled"
                                          );
                                        }}
                                      >
                                        Mark as Cancelled
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </main>
        </div>
      </div>

      {/* Contact Detail Dialog */}
      <Dialog open={isContactDetailOpen} onOpenChange={setIsContactDetailOpen}>
        <DialogContent className="sm:max-w-[500px]">
          {selectedContact && (
            <>
              <DialogHeader>
                <DialogTitle>Contact Detail</DialogTitle>
                <DialogDescription>
                  Inquiry from {selectedContact.customerName || "Customer"}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="flex items-center space-x-4">
                  <Avatar className="h-10 w-10">
                    <AvatarImage
                      src={selectedContact.customerData?.photoURL || ""}
                      alt={selectedContact.customerName || "Customer"}
                    />
                    <AvatarFallback>
                      {(selectedContact.customerName || "A").charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-medium">
                      {selectedContact.customerName || "Anonymous"}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {selectedContact.customerEmail || "No email provided"}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Service</h4>
                  <p>{selectedContact.serviceName || "General Inquiry"}</p>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Message</h4>
                  <div className="rounded-md bg-muted p-3">
                    <p className="text-sm whitespace-pre-wrap">
                      {selectedContact.message}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Status</h4>
                    <div>{getStatusBadge(selectedContact.status)}</div>
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Date</h4>
                    <p className="text-sm">
                      {selectedContact.createdAtFormatted}
                    </p>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <div className="flex space-x-2">
                  <Select
                    defaultValue={selectedContact.status || "pending"}
                    onValueChange={(value) =>
                      handleStatusUpdate(selectedContact.id, value)
                    }
                  >
                    <SelectTrigger className="w-[130px]">
                      <SelectValue placeholder="Update status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in-progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={() => setIsContactDetailOpen(false)}>
                    Close
                  </Button>
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
