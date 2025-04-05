"use client";
import { useState } from "react";
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
import { Inbox, MessageSquare, MoreHorizontal, Search } from "lucide-react";
import { auth, db } from "@/lib/firebase";
import {
  collection,
  query,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { useEffect } from "react";

export default function ContactsTab() {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedContact, setSelectedContact] = useState(null);
  const [isContactDetailOpen, setIsContactDetailOpen] = useState(false);
  const [contactType, setContactType] = useState("all");

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

  // Filter contacts based on status filter, contact type, and search query
  const filteredContacts = contacts.filter((contact) => {
    const matchesStatus =
      statusFilter === "all" || contact.status === statusFilter;
    const matchesType = contactType === "all" || contact.type === contactType;
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch =
      !searchQuery ||
      (contact.customerName &&
        contact.customerName.toLowerCase().includes(searchLower)) ||
      (contact.serviceName &&
        contact.serviceName.toLowerCase().includes(searchLower)) ||
      (contact.propertyTitle &&
        contact.propertyTitle.toLowerCase().includes(searchLower)) ||
      (contact.message && contact.message.toLowerCase().includes(searchLower));
    return matchesStatus && matchesType && matchesSearch;
  });

  // Open contact detail modal
  const openContactDetail = (contact) => {
    setSelectedContact(contact);
    setIsContactDetailOpen(true);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-16">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Service Inquiries</CardTitle>
          <CardDescription>
            View and manage inquiries from potential customers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search contacts..."
                  className="w-full appearance-none pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>

              <Select value={contactType} onValueChange={setContactType}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="service">Services</SelectItem>
                  <SelectItem value="real-estate">Real Estate</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {filteredContacts.length === 0 ? (
            <div className="text-center py-10">
              <Inbox className="mx-auto h-12 w-12 text-gray-300" />
              <h3 className="mt-4 text-lg font-medium">No inquiries found</h3>
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
                    <TableHead className="w-[250px]">Customer</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Inquiry Details</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
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
                                contact.customerPhoto ||
                                contact.customerData?.photoURL ||
                                contact.customerData?.profilePic ||
                                ""
                              }
                              alt={contact.customerName || "Customer"}
                            />
                            <AvatarFallback>
                              {(contact.customerName || "A").charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">
                              {contact.customerName || "Anonymous"}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {contact.customerEmail || "No email provided"}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {contact.type === "real-estate"
                            ? "Real Estate"
                            : "Service"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium line-clamp-1">
                          {contact.type === "real-estate"
                            ? contact.propertyTitle
                            : contact.serviceName}
                        </div>
                        <div className="text-sm text-muted-foreground line-clamp-1">
                          {contact.message?.substring(0, 50)}...
                        </div>
                      </TableCell>
                      <TableCell>{contact.createdAtFormatted}</TableCell>
                      <TableCell>{getStatusBadge(contact.status)}</TableCell>
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
                                handleStatusUpdate(contact.id, "pending");
                              }}
                            >
                              Mark as Pending
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStatusUpdate(contact.id, "in-progress");
                              }}
                            >
                              Mark as In Progress
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStatusUpdate(contact.id, "completed");
                              }}
                            >
                              Mark as Completed
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStatusUpdate(contact.id, "cancelled");
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

      {/* Contact Detail Dialog */}
      <Dialog open={isContactDetailOpen} onOpenChange={setIsContactDetailOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Inquiry Details</DialogTitle>
          </DialogHeader>
          {selectedContact && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">
                  Customer Information
                </h3>
                <div className="flex items-center gap-3 mt-2">
                  <Avatar className="h-10 w-10">
                    <AvatarImage
                      src={selectedContact.customerData?.profilePic || ""}
                      alt={selectedContact.customerName}
                    />
                    <AvatarFallback>
                      {selectedContact.customerName?.charAt(0) || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">
                      {selectedContact.customerName}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {selectedContact.email}
                    </div>
                  </div>
                </div>
                {selectedContact.phone && (
                  <div className="text-sm mt-1">
                    <span className="text-muted-foreground">Phone: </span>
                    {selectedContact.phone}
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">
                  {selectedContact.type === "real-estate"
                    ? "Property"
                    : "Service"}{" "}
                  Details
                </h3>
                <div className="font-medium">
                  {selectedContact.type === "real-estate"
                    ? selectedContact.propertyTitle
                    : selectedContact.serviceName}
                </div>
                {selectedContact.propertyLocation && (
                  <div className="text-sm text-muted-foreground">
                    Location: {selectedContact.propertyLocation}
                  </div>
                )}
                {selectedContact.budget && (
                  <div className="text-sm text-muted-foreground">
                    Budget: ₹{selectedContact.budget}
                  </div>
                )}
                {selectedContact.timeframe && (
                  <div className="text-sm text-muted-foreground">
                    Time Frame: {selectedContact.timeframe}
                  </div>
                )}
                {selectedContact.queryType && (
                  <div className="text-sm text-muted-foreground">
                    Query Type: {selectedContact.queryType}
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">
                  Message
                </h3>
                <p className="text-sm">{selectedContact.message}</p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">
                  Status
                </h3>
                {getStatusBadge(selectedContact.status)}
              </div>

              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">
                  Received On
                </h3>
                <p className="text-sm">
                  {selectedContact.createdAtFormatted || "Unknown"}
                </p>
              </div>
            </div>
          )}
          <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-4">
            {selectedContact && (
              <Select
                value={selectedContact.status}
                onValueChange={(value) =>
                  handleStatusUpdate(selectedContact.id, value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Update Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            )}
            <Button
              variant="outline"
              onClick={() => setIsContactDetailOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
