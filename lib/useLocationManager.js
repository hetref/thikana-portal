import { useState, useEffect, useCallback, useRef } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import toast from "react-hot-toast";

// Constants
const LOCATION_UPDATE_THRESHOLD = 1000; // 1km in meters
const LOCATION_CACHE_DURATION = 15 * 60 * 1000; // 15 minutes
const LOCATION_STORAGE_KEY = "userLocation";

// Location Permission States
export const LOCATION_STATES = {
  UNKNOWN: "unknown",
  REQUESTING: "requesting",
  GRANTED: "granted",
  DENIED: "denied",
  UNAVAILABLE: "unavailable",
};

export const useLocationManager = (userId) => {
  const [userLocation, setUserLocation] = useState(null);
  const [locationPermission, setLocationPermission] = useState(
    LOCATION_STATES.UNKNOWN
  );
  const [locationError, setLocationError] = useState(null);

  // Refs to prevent duplicate requests and manage state
  const locationRequestInProgress = useRef(false);
  const toastShown = useRef(false);
  const watchId = useRef(null);
  const lastPermissionRequest = useRef(0);

  // Calculate distance between two points in meters
  const calculateDistance = useCallback((lat1, lon1, lat2, lon2) => {
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
    return R * c * 1000; // Return in meters
  }, []);

  // Check if location needs updating
  const shouldUpdateLocation = useCallback(
    (oldLocation, newLocation) => {
      if (!oldLocation || !newLocation) return true;

      const distance = calculateDistance(
        oldLocation.latitude,
        oldLocation.longitude,
        newLocation.latitude,
        newLocation.longitude
      );

      const timeDiff = Date.now() - (oldLocation.lastUpdated || 0);
      return (
        distance > LOCATION_UPDATE_THRESHOLD ||
        timeDiff > LOCATION_CACHE_DURATION
      );
    },
    [calculateDistance]
  );

  // Save location to localStorage and Firestore
  const saveLocation = useCallback(
    async (location) => {
      try {
        // Save to localStorage immediately for quick access
        const locationData = {
          ...location,
          lastUpdated: Date.now(),
        };
        localStorage.setItem(
          LOCATION_STORAGE_KEY,
          JSON.stringify(locationData)
        );

        // Save to Firestore for persistence across devices
        if (userId) {
          await updateDoc(doc(db, "users", userId), {
            location: {
              latitude: location.latitude,
              longitude: location.longitude,
            },
            locationUpdatedAt: new Date(),
          });
        }

        return locationData;
      } catch (error) {
        console.error("Error saving location:", error);
        throw error;
      }
    },
    [userId]
  );

  // Load saved location from localStorage first, then Firestore
  const loadSavedLocation = useCallback(async () => {
    try {
      // First try localStorage for immediate access
      const savedLocation = localStorage.getItem(LOCATION_STORAGE_KEY);
      if (savedLocation) {
        const locationData = JSON.parse(savedLocation);
        const timeDiff = Date.now() - (locationData.lastUpdated || 0);

        // Use cached location if it's recent enough
        if (timeDiff < LOCATION_CACHE_DURATION) {
          setUserLocation(locationData);
          setLocationPermission(LOCATION_STATES.GRANTED);
          return true;
        }
      }

      // If localStorage is stale or empty, try Firestore
      if (userId) {
        const { getDoc, doc } = await import("firebase/firestore");
        const userDoc = await getDoc(doc(db, "users", userId));

        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (userData.location?.latitude && userData.location?.longitude) {
            const locationData = {
              latitude: userData.location.latitude,
              longitude: userData.location.longitude,
              lastUpdated: userData.locationUpdatedAt?.toMillis() || Date.now(),
            };

            setUserLocation(locationData);
            setLocationPermission(LOCATION_STATES.GRANTED);

            // Update localStorage cache
            localStorage.setItem(
              LOCATION_STORAGE_KEY,
              JSON.stringify(locationData)
            );
            return true;
          }
        }
      }

      return false;
    } catch (error) {
      console.error("Error loading saved location:", error);
      return false;
    }
  }, [userId]);

  // Request location permission with improved error handling
  const requestLocationPermission = useCallback(async () => {
    // Prevent multiple simultaneous requests
    if (locationRequestInProgress.current) {
      return false;
    }

    // Don't spam permission requests - wait at least 10 seconds between requests
    const now = Date.now();
    if (now - lastPermissionRequest.current < 10000) {
      return false;
    }
    lastPermissionRequest.current = now;

    // Check if geolocation is available
    if (!navigator.geolocation) {
      setLocationPermission(LOCATION_STATES.UNAVAILABLE);
      if (!toastShown.current) {
        toast.error("Geolocation is not supported by your browser.");
        toastShown.current = true;
      }
      return false;
    }

    locationRequestInProgress.current = true;
    setLocationPermission(LOCATION_STATES.REQUESTING);
    setLocationError(null);

    try {
      const position = await new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error("Location request timeout"));
        }, 15000); // 15 second timeout

        navigator.geolocation.getCurrentPosition(
          (pos) => {
            clearTimeout(timeoutId);
            resolve(pos);
          },
          (err) => {
            clearTimeout(timeoutId);
            reject(err);
          },
          {
            enableHighAccuracy: false, // Better performance and battery life
            timeout: 10000,
            maximumAge: 5 * 60 * 1000, // 5 minutes cache
          }
        );
      });

      const { latitude, longitude } = position.coords;
      const newLocation = { latitude, longitude };

      // Only update if location has changed significantly
      if (shouldUpdateLocation(userLocation, newLocation)) {
        const savedLocation = await saveLocation(newLocation);
        setUserLocation(savedLocation);
      }

      setLocationPermission(LOCATION_STATES.GRANTED);
      setLocationError(null);
      toastShown.current = false; // Reset toast flag on success

      return true;
    } catch (error) {
      console.error("Error getting location:", error);

      // Handle different types of errors
      let errorMessage =
        "Location access denied. Some features may be limited.";

      if (error.code === 1) {
        // PERMISSION_DENIED
        setLocationPermission(LOCATION_STATES.DENIED);
      } else if (error.code === 2) {
        // POSITION_UNAVAILABLE
        setLocationPermission(LOCATION_STATES.UNAVAILABLE);
        errorMessage = "Location services are unavailable.";
      } else if (error.code === 3) {
        // TIMEOUT
        setLocationPermission(LOCATION_STATES.DENIED);
        errorMessage = "Location request timed out.";
      } else {
        setLocationPermission(LOCATION_STATES.DENIED);
      }

      setLocationError(error.message);

      // Only show toast once per session for each error type
      if (!toastShown.current) {
        toast.error(errorMessage);
        toastShown.current = true;
      }

      return false;
    } finally {
      locationRequestInProgress.current = false;
    }
  }, [userLocation, shouldUpdateLocation, saveLocation]);

  // Watch location changes (optional)
  const startWatchingLocation = useCallback(() => {
    if (
      !navigator.geolocation ||
      watchId.current ||
      locationPermission !== LOCATION_STATES.GRANTED
    ) {
      return;
    }

    watchId.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const newLocation = { latitude, longitude };

        if (shouldUpdateLocation(userLocation, newLocation)) {
          saveLocation(newLocation)
            .then((savedLocation) => {
              setUserLocation(savedLocation);
            })
            .catch((error) => {
              console.error("Error saving watched location:", error);
            });
        }
      },
      (error) => {
        console.warn("Watch position error:", error);
      },
      {
        enableHighAccuracy: false,
        maximumAge: 60000, // 1 minute
        timeout: 30000, // 30 seconds
      }
    );
  }, [locationPermission, userLocation, shouldUpdateLocation, saveLocation]);

  // Stop watching location
  const stopWatchingLocation = useCallback(() => {
    if (watchId.current) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
  }, []);

  // Clear location data
  const clearLocation = useCallback(() => {
    setUserLocation(null);
    setLocationPermission(LOCATION_STATES.UNKNOWN);
    setLocationError(null);
    localStorage.removeItem(LOCATION_STORAGE_KEY);
    stopWatchingLocation();
    toastShown.current = false;
  }, [stopWatchingLocation]);

  // Initialize location on mount
  useEffect(() => {
    if (userId) {
      loadSavedLocation();
    }

    // Cleanup on unmount
    return () => {
      stopWatchingLocation();
    };
  }, [userId, loadSavedLocation, stopWatchingLocation]);

  // Get permission status text for UI
  const getPermissionStatusText = useCallback(() => {
    switch (locationPermission) {
      case LOCATION_STATES.UNKNOWN:
        return "Location permission not requested";
      case LOCATION_STATES.REQUESTING:
        return "Requesting location permission...";
      case LOCATION_STATES.GRANTED:
        return "Location access granted";
      case LOCATION_STATES.DENIED:
        return "Location access denied";
      case LOCATION_STATES.UNAVAILABLE:
        return "Location services unavailable";
      default:
        return "Unknown location status";
    }
  }, [locationPermission]);

  // Check if location is available and recent
  const isLocationReady = useCallback(() => {
    if (!userLocation || locationPermission !== LOCATION_STATES.GRANTED) {
      return false;
    }

    const timeDiff = Date.now() - (userLocation.lastUpdated || 0);
    return timeDiff < LOCATION_CACHE_DURATION;
  }, [userLocation, locationPermission]);

  return {
    // State
    userLocation,
    locationPermission,
    locationError,

    // Status checks
    isLocationReady: isLocationReady(),
    isRequesting: locationPermission === LOCATION_STATES.REQUESTING,
    isGranted: locationPermission === LOCATION_STATES.GRANTED,
    isDenied: locationPermission === LOCATION_STATES.DENIED,
    isUnavailable: locationPermission === LOCATION_STATES.UNAVAILABLE,

    // Actions
    requestLocationPermission,
    startWatchingLocation,
    stopWatchingLocation,
    clearLocation,

    // Utilities
    calculateDistance,
    getPermissionStatusText,
    shouldUpdateLocation,
  };
};
