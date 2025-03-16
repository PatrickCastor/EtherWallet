import type React from "react"
import { Navigation } from "./navigation"
import { Footer } from "./footer"

interface LayoutProps {
  children: React.ReactNode
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-black">
      <Navigation />
      {children}
      <Footer />
    </div>
  )
}

export default Layout
