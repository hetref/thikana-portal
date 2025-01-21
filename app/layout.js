import { ThemeProvider } from "@/components/theme-provider"
import { geistSans } from "@/lib/fonts"
import "@/app/globals.css"
import Chatbot from "@/components/Chatbot"
import { Toaster } from "react-hot-toast"

export const metadata = {
  title: "Thikana",
  description: "Find your next home",
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={geistSans.variable}>
      <body className="min-h-screen bg-background font-sans antialiased">
        <ThemeProvider>
          <div className="relative flex min-h-screen flex-col">
            <main className="flex-1">{children}</main>
          </div>
          <Chatbot />
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}