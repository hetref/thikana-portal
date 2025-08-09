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
        return "💬";
      case "order_update":
        return "📦";
      case "promotion":
        return "🏷️";
      case "system":
        return "⚙️";
      case "follower":
        return "👥";
      case "appointment-reminder":
        return "⏰";
      default:
        return "🔔";
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
        <div className="text-center py-8 text-muted-foreground">
          No notifications to display
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {items.map((notification) => (
          <Card
            key={notification.id}
            className={`cursor-pointer hover:bg-accent/50 transition-colors ${
              notification.isRead
                ? "opacity-70"
                : "bg-accent/10 border-primary/20"
            }`}
            onClick={() =>
              !notification.isRead && handleMarkAsRead(notification.id)
            }
          >
            <CardContent className="p-4">
              <div className="flex-1">
                <div className="flex justify-between items-center mb-1">
                  <div className="font-semibold flex items-center gap-2">
                    <span className="mr-1">
                      {getNotificationTypeIcon(notification.type)}
                    </span>
                    {notification.title || notification.type}
                    {!notification.isRead && (
                      <Badge variant="default" className="text-xs">
                        New
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {notification.timestamp}
                  </div>
                </div>
                <p className="text-sm">{notification.message}</p>
                <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                  <span>From: {notification.sender}</span>
                  {notification.whatsapp && (
                    <Badge variant="outline" className="text-xs">
                      WhatsApp
                    </Badge>
                  )}
                  {notification.email && (
                    <Badge variant="outline" className="text-xs">
                      Email
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-2xl font-bold">Notifications</CardTitle>
              <CardDescription>Stay updated with your latest activities</CardDescription>
            </div>
            {unreadCount > 0 && (
              <Button
                variant="outline"
                onClick={handleMarkAllAsRead}
                disabled={markAllLoading}
                size="sm"
              >
                {markAllLoading ? "Marking..." : "Mark all as read"}
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
