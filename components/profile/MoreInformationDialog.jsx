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
} from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

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

const MoreInformationDialog = ({ userData }) => {
  if (!userData) return null;

  const joinedDate = userData?.createdAt
    ? new Date(userData.createdAt.seconds * 1000).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="">
          <Info className="w-4 h-4 mr-1" />
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
              {userData?.business_type && (
                <Badge variant="outline" className="mt-1">
                  {userData.business_type}
                </Badge>
              )}
            </div>
          </div>
          {userData?.bio && (
            <DialogDescription className="text-sm leading-relaxed border-l-2 border-primary/20 pl-3 italic">
              {userData.bio}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="mt-3 space-y-1">
          <h3 className="text-sm font-medium flex items-center gap-1 text-muted-foreground mb-1">
            <Building className="h-3.5 w-3.5" />
            Business Details
          </h3>
          <div className="space-y-0.5 divide-y divide-border/40">
            <InfoItem icon={User} label="Owner" value={userData?.name} />
            <InfoItem icon={Phone} label="Phone" value={userData?.phone} />
            <InfoItem icon={MapPin} label="Address" value={userData?.address} />
            <InfoItem icon={Mail} label="Email" value={userData?.email} />
            <InfoItem
              icon={Globe}
              label="Website"
              value={userData?.website}
              isLink={true}
            />
            {joinedDate && (
              <InfoItem icon={CalendarDays} label="Joined" value={joinedDate} />
            )}
          </div>
        </div>

        {userData?.locations && (
          <div className="mt-3">
            <h3 className="text-sm font-medium flex items-center gap-1 text-muted-foreground mb-1">
              <MapIcon className="h-3.5 w-3.5" />
              Locations
            </h3>
            <div className="border rounded-md p-2 bg-muted/30 text-sm">
              <p className="text-muted-foreground">
                {userData?.locations?.address}
              </p>
            </div>
          </div>
        )}

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
