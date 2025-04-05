"use client";
import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";

// Fix Leaflet icon issues in Next.js
const fixLeafletIcons = () => {
  delete L.Icon.Default.prototype._getIconUrl;

  L.Icon.Default.mergeOptions({
    iconRetinaUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
    iconUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
    shadowUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  });
};

// MapController component to handle focusing on marker
const MapController = ({ location }) => {
  const map = useMap();

  useEffect(() => {
    if (location && location.lat && location.lng) {
      map.flyTo([location.lat, location.lng], 16, {
        animate: true,
        duration: 1,
      });
    }
  }, [map, location]);

  return null;
};

export default function MapComponent({ location, name, address }) {
  const [isMapLoaded, setIsMapLoaded] = useState(false);

  useEffect(() => {
    // Fix icon issues
    fixLeafletIcons();
  }, []);

  const handleGetDirections = () => {
    if (location && location.lat && location.lng) {
      const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${location.lat},${location.lng}`;
      window.open(googleMapsUrl, "_blank");
    }
  };

  if (!location || !location.lat || !location.lng) {
    return (
      <div className="flex justify-center items-center h-full bg-gray-100">
        <p className="text-gray-500">No valid location coordinates</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-grow relative">
        <MapContainer
          center={[location.lat, location.lng]}
          zoom={16}
          scrollWheelZoom={false}
          style={{ height: "100%", width: "100%" }}
          whenReady={() => setIsMapLoaded(true)}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          <Marker position={[location.lat, location.lng]}>
            <Popup>
              <div className="text-center">
                <strong>{name || "Location"}</strong>
                {address && <p className="text-sm">{address}</p>}
                <p className="text-xs mt-1">
                  {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                </p>
              </div>
            </Popup>
          </Marker>
          <MapController location={location} />
        </MapContainer>

        {isMapLoaded && (
          <div className="absolute bottom-4 right-4 z-[1000]">
            <Button
              onClick={handleGetDirections}
              size="sm"
              className="flex items-center gap-2 bg-white text-black hover:bg-gray-100 shadow-md border border-gray-200"
            >
              <Navigation size={16} />
              <span>Get Directions</span>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
