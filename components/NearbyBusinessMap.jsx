"use client";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapContainer, TileLayer, Marker, Popup, Circle } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { auth, db } from "@/lib/firebase";
import { collection, getDocs, getDoc, doc } from "firebase/firestore";
import L from "leaflet";

// Fix Leaflet marker icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// Custom marker icons
const createCustomIcon = (color) => {
  return L.divIcon({
    className: "custom-div-icon",
    html: `<div style="background-color: ${color}; width: 25px; height: 25px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.5);"></div>`,
    iconSize: [25, 25],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  });
};

const businessIcons = {
  free: createCustomIcon("#4B5563"), // gray
  standard: createCustomIcon("#2563EB"), // blue
  premium: createCustomIcon("#059669"), // green
};

const userIcon = L.divIcon({
  className: "custom-div-icon",
  html: '<div style="background-color: #DC2626; width: 25px; height: 25px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.5);"></div>',
  iconSize: [25, 25],
  iconAnchor: [12, 12],
});

export default function NearbyBusinessMap({ height = "400px", width = "100%", cardHeight = "auto" }) {
  const [userLocation, setUserLocation] = useState(null);
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const currentUserId = auth.currentUser?.uid;

  // Calculate distance between two points
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!currentUserId) {
        console.log("No current user ID");
        return;
      }

      try {
        // Fetch user location
        console.log("Fetching user location...");
        const userDoc = await getDoc(doc(db, "users", currentUserId));
        if (!userDoc.exists()) {
          console.log("User document not found");
          return;
        }

        const userData = userDoc.data();
        console.log("User data:", userData);

        if (!userData.location) {
          console.log("No location data in user document");
          return;
        }

        const userLoc = {
          lat: userData.location.latitude,
          lng: userData.location.longitude,
        };
        console.log("User location:", userLoc);
        setUserLocation(userLoc);

        // Fetch all businesses
        console.log("Fetching businesses...");
        const businessesRef = collection(db, "businesses");
        const businessesSnapshot = await getDocs(businessesRef);
        console.log("Total businesses found:", businessesSnapshot.size);

        const businessPromises = businessesSnapshot.docs.map(
          async (businessDoc) => {
            const businessData = businessDoc.data();
            console.log("Business data for", businessDoc.id, ":", businessData);

            // Get business plan from users collection
            const userDocRef = doc(db, "users", businessDoc.id);
            const userDocSnap = await getDoc(userDocRef);
            const businessUserData = userDocSnap.data();
            const plan = businessUserData?.plan || "free";
            console.log("Business plan for", businessDoc.id, ":", plan);

            if (!businessData.location) {
              console.log("No location data for business:", businessDoc.id);
              return null;
            }

            const distance = calculateDistance(
              userLoc.lat,
              userLoc.lng,
              businessData.location.latitude,
              businessData.location.longitude
            );
            console.log("Distance for", businessDoc.id, ":", distance, "km");

            // Check if business is within plan radius
            const radiusLimits = {
              free: 2,
              standard: 4,
              premium: 8,
            };

            if (distance <= radiusLimits[plan]) {
              console.log("Business", businessDoc.id, "is within radius limit");
              return {
                id: businessDoc.id,
                ...businessData,
                business_plan: plan,
                distance_km: distance,
                location: {
                  lat: businessData.location.latitude,
                  lng: businessData.location.longitude,
                },
              };
            }
            console.log("Business", businessDoc.id, "is outside radius limit");
            return null;
          }
        );

        const businessResults = await Promise.all(businessPromises);
        const validBusinesses = businessResults.filter(
          (business) => business !== null
        );
        console.log("Valid businesses:", validBusinesses);
        setBusinesses(validBusinesses);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentUserId]);

  const MapComponent = () => {
    if (!userLocation || !businesses.length) {
      console.log("MapComponent - userLocation:", userLocation);
      console.log("MapComponent - businesses:", businesses);
      return null;
    }

    return (
      <MapContainer
        center={[userLocation.lat, userLocation.lng]}
        zoom={13}
        style={{ height: height, width: width, borderRadius: "0.5rem" }}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        {/* User location marker */}
        <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon}>
          <Popup>Your Location</Popup>
        </Marker>

        {/* Coverage circles */}
        <Circle
          center={[userLocation.lat, userLocation.lng]}
          radius={2000}
          pathOptions={{
            color: "#4B5563",
            fillColor: "#4B5563",
            fillOpacity: 0.1,
          }}
        />
        <Circle
          center={[userLocation.lat, userLocation.lng]}
          radius={4000}
          pathOptions={{
            color: "#2563EB",
            fillColor: "#2563EB",
            fillOpacity: 0.1,
          }}
        />
        <Circle
          center={[userLocation.lat, userLocation.lng]}
          radius={8000}
          pathOptions={{
            color: "#059669",
            fillColor: "#059669",
            fillOpacity: 0.1,
          }}
        />

        {/* Business markers */}
        {businesses.map((business) => {
          console.log("Rendering business marker:", business);
          return (
            <Marker
              key={business.id}
              position={[business.location.lat, business.location.lng]}
              icon={businessIcons[business.business_plan || "free"]}
            >
              <Popup>
                <div className="text-sm">
                  <p className="font-semibold">{business.businessName}</p>
                  <p className="text-gray-600">@{business.username}</p>
                  <p className="text-gray-600">{business.businessType}</p>
                  <p className="text-gray-600">
                    {business.distance_km.toFixed(1)} km away
                  </p>
                  <p className="text-gray-600 capitalize">
                    {business.business_plan} plan
                  </p>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    );
  };

  return (
    <Card className="mt-4 top-20" style={{ height: cardHeight }}>
      <CardHeader>
        <CardTitle className="text-xl">Nearby Businesses</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div style={{ height: height }} className="flex items-center justify-center">
            <p>Loading map...</p>
          </div>
        ) : !userLocation ? (
          <div style={{ height: height }} className="flex items-center justify-center">
            <p>Location not available</p>
          </div>
        ) : !businesses.length ? (
          <div style={{ height: height }} className="flex items-center justify-center">
            <p>No nearby businesses found</p>
          </div>
        ) : (
          <>
            <div className="mb-2">
              <div className="text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#DC2626]" />
                  <span>Your Location</span>
                </div>
              </div>
            </div>
            <MapComponent />
          </>
        )}
      </CardContent>
    </Card>
  );
}
