import TopNavbar from "@/components/TopNavbar"
import { ThemeProvider } from "@/components/theme-provider"
import { geistSans } from "@/lib/fonts"
import "@/app/globals.css"
import { AuthContextProvider } from "@/context/AuthContext"

export const metadata = {
  title: "Thikana",
  description: "Find your next home",
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={geistSans.variable}>
      <body className="min-h-screen bg-background font-sans antialiased">
        <ThemeProvider>
          <AuthContextProvider>
            <div className="relative flex min-h-screen flex-col">
              <main className="flex-1">{children}</main>
            </div>
          </AuthContextProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
