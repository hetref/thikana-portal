"use client";
import CallAutomationSettings from "@/components/CallAutomationSettings";
import { Card } from "@/components/ui/card";

export default function CallsPage() {
  return (
    <div className="container mx-auto p-6">
      <Card className="p-6">
        <CallAutomationSettings />
      </Card>
    </div>
  );
}
