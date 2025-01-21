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
import BasicInfoForm from "@/components/settings/BasicInfoForm";
import PaymentForm from "@/components/settings/PaymentForm";
import BusinessInfoForm from "@/components/settings/BusinessInfoForm";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("basic-info");

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Business Profile Settings</h1>
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex flex-col md:flex-row gap-6"
      >
        <div className="w-full md:w-3/4">
          <TabsContent value="basic-info">
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>
                  Manage your basic business profile information.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <BasicInfoForm />
              </CardContent>
            </Card>
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
        <div className="w-full md:w-1/4">
          <Card>
            <CardContent className="p-4">
              <TabsList className="flex flex-col w-full h-full space-y-2">
                <TabsTrigger
                  value="basic-info"
                  className="w-full justify-start"
                >
                  Basic Information
                </TabsTrigger>
                <TabsTrigger value="payment" className="w-full justify-start">
                  Payment Settings
                </TabsTrigger>
                <TabsTrigger
                  value="business-info"
                  className="w-full justify-start"
                >
                  Business Information
                </TabsTrigger>
              </TabsList>
            </CardContent>
          </Card>
        </div>
      </Tabs>
    </div>
  );
}
