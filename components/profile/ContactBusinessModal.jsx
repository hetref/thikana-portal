"use client";
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { auth, db } from "@/lib/firebase";
import {
  addDoc,
  collection,
  serverTimestamp,
  getDocs,
  query,
  where,
  doc,
  getDoc,
  orderBy,
  limit,
} from "firebase/firestore";
import toast from "react-hot-toast";
import { MessageSquare, TicketIcon } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import Loader from "@/components/Loader";

export default function ContactBusinessModal({
  isOpen,
  onClose,
  businessId,
  businessData,
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [activeTab, setActiveTab] = useState("new");
  const [formData, setFormData] = useState({
    service: "",
    subject: "",
    message: "",
    priority: "medium",
  });

  useEffect(() => {
    const fetchServices = async () => {
      if (!businessId) return;

      try {
        // Fetch services from the business
        const servicesRef = collection(db, "users", businessId, "services");
        const servicesSnapshot = await getDocs(servicesRef);

        const servicesData = servicesSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setServices(servicesData);
      } catch (error) {
        console.error("Error fetching services:", error);
      } finally {
        setLoading(false);
      }
    };

    if (isOpen) {
      fetchServices();
      // Reset form when modal opens
      setFormData({
        service: "",
        subject: "",
        message: "",
        priority: "medium",
      });
      
      // Fetch user tickets if user is logged in
      const user = auth.currentUser;
      if (user) {
        fetchUserTickets(user.uid);
      }
    }
  }, [businessId, isOpen]);

  const fetchUserTickets = async (userId) => {
    if (!businessId) return;
    
    setLoadingTickets(true);
    try {
      // Query tickets collection for this user and business
      const ticketsRef = collection(db, "tickets");
      const q = query(
        ticketsRef,
        where("userId", "==", userId),
        where("businessId", "==", businessId),
        orderBy("createdAt", "desc")
      );
      
      const ticketsSnapshot = await getDocs(q);
      
      const ticketsData = await Promise.all(ticketsSnapshot.docs.map(async (doc) => {
        const ticketData = { id: doc.id, ...doc.data() };
        
        // If there's a service ID, get service name
        if (ticketData.serviceId) {
          try {
            const serviceRef = doc(db, "users", businessId, "services", ticketData.serviceId);
            const serviceDoc = await getDoc(serviceRef);
            if (serviceDoc.exists()) {
              ticketData.serviceName = serviceDoc.data().name;
            }
          } catch (error) {
            console.error("Error fetching service details:", error);
          }
        }
        
        return ticketData;
      }));
      
      setTickets(ticketsData);
    } catch (error) {
      console.error("Error fetching tickets:", error);
      toast.error("Failed to load your tickets");
    } finally {
      setLoadingTickets(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleServiceChange = (value) => {
    setFormData((prev) => ({
      ...prev,
      service: value,
    }));
  };
  
  const handlePriorityChange = (value) => {
    setFormData((prev) => ({
      ...prev,
      priority: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const user = auth.currentUser;
      if (!user) {
        toast.error("You need to be logged in to create a ticket");
        return;
      }

      if (!formData.service) {
        toast.error("Please select a service");
        return;
      }
      
      if (!formData.subject.trim()) {
        toast.error("Please enter a subject for your ticket");
        return;
      }

      if (!formData.message.trim()) {
        toast.error("Please enter your message");
        return;
      }

      // Get the service details to display in the ticket
      const selectedService = services.find((s) => s.id === formData.service);
      const serviceName = selectedService
        ? selectedService.name
        : "Unknown Service";

      // Add a ticket to the tickets collection
      const ticketRef = await addDoc(collection(db, "tickets"), {
        serviceId: formData.service,
        serviceName: serviceName,
        subject: formData.subject,
        message: formData.message,
        priority: formData.priority,
        userId: user.uid,
        userEmail: user.email,
        userName: user.displayName || user.email,
        businessId: businessId,
        businessName: businessData?.businessName || "Business",
        status: "open",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        messages: [{
          text: formData.message,
          sender: "customer",
          timestamp: new Date(),
          userName: user.displayName || user.email
        }]
      });

      // Also add to business inquiries for backward compatibility
      await addDoc(collection(db, "businesses", businessId, "inquiries"), {
        service: serviceName,
        serviceId: formData.service,
        message: formData.message,
        userId: user.uid,
        status: "pending",
        timestamp: serverTimestamp(),
        createdAt: new Date(),
        ticketId: ticketRef.id
      });

      toast.success("Ticket created successfully!");
      // Refresh the tickets list
      fetchUserTickets(user.uid);
      // Switch to my tickets tab
      setActiveTab("tickets");
      // Reset form
      setFormData({
        service: "",
        subject: "",
        message: "",
        priority: "medium",
      });
    } catch (error) {
      console.error("Error creating ticket:", error);
      toast.error("Failed to create ticket. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Function to render status badge with appropriate color
  const renderStatusBadge = (status) => {
    const statusColors = {
      open: "bg-blue-500",
      pending: "bg-yellow-500",
      "in-progress": "bg-purple-500",
      resolved: "bg-green-500",
      closed: "bg-gray-500"
    };
    
    return (
      <Badge className={`${statusColors[status] || "bg-gray-500"}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  // Function to render priority badge
  const renderPriorityBadge = (priority) => {
    const priorityColors = {
      low: "bg-blue-500",
      medium: "bg-yellow-500",
      high: "bg-orange-500",
      urgent: "bg-red-500"
    };
    
    return (
      <Badge className={`${priorityColors[priority] || "bg-gray-500"}`}>
        {priority.charAt(0).toUpperCase() + priority.slice(1)}
      </Badge>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {businessData?.businessName || "Business"} Support
          </DialogTitle>
          <DialogDescription>
            Create a new support ticket or check your existing tickets.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="new">
              <TicketIcon className="h-4 w-4 mr-2" />
              New Ticket
            </TabsTrigger>
            <TabsTrigger value="tickets">
              <MessageSquare className="h-4 w-4 mr-2" />
              My Tickets
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="new">
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              {loading ? (
                <div className="flex justify-center py-4">
                  <Loader/>
                </div>
              ) : services.length === 0 ? (
                <div className="text-center py-2 text-muted-foreground">
                  No services available for this business.
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="service">Related Service</Label>
                    <Select
                      value={formData.service}
                      onValueChange={handleServiceChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a service" />
                      </SelectTrigger>
                      <SelectContent>
                        {services.map((service) => (
                          <SelectItem key={service.id} value={service.id}>
                            {service.name}{" "}
                            {service.isVariablePrice
                              ? `(Price varies)`
                              : service.price
                                ? `(₹${service.price})`
                                : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="priority">Priority</Label>
                    <Select
                      value={formData.priority}
                      onValueChange={handlePriorityChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject</Label>
                    <Input
                      id="subject"
                      name="subject"
                      placeholder="Brief description of your issue"
                      value={formData.subject}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message">Message</Label>
                    <Textarea
                      id="message"
                      name="message"
                      placeholder="Describe your issue in detail..."
                      value={formData.message}
                      onChange={handleInputChange}
                      rows={5}
                      className="resize-none"
                    />
                  </div>
                </div>
              )}

              <DialogFooter className="mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || loading || services.length === 0}
                >
                  {isSubmitting ? (
                    <>
                      <Loader/>
                      Creating Ticket...
                    </>
                  ) : (
                    "Create Ticket"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>
          
          <TabsContent value="tickets">
            <div className="space-y-4 py-2">
              {loadingTickets ? (
                <div className="flex justify-center py-4">
                  <Loader/>
                </div>
              ) : tickets.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  You don't have any tickets with this business yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {tickets.map((ticket) => (
                    <div key={ticket.id} className="border rounded-lg p-3 space-y-2">
                      <div className="flex justify-between items-start">
                        <h3 className="font-medium text-sm">{ticket.subject}</h3>
                        {renderStatusBadge(ticket.status)}
                      </div>
                      
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>
                          {ticket.serviceName || ticket.serviceId || "General Inquiry"}
                        </span>
                        {renderPriorityBadge(ticket.priority)}
                      </div>
                      
                      <div className="text-sm mt-2 line-clamp-2">
                        {ticket.message}
                      </div>
                      
                      <div className="flex justify-between items-center text-xs text-gray-500 pt-1">
                        <span>
                          Created: {ticket.createdAt ? new Date(ticket.createdAt.toDate()).toLocaleString() : "Recently"}
                        </span>
                        
                        <Button 
                          variant="link" 
                          size="sm" 
                          className="text-xs p-0 h-auto"
                          onClick={() => {
                            // Here you could implement a view ticket details function
                            // This could open a new modal or navigate to a ticket detail page
                            toast.success(`View ticket ${ticket.id} (Coming soon)`);
                          }}
                        >
                          View Details
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              <DialogFooter className="mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                >
                  Close
                </Button>
                <Button
                  type="button"
                  onClick={() => setActiveTab("new")}
                >
                  Create New Ticket
                </Button>
              </DialogFooter>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
