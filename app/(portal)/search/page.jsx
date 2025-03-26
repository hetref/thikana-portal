"use client";
import React, { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import WhoToFollow from "@/components/WhoToFollow";
import { auth, db } from "@/lib/firebase";
import algoliasearch from "algoliasearch/lite";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  startAt,
  endAt,
  limit,
} from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import Loader from "@/components/Loader";
import { Search, MapPin, Filter } from "lucide-react";
import Link from "next/link";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { userEmailStatus } from "@/utils/userStatus";
import { sendEmailVerification } from "firebase/auth";
import toast from "react-hot-toast";

// Initialize the Algolia client
const searchClient = algoliasearch(
  "CRYYQ8GU5K",
  "8a0627b687edd4153fbd56237341f3ea"
);
const index = searchClient.initIndex("businesses_index");

const SearchPage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [planFilters, setPlanFilters] = useState({
    basic: true,
    premium: true,
    enterprise: true,
  });
  const [sortBy, setSortBy] = useState("relevance");
  const [userLocation, setUserLocation] = useState(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          console.error("Error getting location:", error);
        }
      );
    }

    // Load popular businesses initially
    loadPopularBusinesses();
  }, []);

  // Check for email verification
  if (userEmailStatus() === false) {
    const verifyEmailHandler = async () => {
      await sendEmailVerification(auth.currentUser)
        .then(() => {
          toast.success("Verification email sent!");
        })
        .catch((error) => {
          toast.error("Error sending verification email: " + error.code);
        });
    };
    return (
      <div className="flex flex-col gap-4 justify-center items-center min-h-[500px]">
        <p>Please verify your email to continue</p>
        <Button onClick={verifyEmailHandler} className="bg-emerald-800 mt-1">
          Verify Email
        </Button>
      </div>
    );
  }

  // Calculate distance between two points
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;

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
    return parseFloat((R * c).toFixed(1));
  };

  const loadPopularBusinesses = async () => {
    setLoading(true);
    setInitialLoad(true);
    try {
      // Get popular businesses from Algolia
      const { hits } = await index.search("", {
        hitsPerPage: 20,
      });

      if (hits.length === 0) {
        setSearchResults([]);
        setLoading(false);
        setInitialLoad(false);
        return;
      }

      // Fetch additional details from Firestore for each hit
      const businessIds = hits.map((hit) => hit.objectID);
      const businessDetails = await getBusinessDetails(businessIds);

      setSearchResults(businessDetails);
    } catch (error) {
      console.error("Error loading popular businesses:", error);
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  };

  // Helper function to get business details from Firestore
  const getBusinessDetails = async (businessIds) => {
    const businessDetails = [];

    try {
      const businessesRef = collection(db, "users");
      const businessQuery = query(
        businessesRef,
        where("role", "==", "business"),
        where("__name__", "in", businessIds)
      );

      const businessSnapshot = await getDocs(businessQuery);

      businessSnapshot.forEach((doc) => {
        const data = doc.data();
        let distance = null;

        if (userLocation && data.location) {
          distance = calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            data.location.latitude,
            data.location.longitude
          );
        }

        businessDetails.push({
          id: doc.id,
          businessName: data.businessName || data.name || "Unknown Business",
          businessType: data.businessType || "Business",
          username: data.username || "user",
          profilePic: data.profilePic || "",
          location: data.location || null,
          distance: distance,
          plan: data.plan || "basic",
        });
      });

      return businessDetails;
    } catch (error) {
      console.error("Error getting business details:", error);
      return [];
    }
  };

  const handleSearch = async () => {
    if (!searchQuery && (!businessType || businessType === "all")) {
      loadPopularBusinesses();
      return;
    }

    setLoading(true);
    try {
      // Configure search parameters for Algolia
      const searchParams = {
        hitsPerPage: 50,
      };

      // Add filters for business type if specified
      if (businessType && businessType !== "all") {
        searchParams.filters = `business_type:${businessType}`;
      }

      // Search in Algolia
      const { hits } = await index.search(searchQuery, searchParams);

      if (hits.length === 0) {
        setSearchResults([]);
        setLoading(false);
        return;
      }

      // Fetch additional details from Firestore
      const businessIds = hits.map((hit) => hit.objectID);
      let businessDetails = await getBusinessDetails(businessIds);

      // Apply plan filters
      businessDetails = businessDetails.filter(
        (business) => planFilters[business.plan]
      );

      // Sort results
      if (sortBy === "distance" && userLocation) {
        businessDetails.sort((a, b) => {
          if (a.distance === null) return 1;
          if (b.distance === null) return -1;
          return a.distance - b.distance;
        });
      } else if (sortBy === "name") {
        businessDetails.sort((a, b) =>
          a.businessName.localeCompare(b.businessName)
        );
      }
      // For relevance, we keep the Algolia ranking

      setSearchResults(businessDetails);
    } catch (error) {
      console.error("Error searching businesses:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlanFilterChange = (plan) => {
    setPlanFilters({
      ...planFilters,
      [plan]: !planFilters[plan],
    });
  };

  const handleSortChange = (value) => {
    setSortBy(value);

    let sortedResults = [...searchResults];

    if (value === "distance" && userLocation) {
      sortedResults.sort((a, b) => {
        if (a.distance === null) return 1;
        if (b.distance === null) return -1;
        return a.distance - b.distance;
      });
    } else if (value === "name") {
      sortedResults.sort((a, b) =>
        a.businessName.localeCompare(b.businessName)
      );
    }

    setSearchResults(sortedResults);
  };

  return (
    <div className="mx-auto flex gap-6 px-4 md:px-6 lg:gap-10 max-w-7xl">
      <div className="hidden md:block">
        <Sidebar />
      </div>
      <div className="flex-1">
        <div className="my-4 space-y-4">
          <h1 className="text-2xl font-bold">Search Businesses</h1>

          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search businesses..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
              </div>

              <Select value={businessType} onValueChange={setBusinessType}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Business type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="Restaurant">Restaurant</SelectItem>
                  <SelectItem value="Retail">Retail</SelectItem>
                  <SelectItem value="Service">Service</SelectItem>
                  <SelectItem value="Technology">Technology</SelectItem>
                  <SelectItem value="Healthcare">Healthcare</SelectItem>
                  <SelectItem value="Education">Education</SelectItem>
                </SelectContent>
              </Select>

              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon">
                    <Filter className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent>
                  <SheetHeader>
                    <SheetTitle>Search Filters</SheetTitle>
                  </SheetHeader>
                  <div className="mt-4 space-y-4">
                    <div>
                      <h3 className="mb-2 font-medium">Business Plan</h3>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="basic"
                            checked={planFilters.basic}
                            onCheckedChange={() =>
                              handlePlanFilterChange("basic")
                            }
                          />
                          <Label htmlFor="basic">Basic</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="premium"
                            checked={planFilters.premium}
                            onCheckedChange={() =>
                              handlePlanFilterChange("premium")
                            }
                          />
                          <Label htmlFor="premium">Premium</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="enterprise"
                            checked={planFilters.enterprise}
                            onCheckedChange={() =>
                              handlePlanFilterChange("enterprise")
                            }
                          />
                          <Label htmlFor="enterprise">Enterprise</Label>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h3 className="mb-2 font-medium">Sort By</h3>
                      <Select value={sortBy} onValueChange={handleSortChange}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="relevance">Relevance</SelectItem>
                          <SelectItem value="distance">Distance</SelectItem>
                          <SelectItem value="name">Name (A-Z)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="pt-4">
                      <Button onClick={handleSearch} className="w-full">
                        Apply Filters
                      </Button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>

              <Button onClick={handleSearch}>Search</Button>
            </div>

            {initialLoad && loading ? (
              <div className="flex justify-center my-8">
                <Loader />
              </div>
            ) : (
              <>
                {searchResults.length === 0 ? (
                  <div className="text-center p-8 border rounded-md">
                    <p className="text-muted-foreground">
                      No businesses found. Try a different search query.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4 mt-4">
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-muted-foreground">
                        {searchResults.length}{" "}
                        {searchResults.length === 1 ? "business" : "businesses"}{" "}
                        found
                      </p>
                      <Select value={sortBy} onValueChange={handleSortChange}>
                        <SelectTrigger className="w-[150px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="relevance">Relevance</SelectItem>
                          <SelectItem value="distance">Distance</SelectItem>
                          <SelectItem value="name">Name (A-Z)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid gap-4">
                      {searchResults.map((business) => (
                        <Link
                          key={business.id}
                          href={`/${business.username}?user=${business.id}`}
                          className="block"
                        >
                          <div className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                            <div className="flex items-center gap-4">
                              <Avatar className="h-12 w-12">
                                <AvatarImage
                                  src={business.profilePic}
                                  alt={business.businessName}
                                />
                              </Avatar>
                              <div className="flex-1">
                                <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                                  <div>
                                    <h3 className="font-semibold">
                                      {business.businessName}
                                    </h3>
                                    <p className="text-sm text-muted-foreground">
                                      @{business.username}
                                    </p>
                                  </div>
                                  <Badge
                                    variant="outline"
                                    className="hidden md:inline-flex capitalize"
                                  >
                                    {business.plan} plan
                                  </Badge>
                                </div>
                                <div className="mt-1 flex flex-wrap gap-2">
                                  <Badge variant="secondary">
                                    {business.businessType}
                                  </Badge>
                                  {business.distance !== null && (
                                    <div className="flex items-center text-xs text-muted-foreground">
                                      <MapPin className="mr-1 h-3 w-3" />
                                      {business.distance} km away
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
      <div className="hidden lg:block">
        <WhoToFollow />
      </div>
    </div>
  );
};

export default SearchPage;
