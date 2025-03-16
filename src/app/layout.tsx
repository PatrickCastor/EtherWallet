import type React from "react"
import "@/app/globals.css"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { NotificationProvider } from "@/lib/notification-context"
import { TooltipProvider } from "@/components/ui/tooltip"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter", 
  fallback: ["Inter Fallback"]
})

import { Navigation } from "../components/navigation"
import { Footer } from "../components/footer"


export const metadata: Metadata = {
  title: "NodeFlow",
  description: "Visualize and explore blockchain transaction networks",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${inter.variable} font-sans`}>
      <body className={inter.className}>
        <NotificationProvider>
          <TooltipProvider>
            <div className="min-h-screen bg-[#000410]">
              <Navigation />
              {children}
              <Footer />
            </div>
          </TooltipProvider>
        </NotificationProvider>
      </body>
    </html>
  )
}
