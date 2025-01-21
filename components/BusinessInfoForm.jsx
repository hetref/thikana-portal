"use client";
import { useState } from "react"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const businessInfoSchema = z.object({
  category: z.string().min(1, "Business category is required"),
  gstinNumber: z.string().regex(
    /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
    "Invalid GSTIN number"
  ),
  businessLicense: z.string().min(1, "Business license number is required"),
  registrationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)"),
  operationalHours: z.array(z.object({
    day: z.string(),
    openTime: z.string(),
    closeTime: z.string(),
  })),
  socialMediaLinks: z.array(z.object({
    platform: z.string(),
    url: z.string().url("Invalid URL"),
  })),
  services: z.array(z.string().min(1, "Service name is required")),
})

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

export default function BusinessInfoForm() {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm({
    resolver: zodResolver(businessInfoSchema),
    defaultValues: {
      category: "",
      gstinNumber: "",
      businessLicense: "",
      registrationDate: "",
      operationalHours: days.map((day) => ({ day, openTime: "", closeTime: "" })),
      socialMediaLinks: [{ platform: "", url: "" }],
      services: [""],
    },
  })

  const {
    fields: socialMediaFields,
    append: appendSocialMedia,
    remove: removeSocialMedia,
  } = useFieldArray({
    control: form.control,
    name: "socialMediaLinks",
  })

  const {
    fields: serviceFields,
    append: appendService,
    remove: removeService,
  } = useFieldArray({
    control: form.control,
    name: "services",
  })

  async function onSubmit(data) {
    setIsSubmitting(true)
    // TODO: Implement API call to save data
    console.log(data)
    await new Promise((resolve) => setTimeout(resolve, 2000)) // Simulating API call
    setIsSubmitting(false)
  }

  return (
    (<Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Business Category</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="retail">Retail</SelectItem>
                  <SelectItem value="food">Food & Beverage</SelectItem>
                  <SelectItem value="tech">Technology</SelectItem>
                  <SelectItem value="health">Healthcare</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
        <FormField
          control={form.control}
          name="gstinNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>GSTIN Number</FormLabel>
              <FormControl>
                <Input placeholder="Enter your GSTIN number" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
        <FormField
          control={form.control}
          name="businessLicense"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Business License</FormLabel>
              <FormControl>
                <Input placeholder="Enter your business license number" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
        <FormField
          control={form.control}
          name="registrationDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Business Registration Date</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
        <div>
          <h3 className="text-lg font-semibold mb-2">Operational Hours</h3>
          {form.watch("operationalHours").map((_, index) => (
            <div key={index} className="flex space-x-2 mb-2">
              <FormField
                control={form.control}
                name={`operationalHours.${index}.day`}
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormControl>
                      <Input {...field} readOnly />
                    </FormControl>
                  </FormItem>
                )} />
              <FormField
                control={form.control}
                name={`operationalHours.${index}.openTime`}
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                  </FormItem>
                )} />
              <FormField
                control={form.control}
                name={`operationalHours.${index}.closeTime`}
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                  </FormItem>
                )} />
            </div>
          ))}
        </div>
        <div>
          <h3 className="text-lg font-semibold mb-2">Social Media Links</h3>
          {socialMediaFields.map((field, index) => (
            <div key={field.id} className="flex space-x-2 mb-2">
              <FormField
                control={form.control}
                name={`socialMediaLinks.${index}.platform`}
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormControl>
                      <Input placeholder="Platform (e.g., Facebook)" {...field} />
                    </FormControl>
                  </FormItem>
                )} />
              <FormField
                control={form.control}
                name={`socialMediaLinks.${index}.url`}
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormControl>
                      <Input placeholder="URL" {...field} />
                    </FormControl>
                  </FormItem>
                )} />
              <Button type="button" variant="outline" onClick={() => removeSocialMedia(index)}>
                Remove
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            onClick={() => appendSocialMedia({ platform: "", url: "" })}>
            Add Social Media Link
          </Button>
        </div>
        <div>
          <h3 className="text-lg font-semibold mb-2">Services</h3>
          {serviceFields.map((field, index) => (
            <div key={field.id} className="flex space-x-2 mb-2">
              <FormField
                control={form.control}
                name={`services.${index}`}
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormControl>
                      <Input placeholder="Service name" {...field} />
                    </FormControl>
                  </FormItem>
                )} />
              <Button type="button" variant="outline" onClick={() => removeService(index)}>
                Remove
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" onClick={() => appendService("")}>
            Add Service
          </Button>
        </div>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Save Business Information"}
        </Button>
      </form>
    </Form>)
  );
}

