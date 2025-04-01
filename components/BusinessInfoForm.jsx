"use client";
import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { auth, db } from "@/lib/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import toast from "react-hot-toast";
import { Loader2, Plus, X } from "lucide-react";

const businessInfoSchema = z.object({
  business_type: z.string().min(1, "Business type is required"),
  gstinNumber: z
    .string()
    .regex(
      /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
      "Invalid GSTIN number"
    )
    .or(z.literal("")),
  businessLicense: z.string().min(1, "Business license number is required"),
  registrationDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)"),
  operationalHours: z.array(
    z.object({
      day: z.string(),
      openTime: z.string(),
      closeTime: z.string(),
    })
  ),
  socialMediaLinks: z.array(
    z.object({
      platform: z.string(),
      url: z.string().url("Invalid URL"),
    })
  ),
});

const days = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const businessTypes = [
  "Retail",
  "Restaurant",
  "Salon",
  "Grocery",
  "Electronics",
  "Clothing",
  "Healthcare",
  "Education",
  "Fitness",
  "Technology",
  "Professional Services",
  "Other",
];

export default function BusinessInfoForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [customBusinessType, setCustomBusinessType] = useState("");
  const [selectedBusinessType, setSelectedBusinessType] = useState("");
  const user = auth.currentUser;

  const form = useForm({
    resolver: zodResolver(businessInfoSchema),
    defaultValues: {
      business_type: "",
      gstinNumber: "",
      businessLicense: "",
      registrationDate: "",
      operationalHours: days.map((day) => ({
        day,
        openTime: "",
        closeTime: "",
      })),
      socialMediaLinks: [{ platform: "", url: "" }],
    },
  });

  useEffect(() => {
    const fetchBusinessData = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }
      try {
        const businessDocRef = doc(db, "businesses", user.uid);
        const businessDocSnap = await getDoc(businessDocRef);
        if (businessDocSnap.exists()) {
          const businessData = businessDocSnap.data();

          // Check if business_type is one of the predefined types or a custom type
          const storedBusinessType = businessData.business_type || "";
          const isCustomType =
            !businessTypes.includes(storedBusinessType) &&
            storedBusinessType !== "";

          setSelectedBusinessType(isCustomType ? "Other" : storedBusinessType);
          setCustomBusinessType(isCustomType ? storedBusinessType : "");

          // Initialize form with existing data
          const formData = {
            business_type: isCustomType ? "Other" : storedBusinessType,
            gstinNumber: businessData.gstinNumber || "",
            businessLicense: businessData.businessLicense || "",
            registrationDate: businessData.registrationDate || "",
            operationalHours:
              businessData.operationalHours ||
              days.map((day) => ({
                day,
                openTime: "",
                closeTime: "",
              })),
            socialMediaLinks: businessData.socialMediaLinks || [
              { platform: "", url: "" },
            ],
          };

          form.reset(formData);
        }
      } catch (error) {
        console.error("Error fetching business data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBusinessData();
  }, [user, form]);

  const handleBusinessTypeChange = (value) => {
    setSelectedBusinessType(value);
    form.setValue("business_type", value);
    if (value !== "Other") {
      setCustomBusinessType("");
    }
  };

  const {
    fields: socialMediaFields,
    append: appendSocialMedia,
    remove: removeSocialMedia,
  } = useFieldArray({
    control: form.control,
    name: "socialMediaLinks",
  });

  async function onSubmit(data) {
    setIsSubmitting(true);
    const toastId = toast.loading("Saving business information...");

    try {
      if (!user) {
        throw new Error("User not authenticated");
      }

      // Determine the final business type to save
      const finalBusinessType =
        selectedBusinessType === "Other" && customBusinessType
          ? customBusinessType
          : selectedBusinessType;

      // Save data to Firestore with the correct business_type
      const businessRef = doc(db, "businesses", user.uid);
      await setDoc(
        businessRef,
        {
          ...data,
          business_type: finalBusinessType,
          updatedAt: new Date(),
        },
        { merge: true }
      );

      toast.success("Business information saved successfully!", {
        id: toastId,
      });
    } catch (error) {
      console.error("Error saving business information:", error);
      toast.error("Failed to save business information. Please try again.", {
        id: toastId,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">
            Loading business information...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-2xl font-semibold mb-6">Business Details</h2>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="business_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Business Type</FormLabel>
                  <Select
                    value={selectedBusinessType}
                    onValueChange={handleBusinessTypeChange}
                  >
                    <FormControl>
                      <SelectTrigger className="bg-gray-50">
                        <SelectValue placeholder="Select business type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {businessTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {selectedBusinessType === "Other" && (
                    <Input
                      placeholder="Specify your business type"
                      value={customBusinessType}
                      onChange={(e) => setCustomBusinessType(e.target.value)}
                      disabled={isSubmitting}
                      className="mt-2 bg-gray-50"
                    />
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="registrationDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Business Registration Date</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      {...field}
                      disabled={isSubmitting}
                      className="bg-gray-50"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="gstinNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>GSTIN Number</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter your GSTIN number"
                      {...field}
                      disabled={isSubmitting}
                      className="bg-gray-50"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="businessLicense"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Business License</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter your business license number"
                      {...field}
                      disabled={isSubmitting}
                      className="bg-gray-50"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="md:col-span-2">
              <h3 className="text-lg font-semibold mb-4">Operational Hours</h3>
              <div className="bg-gray-50 p-4 rounded-md space-y-3">
                <div className="grid grid-cols-3 gap-3 mb-2 text-sm font-medium text-muted-foreground">
                  <div>Day</div>
                  <div>Opening Time</div>
                  <div>Closing Time</div>
                </div>
                {form.watch("operationalHours").map((_, index) => (
                  <div key={index} className="grid grid-cols-3 gap-3">
                    <FormField
                      control={form.control}
                      name={`operationalHours.${index}.day`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              {...field}
                              readOnly
                              disabled={isSubmitting}
                              className="bg-white"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`operationalHours.${index}.openTime`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              type="time"
                              {...field}
                              disabled={isSubmitting}
                              className="bg-white"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`operationalHours.${index}.closeTime`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              type="time"
                              {...field}
                              disabled={isSubmitting}
                              className="bg-white"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="md:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Social Media Links</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => appendSocialMedia({ platform: "", url: "" })}
                  disabled={isSubmitting}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Link
                </Button>
              </div>
              <div className="bg-gray-50 p-4 rounded-md space-y-3">
                {socialMediaFields.map((field, index) => (
                  <div key={field.id} className="flex gap-3 items-start">
                    <FormField
                      control={form.control}
                      name={`socialMediaLinks.${index}.platform`}
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormControl>
                            <Input
                              placeholder="Platform (e.g., Facebook)"
                              {...field}
                              disabled={isSubmitting}
                              className="bg-white"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`socialMediaLinks.${index}.url`}
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormControl>
                            <Input
                              placeholder="URL"
                              {...field}
                              disabled={isSubmitting}
                              className="bg-white"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => removeSocialMedia(index)}
                      disabled={isSubmitting || socialMediaFields.length === 1}
                      className="mt-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {socialMediaFields.length === 0 && (
                  <p className="text-sm text-gray-500 py-2">
                    No social media links added yet.
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-200">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Business Information"
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
