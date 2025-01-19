"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { GoogleMap, LoadScript, Marker } from "@react-google-maps/api";

const defaultLocation = {
  lat: 23.8103, // Bangladesh center coordinates
  lng: 90.4125,
};

const mapContainerStyle = {
  width: "100%",
  height: "200px", // Small map height
};

const largeMapStyle = {
  width: "100%",
  height: "70vh", // Large map height for dialog
};

export default function Map() {
  const [showMap, setShowMap] = useState(false);

  return (
    <>
      <Card className="cursor-pointer" onClick={() => setShowMap(true)}>
        <CardHeader>
          <CardTitle className="text-xl">Location</CardTitle>
        </CardHeader>
        <CardContent>
          {/* <LoadScript googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}>
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              center={defaultLocation}
              zoom={13}
            >
              <Marker position={defaultLocation} />
            </GoogleMap>
          </LoadScript> */}
        </CardContent>
      </Card>

      <Dialog open={showMap} onOpenChange={setShowMap}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Location Map</DialogTitle>
          </DialogHeader>
          {/* <LoadScript googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}>
            <GoogleMap
              mapContainerStyle={largeMapStyle}
              center={defaultLocation}
              zoom={13}
            >
              <Marker position={defaultLocation} />
            </GoogleMap>
          </LoadScript> */}
        </DialogContent>
      </Dialog>
    </>
  );
}
