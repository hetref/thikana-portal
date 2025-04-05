"use client";
import React, { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import WhoToFollow from "@/components/WhoToFollow";
import {
  Briefcase,
  MapPin,
  Search as SearchIcon,
  Filter,
  Navigation,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { toast } from "react-hot-toast";
import { Loader } from "@googlemaps/js-api-loader";

import { liteClient as algoliasearch } from "algoliasearch/lite";
import {
  InstantSearch,
  SearchBox,
  Hits,
  RefinementList,
  SortBy,
  Stats,
  Pagination,
  Configure,
} from "react-instantsearch";

const searchClient = algoliasearch(
  "082T3XEBV7",
  "816be13729d5b895aa6ce749d0fce451"
);

// Replace with your Google Maps API key
const GOOGLE_MAPS_API_KEY = "AIzaSyDb-fh_vaeGMyzGKIbM5ki8PS7A4jTFQYs";

const Hit = ({ hit, userLocation, googleMapsService }) => {
  const [distance, setDistance] = useState(null);
  const [loading, setLoading] = useState(false);
  const businessLocation = hit.location || null;

  useEffect(() => {
    const calculateGoogleDistance = async () => {
      if (!userLocation || !businessLocation || !googleMapsService) return;

      setLoading(true);
      try {
        const distanceService = new googleMapsService.DistanceMatrixService();
        const response = await distanceService.getDistanceMatrix({
          origins: [
            { lat: userLocation.latitude, lng: userLocation.longitude },
          ],
          destinations: [
            { lat: businessLocation.latitude, lng: businessLocation.longitude },
          ],
          travelMode: googleMapsService.TravelMode.DRIVING,
          unitSystem: googleMapsService.UnitSystem.METRIC,
        });

        if (response.rows[0].elements[0].status === "OK") {
          setDistance({
            text: response.rows[0].elements[0].distance.text,
            value: response.rows[0].elements[0].distance.value,
          });
        }
      } catch (error) {
        console.error("Error calculating Google Maps distance:", error);
      } finally {
        setLoading(false);
      }
    };

    calculateGoogleDistance();
  }, [userLocation, businessLocation, googleMapsService]);

  return (
    <Link
      href={`/${hit.username || "business"}?user=${hit.objectID || hit.id}`}
      className="block"
    >
      <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200 p-4 border border-gray-100">
        <div className="flex items-center gap-4">
          {/* <div className="relative h-16 w-16 flex-shrink-0 rounded-full overflow-hidden border border-gray-200">
            <Image
              src={
                hit.profilePic ||
                "https://randomuser.me/api/portraits/men/32.jpg"
              }
              alt={hit.businessName}
              fill
              className="object-cover"
            />
          </div> */}
          <div className="flex-1">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-1">
              <div>
                <h3 className="font-semibold text-gray-900">
                  {hit.businessName}
                </h3>
                <p className="text-sm text-gray-500">
                  @{hit.username || "business"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {hit.isFranchise && (
                  <div className="text-xs px-2 py-1 bg-purple-100 text-purple-600 rounded-full font-medium">
                    Franchise
                  </div>
                )}
                <div className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full capitalize">
                  {hit.plan || "basic"} plan
                </div>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-2 items-center">
              <div className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded-full flex items-center gap-1">
                <Briefcase className="w-3 h-3" />
                {hit.business_type || hit.businessType || "Business"}
              </div>
              {loading && (
                <div className="text-xs px-2 py-1 bg-gray-50 text-gray-500 rounded-full flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-gray-400 animate-pulse mr-1"></div>
                  Calculating...
                </div>
              )}
              {distance && !loading && (
                <div className="text-xs px-2 py-1 bg-green-50 text-green-600 rounded-full flex items-center gap-1">
                  <Navigation className="w-3 h-3 mr-1" />
                  {distance.text}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};

const CustomSearchBox = ({ ...props }) => (
  <div className="relative mb-6">
    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
      <SearchIcon className="w-5 h-5 text-gray-400" />
    </div>
    <SearchBox
      {...props}
      classNames={{
        root: "w-full",
        form: "w-full",
        input:
          "w-full pl-10 pr-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white text-gray-900",
        submit: "hidden",
        reset:
          "absolute right-3 top-1/2 -translate-y-1/2 p-1 bg-gray-100 rounded-full text-gray-600",
        loadingIndicator: "absolute right-12 top-1/2 -translate-y-1/2",
      }}
      placeholder="Search for businesses..."
      submitIconComponent={() => null}
    />
  </div>
);

const CustomRefinementList = ({ ...props }) => (
  <div className="mb-6">
    <div className="flex items-center gap-2 mb-3">
      <Filter className="w-4 h-4 text-gray-700" />
      <h3 className="font-medium text-gray-900">Business Type</h3>
    </div>
    <RefinementList
      {...props}
      classNames={{
        root: "",
        list: "space-y-2",
        item: "flex items-center",
        label: "flex items-center cursor-pointer",
        checkbox:
          "w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary bg-white",
        labelText: "ml-2 text-sm text-gray-700",
        count:
          "ml-auto text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full",
      }}
      operator="or"
      showMore
    />
  </div>
);

const SearchPage = () => {
  const [userLocation, setUserLocation] = useState(null);
  const [locationStatus, setLocationStatus] = useState("pending"); // pending, granted, denied
  const [googleMapsService, setGoogleMapsService] = useState(null);
  const [googleLoading, setGoogleLoading] = useState(true);

  // Load Google Maps API
  useEffect(() => {
    const loadGoogleMapsAPI = async () => {
      try {
        setGoogleLoading(true);
        const loader = new Loader({
          apiKey: GOOGLE_MAPS_API_KEY,
          version: "weekly",
          libraries: ["places", "geometry"],
        });

        const google = await loader.load();
        setGoogleMapsService(google.maps);
        setGoogleLoading(false);
      } catch (error) {
        console.error("Error loading Google Maps API:", error);
        toast.error("Could not load Google Maps. Distances may be inaccurate.");
        setGoogleLoading(false);
      }
    };

    loadGoogleMapsAPI();
  }, []);

  const getLocation = () => {
    setLocationStatus("loading");

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          setLocationStatus("granted");
          toast.success("Location access granted!");
        },
        (error) => {
          console.error("Error getting location:", error);
          setLocationStatus("denied");
          toast.error("Unable to access your location");
        },
        { enableHighAccuracy: true }
      );
    } else {
      setLocationStatus("unsupported");
      toast.error("Geolocation is not supported by your browser");
    }
  };

  // Try to get location automatically on page load
  useEffect(() => {
    getLocation();

    // Setup a watchPosition to update location in real-time if user is moving
    let watchId;
    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          console.error("Error watching location:", error);
        },
        { enableHighAccuracy: true }
      );
    }

    // Cleanup watch on component unmount
    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  const customHitComponent = (props) => (
    <Hit
      {...props}
      userLocation={userLocation}
      googleMapsService={googleMapsService}
    />
  );

  return (
    <div className="mx-auto flex gap-6 px-4 md:px-6 lg:gap-10 max-w-7xl pt-8">
      <div className="hidden md:block w-64 flex-shrink-0">
        <Sidebar />
      </div>
      <div className="flex-1">
        <InstantSearch
          searchClient={searchClient}
          indexName="business"
          insights
        >
          {/* {userLocation ? (
            <Configure
              aroundLatLngViaIP={false}
              aroundLatLng={`${userLocation.latitude}, ${userLocation.longitude}`}
              aroundRadius={50000} // 50km radius
              getRankingInfo={true}
              hitsPerPage={10}
            />
          ) : ( */}
          <Configure hitsPerPage={10} />
          {/* )} */}

          <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
              <h1 className="text-2xl font-bold text-gray-900">
                Find Businesses
              </h1>

              {locationStatus !== "granted" && (
                <Button
                  variant="outline"
                  className="flex items-center gap-2"
                  onClick={getLocation}
                  disabled={locationStatus === "loading"}
                >
                  <MapPin className="w-4 h-4" />
                  {locationStatus === "loading"
                    ? "Getting location..."
                    : "Enable location"}
                </Button>
              )}

              {userLocation && (
                <div className="text-sm text-green-600 flex items-center gap-2">
                  <Navigation className="w-4 h-4" />
                  <span>Location active</span>
                  {googleLoading && (
                    <span className="text-xs text-gray-500">
                      (Loading maps...)
                    </span>
                  )}
                </div>
              )}
            </div>

            <CustomSearchBox />

            <div className="flex flex-col md:flex-row gap-8">
              <div className="w-full md:w-64 flex-shrink-0">
                <div className="sticky top-24">
                  <CustomRefinementList attribute="business_type" />

                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-3">
                      <h3 className="font-medium text-gray-900">Sort By</h3>
                    </div>
                    <SortBy
                      classNames={{
                        root: "w-full",
                        select:
                          "w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white text-gray-900",
                      }}
                      items={[
                        { label: "Featured", value: "business" },
                        {
                          label: "Business Name (A-Z)",
                          value: "business_businessName_asc",
                        },
                        {
                          label: "Business Name (Z-A)",
                          value: "business_businessName_desc",
                        },
                      ]}
                    />
                  </div>
                </div>
              </div>

              <div className="flex-1">
                <div className="pb-4 mb-4 border-b border-gray-200">
                  <Stats
                    classNames={{
                      root: "text-sm text-gray-500",
                    }}
                    translations={{
                      stats: (nbHits) =>
                        `${nbHits.toLocaleString()} ${
                          nbHits === 1 ? "business" : "businesses"
                        } found`,
                    }}
                  />
                </div>

                <div className="space-y-4">
                  <Hits
                    hitComponent={customHitComponent}
                    classNames={{
                      root: "",
                      list: "space-y-4",
                    }}
                  />
                </div>

                <div className="mt-8 flex justify-center">
                  <Pagination
                    classNames={{
                      root: "",
                      list: "flex space-x-1",
                      item: "px-3 py-2 rounded-md text-sm",
                      selectedItem: "bg-primary text-white",
                      disabledItem: "opacity-40",
                      link: "hover:underline",
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </InstantSearch>
      </div>
      {/* <div className="hidden lg:block w-72 flex-shrink-0">
        <WhoToFollow />
      </div> */}
    </div>
  );
};

export default SearchPage;
