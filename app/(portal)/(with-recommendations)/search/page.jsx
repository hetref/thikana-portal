"use client";
import React, { useState, useEffect } from "react";
import {
  Briefcase,
  MapPin,
  Search as SearchIcon,
  Filter,
  Navigation,
  Clock,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { toast } from "react-hot-toast";

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

const Hit = ({ hit, userLocation }) => {
  // Distance in meters from Algolia ranking info when aroundLatLng is set
  const meters =
    hit?._rankingInfo?.matchedGeoLocation?.distance ??
    hit?._geoDistance ??
    null;
  const distanceText =
    typeof meters === "number" ? `${(meters / 1000).toFixed(1)} km` : null;

  return (
    <Link
      href={`/${hit.username || "business"}?user=${hit.objectID || hit.id}`}
      className="block group"
    >
      <div className="bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 p-6 border border-gray-100 hover:border-gray-200 group-hover:scale-[1.01]">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
              {hit.businessName}
            </h3>
            <p className="text-sm text-gray-500 font-medium">
              @{hit.username || "business"}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {hit.isFranchise && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-purple-100 to-purple-50 text-purple-700 border border-purple-200">
                Franchise
              </span>
            )}
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-gray-100 to-gray-50 text-gray-700 border border-gray-200 capitalize">
              {hit.plan || "basic"} plan
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-blue-50 to-blue-25 text-blue-700 rounded-lg border border-blue-100">
            <Briefcase className="w-3.5 h-3.5" />
            <span className="text-sm font-medium">
              {hit.business_type || hit.businessType || "Business"}
            </span>
          </div>

          {loading && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-50 text-gray-500 rounded-lg border border-gray-100">
              <div className="w-3 h-3 rounded-full bg-gray-400 animate-pulse"></div>
              <span className="text-sm">Calculating distance...</span>
            </div>
          )}

          {distance && !loading && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-green-50 to-emerald-25 text-green-700 rounded-lg border border-green-100">
              <Navigation className="w-3.5 h-3.5" />
              <span className="text-sm font-medium">{distance.text}</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
};

const CustomSearchBox = ({ ...props }) => (
  <div className="relative mb-8">
    <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none z-10">
      <SearchIcon className="w-5 h-5 text-gray-400" />
    </div>
    <SearchBox
      {...props}
      classNames={{
        root: "w-full",
        form: "w-full",
        input:
          "w-full pl-12 pr-4 py-4 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 text-base shadow-sm transition-all duration-200 hover:shadow-md",
        submit: "hidden",
        reset:
          "absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-600 transition-colors",
        loadingIndicator: "absolute right-14 top-1/2 -translate-y-1/2",
      }}
      placeholder="Search for businesses near you..."
      submitIconComponent={() => null}
    />
  </div>
);

const CustomRefinementList = ({ ...props }) => (
  <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 mb-6">
    <div className="flex items-center gap-2 mb-4">
      <div className="p-1.5 bg-blue-100 rounded-lg">
        <Filter className="w-4 h-4 text-blue-600" />
      </div>
      <h3 className="font-semibold text-gray-900">Business Type</h3>
    </div>
    <RefinementList
      {...props}
      classNames={{
        root: "",
        list: "space-y-3",
        item: "flex items-center",
        label: "flex items-center cursor-pointer group w-full",
        checkbox:
          "w-4 h-4 rounded border-2 border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 bg-white transition-colors",
        labelText:
          "ml-3 text-sm text-gray-700 group-hover:text-gray-900 transition-colors flex-1",
        count:
          "ml-auto text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-md font-medium",
      }}
      operator="or"
      showMore
    />
  </div>
);

const CustomSortBy = ({ ...props }) => (
  <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
    <div className="flex items-center gap-2 mb-4">
      <div className="p-1.5 bg-green-100 rounded-lg">
        <Clock className="w-4 h-4 text-green-600" />
      </div>
      <h3 className="font-semibold text-gray-900">Sort By</h3>
    </div>
    <SortBy
      {...props}
      classNames={{
        root: "w-full",
        select:
          "w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 transition-all duration-200 hover:border-gray-300",
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
);

const SearchPage = () => {
  const [userLocation, setUserLocation] = useState(null);
  const [locationStatus, setLocationStatus] = useState("pending");
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

  useEffect(() => {
    getLocation();
  }, []);

  const customHitComponent = (props) => (
    <Hit {...props} userLocation={userLocation} />
  );

  // Build Configure props based on available location
  const configureProps = userLocation
    ? {
        aroundLatLngViaIP: false,
        aroundLatLng: `${userLocation.latitude}, ${userLocation.longitude}`,
        aroundRadius: 100000, // 100km search radius; tweak as needed
        getRankingInfo: true,
        hitsPerPage: 10,
      }
    : {
        aroundLatLngViaIP: true,
        getRankingInfo: true,
        hitsPerPage: 10,
      };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <div className="mx-auto flex gap-8 px-4 md:px-6 lg:gap-12 max-w-7xl pt-8 pb-12">
        <div className="flex-1">
          <InstantSearch
            searchClient={searchClient}
            indexName="business"
            insights
          >
            <Configure hitsPerPage={10} />

            {/* Header Section */}
            <div className="mb-8">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-8">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    Discover Businesses
                  </h1>
                  <p className="text-gray-600">
                    Find and connect with local businesses in your area
                  </p>
                </div>

                {locationStatus !== "granted" && (
                  <Button
                    variant="outline"
                    className="flex items-center gap-3 px-6 py-3 rounded-xl border-2 hover:bg-blue-50 hover:border-blue-200 transition-all duration-200"
                    onClick={getLocation}
                    disabled={locationStatus === "loading"}
                  >
                    <MapPin className="w-5 h-5" />
                    <span className="font-medium">
                      {locationStatus === "loading"
                        ? "Getting location..."
                        : "Enable location"}
                    </span>
                  </Button>
                )}

                {userLocation && (
                  <div className="inline-flex items-center gap-3 px-4 py-2 bg-green-50 text-green-700 rounded-xl border border-green-200">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <Navigation className="w-4 h-4" />
                    <span className="font-medium">Location active</span>
                    {googleLoading && (
                      <span className="text-xs text-green-600 opacity-75">
                        (Loading maps...)
                      </span>
                    )}
                  </div>
                )}
              </div>

              <CustomSearchBox />
            </div>

            <div className="flex flex-col lg:flex-row gap-8">
              {/* Sidebar Filters */}
              <div className="w-full lg:w-80 flex-shrink-0">
                <div className="sticky top-6 space-y-6">
                  <CustomRefinementList attribute="business_type" />
                  <CustomSortBy />
                </div>
              </div>

              {/* Main Content */}
              <div className="flex-1 min-w-0">
                {/* Stats */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-6">
                  <Stats
                    classNames={{
                      root: "text-sm font-medium text-gray-600",
                    }}
                    translations={{
                      stats: (nbHits) =>
                        `${nbHits.toLocaleString()} ${nbHits === 1 ? "business" : "businesses"} found`,
                    }}
                  />
                </div>

                {/* Results */}
                <div className="space-y-4 mb-8">
                  <Hits
                    hitComponent={customHitComponent}
                    classNames={{ root: "", list: "space-y-4" }}
                  />
                </div>

                {/* Pagination */}
                <div className="flex justify-center">
                  <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                    <Pagination
                      classNames={{
                        root: "",
                        list: "flex items-center gap-2",
                        item: "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                        selectedItem: "bg-blue-600 text-white shadow-md",
                        disabledItem: "opacity-40 cursor-not-allowed",
                        link: "hover:bg-gray-100 text-gray-700 hover:text-gray-900",
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </InstantSearch>
        </div>
      </div>
    </div>
  );
};

export default SearchPage;
