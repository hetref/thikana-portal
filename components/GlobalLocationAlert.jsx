"use client";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { useLocationAlert } from "@/lib/context/LocationAlertContext";
import Link from "next/link";

export function GlobalLocationAlert() {
  const { showLocationAlert } = useLocationAlert();

  if (!showLocationAlert) return null;

  return (
    <div className="absolute top-[70px] left-0 right-0 z-50">
      <Alert
        variant="destructive"
        className="mx-auto max-w-2xl h-10 flex items-center justify-between px-4 py-2 shadow-md"
      >
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle className="text-sm">Location Not Set</AlertTitle>
          <AlertDescription className="text-sm ml-2">
            Please set your business location
          </AlertDescription>
        </div>
        <Link
          href="/map"
          className="text-black text-sm underline hover:text-black transition-colors whitespace-nowrap"
        >
          Set Location
        </Link>
      </Alert>
    </div>
  );
}
