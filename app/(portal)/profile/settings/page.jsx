"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import BasicInfoForm from "@/components/BasicInfoForm";
import PaymentForm from "@/components/PaymentForm";
import BusinessInfoForm from "@/components/BusinessInfoForm";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("basic-info");

  return (
    <div className="container mx-auto py-[15px]">
      {/* <h1 className="text-3xl font-bold mb-6">Business Profile Settings</h1> */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex flex-col-reverse md:flex-row gap-6"
      >
        <div className="w-full md:w-3/4">
          <TabsContent value="basic-info">
            <div className="mb-4">
              <h2 className="font-semibold text-2xl">Basic Information</h2>
              <p className="text-lg mt-2">
                Manage your basic business profile information.
              </p>
            </div>
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
                  Manage detailed information about your business.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <BusinessInfoForm />
              </CardContent>
            </Card>
          </TabsContent>
        </div>
        <div className="w-full md:w-1/4 h-fit md:sticky md:top-[80px]">
          <TabsList className="flex flex-col w-full h-full space-y-2">
            <TabsTrigger value="basic-info" className="w-full">
              Basic Information
            </TabsTrigger>
            <div className="w-full h-[1px] bg-gray-100 rounded-full" />
            <TabsTrigger value="payment" className="w-full">
              Payment Settings
            </TabsTrigger>
            <div className="w-full h-[1px] bg-gray-100 rounded-full" />
            <TabsTrigger value="business-info" className="w-full">
              Business Information
            </TabsTrigger>
          </TabsList>
        </div>
      </Tabs>
    </div>
  );
}
