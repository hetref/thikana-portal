// pages/business/store-location.js
"use client";
import { useState, useEffect, useRef } from "react";
import Head from "next/head";
import Script from "next/script";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, setDoc } from "firebase/firestore";
import { useLocationAlert } from "@/lib/context/LocationAlertContext";

export default function StoreLocationPicker() {
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [error, setError] = useState(null);
  const [existingLocation, setExistingLocation] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const { setShowLocationAlert } = useLocationAlert();
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const autocompleteRef = useRef(null);
  const mapContainerRef = useRef(null);
  const inputRef = useRef(null);

  // Your Google Maps API key
  const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  // Utility: wait until window.google.maps is available after script onLoad
  const waitForGoogleMaps = () =>
    new Promise((resolve, reject) => {
      if (typeof window === "undefined") return reject(new Error("Window not available"));
      if (window.google && window.google.maps) return resolve();
      let attempts = 0;
      const tm = setInterval(() => {
        if (window.google && window.google.maps) {
          clearInterval(tm);
          resolve();
        } else if (++attempts > 100) {
          clearInterval(tm);
          reject(new Error("Google Maps failed to load"));
        }
      }, 100);
    });

  useEffect(() => {
    const init = async () => {
    if (!isMapLoaded || !mapContainerRef.current || !inputRef.current) return;

    try {
        // Ensure google.maps exists even if onLoad fired early
        await waitForGoogleMaps();

      // Initialize the map
      const defaultLocation = { lat: 19.076, lng: 72.877 }; // Default location (Mumbai)

      mapRef.current = new window.google.maps.Map(mapContainerRef.current, {
          center: existingLocation || defaultLocation,
        zoom: 13,
      });

      // Create the autocomplete object and bind it to the input field
      autocompleteRef.current = new window.google.maps.places.Autocomplete(
        inputRef.current
      );
      autocompleteRef.current.bindTo("bounds", mapRef.current);

      // Set up the event listener for when the user selects a place
      autocompleteRef.current.addListener("place_changed", () => {
        const place = autocompleteRef.current.getPlace();

          if (!place?.geometry) {
            console.log("No details available for the input");
          return;
        }

        if (place.geometry.viewport) {
          mapRef.current.fitBounds(place.geometry.viewport);
        } else {
          mapRef.current.setCenter(place.geometry.location);
          mapRef.current.setZoom(17);
        }

        // Update or create marker
        const coordinates = {
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
        };

        updateMarker(coordinates);

        // Set the selected location with place details
        setSelectedLocation({
            name: place.name || "Selected Location",
            address: place.formatted_address || "",
          coordinates: coordinates,
        });

        console.log("Selected location coordinates:", coordinates);
      });

      // Add click event to the map to set location manually
      mapRef.current.addListener("click", (event) => {
        const clickedLocation = {
          coordinates: {
            lat: event.latLng.lat(),
            lng: event.latLng.lng(),
          },
        };

        // Update the marker
        updateMarker(clickedLocation.coordinates);

        // Do reverse geocoding to get address details
        reverseGeocode(clickedLocation.coordinates);
      });

      console.log("Map initialized successfully");
    } catch (err) {
      console.error("Error initializing map:", err);
      setError("Failed to initialize map. Please refresh the page.");
    }
    };

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMapLoaded, mapContainerRef.current]);

  // Add new useEffect to fetch existing location and user role
  useEffect(() => {
    const fetchLocationAndRole = async () => {
      if (!auth.currentUser) return;

      try {
        // Fetch business document
        const businessDoc = await getDoc(
          doc(db, "businesses", auth.currentUser.uid)
        );
        const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));

        if (userDoc.exists()) {
          setUserRole(userDoc.data().role);
        }

        if (businessDoc.exists()) {
          const bData = businessDoc.data();
          // Prefer _geoloc, fallback to legacy location
          let center = null;
          if (
            bData &&
            bData._geoloc &&
            typeof bData._geoloc.lat === "number" &&
            typeof bData._geoloc.lng === "number"
          ) {
            center = { lat: bData._geoloc.lat, lng: bData._geoloc.lng };
          } else if (
            bData &&
            bData.location &&
            typeof bData.location.latitude === "number" &&
            typeof bData.location.longitude === "number"
          ) {
            center = {
              lat: bData.location.latitude,
              lng: bData.location.longitude,
            };
          }

          if (center) {
            setExistingLocation(center);

            // If map is loaded and map exists, update the marker and center
          if (isMapLoaded && mapRef.current) {
              mapRef.current.setCenter(center);
            mapRef.current.setZoom(17);
              updateMarker(center);
              reverseGeocode(center);
            }
          } else if (userRole === "business") {
            setShowLocationAlert(true);
          }
        } else if (userRole === "business") {
          setShowLocationAlert(true);
        }
      } catch (err) {
        console.error("Error fetching location:", err);
      }
    };

    fetchLocationAndRole();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMapLoaded]);

  // Handle getting current location
  const handleGetCurrentLocation = () => {
    setError(null);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coordinates = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };

          // Log the coordinates
          console.log("Current location coordinates:", coordinates);

          // Update the map center
          if (mapRef.current) {
            mapRef.current.setCenter(coordinates);
            mapRef.current.setZoom(17);
          }

          // Update or create marker
          updateMarker(coordinates);

          // Do reverse geocoding to get address details
          reverseGeocode(coordinates);
        },
        (err) => {
          console.error("Error getting location:", err);
          setError(
            "Unable to retrieve your location. Please enable location services."
          );
        }
      );
    } else {
      setError("Geolocation is not supported by your browser.");
    }
  };

  // Update marker on map
  const updateMarker = (coordinates) => {
    if (!window?.google?.maps || !mapRef.current) return;
    // If marker already exists, update its position
    if (markerRef.current) {
      markerRef.current.setPosition(coordinates);
    }
    // Otherwise create a new marker
    else {
      markerRef.current = new window.google.maps.Marker({
        position: coordinates,
        map: mapRef.current,
        draggable: true,
      });

      // Add drag end event to update location when marker is dragged
      markerRef.current.addListener("dragend", () => {
        const newPosition = markerRef.current.getPosition();
        const newCoordinates = {
          lat: newPosition.lat(),
          lng: newPosition.lng(),
        };

        // Log the new coordinates
        console.log("Marker dragged to:", newCoordinates);

        // Do reverse geocoding to get address details
        reverseGeocode(newCoordinates);
      });
    }
  };

  // Perform reverse geocoding to get address from coordinates
  const reverseGeocode = async (coordinates) => {
    try {
      if (!window?.google?.maps) return;
      // Use the geocoder from Google Maps JavaScript API
      const geocoder = new window.google.maps.Geocoder();

      geocoder.geocode({ location: coordinates }, (results, status) => {
        if (status === "OK" && results[0]) {
          setSelectedLocation({
            name: results[0].formatted_address.split(",")[0],
            address: results[0].formatted_address,
            coordinates: coordinates,
          });
        } else {
          setSelectedLocation({
            name: "Selected Location",
            address: `Latitude: ${coordinates.lat.toFixed(
              6
            )}, Longitude: ${coordinates.lng.toFixed(6)}`,
            coordinates: coordinates,
          });
        }
      });
    } catch (err) {
      console.error("Reverse geocoding error:", err);
      // Still set the location with coordinates even if address lookup fails
      setSelectedLocation({
        name: "Selected Location",
        address: `Latitude: ${coordinates.lat.toFixed(
          6
        )}, Longitude: ${coordinates.lng.toFixed(6)}`,
        coordinates: coordinates,
      });
    }
  };

  // Handle confirming the selected location
  const handleConfirmLocation = async () => {
    if (!selectedLocation) {
      setError("Please select a location first.");
      return;
    }

    try {
      const geoloc = {
        lat: selectedLocation.coordinates.lat,
        lng: selectedLocation.coordinates.lng,
      };

      const businessesRef = doc(db, "businesses", auth.currentUser.uid);
      await updateDoc(businessesRef, {
        _geoloc: geoloc,
        // Keep legacy field updated to avoid breaking other pages relying on it
        location: { latitude: geoloc.lat, longitude: geoloc.lng },
        locationAddress: selectedLocation.address || "",
      });

      const usersRef = doc(db, "users", auth.currentUser.uid);
      await setDoc(
        usersRef,
        {
          _geoloc: geoloc,
          location: { latitude: geoloc.lat, longitude: geoloc.lng },
          locationAddress: selectedLocation.address || "",
          updatedAt: new Date(),
        },
        { merge: true }
      );

      // Update the global alert state
      setShowLocationAlert(false);

      alert(
        `Location confirmed! Coordinates: ${JSON.stringify(geoloc)}\nAddress: ${selectedLocation.address || ""}`
      );
    } catch (err) {
      console.error("Error updating location:", err);
      setError("Failed to update location. Please try again.");
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Head>
        <title>Thikana - Set Your Store Location</title>
        <meta name="description" content="Set your business location on Thikana" />
      </Head>

      {/* Load the Google Maps script with places library */}
      <Script
        src={`https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=geometry,places`}
        strategy="afterInteractive"
        onLoad={() => setIsMapLoaded(true)}
        onError={() => setError("Failed to load maps. Please refresh the page.")}
      />

      <h1 className="text-3xl font-bold mb-6">Set Your Store Location</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left panel: Search and results */}
        <div className="lg:col-span-1 space-y-4">
          {/* Search form */}
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="space-y-4">
              <div>
                <label htmlFor="pac-input" className="block text-sm font-medium text-gray-700 mb-1">
                  Search for your store location
                </label>
                <div className="flex">
                  <input
                    ref={inputRef}
                    type="text"
                    id="pac-input"
                    placeholder="Enter address, landmark, or area"
                    className="flex-grow p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="mt-4">
              <button
                onClick={handleGetCurrentLocation}
                className="w-full bg-gray-100 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-400 flex items-center justify-center"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 mr-2"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                    clipRule="evenodd"
                  />
                </svg>
                Use Current Location
              </button>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="bg-red-100 p-4 rounded-md text-red-800">{error}</div>
          )}

          {/* Selected location display */}
          {selectedLocation && (
            <div className="bg-white p-4 rounded-lg shadow">
              <h2 className="text-lg font-medium mb-2">Selected Location</h2>
              <div className="bg-blue-50 p-3 rounded">
                <p className="font-medium">{selectedLocation.name}</p>
                <p className="text-sm text-gray-600 mb-2">{selectedLocation.address}</p>
                <p className="text-xs">
                  Lat: {selectedLocation.coordinates.lat.toFixed(6)}, Lng: {selectedLocation.coordinates.lng.toFixed(6)}
                </p>
              </div>

              <button
                onClick={handleConfirmLocation}
                className="w-full mt-4 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                Confirm This Location
              </button>
            </div>
          )}
        </div>

        {/* Right panel: Map */}
        <div className="lg:col-span-2">
          <div className="bg-white p-4 rounded-lg shadow h-full">
            <div ref={mapContainerRef} className="w-full h-[500px] rounded">
              {!isMapLoaded && (
                <div className="w-full h-full flex items-center justify-center bg-gray-100">
                  <p>Loading map...</p>
                </div>
              )}
            </div>

            <div className="mt-4 text-sm text-gray-600">
              <p>
                You can search for your location, use your current location, or click directly on the map.
              </p>
              <p>Drag the marker to fine-tune the position if needed.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
