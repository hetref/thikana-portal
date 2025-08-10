"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { auth } from "@/lib/firebase";
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
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
  const unsubscribeRef = useRef(() => {});

  useEffect(() => {
    // Clean up any previous listener
    if (unsubscribeRef.current) {
      try { unsubscribeRef.current(); } catch {}
    }

    setLoading(true);

    // Prefer context user if available
    if (user?.uid) {
      const unsubscribe = getNotifications((newNotifications) => {
        setNotifications(newNotifications);
        setLoading(false);
      }, user.uid);
      unsubscribeRef.current = unsubscribe;
      return () => {
        try { unsubscribe(); } catch {}
      };
    }

    // Fallback to Firebase auth if no provider or user not yet in context
    const off = auth.onAuthStateChanged((authUser) => {
      if (authUser?.uid) {
        const unsubscribe = getNotifications((newNotifications) => {
          setNotifications(newNotifications);
          setLoading(false);
        }, authUser.uid);
        unsubscribeRef.current = unsubscribe;
      } else {
        setNotifications([]);
        setLoading(false);
      }
    });

    return () => {
      try { off(); } catch {}
      if (unsubscribeRef.current) {
        try { unsubscribeRef.current(); } catch {}
      }
    };
  }, [user?.uid]);

  const handleMarkAsRead = async (notificationId) => {
    const uid = user?.uid || auth.currentUser?.uid;
    if (!uid) return;

    await markNotificationAsRead(uid, notificationId);

    // Optimistic UI
    setNotifications((prev) =>
      prev.map((notif) =>
        notif.id === notificationId ? { ...notif, isRead: true } : notif
      )
    );
  };

  const handleMarkAllAsRead = async () => {
    const uid = user?.uid || auth.currentUser?.uid;
    if (!uid) return;
    try {
      setMarkAllLoading(true);
      await markAllNotificationsAsRead(uid);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } finally {
      setMarkAllLoading(false);
    }
  };

  const handleTestNotification = async () => {
    const uid = user?.uid || auth.currentUser?.uid;
    if (!uid) return;
    try {
      setTestLoading(true);
      await sendNotificationToUser(uid, {
        title: "Test Notification",
        message:
          testMessage ||
          "This is a test notification with multi-channel delivery options.",
        type: "test",
        sender: "System",
        whatsapp: sendWhatsApp,
        email: sendEmail,
      });
      setTestMessage("");
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
      case "appointment-reminder":
        return "⏰";
      default:
        return "bg-gray-50 border-gray-100";
    }
  };

  const unreadCount = notifications.filter((notif) => !notif.isRead).length;

  if (loading) {
    return <NotificationsSkeleton />;
  }

  // If not logged-in
  if (!user?.uid && !auth.currentUser?.uid) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        Please sign in to view notifications.
      </div>
    );
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
              <CardTitle className="text-2xl font-bold">Notifications</CardTitle>
              <CardDescription>Stay updated with your latest activities</CardDescription>
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
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" className="mb-4">
            <TabsList className="w-full">
              <TabsTrigger value="all" className="flex-1">
                All ({notifications.length})
              </TabsTrigger>
              <TabsTrigger value="unread" className="flex-1">
                Unread ({unreadCount})
              </TabsTrigger>
            </TabsList>
            <TabsContent value="all" className="mt-4">
              {renderNotificationList(notifications)}
            </TabsContent>
            <TabsContent value="unread" className="mt-4">
              {renderNotificationList(
                notifications.filter((notif) => !notif.isRead)
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="flex-col space-y-4">
          <Input
            type="text"
            placeholder="Enter test notification message"
            value={testMessage}
            onChange={(e) => setTestMessage(e.target.value)}
          />
          <div className="flex items-center space-x-6 w-full">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="send-whatsapp"
                checked={sendWhatsApp}
                onCheckedChange={setSendWhatsApp}
              />
              <Label htmlFor="send-whatsapp">WhatsApp</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="send-email"
                checked={sendEmail}
                onCheckedChange={setSendEmail}
              />
              <Label htmlFor="send-email">Email</Label>
            </div>
          </div>
          <Button
            onClick={handleTestNotification}
            disabled={testLoading}
            className="w-full"
            variant="outline"
          >
            {testLoading ? "Creating Test Notification..." : "Create Test Notification"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}