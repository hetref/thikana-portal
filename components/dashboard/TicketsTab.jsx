"use client";
import { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  updateDoc,
  doc,
  getDoc,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Loader2, Search, MessagesSquare, Filter, ChevronDown, TicketIcon } from "lucide-react";
import toast from "react-hot-toast";

export default function TicketsTab() {
  const [tickets, setTickets] = useState([]);
  const [filteredTickets, setFilteredTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [ticketDetailsOpen, setTicketDetailsOpen] = useState(false);
  const [ticketTypeFilter, setTicketTypeFilter] = useState("all");
  const [replyText, setReplyText] = useState("");
  const [replying, setReplying] = useState(false);

  // Fetch tickets on component mount
  useEffect(() => {
    fetchTickets();
  }, []);

  // Apply filters when tickets or filter parameters change
  useEffect(() => {
    filterTickets();
  }, [tickets, searchTerm, statusFilter, priorityFilter, ticketTypeFilter]);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        toast.error("You need to be logged in to view tickets");
        setLoading(false);
        return;
      }

      // Query tickets from the business's subcollection
      const ticketsRef = collection(db, "users", user.uid, "tickets");
      const q = query(
        ticketsRef,
        orderBy("updatedAt", "desc")
      );

      const ticketsSnapshot = await getDocs(q);
      const ticketsData = ticketsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAtDate: doc.data().createdAt ? new Date(doc.data().createdAt.toDate()) : new Date(),
        updatedAtDate: doc.data().updatedAt ? new Date(doc.data().updatedAt.toDate()) : new Date()
      }));

      setTickets(ticketsData);
      setFilteredTickets(ticketsData);
    } catch (error) {
      console.error("Error fetching tickets:", error);
      toast.error("Failed to load tickets");
    } finally {
      setLoading(false);
    }
  };

  const filterTickets = () => {
    let filtered = [...tickets];

    // Apply search term filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        ticket => 
          ticket.subject?.toLowerCase().includes(term) ||
          ticket.message?.toLowerCase().includes(term) ||
          ticket.userName?.toLowerCase().includes(term) ||
          ticket.userEmail?.toLowerCase().includes(term)
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(ticket => ticket.status === statusFilter);
    }

    // Apply priority filter
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(ticket => ticket.priority === priorityFilter);
    }

    // Apply filter for business queries vs customer tickets
    if (ticketTypeFilter === 'business') {
      filtered = filtered.filter(ticket => ticket.isBusinessQuery === true);
    } else if (ticketTypeFilter === 'customer') {
      filtered = filtered.filter(ticket => !ticket.isBusinessQuery);
    }

    setFilteredTickets(filtered);
  };

  const handleOpenTicket = async (ticket) => {
    try {
      // Get fresh ticket data from database
      const user = auth.currentUser;
      if (!user) {
        toast.error("You need to be logged in to view ticket details");
        return;
      }
      
      const ticketRef = doc(db, "users", user.uid, "tickets", ticket.id);
      const ticketDoc = await getDoc(ticketRef);
      
      if (ticketDoc.exists()) {
        const freshTicket = { 
          id: ticketDoc.id, 
          ...ticketDoc.data(),
          createdAtDate: ticketDoc.data().createdAt ? new Date(ticketDoc.data().createdAt.toDate()) : new Date(),
          updatedAtDate: ticketDoc.data().updatedAt ? new Date(ticketDoc.data().updatedAt.toDate()) : new Date()
        };
        setSelectedTicket(freshTicket);
        setTicketDetailsOpen(true);
      } else {
        toast.error("Ticket not found");
      }
    } catch (error) {
      console.error("Error opening ticket:", error);
      toast.error("Failed to open ticket details");
    }
  };

  const handleStatusChange = async (ticketId, newStatus) => {
    try {
      const user = auth.currentUser;
      if (!user) {
        toast.error("You need to be logged in to update ticket status");
        return;
      }
      
      const ticketRef = doc(db, "users", user.uid, "tickets", ticketId);
      
      await updateDoc(ticketRef, {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
      
      toast.success(`Ticket status updated to ${newStatus}`);
      
      // Update the ticket in the state
      const updatedTickets = tickets.map(ticket => 
        ticket.id === ticketId ? { ...ticket, status: newStatus } : ticket
      );
      
      setTickets(updatedTickets);
      
      // Also update the selected ticket if it's open
      if (selectedTicket && selectedTicket.id === ticketId) {
        setSelectedTicket({
          ...selectedTicket,
          status: newStatus
        });
      }
    } catch (error) {
      console.error("Error updating ticket status:", error);
      toast.error("Failed to update ticket status");
    }
  };

  const handlePriorityChange = async (ticketId, newPriority) => {
    try {
      const user = auth.currentUser;
      if (!user) {
        toast.error("You need to be logged in to update ticket priority");
        return;
      }
      
      const ticketRef = doc(db, "users", user.uid, "tickets", ticketId);
      
      await updateDoc(ticketRef, {
        priority: newPriority,
        updatedAt: serverTimestamp()
      });
      
      toast.success(`Ticket priority updated to ${newPriority}`);
      
      // Update the ticket in the state
      const updatedTickets = tickets.map(ticket => 
        ticket.id === ticketId ? { ...ticket, priority: newPriority } : ticket
      );
      
      setTickets(updatedTickets);
      
      // Also update the selected ticket if it's open
      if (selectedTicket && selectedTicket.id === ticketId) {
        setSelectedTicket({
          ...selectedTicket,
          priority: newPriority
        });
      }
    } catch (error) {
      console.error("Error updating ticket priority:", error);
      toast.error("Failed to update ticket priority");
    }
  };

  const handleReplySubmit = async () => {
    if (!replyText.trim()) {
      toast.error("Please enter a reply message");
      return;
    }

    setReplying(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        toast.error("You need to be logged in to reply");
        return;
      }

      const ticketRef = doc(db, "users", user.uid, "tickets", selectedTicket.id);
      
      // Create new message
      const newMessage = {
        text: replyText,
        sender: "business",
        timestamp: new Date(),
        userName: user.displayName || user.email
      };

      // Get current messages array or initialize if it doesn't exist
      const messages = selectedTicket.messages || [];
      
      // Add new message to array
      const updatedMessages = [...messages, newMessage];

      // Update the ticket with new message and change status to in-progress if it's open
      const newStatus = selectedTicket.status === "open" ? "in-progress" : selectedTicket.status;
      
      await updateDoc(ticketRef, {
        messages: updatedMessages,
        status: newStatus,
        updatedAt: serverTimestamp()
      });

      // Update the selected ticket state
      setSelectedTicket({
        ...selectedTicket,
        messages: updatedMessages,
        status: newStatus,
        updatedAtDate: new Date()
      });

      // Also update the ticket in the main list
      const updatedTickets = tickets.map(ticket => 
        ticket.id === selectedTicket.id 
          ? { 
              ...ticket, 
              messages: updatedMessages, 
              status: newStatus,
              updatedAtDate: new Date()
            } 
          : ticket
      );
      
      setTickets(updatedTickets);

      // Clear the reply input
      setReplyText("");
      toast.success("Reply sent successfully");
    } catch (error) {
      console.error("Error sending reply:", error);
      toast.error("Failed to send reply");
    } finally {
      setReplying(false);
    }
  };

  // Function to render status badge with appropriate color
  const renderStatusBadge = (status) => {
    const statusColors = {
      open: "bg-blue-100 text-blue-800 border border-blue-500",
      pending: "bg-yellow-100 text-yellow-800 border border-yellow-500",
      "in-progress": "bg-purple-100 text-purple-800 border border-purple-500",
      resolved: "bg-green-100 text-green-800 border border-green-500",
      closed: "bg-gray-100 text-gray-800 border border-gray-500"
    };
    
    return (
      <Badge className={`${statusColors[status] || "bg-gray-100 text-gray-800 border border-gray-500"}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  // Function to render priority badge
  const renderPriorityBadge = (priority) => {
    const priorityStyles = {
      low: "bg-blue-100 text-blue-800 border border-blue-500",
      medium: "bg-yellow-100 text-yellow-800 border border-yellow-500",
      high: "bg-orange-100 text-orange-800 border border-orange-500",
      urgent: "bg-red-100 text-red-800 border border-red-500"
    };
    
    return (
      <Badge className={`${priorityStyles[priority] || "bg-gray-100 text-gray-800 border border-gray-500"}`}>
        {priority.charAt(0).toUpperCase() + priority.slice(1)}
      </Badge>
    );
  };

  // Format date for display
  const formatDate = (date) => {
    if (!date) return "N/A";
    return date.toLocaleString();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Support Tickets</span>
            <Button 
              size="sm" 
              onClick={fetchTickets}
              disabled={loading}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Refresh
            </Button>
          </CardTitle>
          <CardDescription>
            Manage customer support tickets and inquiries.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search tickets..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <Select value={ticketTypeFilter} onValueChange={setTicketTypeFilter}>
                <SelectTrigger className="w-[150px]">
                  <TicketIcon className="h-4 w-4 mr-2" />
                  <span className="text-sm">Ticket Type</span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tickets</SelectItem>
                  <SelectItem value="customer">Customer Tickets</SelectItem>
                  <SelectItem value="business">Business Queries</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[130px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <span className="text-sm">Status</span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-[130px]">
                  <ChevronDown className="h-4 w-4 mr-2" />
                  <span className="text-sm">Priority</span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Tickets List */}
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No tickets found.
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTickets.map((ticket) => (
                <div 
                  key={ticket.id} 
                  className="border rounded-lg p-4 space-y-2 hover:shadow-md cursor-pointer transition-shadow"
                  onClick={() => handleOpenTicket(ticket)}
                >
                  <div className="flex justify-between items-start">
                    <h3 className="font-medium">{ticket.subject}</h3>
                    {renderStatusBadge(ticket.status)}
                  </div>
                  
                  <div className="flex items-center text-sm text-gray-500">
                    <span>From: {ticket.userName || ticket.userEmail || "Unknown User"}</span>
                    {ticket.isBusinessQuery && (
                      <Badge className="ml-2 bg-purple-100 text-purple-800 border border-purple-500">Business Query</Badge>
                    )}
                    {ticket.category && (
                      <Badge className="ml-2 bg-gray-100 text-gray-800 border border-gray-500">{ticket.category}</Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center space-x-2">
                      <span>{ticket.ticketId || ticket.id}</span>
                      <span>{ticket.serviceName || ticket.serviceId || "General Inquiry"}</span>
                      {renderPriorityBadge(ticket.priority)}
                      <span className="flex items-center space-x-1">
                        <MessagesSquare className="h-3 w-3" />
                        <span>{ticket.messages?.length || 1}</span>
                      </span>
                    </div>
                    
                    <div className="text-right">
                      <div>Created: {formatDate(ticket.createdAtDate)}</div>
                      <div>Updated: {formatDate(ticket.updatedAtDate)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {filteredTickets.length} of {tickets.length} tickets
          </div>
        </CardFooter>
      </Card>
      
      {/* Ticket Details Dialog */}
      <Dialog open={ticketDetailsOpen} onOpenChange={setTicketDetailsOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          {selectedTicket && (
            <>
              <DialogHeader>
                <DialogTitle className="flex justify-between items-center pt-3">
                  <span>{selectedTicket.subject}</span>
                  {renderStatusBadge(selectedTicket.status)}
                </DialogTitle>
                <DialogDescription>
                  From: {selectedTicket.userName || selectedTicket.userEmail || "Unknown User"}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 my-4">
                {/* Ticket Properties */}
                <div className="grid grid-cols-2 gap-4 text-sm border-b pb-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Service</Label>
                    <div>
                      {selectedTicket.serviceName || selectedTicket.serviceId || 
                      (selectedTicket.category ? `Category: ${selectedTicket.category}` : "General Inquiry")}
                      {selectedTicket.isBusinessQuery && (
                        <Badge className="ml-2 bg-purple-100 text-purple-800 border border-purple-500">Business Query</Badge>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Priority</Label>
                    <div className="flex items-center space-x-2">
                      {renderPriorityBadge(selectedTicket.priority)}
                      <Select 
                        value={selectedTicket.priority} 
                        onValueChange={(value) => handlePriorityChange(selectedTicket.id, value)}
                      >
                        <SelectTrigger className="h-7 text-xs border-dashed border-muted ml-2">
                          <span>Change</span>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Created</Label>
                    <div>{formatDate(selectedTicket.createdAtDate)}</div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Status</Label>
                    <div className="flex items-center space-x-2">
                      {renderStatusBadge(selectedTicket.status)}
                      <Select 
                        value={selectedTicket.status} 
                        onValueChange={(value) => handleStatusChange(selectedTicket.id, value)}
                      >
                        <SelectTrigger className="h-7 text-xs border-dashed border-muted ml-2">
                          <span>Change</span>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="open">Open</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="in-progress">In Progress</SelectItem>
                          <SelectItem value="resolved">Resolved</SelectItem>
                          <SelectItem value="closed">Closed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Ticket ID</Label>
                    <div>{selectedTicket.ticketId || selectedTicket.id}</div>
                  </div>
                </div>
                
                {/* Conversation */}
                <div>
                  <h4 className="text-sm font-medium mb-2">Conversation</h4>
                  <div className="space-y-4">
                    {/* Initial Message */}
                    <div className="rounded-lg bg-gray-100 p-3">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{selectedTicket.userName || "Customer"}</span>
                        <span className="text-xs text-gray-500">
                          {formatDate(selectedTicket.createdAtDate)}
                        </span>
                      </div>
                      <p className="mt-1 text-sm">{selectedTicket.message}</p>
                    </div>
                    
                    {/* Reply Messages */}
                    {selectedTicket.messages && selectedTicket.messages.slice(1).map((message, index) => (
                      <div 
                        key={index}
                        className={`rounded-lg p-3 ${
                          message.sender === "business" 
                            ? "bg-blue-100 ml-4" 
                            : "bg-gray-100 mr-4"
                        }`}
                      >
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">
                            {message.sender === "business" ? "You" : message.userName || "Customer"}
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatDate(message.timestamp ? new Date(message.timestamp.toDate ? message.timestamp.toDate() : message.timestamp) : new Date())}
                          </span>
                        </div>
                        <p className="mt-1 text-sm">{message.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
                
                {!["resolved", "closed"].includes(selectedTicket.status) ? (
                  <div className="pt-2">
                    <Label htmlFor="reply" className="text-sm font-medium">Reply</Label>
                    <Textarea 
                      id="reply"
                      placeholder="Type your reply here..."
                      className="mt-1"
                      rows={3}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      disabled={replying}
                    />
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground mt-4 italic">
                    This ticket is {selectedTicket.status}. No further replies can be added.
                  </div>
                )}
              </div>
              
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setTicketDetailsOpen(false)}
                >
                  Close
                </Button>
                {!["resolved", "closed"].includes(selectedTicket.status) && (
                  <Button
                    onClick={handleReplySubmit}
                    disabled={replying || !replyText.trim()}
                  >
                    {replying ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      "Send Reply"
                    )}
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
} 