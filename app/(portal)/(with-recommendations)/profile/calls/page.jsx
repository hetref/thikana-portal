"use client";
import CallAutomationSettings from "@/components/CallAutomationSettings";
import CallScriptManager from "@/components/CallScriptManager";
import CallTypeManager from "@/components/CallTypeManager";
import RequestCallsManager from "@/components/RequestCallsManager";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function CallsPage() {
  return (
    <div className="container mx-auto p-6">
      <Tabs defaultValue="requests" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="requests">Call Requests</TabsTrigger>
          <TabsTrigger value="types">Call Types</TabsTrigger>
          <TabsTrigger value="scripts">Call Scripts</TabsTrigger>
          <TabsTrigger value="automation">Call Automation</TabsTrigger>
        </TabsList>

        <TabsContent value="requests">
          <Card className="p-6">
            <RequestCallsManager />
          </Card>
        </TabsContent>

        <TabsContent value="types">
          <Card className="p-6">
            <CallTypeManager />
          </Card>
        </TabsContent>

        <TabsContent value="scripts">
          <Card className="p-6">
            <CallScriptManager />
          </Card>
        </TabsContent>

        <TabsContent value="automation">
          <Card className="p-6">
            <CallAutomationSettings />
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
