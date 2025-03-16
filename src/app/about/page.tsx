/**
 * About Page Component
 *
 * This component renders the About Us page, showcasing the company's mission
 * and team members. It uses Next.js Image component for optimized image loading
 * and the FadeInSection component for smooth animations.
 */

// Import necessary components and modules
import Image from "next/image"
import { FadeInSection } from "../../components/fade-in-section"
import Link from "next/link"
import { ArrowRight, Database, Code, LineChart, Shield, Zap, Layers } from "lucide-react"

/**
 * AboutPage function component
 * Renders the structure and content of the About page
 * @returns JSX.Element
 */
export default function AboutPage() {
  return (
    <main className="min-h-screen bg-[#000410] text-white py-12 px-4 sm:px-6 lg:px-8">
      {/* About Us Section */}
      <FadeInSection>
        <div className="max-w-7xl mx-auto">
          {/* Page Title and Introduction */}
          <div className="text-center mb-16">
            <h1 className="text-4xl font-bold text-white sm:text-5xl mb-4">About Our Platform</h1>
            <div className="max-w-3xl mx-auto">
              <p className="text-lg text-gray-400">
                We've built a comprehensive Ethereum blockchain explorer and wallet analytics platform that provides real-time insights, transaction visualization, and powerful tracking tools.
              </p>
            </div>
          </div>

          {/* Our Mission Section */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-white text-center mb-4">Our Mission</h2>
            <div className="max-w-3xl mx-auto">
              <p className="text-lg text-gray-400 text-center mb-8">
                Our mission is to make blockchain data accessible, understandable, and actionable for everyone. We believe in transparency, security, and empowering users with insights into the Ethereum ecosystem.
              </p>
              
              <div className="bg-gradient-to-r from-[#0B1017] to-[#0F172A] p-8 rounded-xl border border-gray-800">
                <div className="flex flex-col md:flex-row items-center justify-between">
                  <div className="mb-6 md:mb-0 md:mr-8">
                    <h3 className="text-xl font-semibold mb-2">Ready to explore the Ethereum blockchain?</h3>
                    <p className="text-gray-400">Start tracking wallet activity and visualizing transactions today.</p>
                  </div>
                  <Link href="/transactions" className="bg-[#4ade80] text-black px-6 py-3 rounded-lg font-medium hover:bg-[#4ade80]/90 transition-colors inline-flex items-center whitespace-nowrap">
                    Try It Now
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
          
          {/* Technology Stack Section */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-white text-center mb-8">Our Technology Stack</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              <div className="bg-white/5 p-6 rounded-lg hover:bg-white/10 transition-all duration-300">
                <div className="bg-[#4ade80]/10 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                  <Database className="h-6 w-6 text-[#4ade80]" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Neo4j Graph Database</h3>
                <p className="text-gray-400">
                  We use Neo4j to efficiently store and query complex blockchain transaction relationships, enabling powerful graph visualizations.
                </p>
              </div>
              
              <div className="bg-white/5 p-6 rounded-lg hover:bg-white/10 transition-all duration-300">
                <div className="bg-[#4ade80]/10 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                  <Code className="h-6 w-6 text-[#4ade80]" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Next.js & React</h3>
                <p className="text-gray-400">
                  Our frontend is built with Next.js and React, providing a fast, responsive, and intuitive user experience.
                </p>
              </div>
              
              <div className="bg-white/5 p-6 rounded-lg hover:bg-white/10 transition-all duration-300">
                <div className="bg-[#4ade80]/10 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                  <LineChart className="h-6 w-6 text-[#4ade80]" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Real-time APIs</h3>
                <p className="text-gray-400">
                  We integrate with Etherscan, Binance, and CoinGecko APIs to provide up-to-the-minute blockchain and market data.
                </p>
              </div>
            </div>
          </div>
          
          {/* Key Features Section */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-white text-center mb-8">Key Features</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
              <div className="flex items-start p-4">
                <div className="bg-[#4ade80]/10 w-10 h-10 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                  <Shield className="h-5 w-5 text-[#4ade80]" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2">Secure Wallet Tracking</h3>
                  <p className="text-gray-400">
                    Monitor any Ethereum wallet address without connecting your own wallet or sharing private keys.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start p-4">
                <div className="bg-[#4ade80]/10 w-10 h-10 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                  <Zap className="h-5 w-5 text-[#4ade80]" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2">Real-time Updates</h3>
                  <p className="text-gray-400">
                    Get live price data, transaction updates, and blockchain metrics with automatic refreshing.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start p-4">
                <div className="bg-[#4ade80]/10 w-10 h-10 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                  <LineChart className="h-5 w-5 text-[#4ade80]" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2">Interactive Visualizations</h3>
                  <p className="text-gray-400">
                    Explore transaction patterns and connections with our interactive graph visualization tool.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start p-4">
                <div className="bg-[#4ade80]/10 w-10 h-10 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                  <Layers className="h-5 w-5 text-[#4ade80]" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2">Comprehensive Analytics</h3>
                  <p className="text-gray-400">
                    Access detailed transaction history, wallet balances, and network statistics in one place.
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Project Timeline */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-white text-center mb-8">Project Timeline</h2>
            <div className="max-w-3xl mx-auto relative">
              {/* Timeline line */}
              <div className="absolute left-0 md:left-1/2 top-0 bottom-0 w-px bg-gray-700 transform md:translate-x-px"></div>
              
              {/* Timeline items */}
              <div className="space-y-12">
                <div className="relative flex flex-col md:flex-row items-center md:justify-between">
                  <div className="flex-1 md:text-right md:pr-8 mb-4 md:mb-0">
                    <h3 className="text-lg font-semibold text-[#4ade80]">Q1 2023</h3>
                    <p className="text-white font-medium">Project Inception</p>
                    <p className="text-gray-400">Initial concept and research phase</p>
                  </div>
                  <div className="absolute left-0 md:left-1/2 w-4 h-4 rounded-full bg-[#4ade80] transform -translate-x-1/2"></div>
                  <div className="flex-1 md:pl-8"></div>
                </div>
                
                <div className="relative flex flex-col md:flex-row items-center md:justify-between">
                  <div className="flex-1 md:text-right md:pr-8 mb-4 md:mb-0 md:order-1"></div>
                  <div className="absolute left-0 md:left-1/2 w-4 h-4 rounded-full bg-[#4ade80] transform -translate-x-1/2"></div>
                  <div className="flex-1 md:pl-8 md:order-2">
                    <h3 className="text-lg font-semibold text-[#4ade80]">Q2 2023</h3>
                    <p className="text-white font-medium">Frontend Development</p>
                    <p className="text-gray-400">UI/UX design and frontend implementation</p>
                  </div>
                </div>
                
                <div className="relative flex flex-col md:flex-row items-center md:justify-between">
                  <div className="flex-1 md:text-right md:pr-8 mb-4 md:mb-0">
                    <h3 className="text-lg font-semibold text-[#4ade80]">Q3 2023</h3>
                    <p className="text-white font-medium">Backend Integration</p>
                    <p className="text-gray-400">Neo4j database setup and API integration</p>
                  </div>
                  <div className="absolute left-0 md:left-1/2 w-4 h-4 rounded-full bg-[#4ade80] transform -translate-x-1/2"></div>
                  <div className="flex-1 md:pl-8"></div>
                </div>
                
                <div className="relative flex flex-col md:flex-row items-center md:justify-between">
                  <div className="flex-1 md:text-right md:pr-8 mb-4 md:mb-0 md:order-1"></div>
                  <div className="absolute left-0 md:left-1/2 w-4 h-4 rounded-full bg-[#4ade80] transform -translate-x-1/2"></div>
                  <div className="flex-1 md:pl-8 md:order-2">
                    <h3 className="text-lg font-semibold text-[#4ade80]">Q4 2023</h3>
                    <p className="text-white font-medium">Beta Launch</p>
                    <p className="text-gray-400">Initial release with core functionality</p>
                  </div>
                </div>
                
                <div className="relative flex flex-col md:flex-row items-center md:justify-between">
                  <div className="flex-1 md:text-right md:pr-8 mb-4 md:mb-0">
                    <h3 className="text-lg font-semibold text-[#4ade80]">Q1 2024</h3>
                    <p className="text-white font-medium">Full Release</p>
                    <p className="text-gray-400">Complete platform with all features</p>
                  </div>
                  <div className="absolute left-0 md:left-1/2 w-4 h-4 rounded-full bg-[#4ade80] transform -translate-x-1/2"></div>
                  <div className="flex-1 md:pl-8"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Team Members Grid */}
          <div>
            <h2 className="text-3xl font-bold text-white text-center mb-8">Our Team</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {/* Team Member 1 */}
              <div className="bg-white/5 rounded-lg shadow-lg overflow-hidden transition-all duration-300 hover:scale-105 hover:bg-white/10">
                <div className="aspect-w-1 aspect-h-1 relative overflow-hidden">
                  <Image
                    src="/Truong_Dang_Kien.jpg?height=400&width=400"
                    alt="Team member"
                    width={400}
                    height={400}
                    className="object-cover"
                  />
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-semibold text-white mb-2">Truong Dang Kien</h3>
                  <p className="text-gray-400 mb-4">Project Lead</p>
                  <p className="text-sm text-gray-500">
                    Oversees project direction and coordinates team efforts to ensure successful delivery.
                  </p>
                </div>
              </div>

              {/* Team Member 2 */}
              <div className="bg-white/5 rounded-lg shadow-lg overflow-hidden transition-all duration-300 hover:scale-105 hover:bg-white/10">
                <div className="aspect-w-1 aspect-h-1 relative overflow-hidden">
                  <Image
                    src="/DuyLe.jpg?height=400&width=400"
                    alt="Team member"
                    width={400}
                    height={400}
                    className="object-cover"
                  />
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-semibold text-white mb-2">Le Quoc Duy</h3>
                  <p className="text-gray-400 mb-4">Backend Developer</p>
                  <p className="text-sm text-gray-500">
                    Specializes in Neo4j database architecture and blockchain data integration.
                  </p>
                </div>
              </div>

              {/* Team Member 3 */}
              <div className="bg-white/5 rounded-lg shadow-lg overflow-hidden transition-all duration-300 hover:scale-105 hover:bg-white/10">
                <div className="aspect-w-1 aspect-h-1 relative overflow-hidden">
                  <Image
                    src="/GiaHuy.JPG?height=400&width=400"
                    alt="Team member"
                    width={400}
                    height={400}
                    className="object-cover"
                  />
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-semibold text-white mb-2">Dong Nguyen Gia Huy</h3>
                  <p className="text-gray-400 mb-4">Frontend Developer</p>
                  <p className="text-sm text-gray-500">
                    Creates responsive UI components and interactive data visualizations.
                  </p>
                </div>
              </div>

              {/* Team Member 4 */}
              <div className="bg-white/5 rounded-lg shadow-lg overflow-hidden transition-all duration-300 hover:scale-105 hover:bg-white/10">
                <div className="aspect-w-1 aspect-h-1 relative overflow-hidden">
                  <Image
                    src="/Pat.jpg?height=400&width=400"
                    alt="Team member"
                    width={400}
                    height={400}
                    className="object-cover"
                  />
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-semibold text-white mb-2">Nguyen Tan Phat</h3>
                  <p className="text-gray-400 mb-4">UX Researcher</p>
                  <p className="text-sm text-gray-500">
                    Focuses on user experience research and ensuring platform accessibility.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </FadeInSection>
    </main>
  )
}

