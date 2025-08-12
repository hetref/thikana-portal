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
      <Tabs defaultValue="history" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="history">Call History</TabsTrigger>
          <TabsTrigger value="types">Call Types</TabsTrigger>
          <TabsTrigger value="scripts">Call Scripts</TabsTrigger>
          <TabsTrigger value="make-call">Make a Call</TabsTrigger>
        </TabsList>

        <TabsContent value="history">
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

        <TabsContent value="make-call">
          <Card className="p-6">
            <CallAutomationSettings />
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
