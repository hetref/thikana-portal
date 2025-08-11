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
import { Plus, X } from "lucide-react";
import Loader from "@/components/Loader";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

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
  operationalHours: z
    .array(
    z.object({
      day: z.string(),
        enabled: z.boolean().default(false),
        openTime: z.string().optional().or(z.literal("")),
        closeTime: z.string().optional().or(z.literal("")),
    })
    )
    .length(7),
  socialMediaLinks: z.array(
    z.object({
      platform: z.string(),
      url: z.string().url("Invalid URL"),
    })
  ),
  acceptAppointments: z.boolean().default(false),
  appointmentSlotMinutes: z
    .number()
    .int()
    .min(5, "Minimum slot is 5 minutes")
    .max(240, "Maximum slot is 240 minutes")
    .optional(),
}).superRefine((data, ctx) => {
  // If acceptAppointments is true, require a valid appointmentSlotMinutes
  if (data.acceptAppointments) {
    if (
      typeof data.appointmentSlotMinutes !== "number" ||
      Number.isNaN(data.appointmentSlotMinutes)
    ) {
      ctx.addIssue({
        path: ["appointmentSlotMinutes"],
        code: z.ZodIssueCode.custom,
        message: "Please provide the single appointment time in minutes",
      });
    }
  }
  // If a day is enabled, require open and close time
  for (let i = 0; i < data.operationalHours.length; i++) {
    const oh = data.operationalHours[i];
    if (oh.enabled) {
      if (!oh.openTime || !oh.closeTime) {
        ctx.addIssue({
          path: ["operationalHours", i],
          code: z.ZodIssueCode.custom,
          message: "Please set opening and closing time for enabled days",
        });
      }
    }
  }
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

export default function BusinessInfoForm({
  readOnly = false,
  businessId = null,
}) {
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
        enabled: false,
        openTime: "",
        closeTime: "",
      })),
      socialMediaLinks: [{ platform: "", url: "" }],
      acceptAppointments: false,
      appointmentSlotMinutes: 30,
    },
  });

  useEffect(() => {
    const fetchBusinessData = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }
      try {
        // Determine which ID to use - either businessId (for members) or user.uid (for business owners)
        const targetId = businessId || user.uid;

        const businessDocRef = doc(db, "businesses", targetId);
        const businessDocSnap = await getDoc(businessDocRef);

        // Helper to normalize operational hours to new schema
        const normalizeOperationalHours = (ops) => {
          if (!Array.isArray(ops) || ops.length !== 7) {
            return days.map((day) => ({ day, enabled: false, openTime: "", closeTime: "" }));
          }
          return ops.map((item, idx) => {
            const baseDay = days[idx] || item.day;
            const enabled =
              typeof item.enabled === "boolean"
                ? item.enabled
                : Boolean(item.openTime && item.closeTime);
            return {
              day: item.day || baseDay,
              enabled,
              openTime: item.openTime || "",
              closeTime: item.closeTime || "",
            };
          });
        };

        // If business data doesn't exist in businesses collection, try to fetch from users collection
        if (!businessDocSnap.exists()) {
          const userDocRef = doc(db, "users", targetId);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();

            // Check if business_type is one of the predefined types or a custom type
            const storedBusinessType = userData.business_type || "";
            const isCustomType =
              !businessTypes.includes(storedBusinessType) &&
              storedBusinessType !== "";

            setSelectedBusinessType(
              isCustomType ? "Other" : storedBusinessType
            );
            setCustomBusinessType(isCustomType ? storedBusinessType : "");

            // Initialize form with existing data
            const formData = {
              business_type: isCustomType ? "Other" : storedBusinessType,
              gstinNumber: userData.gstinNumber || "",
              businessLicense: userData.businessLicense || "",
              registrationDate: userData.registrationDate || "",
              operationalHours: normalizeOperationalHours(
                userData.operationalHours
              ),
              socialMediaLinks: userData.socialMediaLinks || [
                { platform: "", url: "" },
              ],
              acceptAppointments: Boolean(userData.acceptAppointments),
              appointmentSlotMinutes:
                typeof userData.appointmentSlotMinutes === "number"
                  ? userData.appointmentSlotMinutes
                  : 30,
            };

            form.reset(formData);
          }
        } else {
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
            operationalHours: normalizeOperationalHours(
              businessData.operationalHours
            ),
            socialMediaLinks: businessData.socialMediaLinks || [
              { platform: "", url: "" },
            ],
            acceptAppointments: Boolean(businessData.acceptAppointments),
            appointmentSlotMinutes:
              typeof businessData.appointmentSlotMinutes === "number"
                ? businessData.appointmentSlotMinutes
                : 30,
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
  }, [user, form, businessId]);

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
    // Don't submit if in readonly mode
    if (readOnly) {
      toast.error("You don't have permission to update business information");
      return;
    }

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

      // Sanitize operational hours: clear times for disabled days
      const sanitizedOperationalHours = data.operationalHours.map((oh) =>
        oh.enabled
          ? oh
          : { day: oh.day, enabled: false, openTime: "", closeTime: "" }
      );

      // Compose payload
      const payload = {
        ...data,
        business_type: finalBusinessType,
        operationalHours: sanitizedOperationalHours,
        updatedAt: new Date(),
      };

      // Save data to Firestore with the correct business_type
      const businessRef = doc(db, "businesses", user.uid);
      await setDoc(businessRef, payload, { merge: true });

      // Mirror key scheduling fields to users doc for consumer-side reads
      const userRef = doc(db, "users", user.uid);
      await setDoc(
        userRef,
        {
          business_type: finalBusinessType,
          operationalHours: sanitizedOperationalHours,
          acceptAppointments: Boolean(data.acceptAppointments),
          appointmentSlotMinutes:
            typeof data.appointmentSlotMinutes === "number"
              ? data.appointmentSlotMinutes
              : 30,
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

  // Add a render function to create readonly inputs
  const renderReadOnlyInput = (label, value) => (
    <div className="mb-4">
      <div className="text-sm font-medium text-gray-700 mb-1">{label}</div>
      <div className="p-2 border rounded-md bg-gray-50 text-gray-700">
        {value || "Not provided"}
      </div>
    </div>
  );

  // Render a simplified readonly view for members
  if (readOnly) {
    const { getValues } = form;
    const values = getValues();

    return (
      <div className="space-y-6">
        <div className="bg-violet-50 text-violet-800 p-4 rounded-md mb-4">
          You are viewing business information in read-only mode.
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader/>
          </div>
        ) : (
          <div>
            {renderReadOnlyInput(
              "Business Type",
              values.business_type === "Other"
                ? customBusinessType
                : values.business_type
            )}
            {renderReadOnlyInput("GSTIN Number", values.gstinNumber)}
            {renderReadOnlyInput("Business License", values.businessLicense)}
            {renderReadOnlyInput("Registration Date", values.registrationDate)}

            <div className="mb-4">
              <div className="text-sm font-medium text-gray-700 mb-2">
                Operational Hours
              </div>
              <div className="border rounded-md overflow-hidden">
                {values.operationalHours.map((item, index) => (
                  <div
                    key={index}
                    className={`flex p-2 ${index % 2 === 0 ? "bg-gray-50" : "bg-white"}`}
                  >
                    <div className="flex-1 font-medium">{item.day}</div>
                    <div className="flex-1">
                      {item.enabled && item.openTime && item.closeTime
                        ? `${item.openTime} - ${item.closeTime}`
                        : "Closed"}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {values.socialMediaLinks && values.socialMediaLinks.length > 0 && (
              <div className="mb-4">
                <div className="text-sm font-medium text-gray-700 mb-2">
                  Social Media Links
                </div>
                <div className="space-y-2">
                  {values.socialMediaLinks.map((link, index) =>
                    link.platform && link.url ? (
                      <div
                        key={index}
                        className="flex items-center gap-2 p-2 border rounded-md"
                      >
                        <div className="font-medium">{link.platform}:</div>
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline truncate"
                        >
                          {link.url}
                        </a>
                      </div>
                    ) : null
                  )}
                </div>
              </div>
            )}

            <div className="mb-4">
              <div className="text-sm font-medium text-gray-700 mb-1">Appointments</div>
              <div className="p-2 border rounded-md bg-gray-50 text-gray-700">
                {values.acceptAppointments
                  ? `Accepting appointments (slot: ${values.appointmentSlotMinutes || 30} minutes)`
                  : "Not accepting appointments"}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader/>
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
            {/* Business type and registration/gstin/license remain */}
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

            {/* Operational Hours */}
            <div className="md:col-span-2">
              <h3 className="text-lg font-semibold mb-4">Operational Hours</h3>
              <div className="bg-gray-50 p-4 rounded-md space-y-3">
                <div className="grid grid-cols-5 gap-3 mb-2 text-sm font-medium text-muted-foreground">
                  <div>Day</div>
                  <div className="col-span-1">Open?</div>
                  <div>Opening Time</div>
                  <div>Closing Time</div>
                  <div></div>
                </div>
                {form.watch("operationalHours").map((_, index) => (
                  <div key={index} className="grid grid-cols-5 gap-3 items-center">
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
                      name={`operationalHours.${index}.enabled`}
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-2">
                          <FormControl>
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={field.value}
                                onCheckedChange={(val) => {
                                  field.onChange(val);
                                  if (!val) {
                                    // Clear times when disabling
                                    form.setValue(
                                      `operationalHours.${index}.openTime`,
                                      ""
                                    );
                                    form.setValue(
                                      `operationalHours.${index}.closeTime`,
                                      ""
                                    );
                                  }
                                }}
                              disabled={isSubmitting}
                            />
                              <Label className="text-sm">Open</Label>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`operationalHours.${index}.openTime`}
                      render={({ field }) => {
                        const isEnabled = form.getValues(
                          `operationalHours.${index}.enabled`
                        );
                        return (
                          <FormItem>
                            <FormControl>
                              <Input
                                type="time"
                                {...field}
                                disabled={isSubmitting || !isEnabled}
                                className="bg-white"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        );
                      }}
                    />
                    <FormField
                      control={form.control}
                      name={`operationalHours.${index}.closeTime`}
                      render={({ field }) => {
                        const isEnabled = form.getValues(
                          `operationalHours.${index}.enabled`
                        );
                        return (
                        <FormItem>
                          <FormControl>
                            <Input
                              type="time"
                              {...field}
                                disabled={isSubmitting || !isEnabled}
                              className="bg-white"
                            />
                          </FormControl>
                            <FormMessage />
                        </FormItem>
                        );
                      }}
                    />
                    <div></div>
                  </div>
                ))}
              </div>
            </div>

            {/* Social Media Links */}
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
                      name={`socialMediaLinks.${index}.platform`
                      }
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

            {/* Appointments Settings */}
            <div className="md:col-span-2">
              <h3 className="text-lg font-semibold mb-4">Appointments</h3>
              <div className="bg-gray-50 p-4 rounded-md space-y-4">
                <FormField
                  control={form.control}
                  name="acceptAppointments"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="mb-2">Accept Appointments</FormLabel>
                      <FormControl>
                        <div className="flex items-center gap-3">
                          <Switch
                            checked={field.value}
                            onCheckedChange={(val) => field.onChange(val)}
                            disabled={isSubmitting}
                          />
                          <span className="text-sm text-muted-foreground">
                            Enable consumers to book appointments
                          </span>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {form.watch("acceptAppointments") && (
                  <FormField
                    control={form.control}
                    name="appointmentSlotMinutes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Single Appointment Time (minutes)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={5}
                            max={240}
                            step={5}
                            {...field}
                            value={field.value ?? 30}
                            onChange={(e) =>
                              field.onChange(parseInt(e.target.value || "30", 10))
                            }
                            disabled={isSubmitting}
                            className="bg-white max-w-xs"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
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
                  <Loader/>
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
