"use client"

import { useEffect, useState } from "react"
import { X } from "lucide-react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const toastVariants = cva(
  "fixed flex items-center w-auto max-w-md p-4 rounded-lg shadow-lg transition-all transform pointer-events-auto z-50",
  {
    variants: {
      variant: {
        default: "bg-gray-800 text-white border-gray-700",
        success: "bg-green-900 text-white border-green-800",
        error: "bg-red-900 text-white border-red-800",
        warning: "bg-yellow-900 text-white border-yellow-800",
        info: "bg-blue-900 text-white border-blue-800",
      },
      position: {
        "top-right": "top-20 right-4",
        "top-left": "top-20 left-4",
        "bottom-right": "bottom-4 right-4",
        "bottom-left": "bottom-4 left-4",
        "top-center": "top-20 left-1/2 -translate-x-1/2",
        "bottom-center": "bottom-4 left-1/2 -translate-x-1/2",
      },
      animation: {
        slide: "",
        fade: "",
      },
    },
    defaultVariants: {
      variant: "default",
      position: "top-right",
      animation: "slide",
    },
  }
)

export interface ToastProps extends VariantProps<typeof toastVariants> {
  message: string
  duration?: number
  onClose?: () => void
  visible: boolean
  index?: number
}

export function Toast({
  message,
  variant,
  position,
  animation,
  duration = 5000,
  onClose,
  visible,
  index = 0,
}: ToastProps) {
  const [isVisible, setIsVisible] = useState(visible)
  
  useEffect(() => {
    setIsVisible(visible)
    
    if (visible && duration !== Infinity) {
      const timer = setTimeout(() => {
        setIsVisible(false)
        if (onClose) setTimeout(onClose, 300) // Allow animation to complete
      }, duration)
      
      return () => clearTimeout(timer)
    }
  }, [visible, duration, onClose])
  
  // Map animation variants to transform classes
  const getAnimationClasses = () => {
    if (!isVisible) return "opacity-0"
    
    if (animation === "fade") return "opacity-100"
    
    // Slide animations based on position
    if (position?.includes("right")) return "opacity-100 translate-x-0"
    if (position?.includes("left")) return "opacity-100 translate-x-0"
    if (position?.includes("top")) return "opacity-100 translate-y-0"
    if (position?.includes("bottom")) return "opacity-100 translate-y-0"
    
    return "opacity-100"
  }
  
  // Get initial position for animations
  const getInitialPosition = () => {
    if (animation !== "slide") return ""
    
    if (position?.includes("right")) return "-translate-x-10"
    if (position?.includes("left")) return "translate-x-10"
    if (position?.includes("top") && !position.includes("left") && !position.includes("right")) return "translate-y-10"
    if (position?.includes("bottom") && !position.includes("left") && !position.includes("right")) return "-translate-y-10"
    
    return ""
  }
  
  // Calculate vertical offset based on index
  const getVerticalOffset = () => {
    // This function is not needed anymore since we're using inline styles
    return "";
  }
  
  if (!visible && !isVisible) return null
  
  return (
    <div
      className={cn(
        toastVariants({ variant, position, animation }),
        getInitialPosition(),
        getAnimationClasses(),
        "transition-all duration-300 ease-in-out border"
      )}
      style={{ 
        ...(position?.includes("top") ? { top: `${80 + (index * 64)}px` } : {}),
        ...(position?.includes("bottom") ? { bottom: `${16 + (index * 64)}px` } : {})
      }}
      role="alert"
    >
      <div className="flex-1">{message}</div>
      <button
        onClick={() => {
          setIsVisible(false)
          if (onClose) setTimeout(onClose, 300) // Allow animation to complete
        }}
        className="ml-4 text-gray-400 hover:text-white focus:outline-none"
        aria-label="Close notification"
      >
        <X size={18} />
      </button>
    </div>
  )
} 