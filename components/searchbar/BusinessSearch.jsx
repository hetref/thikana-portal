import React, { useState, useEffect } from "react";
import { auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
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

// Demo data for businesses
const DEMO_BUSINESSES = [
  {
    id: "business1",
    businessName: "Café Delicious",
    businessType: "Restaurant",
    username: "cafedelicious",
    profilePic: "https://randomuser.me/api/portraits/men/32.jpg",
    location: { latitude: 19.076, longitude: 72.8777 },
    plan: "premium",
    distance: 1.2,
  },
  {
    id: "business2",
    businessName: "Tech Solutions",
    businessType: "Technology",
    username: "techsolutions",
    profilePic: "https://randomuser.me/api/portraits/women/44.jpg",
    location: { latitude: 19.0822, longitude: 72.8812 },
    plan: "enterprise",
    distance: 2.5,
  },
  {
    id: "business3",
    businessName: "Fresh Groceries",
    businessType: "Retail",
    username: "freshgroceries",
    profilePic: "https://randomuser.me/api/portraits/men/22.jpg",
    location: { latitude: 19.06, longitude: 72.89 },
    plan: "basic",
    distance: 3.7,
  },
  {
    id: "business4",
    businessName: "City Hospital",
    businessType: "Healthcare",
    username: "cityhospital",
    profilePic: "https://randomuser.me/api/portraits/women/24.jpg",
    location: { latitude: 19.05, longitude: 72.86 },
    plan: "premium",
    distance: 4.2,
  },
  {
    id: "business5",
    businessName: "Learning Academy",
    businessType: "Education",
    username: "learningacademy",
    profilePic: "https://randomuser.me/api/portraits/men/66.jpg",
    location: { latitude: 19.09, longitude: 72.87 },
    plan: "basic",
    distance: 5.1,
  },
  {
    id: "business6",
    businessName: "Spa & Wellness",
    businessType: "Service",
    username: "spawellness",
    profilePic: "https://randomuser.me/api/portraits/women/55.jpg",
    location: { latitude: 19.1, longitude: 72.865 },
    plan: "premium",
    distance: 6.3,
  },
  {
    id: "business7",
    businessName: "Fashion Store",
    businessType: "Retail",
    username: "fashionstore",
    profilePic: "https://randomuser.me/api/portraits/women/33.jpg",
    location: { latitude: 19.075, longitude: 72.855 },
    plan: "enterprise",
    distance: 2.8,
  },
  {
    id: "business8",
    businessName: "Code Masters",
    businessType: "Technology",
    username: "codemasters",
    profilePic: "https://randomuser.me/api/portraits/men/45.jpg",
    location: { latitude: 19.095, longitude: 72.889 },
    plan: "basic",
    distance: 5.5,
  },
];

const BusinessSearch = () => {
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

  const loadPopularBusinesses = async () => {
    setLoading(true);
    setInitialLoad(true);

    try {
      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 800));

      // Set the demo businesses as results
      setSearchResults(DEMO_BUSINESSES);
    } catch (error) {
      console.error("Error loading popular businesses:", error);
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  };

  const handleSearch = async () => {
    setLoading(true);

    try {
      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Filter demo businesses based on search query and filters
      let filteredResults = [...DEMO_BUSINESSES];

      // Filter by search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filteredResults = filteredResults.filter(
          (business) =>
            business.businessName.toLowerCase().includes(query) ||
            business.username.toLowerCase().includes(query)
        );
      }

      // Filter by business type
      if (businessType && businessType !== "all") {
        filteredResults = filteredResults.filter(
          (business) => business.businessType === businessType
        );
      }

      // Apply plan filters
      filteredResults = filteredResults.filter(
        (business) => planFilters[business.plan]
      );

      // Sort results
      if (sortBy === "distance") {
        filteredResults.sort((a, b) => a.distance - b.distance);
      } else if (sortBy === "name") {
        filteredResults.sort((a, b) =>
          a.businessName.localeCompare(b.businessName)
        );
      }

      setSearchResults(filteredResults);
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

    if (value === "distance") {
      sortedResults.sort((a, b) => a.distance - b.distance);
    } else if (value === "name") {
      sortedResults.sort((a, b) =>
        a.businessName.localeCompare(b.businessName)
      );
    }

    setSearchResults(sortedResults);
  };

  return (
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
                        onCheckedChange={() => handlePlanFilterChange("basic")}
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
  );
};

export default BusinessSearch;
