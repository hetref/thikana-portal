"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
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
} from "lucide-react";

export default function NotificationsClient() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [testLoading, setTestLoading] = useState(false);
  const [markAllLoading, setMarkAllLoading] = useState(false);
  const [sendWhatsApp, setSendWhatsApp] = useState(false);
  const [sendEmail, setSendEmail] = useState(false);
  const [testMessage, setTestMessage] = useState("");
  const { user } = useAuth();

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
    switch (type) {
      case "message":
        return <MessageCircle className="w-4 h-4 text-blue-600" />;
      case "order_update":
        return <Package className="w-4 h-4 text-green-600" />;
      case "promotion":
        return <Tag className="w-4 h-4 text-purple-600" />;
      case "system":
        return <Settings className="w-4 h-4 text-gray-600" />;
      case "follower":
        return <Users className="w-4 h-4 text-orange-600" />;
      case "test":
        return <Sparkles className="w-4 h-4 text-pink-600" />;
      default:
        return <Bell className="w-4 h-4 text-gray-600" />;
    }
  };

  const getNotificationBgColor = (type) => {
    switch (type) {
      case "message":
        return "bg-blue-50 border-blue-100";
      case "order_update":
        return "bg-green-50 border-green-100";
      case "promotion":
        return "bg-purple-50 border-purple-100";
      case "system":
        return "bg-gray-50 border-gray-100";
      case "follower":
        return "bg-orange-50 border-orange-100";
      case "test":
        return "bg-pink-50 border-pink-100";
      default:
        return "bg-gray-50 border-gray-100";
    }
  };

  // Get unread notifications count
  const unreadCount = notifications.filter((notif) => !notif.isRead).length;

  if (loading) {
    return <NotificationsSkeleton />;
  }

  const renderNotificationList = (items) => {
    if (items.length === 0) {
      return (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <Bell className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No notifications yet
          </h3>
          <p className="text-gray-500">
            When you receive notifications, they'll appear here
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {items.map((notification) => (
          <div
            key={notification.id}
            className={`group relative rounded-xl border transition-all duration-200 cursor-pointer hover:shadow-md ${
              notification.isRead
                ? "bg-white border-gray-100 opacity-75"
                : `${getNotificationBgColor(notification.type)} shadow-sm hover:shadow-lg`
            }`}
            onClick={() =>
              !notification.isRead && handleMarkAsRead(notification.id)
            }
          >
            <div className="p-5">
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className={`p-2.5 rounded-lg ${
                  notification.isRead ? "bg-gray-100" : "bg-white/80"
                } flex-shrink-0`}>
                  {getNotificationTypeIcon(notification.type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h4 className="font-semibold text-gray-900 text-base leading-tight">
                      {notification.title || notification.type}
                    </h4>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {!notification.isRead && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      )}
                      <span className="text-xs text-gray-500 font-medium">
                        {notification.timestamp}
                      </span>
                    </div>
                  </div>

                  <p className="text-gray-700 text-sm leading-relaxed mb-3">
                    {notification.message}
                  </p>

                  {/* Footer */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">
                        From: {notification.sender}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {notification.whatsapp && (
                        <div className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-md">
                          <Smartphone className="w-3 h-3" />
                          <span className="text-xs font-medium">WhatsApp</span>
                        </div>
                      )}
                      {notification.email && (
                        <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-md">
                          <Mail className="w-3 h-3" />
                          <span className="text-xs font-medium">Email</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50/30">
      <div className="px-6 md:px-10 py-8 w-full">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-xl">
                  <BellRing className="w-6 h-6 text-blue-600" />
                </div>
                Notifications
              </h1>
              <p className="text-gray-600">
                Stay updated with your latest activities and messages
              </p>
            </div>

            {unreadCount > 0 && (
              <Button
                variant="outline"
                onClick={handleMarkAllAsRead}
                disabled={markAllLoading}
                className="flex items-center gap-2 px-6 py-3 rounded-xl border-2 hover:bg-green-50 hover:border-green-200 transition-all duration-200"
              >
                <CheckCheck className="w-4 h-4" />
                <span className="font-medium">
                  {markAllLoading ? "Marking..." : "Mark all as read"}
                </span>
              </Button>
            )}
          </div>

          {/* Stats */}
          {notifications.length > 0 && (
            <div className="flex items-center gap-6 mt-6">
              <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg border border-gray-200 shadow-sm">
                <Bell className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">
                  {notifications.length} total
                </span>
              </div>
              {unreadCount > 0 && (
                <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-blue-700">
                    {unreadCount} unread
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6">
            <Tabs defaultValue="all" className="w-full">
              <TabsList className="flex w-full bg-gray-100 rounded-xl p-1 mb-6 gap-1">
                <TabsTrigger 
                  value="all" 
                  className="rounded-lg font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all duration-200"
                >
                  All Notifications ({notifications.length})
                </TabsTrigger>
                <TabsTrigger 
                  value="unread" 
                  className="rounded-lg font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all duration-200"
                >
                  Unread ({unreadCount})
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="all" className="mt-0">
                {renderNotificationList(notifications)}
              </TabsContent>
              
              <TabsContent value="unread" className="mt-0">
                {renderNotificationList(
                  notifications.filter((notif) => !notif.isRead)
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* Test Notification Section */}
          <div className="border-t border-gray-100 bg-gray-50/50">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Test Notification</h3>
                  <p className="text-sm text-gray-600">Send a test notification to verify your settings</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="relative">
                  <Input
                    type="text"
                    placeholder="Enter your test message..."
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                    className="pl-4 pr-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                  />
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        id="send-whatsapp"
                        checked={sendWhatsApp}
                        onCheckedChange={setSendWhatsApp}
                        className="w-5 h-5 rounded border-2 border-gray-300 data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                      />
                      <Label htmlFor="send-whatsapp" className="flex items-center gap-2 cursor-pointer">
                        <Smartphone className="w-4 h-4 text-green-600" />
                        <span className="font-medium text-gray-700">WhatsApp</span>
                      </Label>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <Checkbox
                        id="send-email"
                        checked={sendEmail}
                        onCheckedChange={setSendEmail}
                        className="w-5 h-5 rounded border-2 border-gray-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                      />
                      <Label htmlFor="send-email" className="flex items-center gap-2 cursor-pointer">
                        <Mail className="w-4 h-4 text-blue-600" />
                        <span className="font-medium text-gray-700">Email</span>
                      </Label>
                    </div>
                  </div>

                  <Button
                    onClick={handleTestNotification}
                    disabled={testLoading}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-medium transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-60"
                  >
                    <Send className="w-4 h-4" />
                    <span>
                      {testLoading ? "Sending..." : "Send Test"}
                    </span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}