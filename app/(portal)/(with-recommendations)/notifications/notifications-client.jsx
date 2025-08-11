"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  addTestNotification,
  sendNotificationToUser,
} from "@/lib/notifications";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import NotificationsSkeleton from "@/components/NotificationsSkeleton";
import {
  Bell,
  BellRing,
  CheckCheck,
  Send,
  MessageCircle,
  Package,
  Tag,
  Settings,
  Users,
  Smartphone,
  Mail,
  Sparkles,
  Circle,
  Clock,
  Filter,
  X,
  Zap,
  ChevronDown,
  Search,
} from "lucide-react";

export default function NotificationsClient() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [testLoading, setTestLoading] = useState(false);
  const [markAllLoading, setMarkAllLoading] = useState(false);
  const [sendWhatsApp, setSendWhatsApp] = useState(false);
  const [sendEmail, setSendEmail] = useState(false);
  const [testMessage, setTestMessage] = useState("");
  const [filterTypes, setFilterTypes] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const { user } = useAuth();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowFilterDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    let unsubscribe = () => {};

    if (user?.uid) {
      setLoading(true);
      console.log("Setting up realtime notifications for user:", user.uid);
      unsubscribe = getNotifications((newNotifications) => {
        console.log("Received new notifications:", newNotifications);
        setNotifications(newNotifications);
        setLoading(false);
      }, user.uid);
    } else {
      // No user logged in; stop loading to show fallback UI
      setLoading(false);
    }

    return () => unsubscribe();
  }, [user]);

  const handleMarkAsRead = async (notificationId) => {
    if (!user?.uid) return;

    await markNotificationAsRead(user.uid, notificationId);

    // Update UI optimistically
    setNotifications((prev) =>
      prev.map((notif) =>
        notif.id === notificationId ? { ...notif, isRead: true } : notif
      )
    );
  };

  const handleMarkAllAsRead = async () => {
    if (!user?.uid) return;
    try {
      setMarkAllLoading(true);
      await markAllNotificationsAsRead(user.uid);

      // Update UI optimistically
      setNotifications((prev) =>
        prev.map((notif) => ({ ...notif, isRead: true }))
      );
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    } finally {
      setMarkAllLoading(false);
    }
  };

  const handleTestNotification = async () => {
    if (!user?.uid) return;

    try {
      setTestLoading(true);
      console.log("Creating test notification for user:", user.uid);

      // Use sendNotificationToUser instead of addTestNotification to include WhatsApp and email
      await sendNotificationToUser(user.uid, {
        title: "Test Notification",
        message:
          testMessage ||
          "This is a test notification with multi-channel delivery options.",
        type: "test",
        sender: "System",
        whatsapp: sendWhatsApp,
        email: sendEmail,
      });

      console.log("Test notification created successfully");
      console.log("WhatsApp:", sendWhatsApp, "Email:", sendEmail);

      // Clear test message
      setTestMessage("");
    } catch (error) {
      console.error("Error creating test notification:", error);
    } finally {
      setTestLoading(false);
    }
  };

  const getNotificationTypeIcon = (type) => {
    const iconClass = "w-4 h-4";
    switch (type) {
      case "message":
        return <MessageCircle className={`${iconClass} text-blue-500`} />;
      case "order_update":
        return <Package className={`${iconClass} text-emerald-500`} />;
      case "promotion":
        return <Tag className={`${iconClass} text-purple-500`} />;
      case "system":
        return <Settings className={`${iconClass} text-slate-500`} />;
      case "follower":
        return <Users className={`${iconClass} text-orange-500`} />;
      case "test":
        return <Sparkles className={`${iconClass} text-pink-500`} />;
      default:
        return <Bell className={`${iconClass} text-slate-500`} />;
    }
  };

  const getNotificationTypeInfo = (type) => {
    switch (type) {
      case "message":
        return { color: "blue", bgColor: "bg-blue-50", borderColor: "border-blue-200", gradient: "from-blue-500/10 to-blue-600/5" };
      case "order_update":
        return { color: "emerald", bgColor: "bg-emerald-50", borderColor: "border-emerald-200", gradient: "from-emerald-500/10 to-emerald-600/5" };
      case "promotion":
        return { color: "purple", bgColor: "bg-purple-50", borderColor: "border-purple-200", gradient: "from-purple-500/10 to-purple-600/5" };
      case "system":
        return { color: "slate", bgColor: "bg-slate-50", borderColor: "border-slate-200", gradient: "from-slate-500/10 to-slate-600/5" };
      case "follower":
        return { color: "orange", bgColor: "bg-orange-50", borderColor: "border-orange-200", gradient: "from-orange-500/10 to-orange-600/5" };
      case "test":
        return { color: "pink", bgColor: "bg-pink-50", borderColor: "border-pink-200", gradient: "from-pink-500/10 to-pink-600/5" };
      default:
        return { color: "slate", bgColor: "bg-slate-50", borderColor: "border-slate-200", gradient: "from-slate-500/10 to-slate-600/5" };
    }
  };

  // Get unread notifications count
  const unreadCount = notifications.filter((notif) => !notif.isRead).length;
  
  // Filter notifications by type and search query
  let filteredNotifications = notifications;
  
  // Apply type filters
  if (filterTypes.length > 0) {
    filteredNotifications = filteredNotifications.filter(notif => 
      filterTypes.includes(notif.type)
    );
  }
  
  // Apply search filter
  if (searchQuery.trim()) {
    filteredNotifications = filteredNotifications.filter(notif =>
      notif.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      notif.message?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      notif.sender?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }

  // Get unique notification types for filter
  const notificationTypes = [...new Set(notifications.map(notif => notif.type))];

  // Handle filter type toggle
  const toggleFilterType = (type) => {
    setFilterTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  // Remove a specific filter
  const removeFilter = (type) => {
    setFilterTypes(prev => prev.filter(t => t !== type));
  };

  // Clear all filters
  const clearAllFilters = () => {
    setFilterTypes([]);
    setSearchQuery("");
  };

  if (loading) {
    return <NotificationsSkeleton />;
  }

  if (!user?.uid) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-slate-500">
        Sign in to view your notifications.
      </div>
    );
  }

  const renderNotificationList = (items) => {
    if (items.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-16 px-6">
          <div className="relative mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl flex items-center justify-center shadow-sm">
              <Bell className="w-10 h-10 text-slate-400" />
            </div>
            <div className="absolute -top-1 -right-1 w-6 h-6 bg-slate-200 rounded-full flex items-center justify-center">
              <Circle className="w-3 h-3 text-slate-500" />
            </div>
          </div>
          <h3 className="text-xl font-semibold text-slate-900 mb-2">
            {filterTypes.length === 0 && !searchQuery
              ? "No notifications yet"
              : "No notifications match your filters"}
          </h3>
          <p className="text-slate-500 text-center max-w-sm">
            {filterTypes.length === 0 && !searchQuery
              ? "When you receive notifications, they'll appear here with beautiful visual indicators"
              : "Try clearing filters or adjusting your search query"}
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {items.map((notification) => {
          const typeInfo = getNotificationTypeInfo(notification.type);
          return (
            <div
              key={notification.id}
              className={`group relative overflow-hidden rounded-2xl border transition-all duration-300 cursor-pointer hover:shadow-lg hover:-translate-y-1 ${
                notification.isRead
                  ? "bg-white border-slate-200 opacity-80 hover:opacity-100"
                  : `bg-gradient-to-br ${typeInfo.gradient} border-2 ${typeInfo.borderColor} shadow-sm hover:shadow-xl`
              }`}
              onClick={() =>
                !notification.isRead && handleMarkAsRead(notification.id)
              }
            >
              {/* Unread indicator line */}
              {!notification.isRead && (
                <div className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-${typeInfo.color}-500 to-${typeInfo.color}-600`} />
              )}
              
              <div className="p-6">
                <div className="flex items-start gap-4">
                  {/* Enhanced Icon */}
                  <div className={`relative p-3 rounded-xl ${
                    notification.isRead 
                      ? "bg-slate-100 shadow-sm" 
                      : `${typeInfo.bgColor} shadow-md ring-1 ring-white/50`
                  } flex-shrink-0 transition-all duration-300 group-hover:scale-110`}>
                    {getNotificationTypeIcon(notification.type)}
                    {!notification.isRead && (
                      <div className={`absolute -top-1 -right-1 w-3 h-3 bg-${typeInfo.color}-500 rounded-full ring-2 ring-white animate-pulse`} />
                    )}
                  </div>

                  {/* Enhanced Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <h4 className={`font-semibold text-slate-900 text-lg leading-tight ${
                          !notification.isRead ? "text-slate-900" : "text-slate-700"
                        }`}>
                          {notification.title || notification.type}
                        </h4>
                        {!notification.isRead && (
                          <Badge variant="secondary" className={`bg-${typeInfo.color}-100 text-${typeInfo.color}-700 border-${typeInfo.color}-200 text-xs font-medium`}>
                            New
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 text-slate-500">
                        <Clock className="w-3 h-3" />
                        <span className="text-sm font-medium whitespace-nowrap">
                          {notification.timestamp}
                        </span>
                      </div>
                    </div>

                    <p className={`text-slate-700 leading-relaxed mb-4 ${
                      notification.isRead ? "text-slate-600" : "text-slate-800"
                    }`}>
                      {notification.message}
                    </p>

                    {/* Enhanced Footer */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-500 font-medium">
                          From: <span className="text-slate-700">{notification.sender}</span>
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {notification.whatsapp && (
                          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg border border-emerald-200 shadow-sm">
                            <Smartphone className="w-3.5 h-3.5" />
                            <span className="text-xs font-semibold">WhatsApp</span>
                          </div>
                        )}
                        {notification.email && (
                          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg border border-blue-200 shadow-sm">
                            <Mail className="w-3.5 h-3.5" />
                            <span className="text-xs font-semibold">Email</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-8">
        {/* Enhanced Header */}
        <div className="mb-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg">
                <BellRing className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-slate-900 mb-2">
                  Notifications
                </h1>
                <p className="text-slate-600 text-lg">
                  Stay updated with your latest activities and messages
                </p>
              </div>
            </div>

            {unreadCount > 0 && (
              <Button
                variant="outline"
                onClick={handleMarkAllAsRead}
                disabled={markAllLoading}
                className="flex items-center gap-2 px-6 py-3 rounded-xl border-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300 transition-all duration-200 shadow-sm hover:shadow-md font-medium"
              >
                <CheckCheck className="w-4 h-4" />
                <span>
                  {markAllLoading ? "Marking..." : "Mark all as read"}
                </span>
              </Button>
            )}
          </div>

          {/* Enhanced Stats and Filters */}
          <div className="mt-8 space-y-4">
            {/* Stats Row */}
          {notifications.length > 0 && (
              <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-3 px-5 py-3 bg-white rounded-xl border border-slate-200 shadow-sm">
                <div className="p-2 bg-slate-100 rounded-lg">
                  <Bell className="w-4 h-4 text-slate-600" />
                </div>
                <span className="font-semibold text-slate-700">
                  {notifications.length} total notifications
                </span>
              </div>
              
              {unreadCount > 0 && (
                <div className="flex items-center gap-3 px-5 py-3 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl border border-blue-200 shadow-sm">
                  <div className="relative">
                    <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                    <div className="absolute inset-0 w-3 h-3 bg-blue-400 rounded-full animate-ping"></div>
                  </div>
                  <span className="font-semibold text-blue-700">
                    {unreadCount} unread
                  </span>
                </div>
              )}
            </div>
            )}

            {/* Search and Filter Row */}
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Search notifications..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 h-12 rounded-xl border-2 border-slate-200 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition-all duration-200"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-slate-100 rounded-full transition-colors"
                  >
                    <X className="w-4 h-4 text-slate-400" />
                  </button>
          )}
        </div>

              {/* Filter Dropdown */}
          {notificationTypes.length > 1 && (
                <div className="relative" ref={dropdownRef}>
                  <Button
                    variant="outline"
                    onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                    className="flex items-center gap-2 h-12 px-4 rounded-xl border-2 border-slate-200 hover:bg-slate-50 transition-all duration-200"
                  >
                    <Filter className="w-4 h-4" />
                    <span>Filter by type</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${showFilterDropdown ? 'rotate-180' : ''}`} />
                  </Button>
                  
                  {showFilterDropdown && (
                    <div className="absolute top-full mt-2 right-0 w-56 bg-white rounded-xl border border-slate-200 shadow-lg z-10 py-2">
                  {notificationTypes.map((type) => {
                    const count = notifications.filter(n => n.type === type).length;
                        const isSelected = filterTypes.includes(type);
                    return (
                          <button
                        key={type}
                            onClick={() => toggleFilterType(type)}
                            className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors ${
                              isSelected ? 'bg-blue-50 text-blue-700' : 'text-slate-700'
                            }`}
                          >
                            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                              isSelected 
                                ? 'bg-blue-500 border-blue-500' 
                                : 'border-slate-300'
                            }`}>
                              {isSelected && <span className="w-2 h-2 bg-white rounded-sm" />}
                            </div>
                        {getNotificationTypeIcon(type)}
                            <span className="capitalize flex-1">{type.replace("_", " ")}</span>
                            <span className="text-sm text-slate-500">({count})</span>
                          </button>
                    );
                  })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Active Filters */}
            {(filterTypes.length > 0 || searchQuery) && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-slate-600">Active filters:</span>
                
                {searchQuery && (
                  <Badge variant="secondary" className="flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 border border-blue-200">
                    <Search className="w-3 h-3" />
                    <span>"{searchQuery}"</span>
                    <button
                      onClick={() => setSearchQuery("")}
                      className="ml-1 hover:bg-blue-200 rounded-full p-0.5 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                )}
                
                {filterTypes.map((type) => (
                  <Badge key={type} variant="secondary" className="flex items-center gap-1 px-3 py-1 bg-slate-100 text-slate-700 border border-slate-200">
                    {getNotificationTypeIcon(type)}
                    <span className="capitalize">{type.replace("_", " ")}</span>
                    <button
                      onClick={() => removeFilter(type)}
                      className="ml-1 hover:bg-slate-200 rounded-full p-0.5 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllFilters}
                  className="text-slate-500 hover:text-slate-700 px-2 py-1 h-auto"
                >
                  Clear all
                </Button>
            </div>
          )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8">
          {/* Enhanced Filters Sidebar - Removed */}

          {/* Main Content */}
          <div className="col-span-1">
            <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm overflow-hidden">
              <div className="p-8">
                <Tabs defaultValue="all" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 bg-slate-100 rounded-xl p-1 mb-8 h-12">
                    <TabsTrigger 
                      value="all" 
                      className="rounded-lg font-semibold text-slate-700 data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-slate-900 transition-all duration-200 h-10"
                    >
                      All Notifications ({filteredNotifications.length})
                    </TabsTrigger>
                    <TabsTrigger 
                      value="unread" 
                      className="rounded-lg font-semibold text-slate-700 data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-slate-900 transition-all duration-200 h-10"
                    >
                      Unread ({filteredNotifications.filter(n => !n.isRead).length})
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="all" className="mt-0">
                    {renderNotificationList(filteredNotifications)}
                  </TabsContent>
                  
                  <TabsContent value="unread" className="mt-0">
                    {renderNotificationList(
                      filteredNotifications.filter((notif) => !notif.isRead)
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            </Card>

            {/* Enhanced Test Notification Section */}
            <Card className="mt-8 border-0 shadow-lg bg-gradient-to-br from-purple-50/50 to-pink-50/50 backdrop-blur-sm overflow-hidden">
              <div className="p-8">
                <div className="flex items-center gap-4 mb-6">
                  <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl shadow-lg">
                    <Zap className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">Test Notification</h3>
                    <p className="text-slate-600">Send a test notification to verify your settings and channels</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="relative">
                    <Input
                      type="text"
                      placeholder="Enter your test message..."
                      value={testMessage}
                      onChange={(e) => setTestMessage(e.target.value)}
                      className="h-12 pl-4 pr-4 rounded-xl border-2 border-slate-200 focus:border-purple-400 focus:ring-4 focus:ring-purple-100 transition-all duration-200 text-base"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-6">
                    <div className="flex items-center gap-8">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          id="send-whatsapp"
                          checked={sendWhatsApp}
                          onCheckedChange={setSendWhatsApp}
                          className="w-5 h-5 rounded border-2 border-slate-300 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500 transition-colors"
                        />
                        <Label htmlFor="send-whatsapp" className="flex items-center gap-2 cursor-pointer">
                          <Smartphone className="w-5 h-5 text-emerald-600" />
                          <span className="font-semibold text-slate-700">WhatsApp</span>
                        </Label>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <Checkbox
                          id="send-email"
                          checked={sendEmail}
                          onCheckedChange={setSendEmail}
                          className="w-5 h-5 rounded border-2 border-slate-300 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500 transition-colors"
                        />
                        <Label htmlFor="send-email" className="flex items-center gap-2 cursor-pointer">
                          <Mail className="w-5 h-5 text-blue-600" />
                          <span className="font-semibold text-slate-700">Email</span>
                        </Label>
                      </div>
                    </div>

                    <Button
                      onClick={handleTestNotification}
                      disabled={testLoading}
                      className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl font-semibold transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-60 transform hover:scale-105"
                    >
                      <Send className="w-4 h-4" />
                      <span>
                        {testLoading ? "Sending..." : "Send Test"}
                      </span>
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}