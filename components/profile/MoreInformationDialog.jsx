import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Info } from "lucide-react";
import Link from "next/link";

const MoreInformationDialog = ({ userData }) => {
  return (
    <div>
      <Dialog>
        <DialogTrigger>
          <Button variant="ghost">
            <Info className="w-4 h-4" />
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{userData?.businessName}</DialogTitle>
            <DialogDescription>
              {/* Owner Name, Phone, Address, Email, Website, Bio */}
              <div className="mt-4">
                <h4 className="font-semibold text-base">Owner</h4>
                <p>{userData?.name}</p>
              </div>
              <div className="mt-4">
                <h4 className="font-semibold text-base">Phone</h4>
                <p>{userData?.phone}</p>
              </div>
              <div className="mt-4">
                <h4 className="font-semibold text-base">Address</h4>
                <p>{userData?.address}</p>
              </div>
              <div className="mt-4">
                <h4 className="font-semibold text-base">Email</h4>
                <p>{userData?.email}</p>
              </div>
              <div className="mt-4">
                <h4 className="font-semibold text-base">Website</h4>
                <p>
                  <Link href={userData?.website || "#"} target="_blank">
                    {userData?.website}
                  </Link>
                </p>
              </div>
              <div className="mt-4">
                <h4 className="font-semibold text-base">Bio</h4>
                <p>{userData?.bio}</p>
              </div>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MoreInformationDialog;
