"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { auth, db } from "@/lib/firebase";
import { getDoc, doc } from "firebase/firestore";
import BasicInfoForm from "@/components/BasicInfoForm";
import PaymentForm from "@/components/PaymentForm";
import BusinessInfoForm from "@/components/BusinessInfoForm";
import toast from "react-hot-toast";
import { AlertCircle, User, CreditCard, Building } from "lucide-react";
import Loader from "@/components/Loader";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("basic-info");
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);
  const [businessId, setBusinessId] = useState(null);

  useEffect(() => {
    const checkUserRole = async () => {
      try {
        setLoading(true);
        const user = auth.currentUser;
        if (!user) return;

        const userDoc = await getDoc(doc(db, "users", user.uid));

        if (userDoc.exists()) {
          const userData = userDoc.data();
          setUserRole(userData.role || "user");

          // If user is a member, set the active tab to business-info and store the businessId
          if (userData.role === "member" && userData.businessId) {
            setActiveTab("business-info");
            setBusinessId(userData.businessId);
          }
        }
      } catch (error) {
        console.error("Error checking user role:", error);
        toast.error("Failed to load user data");
      } finally {
        setLoading(false);
      }
    };

    checkUserRole();
  }, []);

  const handleTabChange = (value) => {
    // If user is a member, only allow access to business-info tab
    if (userRole === "member" && value !== "business-info") {
      toast.error("As a member, you can only view business information");
      return;
    }
    setActiveTab(value);
  };

  if (loading) {
    return (
      <div className="container mx-auto py-[30px] flex justify-center items-center min-h-[60vh]">
        <Loader/>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-[15px]">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-gray-500">
          Update your account and business settings.
        </p>
      </div>

      {userRole === "member" && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded-md">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            <span className="font-medium">Member Access:</span>
            <span className="ml-1">
              As a member, you can view business information but cannot modify
              settings.
            </span>
          </div>
        </div>
      )}

      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="flex flex-col-reverse md:flex-row gap-6"
      >
        <div className="w-full md:w-3/4">
          <TabsContent value="basic-info">
            <BasicInfoForm />
          </TabsContent>
          <TabsContent value="payment">
            <Card>
              <CardHeader>
                <CardTitle>Payment Settings</CardTitle>
                <CardDescription>
                  Configure your Razorpay payment credentials.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PaymentForm />
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="business-info">
            <Card>
              <CardHeader>
                <CardTitle>Business Information</CardTitle>
                <CardDescription>
                  {userRole === "member"
                    ? "View information about the business."
                    : "Manage detailed information about your business."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <BusinessInfoForm
                  readOnly={userRole === "member"}
                  businessId={userRole === "member" ? businessId : null}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </div>
        <div className="w-full md:w-1/4 h-fit md:sticky md:top-[80px]">
          <TabsList className="flex flex-col w-full h-full space-y-2">
            {userRole !== "member" && (
              <>
                <TabsTrigger value="basic-info" className="w-full">
                  <User className="h-4 w-4 mr-2" />
                  Basic Information
                </TabsTrigger>
                <div className="w-full h-[1px] bg-gray-100 rounded-full" />
                <TabsTrigger value="payment" className="w-full">
                  <CreditCard className="h-4 w-4 mr-2" />
                  Payment Settings
                </TabsTrigger>
                <div className="w-full h-[1px] bg-gray-100 rounded-full" />
              </>
            )}
            <TabsTrigger value="business-info" className="w-full">
              <Building className="h-4 w-4 mr-2" />
              Business Information
            </TabsTrigger>
          </TabsList>
        </div>
      </Tabs>
    </div>
  );
}
