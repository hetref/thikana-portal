'use client'
import { useState, useEffect } from 'react'
import { Mail, X, PlusCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { ScrollArea } from './ui/scroll-area'
import { Button } from "./ui/button"
import { Textarea } from "./ui/textarea"
import { Input } from "./ui/input"
import { Select, SelectItem, SelectTrigger, SelectValue, SelectContent } from "./ui/select"
import { getNotifications, addNotification, verifyUserNotifications, checkNotificationsStructure, addTestNotification, getUserNotifications } from "@/lib/notifications"
import { useAuth } from "@/lib/auth" // Assuming you have an auth context

export default function NotificationsList() {
  const [notifications, setNotifications] = useState([])
  const [isComposeOpen, setIsComposeOpen] = useState(false)
  const [newNotification, setNewNotification] = useState({
    title: "",
    type: "",
    to: ""
  })
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let unsubscribe = () => {};

    const initializeNotifications = async () => {
      if (!user?.uid) {
        console.log("No user logged in");
        return;
      }

      console.log("Initializing notifications for user:", user.uid);
      
      // Add these lines to debug
      await checkNotificationsStructure(user.uid);
      
      // Uncomment this to add a test notification
      // await addTestNotification(user.uid);

      try {
        unsubscribe = getNotifications((notifications) => {
          console.log("Notifications callback received:", notifications);
          setNotifications(notifications);
        }, user.uid);
      } catch (error) {
        console.error("Error initializing notifications:", error);
      }
    };

    initializeNotifications();

    return () => {
      console.log("Cleaning up notifications listener");
      unsubscribe();
    };
  }, [user]);

  useEffect(() => {
    const fetchNotifications = async () => {
      if (user) {
        try {
          const userNotifications = await getUserNotifications(user.uid);
          setNotifications(userNotifications);
        } catch (error) {
          console.error("Failed to fetch notifications:", error);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchNotifications();
  }, [user]);

  // Add this console log to verify the state updates
  useEffect(() => {
    console.log("Notifications state updated:", notifications);
  }, [notifications]);

  const handleInputChange = (e) => {
    setNewNotification({ ...newNotification, [e.target.name]: e.target.value })
  }

  const addNewNotification = async () => {
    if (!newNotification.title || !newNotification.type || !newNotification.to) {
      console.log("Missing required fields");
      return;
    }

    try {
      console.log("Adding new notification:", newNotification);
      const notificationId = await addNotification({
        ...newNotification,
        sender: user?.displayName || "Admin",
      });
      
      console.log("Notification added successfully with ID:", notificationId);
      setIsComposeOpen(false);
      setNewNotification({ title: "", type: "", to: "" });
    } catch (error) {
      console.error("Error adding notification:", error);
      // Add error handling UI here
    }
  }

  return (
    <>
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-2xl">Notifications ({notifications.length})</CardTitle>
          <div className="flex gap-2">
            {/* Add a test button */}
            <Button 
              variant="outline" 
              onClick={() => user?.uid && addTestNotification(user.uid)}
            >
              Add Test
            </Button>
            <Button 
              variant="default" 
              className="flex items-center gap-2" 
              onClick={() => setIsComposeOpen(true)}
            >
              <PlusCircle className="h-4 w-4" />
              New Notification
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[calc(100vh-12rem)] md:h-[calc(100vh-14rem)]">
            <div className="space-y-4">
              {notifications.map((notification) => (
                <Card key={notification.id} className="hover:bg-accent cursor-pointer">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <img 
                        src={notification.profileImage} 
                        alt={notification.sender}
                        className="w-12 h-12 rounded-full"
                      />
                      <div className="flex-1">
                        <h3 className="font-medium">{notification.title}</h3>
                        <p className="text-sm text-muted-foreground">From: {notification.sender}</p>
                        <div className="mt-2 flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-1 text-xs rounded-full bg-blue-800 text-blue-100">
                            {notification.type}
                          </span>
                          <span className="text-xs text-muted-foreground">{notification.timestamp}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {isComposeOpen && (
        <Card className="fixed bottom-4 right-4 sm:max-w-[500px] w-[90%] shadow-lg z-20">
          <CardHeader className="px-4 py-2 flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Create Notification</CardTitle>
            <Button variant="ghost" size="icon" onClick={() => setIsComposeOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <Input 
              type="text" 
              placeholder="Notification Title" 
              name="title"
              value={newNotification.title} 
              onChange={handleInputChange} 
              className="border rounded-lg px-3 py-2 w-full"
            />
            <Select name="type" onValueChange={(value) => handleInputChange({ target: { name: 'type', value }})}>
              <SelectTrigger>
                <SelectValue placeholder="Select Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="announcement">Announcement</SelectItem>
                <SelectItem value="alert">Alert</SelectItem>
                <SelectItem value="message">Message</SelectItem>
              </SelectContent>
            </Select>
            <Select name="to" onValueChange={(value) => handleInputChange({ target: { name: 'to', value }})}>
              <SelectTrigger>
                <SelectValue placeholder="Send To" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="users">Users</SelectItem>
                <SelectItem value="business">Businesses</SelectItem>
                <SelectItem value="everyone">Everyone</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex justify-between items-center pt-4">
              <Button onClick={addNewNotification}>Send</Button>
              <Button variant="ghost" onClick={() => setIsComposeOpen(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  )
}
