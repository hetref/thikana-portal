"use client";
import { useState, useEffect } from "react";
import ServiceDialog from "@/components/service/ServiceDialog";
import { getService } from "@/lib/services-operations";
import { Card, CardContent } from "./ui/card";
import Image from "next/image";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { FileBox, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import useBusinessIdForMember from "@/hooks/useBusinessIdForMember";

export function ServicesGrid({ userId, userData, userType = "customer" }) {
  const [selectedService, setSelectedService] = useState(null);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedServiceData, setSelectedServiceData] = useState(null);

  // Use our custom hook to get the appropriate ID for fetching data
  const {
    targetId,
    isMember,
    loading: idLoading,
  } = useBusinessIdForMember(userId);

  useEffect(() => {
    if (idLoading) return; // Wait until we know if the user is a member

    const servicesCol = collection(db, `users/${targetId}/services`);
    const unsubscribe = onSnapshot(
      servicesCol,
      (servicesSnapshot) => {
        if (!servicesSnapshot.empty) {
          const servicesData = servicesSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setServices(servicesData);
        } else {
          setServices([]);
        }
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching services:", error);
        setError("Failed to fetch services. Please try again.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [targetId, idLoading]);

  useEffect(() => {
    const fetchSelectedService = async () => {
      if (selectedService) {
        try {
          // Use targetId instead of userId to get the correct service
          const serviceData = await getService(targetId, selectedService);
          setSelectedServiceData(serviceData);
        } catch (error) {
          console.error("Error fetching selected service:", error);
          setError("Failed to fetch selected service. Please try again.");
        }
      }
    };

    if (!idLoading && selectedService) {
      fetchSelectedService();
    }
  }, [selectedService, targetId, idLoading]);

  if (idLoading || loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader/>
        <p className="text-muted-foreground">Loading services...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <AlertCircle className="w-12 h-12 text-destructive/70 mb-4" />
        <p className="text-destructive font-medium mb-1">
          Something went wrong
        </p>
        <p className="text-muted-foreground text-sm">{error}</p>
      </div>
    );
  }

  if (services.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <FileBox className="w-16 h-16 text-muted-foreground/30 mb-4" />
        <h3 className="text-lg font-medium text-gray-800 mb-2">
          No services added yet
        </h3>
        <p className="text-muted-foreground text-sm max-w-md">
          {isMember
            ? "The business hasn't added any services to its offerings."
            : "This business hasn't added any services to its offerings."}
        </p>
      </div>
    );
  }

  return (
    <>
      {isMember && (
        <div className="mb-4 p-2 bg-violet-50 text-violet-700 rounded-md text-sm">
          Showing services from your business
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6">
        {services.map((service) => (
          <Card
            className="overflow-hidden hover:shadow-lg transition-all duration-300 border border-gray-100"
            onClick={() => setSelectedService(service.id)}
            key={service.id}
          >
            <div className="aspect-square relative bg-gray-50 overflow-hidden">
              <Image
                src={service.imageUrl || "/service-placeholder.png"}
                alt={service.title}
                fill
                className="object-cover hover:scale-105 transition-transform duration-300"
              />
              {service.available === false && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                  <Badge
                    variant="destructive"
                    className="text-sm px-3 py-1.5 font-medium uppercase"
                  >
                    Unavailable
                  </Badge>
                </div>
              )}
            </div>
            <CardContent className="p-4">
              <h3 className="font-semibold text-lg mb-1 truncate">
                {service.title}
              </h3>
              <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                {service.description}
              </p>
              <div className="flex items-center justify-between">
                <p className="font-bold text-lg text-primary">
                  ₹{service.price?.toFixed(2) || "0.00"}
                </p>
                <Badge
                  variant={service.available ? "secondary" : "destructive"}
                  className="text-xs"
                >
                  {service.available ? "Available" : "Unavailable"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {selectedService && targetId && selectedServiceData && (
        <ServiceDialog
          service={selectedServiceData}
          isOpen={!!selectedService}
          onClose={() => {
            setSelectedService(null);
            setSelectedServiceData(null);
          }}
          userId={targetId}
          userData={userData}
          userType={userType}
        />
      )}
    </>
  );
}
