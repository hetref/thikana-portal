import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Info,
  User,
  Phone,
  MapPin,
  Mail,
  Globe,
  FileText,
  Clock,
  CalendarDays,
  ExternalLink,
  MapIcon,
  Building,
  Tag,
  Check,
  Briefcase,
  Facebook,
  Instagram,
  Twitter,
  Linkedin,
  Youtube,
  FileCheck,
} from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const InfoItem = ({ icon: Icon, label, value, isLink, linkTarget }) => {
  if (!value) return null;

  return (
    <div className="flex items-start gap-3 py-2">
      <div className="mt-0.5 rounded-md bg-muted p-1.5 text-muted-foreground">
        <Icon className="h-4 w-4" />
      </div>
      <div className="space-y-0.5">
        <p className="text-xs text-muted-foreground">{label}</p>
        {isLink ? (
          <Link
            href={value}
            target={linkTarget || "_blank"}
            className="text-sm text-primary hover:underline flex items-center gap-1"
          >
            {value}
            <ExternalLink className="h-3 w-3" />
          </Link>
        ) : (
          <p className="text-sm font-medium">{value}</p>
        )}
      </div>
    </div>
  );
};

// Helper function to get social media icon
const getSocialMediaIcon = (platform) => {
  const loweredPlatform = platform.toLowerCase();
  if (loweredPlatform.includes("facebook")) return Facebook;
  if (loweredPlatform.includes("instagram")) return Instagram;
  if (loweredPlatform.includes("twitter") || loweredPlatform.includes("x"))
    return Twitter;
  if (loweredPlatform.includes("linkedin")) return Linkedin;
  if (loweredPlatform.includes("youtube")) return Youtube;
  return Globe;
};

const MoreInformationDialog = ({ userData, buttonClassName }) => {
  if (!userData) return null;

  const joinedDate = userData?.createdAt
    ? new Date(userData.createdAt.seconds * 1000).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

  // Format registration date if exists
  const registrationDate = userData?.registrationDate
    ? new Date(userData.registrationDate).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          className={buttonClassName || ""}
        >
          <Info className="w-4 h-4 mr-2" />
          Info
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-3">
            <Avatar className="h-14 w-14 border">
              <AvatarImage
                src={userData?.profilePic || "/avatar.png"}
                alt={userData?.businessName}
              />
              <AvatarFallback>
                {userData?.businessName?.charAt(0) || "B"}
              </AvatarFallback>
            </Avatar>
            <div>
              <DialogTitle className="text-xl font-bold">
                {userData?.businessName}
              </DialogTitle>
              <div className="flex gap-1 flex-wrap mt-1">
                {userData?.business_type && (
                  <Badge variant="outline" className="capitalize">
                    {userData.business_type}
                  </Badge>
                )}
                {userData?.business_categories?.map((category) => (
                  <Badge
                    key={category}
                    variant="secondary"
                    className="capitalize"
                  >
                    {category}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          {userData?.bio && (
            <DialogDescription className="text-sm leading-relaxed border-l-2 border-primary/20 pl-3 italic">
              {userData.bio}
            </DialogDescription>
          )}
        </DialogHeader>

        <Tabs defaultValue="basic" className="mt-3">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">Basic</TabsTrigger>
            <TabsTrigger value="business">Business</TabsTrigger>
            <TabsTrigger value="hours">Hours</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="mt-3 space-y-1">
            <h3 className="text-sm font-medium flex items-center gap-1 text-muted-foreground mb-1">
              <User className="h-3.5 w-3.5" />
              Contact Information
            </h3>
            <div className="space-y-0.5 divide-y divide-border/40">
              <InfoItem icon={User} label="Owner" value={userData?.name} />
              <InfoItem icon={Phone} label="Phone" value={userData?.phone} />
              <InfoItem
                icon={MapPin}
                label="Address"
                value={userData?.address}
              />
              <InfoItem icon={Mail} label="Email" value={userData?.email} />
              <InfoItem
                icon={Globe}
                label="Website"
                value={userData?.website}
                isLink={true}
              />
              {joinedDate && (
                <InfoItem
                  icon={CalendarDays}
                  label="Joined"
                  value={joinedDate}
                />
              )}
              {userData?.business_type && (
                <InfoItem
                  icon={Briefcase}
                  label="Business Type"
                  value={userData.business_type}
                />
              )}
            </div>

            {userData?.businessTags && userData.businessTags.length > 0 && (
              <div className="mt-3">
                <h3 className="text-sm font-medium flex items-center gap-1 text-muted-foreground mb-2">
                  <Tag className="h-3.5 w-3.5" />
                  Business Tags
                </h3>
                <div className="flex flex-wrap gap-1">
                  {userData.businessTags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="business" className="mt-3 space-y-3">
            <h3 className="text-sm font-medium flex items-center gap-1 text-muted-foreground mb-1">
              <Building className="h-3.5 w-3.5" />
              Business Details
            </h3>
            <div className="space-y-0.5 divide-y divide-border/40">
              {userData?.businessLicense && (
                <InfoItem
                  icon={FileCheck}
                  label="Business License"
                  value={userData.businessLicense}
                />
              )}
              {userData?.gstinNumber && (
                <InfoItem
                  icon={FileText}
                  label="GSTIN Number"
                  value={userData.gstinNumber}
                />
              )}
              {registrationDate && (
                <InfoItem
                  icon={CalendarDays}
                  label="Registered On"
                  value={registrationDate}
                />
              )}
            </div>

            {userData?.about && (
              <div className="mt-3">
                <h3 className="text-sm font-medium flex items-center gap-1 text-muted-foreground mb-1">
                  <Briefcase className="h-3.5 w-3.5" />
                  About the Business
                </h3>
                <p className="text-sm mt-1 text-muted-foreground leading-relaxed">
                  {userData.about.length > 150
                    ? `${userData.about.substring(0, 150)}...`
                    : userData.about}
                </p>
              </div>
            )}

            {userData?.socialMediaLinks &&
              userData.socialMediaLinks.length > 0 && (
                <div className="mt-3">
                  <h3 className="text-sm font-medium flex items-center gap-1 text-muted-foreground mb-2">
                    <Globe className="h-3.5 w-3.5" />
                    Social Media
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {userData.socialMediaLinks.map((link, index) => {
                      if (!link.platform || !link.url) return null;
                      const SocialIcon = getSocialMediaIcon(link.platform);
                      return (
                        <Link
                          key={index}
                          href={link.url}
                          target="_blank"
                          className="p-1.5 bg-muted rounded-md hover:bg-muted/80 transition-colors"
                        >
                          <SocialIcon className="h-4 w-4 text-muted-foreground" />
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
          </TabsContent>

          <TabsContent value="hours" className="mt-3">
            <h3 className="text-sm font-medium flex items-center gap-1 text-muted-foreground mb-1">
              <Clock className="h-3.5 w-3.5" />
              Operational Hours
            </h3>
            {userData?.operationalHours &&
            userData.operationalHours.length > 0 ? (
              <div className="divide-y divide-border/40 rounded-md overflow-hidden mt-2 bg-muted/30">
                {userData.operationalHours.map((hours, index) => {
                  if (!hours.openTime && !hours.closeTime) return null;
                  return (
                    <div
                      key={index}
                      className="px-3 py-2 flex justify-between text-sm"
                    >
                      <span className="font-medium">{hours.day}</span>
                      {hours.openTime && hours.closeTime ? (
                        <span>
                          {hours.openTime} - {hours.closeTime}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Closed</span>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground mt-2">
                No operational hours specified.
              </p>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-4 flex justify-end gap-2">
          {userData?.website && (
            <Button asChild variant="outline" size="sm" className="gap-1">
              <Link href={userData.website} target="_blank">
                <Globe className="h-3.5 w-3.5" />
                Visit Website
              </Link>
            </Button>
          )}
          <DialogTrigger asChild>
            <Button size="sm">Close</Button>
          </DialogTrigger>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MoreInformationDialog;
