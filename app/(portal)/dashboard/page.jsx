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
  Menu,
  Sparkles,
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
import Loader from "@/components/Loader";
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
import AppointmentsTab from "@/components/dashboard/AppointmentsTab";

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState("tickets");
  const [activeTransactionTab, setActiveTransactionTab] = useState("expenses");
  const [activeAnalyticsTab, setActiveAnalyticsTab] =
    useState("expense-analytics");
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <Loader/>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-[1800px] mx-auto py-6 sm:py-10 px-4 sm:px-6">
        <div className="flex flex-col lg:flex-row gap-4 sm:gap-8">
          {/* Left Sidebar */}
          <aside className="hidden lg:block w-[400px] shrink-0">
            <div className="sticky top-6">
              <Sidebar />
            </div>
          </aside>

          {/* Main content */}
          <main className="flex-1 space-y-6 sm:space-y-8">
            {/* Header Section */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 via-purple-600/10 to-indigo-600/20 rounded-2xl blur-3xl -z-10" />
              <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
                <CardContent className="p-6 sm:p-8">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl">
                      <Sparkles className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 bg-clip-text text-transparent">
                        Welcome back, {userData?.businessName || "Business Owner"}
                      </h1>
                      <p className="text-gray-600 mt-1 text-sm sm:text-base">
                        Manage your business with powerful insights and tools
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Tabs value={activeTab} onValueChange={handleTabChange}>
              {/* Desktop Tabs List */}
              <div className="hidden md:block mb-8">
                <Card className="border-0 shadow-lg bg-white/90 backdrop-blur-sm">
                  <CardContent className="p-2">
                    <TabsList className="grid grid-cols-5 lg:grid-cols-10 w-full bg-transparent gap-1 p-1">
                      <TabsTrigger
                        value="contacts"
                        className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white transition-all duration-300 hover:scale-105 rounded-xl"
                      >
                        <MessageSquare className="h-4 w-4" />
                        <span className="hidden lg:inline">Contacts</span>
                      </TabsTrigger>
                      <TabsTrigger
                        value="tickets"
                        className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white transition-all duration-300 hover:scale-105 rounded-xl"
                      >
                        <Inbox className="h-4 w-4" />
                        <span className="hidden lg:inline">Tickets</span>
                      </TabsTrigger>
                      <TabsTrigger
                        value="payments"
                        className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white transition-all duration-300 hover:scale-105 rounded-xl"
                      >
                        <CreditCard className="h-4 w-4" />
                        <span className="hidden lg:inline">Payments</span>
                      </TabsTrigger>
                      <TabsTrigger
                        value="plans"
                        className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white transition-all duration-300 hover:scale-105 rounded-xl"
                      >
                        <ClockIcon className="h-4 w-4" />
                        <span className="hidden lg:inline">Plans</span>
                      </TabsTrigger>
                      <TabsTrigger
                        value="transactions"
                        className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white transition-all duration-300 hover:scale-105 rounded-xl"
                      >
                        <CreditCard className="h-4 w-4" />
                        <span className="hidden lg:inline">Transactions</span>
                      </TabsTrigger>
                      <TabsTrigger
                        value="orders"
                        className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white transition-all duration-300 hover:scale-105 rounded-xl"
                      >
                        <ShoppingBag className="h-4 w-4" />
                        <span className="hidden lg:inline">Orders</span>
                      </TabsTrigger>
                      <TabsTrigger
                        value="analytics"
                        className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white transition-all duration-300 hover:scale-105 rounded-xl"
                      >
                        <BarChart className="h-4 w-4" />
                        <span className="hidden lg:inline">Analytics</span>
                      </TabsTrigger>
                      <TabsTrigger
                        value="appointments"
                        className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white transition-all duration-300 hover:scale-105 rounded-xl"
                      >
                        <Calendar className="h-4 w-4" />
                        <span className="hidden lg:inline">Appointments</span>
                      </TabsTrigger>
                      <TabsTrigger
                        value="members"
                        className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white transition-all duration-300 hover:scale-105 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={userRole === "member"}
                      >
                        <User className="h-4 w-4" />
                        <span className="hidden lg:inline">Members</span>
                      </TabsTrigger>
                      <TabsTrigger
                        value="settings"
                        className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white transition-all duration-300 hover:scale-105 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={userRole === "member"}
                      >
                        <SettingsIcon className="h-4 w-4" />
                        <span className="hidden lg:inline">Settings</span>
                      </TabsTrigger>
                    </TabsList>
                  </CardContent>
                </Card>
              </div>

              {/* Mobile Scrollable Tabs */}
              <div className="md:hidden mb-6">
                <Card className="border-0 shadow-lg bg-white/90 backdrop-blur-sm">
                  <CardContent className="p-2">
                    <div className="overflow-x-auto scrollbar-hide">
                      <TabsList className="inline-flex w-max min-w-full bg-transparent gap-1 p-1">
                        <TabsTrigger
                          value="contacts"
                          className="flex items-center gap-2 whitespace-nowrap px-4 py-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white transition-all duration-300 rounded-lg"
                        >
                          <MessageSquare className="h-4 w-4" />
                          <span className="text-sm">Contacts</span>
                        </TabsTrigger>
                        <TabsTrigger
                          value="tickets"
                          className="flex items-center gap-2 whitespace-nowrap px-4 py-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white transition-all duration-300 rounded-lg"
                        >
                          <Inbox className="h-4 w-4" />
                          <span className="text-sm">Tickets</span>
                        </TabsTrigger>
                        <TabsTrigger
                          value="payments"
                          className="flex items-center gap-2 whitespace-nowrap px-4 py-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white transition-all duration-300 rounded-lg"
                        >
                          <CreditCard className="h-4 w-4" />
                          <span className="text-sm">Payments</span>
                        </TabsTrigger>
                        <TabsTrigger
                          value="plans"
                          className="flex items-center gap-2 whitespace-nowrap px-4 py-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white transition-all duration-300 rounded-lg"
                        >
                          <ClockIcon className="h-4 w-4" />
                          <span className="text-sm">Plans</span>
                        </TabsTrigger>
                        <TabsTrigger
                          value="transactions"
                          className="flex items-center gap-2 whitespace-nowrap px-4 py-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white transition-all duration-300 rounded-lg"
                        >
                          <CreditCard className="h-4 w-4" />
                          <span className="text-sm">Transactions</span>
                        </TabsTrigger>
                        <TabsTrigger
                          value="orders"
                          className="flex items-center gap-2 whitespace-nowrap px-4 py-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white transition-all duration-300 rounded-lg"
                        >
                          <ShoppingBag className="h-4 w-4" />
                          <span className="text-sm">Orders</span>
                        </TabsTrigger>
                        <TabsTrigger
                          value="analytics"
                          className="flex items-center gap-2 whitespace-nowrap px-4 py-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white transition-all duration-300 rounded-lg"
                        >
                          <BarChart className="h-4 w-4" />
                          <span className="text-sm">Analytics</span>
                        </TabsTrigger>
                        <TabsTrigger
                          value="appointments"
                          className="flex items-center gap-2 whitespace-nowrap px-4 py-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white transition-all duration-300 rounded-lg"
                        >
                          <Calendar className="h-4 w-4" />
                          <span className="text-sm">Appointments</span>
                        </TabsTrigger>
                        <TabsTrigger
                          value="settings"
                          className="flex items-center gap-2 whitespace-nowrap px-4 py-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white transition-all duration-300 rounded-lg"
                        >
                          <SettingsIcon className="h-4 w-4" />
                          <span className="text-sm">Settings</span>
                        </TabsTrigger>
                      </TabsList>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Tab Content */}
              <div className="space-y-6">
                <TabsContent value="contacts" className="space-y-6 mt-0">
                  <ContactsTab />
                </TabsContent>

                <TabsContent value="tickets" className="space-y-6 mt-0">
                  <TicketsTab />
                </TabsContent>

                <TabsContent value="payments" className="space-y-6 mt-0">
                  <PaymentsTab />
                </TabsContent>

                <TabsContent value="plans" className="space-y-6 mt-0">
                  <PlansTab />
                </TabsContent>

                <TabsContent value="transactions" className="space-y-6 mt-0">
                  <Card className="border-0 shadow-lg bg-white/90 backdrop-blur-sm">
                    <CardContent className="p-6">
                      <Tabs
                        value={activeTransactionTab}
                        onValueChange={setActiveTransactionTab}
                      >
                        <TabsList className="grid w-full grid-cols-2 bg-gray-100 p-1 rounded-xl">
                          <TabsTrigger 
                            value="expenses" 
                            className="data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all duration-200 rounded-lg"
                          >
                            Expenses
                          </TabsTrigger>
                          <TabsTrigger 
                            value="income" 
                            className="data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all duration-200 rounded-lg"
                          >
                            Income
                          </TabsTrigger>
                        </TabsList>

                        <div className="mt-6">
                          <TabsContent value="expenses" className="mt-0">
                            <ExpenseTab />
                          </TabsContent>

                          <TabsContent value="income" className="mt-0">
                            <IncomeTab />
                          </TabsContent>
                        </div>
                      </Tabs>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="orders" className="space-y-6 mt-0">
                  <OrdersTab />
                </TabsContent>

                <TabsContent value="analytics" className="space-y-6 mt-0">
                  <Card className="border-0 shadow-lg bg-white/90 backdrop-blur-sm">
                    <CardContent className="p-6">
                      <Tabs
                        value={activeAnalyticsTab}
                        onValueChange={setActiveAnalyticsTab}
                      >
                        <TabsList className="grid w-full grid-cols-2 bg-gray-100 p-1 rounded-xl">
                          <TabsTrigger 
                            value="expense-analytics" 
                            className="data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all duration-200 rounded-lg text-xs sm:text-sm"
                          >
                            Expense Analytics
                          </TabsTrigger>
                          <TabsTrigger 
                            value="income-analytics" 
                            className="data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all duration-200 rounded-lg text-xs sm:text-sm"
                          >
                            Income Analytics
                          </TabsTrigger>
                        </TabsList>

                        <div className="mt-6">
                          <TabsContent value="expense-analytics" className="mt-0">
                            <AnalyticsTab />
                          </TabsContent>

                          <TabsContent value="income-analytics" className="mt-0">
                            <IncomeAnalyticsTab />
                          </TabsContent>
                        </div>
                      </Tabs>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="appointments" className="space-y-6 mt-0">
                  <AppointmentsTab />
                </TabsContent>

                <TabsContent value="members" className="space-y-6 mt-0">
                  <MembersTab />
                </TabsContent>

                <TabsContent value="settings" className="space-y-6 mt-0">
                  <SettingsTab />
                </TabsContent>
              </div>
            </Tabs>
          </main>
        </div>
      </div>

      <style jsx global>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}