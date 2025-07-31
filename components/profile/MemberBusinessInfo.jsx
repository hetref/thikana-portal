"use client";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Building,
  MapPin,
  Phone,
  Mail,
  Globe,
  Package,
  Clock,
  Info,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function MemberBusinessInfo({ userData }) {
  const [showBusinessCard, setShowBusinessCard] = useState(false);

  // If user is not a member or doesn't have business data, don't show anything
  if (!userData || userData.role !== "member") {
    return null;
  }

  return (
    <Card className="bg-white border-0 shadow-sm">
      <CardHeader className="space-y-0 pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Building className="h-5 w-5 text-primary" />
          Business Information
          <Badge
            variant="outline"
            className="ml-2 bg-violet-50 text-violet-600 border-violet-200 text-xs"
          >
            Member
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {userData.logo ? (
                <Image
                  src={userData.logo}
                  alt={userData.businessName || "Business Logo"}
                  width={50}
                  height={50}
                  className="rounded-md object-cover border border-gray-200"
                />
              ) : (
                <div className="w-[50px] h-[50px] rounded-md bg-gray-100 flex items-center justify-center">
                  <Building className="h-6 w-6 text-gray-400" />
                </div>
              )}
              <div>
                <h3 className="font-medium text-gray-900">
                  {userData.businessName || "Business Name"}
                </h3>
                <p className="text-sm text-gray-500">
                  You are a member of this business
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowBusinessCard(!showBusinessCard)}
              className="text-gray-500"
            >
              {showBusinessCard ? (
                <>
                  <ChevronUp className="h-4 w-4 mr-1" />
                  Hide
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4 mr-1" />
                  Show
                </>
              )}
            </Button>
          </div>

          {showBusinessCard && (
            <div className="space-y-4 pt-2 border-t">
              {/* Cover image */}
              {userData.coverPic && (
                <div className="w-full h-[120px] relative rounded-md overflow-hidden">
                  <Image
                    src={userData.coverPic}
                    alt="Business Cover"
                    fill
                    className="object-cover"
                  />
                </div>
              )}

              {/* Business bio */}
              {userData.bio && (
                <div className="text-sm text-gray-600">
                  <p>{userData.bio}</p>
                </div>
              )}

              {/* Business address */}
              {userData.locations?.address && (
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">
                    {userData.locations.address}
                  </span>
                </div>
              )}

              {/* Business website */}
              {userData.website && (
                <div className="flex items-center gap-2 text-sm">
                  <Globe className="h-4 w-4 text-gray-500 flex-shrink-0" />
                  <a
                    href={
                      userData.website.startsWith("http")
                        ? userData.website
                        : `https://${userData.website}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {userData.website}
                  </a>
                </div>
              )}

              {/* Business category */}
              {userData.categories && userData.categories.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {userData.categories.map((category, index) => (
                    <Badge
                      key={index}
                      variant="outline"
                      className="bg-gray-50 text-gray-700"
                    >
                      {category}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Dashboard Link */}
              <Button asChild variant="default" size="sm" className="w-full">
                <Link href="/dashboard">
                  <Info className="h-4 w-4 mr-2" />
                  Go to Dashboard
                </Link>
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
