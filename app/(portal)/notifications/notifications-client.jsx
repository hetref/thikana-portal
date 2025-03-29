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
        return "💬";
      case "order_update":
        return "📦";
      case "promotion":
        return "🏷️";
      case "system":
        return "⚙️";
      default:
        return "🔔";
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
              <CardTitle className="text-2xl font-bold">
                Notifications
              </CardTitle>
              <CardDescription>
                Stay updated with your latest activities
              </CardDescription>
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
            {testLoading
              ? "Creating Test Notification..."
              : "Create Test Notification"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
