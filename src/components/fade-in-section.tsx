"use client"

import type React from "react"
import { useEffect, useRef, useState } from "react"

interface FadeInSectionProps {
  children: React.ReactNode
  direction?: "up" | "down"
}

export function FadeInSection({ children, direction = "up" }: FadeInSectionProps) {
  const [isVisible, setVisible] = useState(false)
  const domRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => setVisible(entry.isIntersecting))
    })

    const currentElement = domRef.current
    if (currentElement) {
      observer.observe(currentElement)
    }

    return () => {
      if (currentElement) {
        observer.unobserve(currentElement)
      }
    }
  }, [])

  const fadeClass = direction === "up" ? "translate-y-10" : "-translate-y-10"

  return (
    <div
      className={`transition-all duration-1000 ease-out ${
        isVisible ? "opacity-100 translate-y-0" : `opacity-0 ${fadeClass}`
      }`}
      ref={domRef}
    >
      {children}
    </div>
  )
}

