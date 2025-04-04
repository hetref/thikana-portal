"use client";
import { useState } from "react";
import { useEffect } from "react";
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
  CreditCard,
  ClockIcon,
  SettingsIcon,
  BarChart,
  Package,
  ShoppingBag,
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
import ContactsTab from "@/components/dashboard/ContactsTab";
import PaymentsTab from "@/components/dashboard/PaymentsTab";
import PlansTab from "@/components/dashboard/PlansTab";
import SettingsTab from "@/components/dashboard/SettingsTab";
import ExpenseTab from "@/components/dashboard/ExpenseTab";
import AnalyticsTab from "@/components/dashboard/AnalyticsTab";
import IncomeTab from "@/components/dashboard/IncomeTab";
import IncomeAnalyticsTab from "@/components/dashboard/IncomeAnalyticsTab";
import TicketsTab from "@/components/dashboard/TicketsTab";
import OrdersTab from "@/components/dashboard/OrdersTab";
import MembersTab from "@/components/dashboard/MembersTab";

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState("tickets");
  const [activeTransactionTab, setActiveTransactionTab] = useState("expenses");
  const [activeAnalyticsTab, setActiveAnalyticsTab] =
    useState("expense-analytics");
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);
  const [userRole, setUserRole] = useState(null);

  // Fetch business user data
  useEffect(() => {
    const fetchUserData = async () => {
      const user = auth.currentUser;
      if (!user) return;

      try {
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const data = userDoc.data();
          setUserData(data);
          setUserRole(data.role || "owner");

          // If user is a member, get the business data for display
          if (data.role === "member" && data.businessId) {
            const businessRef = doc(db, "users", data.businessId);
            const businessDoc = await getDoc(businessRef);
            if (businessDoc.exists()) {
              // Set business name for display but keep member role
              setUserData((prev) => ({
                ...prev,
                businessName: businessDoc.data().businessName || "Business",
              }));
            }
          }
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  // Handle tab selection according to user role
  const handleTabChange = (value) => {
    // If user is a member, don't allow access to the members tab
    if (
      userRole === "member" &&
      (value === "members" || value === "settings")
    ) {
      toast.error("You don't have permission to access this section");
      return;
    }
    setActiveTab(value);
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
                Manage your business inquiries, payments and subscription plans
              </p>
            </div>

            <Tabs value={activeTab} onValueChange={handleTabChange}>
              <div className="flex justify-between items-center mb-6">
                <TabsList className="grid grid-cols-3 lg:grid-cols-7 mb-3">
                  <TabsTrigger
                    value="contacts"
                    className="flex items-center gap-2"
                  >
                    <MessageSquare className="h-4 w-4" />
                    Contacts
                  </TabsTrigger>
                  <TabsTrigger
                    value="tickets"
                    className="flex items-center gap-2"
                  >
                    <Inbox className="h-4 w-4" />
                    Tickets
                  </TabsTrigger>
                  <TabsTrigger
                    value="payments"
                    className="flex items-center gap-2"
                  >
                    <CreditCard className="h-4 w-4" />
                    Payments
                  </TabsTrigger>
                  <TabsTrigger
                    value="plans"
                    className="flex items-center gap-2"
                  >
                    <ClockIcon className="h-4 w-4" />
                    Plans
                  </TabsTrigger>
                  <TabsTrigger
                    value="transactions"
                    className="flex items-center gap-2"
                  >
                    <CreditCard className="h-4 w-4" />
                    Transactions
                  </TabsTrigger>
                  <TabsTrigger
                    value="orders"
                    className="flex items-center gap-2"
                  >
                    <ShoppingBag className="h-4 w-4" />
                    Orders
                  </TabsTrigger>
                  <TabsTrigger
                    value="analytics"
                    className="flex items-center gap-2"
                  >
                    <BarChart className="h-4 w-4" />
                    Analytics
                  </TabsTrigger>
                  <TabsTrigger
                    value="members"
                    className="flex items-center gap-2"
                    disabled={userRole === "member"}
                  >
                    <User className="h-4 w-4" />
                    Members
                  </TabsTrigger>
                  <TabsTrigger
                    value="settings"
                    className="flex items-center gap-2"
                    disabled={userRole === "member"}
                  >
                    <SettingsIcon className="h-4 w-4" />
                    Settings
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="contacts" className="space-y-4">
                <ContactsTab />
              </TabsContent>

              <TabsContent value="tickets" className="space-y-4">
                <TicketsTab />
              </TabsContent>

              <TabsContent value="payments" className="space-y-4">
                <PaymentsTab />
              </TabsContent>

              <TabsContent value="plans" className="space-y-4">
                <PlansTab />
              </TabsContent>

              <TabsContent value="transactions" className="space-y-4">
                <Tabs
                  value={activeTransactionTab}
                  onValueChange={setActiveTransactionTab}
                >
                  <TabsList className="w-full mb-6">
                    <TabsTrigger value="expenses" className="flex-1">
                      Expenses
                    </TabsTrigger>
                    <TabsTrigger value="income" className="flex-1">
                      Income
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="expenses">
                    <ExpenseTab />
                  </TabsContent>

                  <TabsContent value="income">
                    <IncomeTab />
                  </TabsContent>
                </Tabs>
              </TabsContent>

              <TabsContent value="orders" className="space-y-4">
                <OrdersTab />
              </TabsContent>

              <TabsContent value="analytics" className="space-y-4">
                <Tabs
                  value={activeAnalyticsTab}
                  onValueChange={setActiveAnalyticsTab}
                >
                  <TabsList className="w-full mb-6">
                    <TabsTrigger value="expense-analytics" className="flex-1">
                      Expense Analytics
                    </TabsTrigger>
                    <TabsTrigger value="income-analytics" className="flex-1">
                      Income Analytics
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="expense-analytics">
                    <AnalyticsTab />
                  </TabsContent>

                  <TabsContent value="income-analytics">
                    <IncomeAnalyticsTab />
                  </TabsContent>
                </Tabs>
              </TabsContent>

              <TabsContent value="members" className="space-y-4">
                <MembersTab />
              </TabsContent>

              <TabsContent value="settings" className="space-y-4">
                <SettingsTab />
              </TabsContent>
            </Tabs>
          </main>
        </div>
      </div>
    </div>
  );
}
