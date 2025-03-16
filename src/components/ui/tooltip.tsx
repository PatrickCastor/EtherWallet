"use client"

import React, { useState, useRef, useEffect } from "react"

interface TooltipProps {
  children: React.ReactNode
}

interface TooltipContentProps {
  children: React.ReactNode
  className?: string
}

interface TooltipTriggerProps {
  children: React.ReactNode
  asChild?: boolean
}

interface TooltipProviderProps {
  children: React.ReactNode
}

const TooltipContext = React.createContext<{
  open: boolean
  setOpen: React.Dispatch<React.SetStateAction<boolean>>
  triggerRef: React.RefObject<HTMLDivElement | null>
  closeWithDelay: () => void
  cancelClose: () => void
}>({
  open: false,
  setOpen: () => {},
  triggerRef: { current: null },
  closeWithDelay: () => {},
  cancelClose: () => {}
})

const TooltipProvider: React.FC<TooltipProviderProps> = ({ children }) => {
  return <>{children}</>
}

const Tooltip: React.FC<TooltipProps> = ({ children }) => {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLDivElement | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Function to close tooltip with a delay
  const closeWithDelay = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    timeoutRef.current = setTimeout(() => {
      setOpen(false)
    }, 100) // 100ms delay before closing
  }

  // Function to cancel the close timer
  const cancelClose = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return (
    <TooltipContext.Provider value={{ open, setOpen, triggerRef, closeWithDelay, cancelClose }}>
      {children}
    </TooltipContext.Provider>
  )
}

const TooltipTrigger: React.FC<TooltipTriggerProps> = ({ children, asChild }) => {
  const { setOpen, triggerRef, closeWithDelay } = React.useContext(TooltipContext)

  return (
    <div
      ref={triggerRef}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => closeWithDelay()}
      className="inline-block"
    >
      {children}
    </div>
  )
}

const TooltipContent: React.FC<TooltipContentProps> = ({ children, className = "" }) => {
  const { open, triggerRef, closeWithDelay, cancelClose } = React.useContext(TooltipContext)
  const contentRef = useRef<HTMLDivElement | null>(null)
  const [position, setPosition] = useState({ top: 0, left: 0 })

  useEffect(() => {
    if (open && triggerRef.current && contentRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect()
      const contentRect = contentRef.current.getBoundingClientRect()
      
      setPosition({
        top: triggerRect.bottom + window.scrollY + 5,
        left: triggerRect.left + window.scrollX + (triggerRect.width / 2) - (contentRect.width / 2)
      })
    }
  }, [open])

  if (!open) return null

  return (
    <div
      ref={contentRef}
      className={`absolute z-50 overflow-hidden rounded-md bg-gray-800 px-4 py-3 text-white shadow-md ${className}`}
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        fontSize: '0.85rem'
      }}
      onMouseEnter={cancelClose}
      onMouseLeave={closeWithDelay}
    >
      {children}
    </div>
  )
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } 