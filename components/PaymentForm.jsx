"use client";
import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"

const paymentSchema = z.object({
  razorpayKeyId: z.string().min(1, "Razorpay Key ID is required"),
  razorpayKeySecret: z.string().min(1, "Razorpay Key Secret is required"),
})

export default function PaymentForm() {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      razorpayKeyId: "",
      razorpayKeySecret: "",
    },
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
          name="razorpayKeyId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Razorpay Key ID</FormLabel>
              <FormControl>
                <Input placeholder="Enter your Razorpay Key ID" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
        <FormField
          control={form.control}
          name="razorpayKeySecret"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Razorpay Key Secret</FormLabel>
              <FormControl>
                <Input type="password" placeholder="Enter your Razorpay Key Secret" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Save Payment Settings"}
        </Button>
      </form>
    </Form>)
  );
}

