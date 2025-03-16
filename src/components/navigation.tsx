"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { X } from "lucide-react"

export function Navigation() {
  const pathname = usePathname()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <nav className="py-4 lg:sticky lg:top-0 bg-[#000410] z-40 border-b border-white/10">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center">
              <img src="/ETH-Rainbow.svg" alt="Logo" className="w-6 h-6" />
            </div>
            <h4 className="font-semibold text-white">NodeFlow</h4>
          </Link>

          <div className="hidden lg:flex items-center gap-8">
            <Link
              href="/"
              className={`text-white/80 hover:text-white transition-colors ${
                pathname === "/" ? "text-white" : ""
              }`.trim()}
            >
              Home
            </Link>
            <Link
              href="/transactions"
              className={`text-white/80 hover:text-white transition-colors ${
                pathname === "/transactions" ? "text-white" : ""
              }`.trim()}
            >
              Transactions
            </Link>
            <Link
              href="/about"
              className={`text-white/80 hover:text-white transition-colors ${
                pathname === "/about" ? "text-white" : ""
              }`.trim()}
            >
              About Us
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <button 
              className="lg:hidden p-2" 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label={isMenuOpen ? "Close menu" : "Open menu"}
            >
              {isMenuOpen ? (
                <X className="w-6 h-6 text-white" />
              ) : (
                <div className="space-y-1.5">
                  <span className="block w-6 h-0.5 bg-white"></span>
                  <span className="block w-6 h-0.5 bg-white"></span>
                  <span className="block w-6 h-0.5 bg-white"></span>
                </div>
              )}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        <div
          className={`lg:hidden ${
            isMenuOpen
              ? "block mt-4 transition-all duration-300 ease-in-out opacity-100 translate-y-0"
              : "hidden opacity-0 -translate-y-4"
          }`}
        >
          <div className="flex flex-col items-center gap-4">
            <Link
              href="/"
              className={`text-base text-white/80 hover:text-white transition-colors ${
                pathname === "/" ? "text-white" : ""
              }`.trim()}
            >
              Home
            </Link>
            <Link
              href="/transactions"
              className={`text-base text-white/80 hover:text-white transition-colors ${
                pathname === "/transactions" ? "text-white" : ""
              }`.trim()}
            >
              Transactions
            </Link>
            <Link
              href="/about"
              className={`text-base text-white/80 hover:text-white transition-colors ${
                pathname === "/about" ? "text-white" : ""
              }`.trim()}
            >
              About Us
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}

