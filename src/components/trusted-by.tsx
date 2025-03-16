"use client"

import type React from "react"
import { useEffect, useRef, useState } from "react"

// Define the props for the FadeInSection component
interface FadeInSectionProps {
  children: React.ReactNode
  direction?: "up" | "down" // Optional direction prop for animation
}

// Component that handles the fade-in effect
export function FadeInSection({ children, direction = "up" }: FadeInSectionProps) {
  const [isVisible, setVisible] = useState(false) // State to track visibility
  const domRef = useRef<HTMLDivElement>(null) // Reference to the DOM element

  useEffect(() => {
    // Create an Intersection Observer to detect when the element is in view
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => setVisible(entry.isIntersecting))
    })

    const currentElement = domRef.current
    if (currentElement) {
      observer.observe(currentElement) // Start observing the element
    }

    return () => {
      if (currentElement) {
        observer.unobserve(currentElement) // Stop observing on cleanup
      }
    }
  }, [])

  // Determine the fade direction based on the direction prop
  const fadeClass = direction === "up" ? "translate-y-10" : "-translate-y-10"

  return (
    <div
      className={`transition-all duration-1000 ease-out ${
        isVisible ? "opacity-100 translate-y-0" : `opacity-0 ${fadeClass}`
      }`}
      ref={domRef} // Attach the reference to the DOM element
    >
      {children}
    </div>
  )
}

// Component to display the logos of trusted crypto platforms
export function TrustedBy() {
  const logos = [
    { name: "Coinbase", src: "/Coinbase.svg" },
    { name: "Binance", src: "/Binance.svg" },
    { name: "Kraken", src: "/Kraken.svg" },
    { name: "Crypto.com", src: "/Cryptocom.svg" },
    { name: "CEX", src: "/CEX.svg" },
    { name: "Gemini", src: "/Gemini.svg" },
  ]

  return (
    <section className="py-16">
      <div className="container mx-auto px-4">
        <p className="text-center text-gray-400 mb-8">
          NodeFlow <span className="text-[#4ade80]">visualization partners</span>
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
          {logos.map((logo) => (
            <FadeInSection key={logo.name}>
              <div
                key={logo.name} // Assign a unique key for each logo
                className="p-6 rounded-lg flex items-center justify-center space-x-4"
              >
                <img src={logo.src || "/placeholder.svg"} alt={logo.name} className="h-8" />
                <p className="text-xl font-semibold text-gray-500">{logo.name}</p>
              </div>
            </FadeInSection>
          ))}
        </div>
      </div>
    </section>
  )
}
