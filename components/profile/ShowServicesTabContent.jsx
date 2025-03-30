"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy, where } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Settings, ArrowRight, Clock, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export default function ShowServicesTabContent({ userId, userData }) {
  const router = useRouter();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const servicesRef = collection(db, "users", userId, "services");
        const q = query(servicesRef, orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);

        const servicesData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setServices(servicesData);
      } catch (error) {
        console.error("Error fetching services:", error);
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchServices();
    }
  }, [userId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Services</h2>
          <p className="text-sm text-muted-foreground">
            Services offered by {userData?.businessName || "your business"}
          </p>
        </div>
        <Link href="/profile/services">
          <Button className="bg-black hover:bg-black/90">
            <Settings className="w-4 h-4 mr-2" />
            Manage Services
          </Button>
        </Link>
      </div> */}

      {services.length === 0 ? (
        <div className="text-center py-10 rounded-lg">
          <Settings className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">
            No services yet
          </h3>
          <p className="text-gray-500 mb-4 max-w-md mx-auto">
            Start adding services that your business offers to attract more
            customers.
          </p>
          <Link href="/profile/services">
            <Button className="bg-black hover:bg-black/90">
              Add Your First Service
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {services.map((service) => (
            <Card
              key={service.id}
              className="overflow-hidden hover:shadow-md transition-all"
            >
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold">
                  {service.name}
                </CardTitle>
                <div className="flex justify-between items-center">
                  <Badge
                    variant="secondary"
                    className="mt-2 bg-primary/10 text-primary hover:bg-primary/20"
                  >
                    ₹{service.price}
                  </Badge>
                  <div className="flex items-center text-muted-foreground text-sm">
                    <Clock className="h-3.5 w-3.5 mr-1" />
                    {service.duration}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <p className="text-gray-600 text-sm line-clamp-3">
                  {service.description}
                </p>
              </CardContent>
              <CardFooter className="border-t flex justify-between pt-4 pb-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push(`/profile/services`)}
                  className="text-primary hover:text-primary-hover hover:bg-primary/5"
                >
                  Contact Business
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push(`/profile/services`)}
                  className="text-white bg-black hover:text-white/80 hover:bg-black/80"
                >
                  Buy Service
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
