import { geistSans } from "@/lib/fonts";
import "@/app/globals.css";
import Chatbot from "@/components/Chatbot";
import { Toaster } from "react-hot-toast";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/react";
import { AuthProvider } from "@/hooks/useAuth";

export const metadata = {
  title: "Thikana",
  description: "Find your next home",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={geistSans.variable} suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        <AuthProvider>
          <div className="relative flex min-h-screen flex-col">
            <main className="flex-1">{children}</main>
          </div>
          <Chatbot />
          <Toaster />
        </AuthProvider>
        <Analytics />
        <Script
          src="https://checkout.razorpay.com/v1/checkout.js"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
