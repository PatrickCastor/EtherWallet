import { TrustedBy } from "../components/trusted-by"
import { CryptoCoins } from "../components/crypto-coins"
import { FAQ } from "../components/faq"
import { FadeInSection } from "../components/fade-in-section"
import PriceHistoryChart from "../components/PriceHistoryChart"
import EthereumStatsCards from "../components/EthereumStatsCards"
import LatestTransactions from "../components/LatestTransactions"
import LatestBlocks from "../components/LatestBlocks"
import Link from "next/link"
import { ArrowRight, Wallet, Shield, BarChart3, Zap } from "lucide-react"

export default function Home() {
  return (
    <main className="text-white bg-[#000410]">
      {/* Hero Section */}
      <FadeInSection>
        <section className="py-16 lg:py-24">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-6">
                <h1 className="text-4xl lg:text-6xl font-bold leading-tight">
                  <span className="text-[#4ade80]">NodeFlow</span>: Blockchain Transaction Visualization
                </h1>
                <p className="text-gray-400 text-lg">
                  Track transactions, analyze wallet activity, and visualize blockchain data with our interactive Ethereum network explorer.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link href="/transactions" className="bg-[#4ade80] text-black px-6 py-3 rounded-lg font-medium hover:bg-[#4ade80]/90 transition-colors inline-flex items-center justify-center">
                    Explore Transactions
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                  <a href="https://ethereum.org" target="_blank" rel="noopener noreferrer" className="bg-transparent border border-[#4ade80] text-[#4ade80] px-6 py-3 rounded-lg font-medium hover:bg-[#4ade80]/10 transition-colors inline-flex items-center justify-center">
                    Learn About Ethereum
                  </a>
                </div>
              </div>
              <div className="relative overflow-hidden">
                <img
                  src="/Phone Entrance.svg"
                  alt="Ethereum wallet interface"
                  className="w-full max-w-lg mx-auto"
                />
              </div>
            </div>
          </div>
        </section>
      </FadeInSection>

      {/* Trusted By Section */}
      <FadeInSection>
        <TrustedBy />
      </FadeInSection>
      
      {/* Crypto Coins Section */}
      <FadeInSection>
        <CryptoCoins />
      </FadeInSection>

      {/* Live Price Chart Section */}
      <FadeInSection>
        <section className="py-12 bg-[#050A14]">
          <div className="container mx-auto px-4">
            <div className="mb-8">
              <h2 className="text-3xl font-bold">Live Ethereum Price</h2>
              <p className="text-gray-400 mt-2">Track real-time ETH price movements</p>
            </div>
            <div className="h-[400px]">
              <PriceHistoryChart />
            </div>
          </div>
        </section>
      </FadeInSection>

      {/* Ethereum Stats Cards */}
      <FadeInSection>
        <section className="py-12">
          <div className="container mx-auto px-4">
            <div className="mb-8">
              <h2 className="text-3xl font-bold">Network Statistics</h2>
              <p className="text-gray-400 mt-2">Real-time Ethereum blockchain metrics</p>
            </div>
            <EthereumStatsCards />
          </div>
        </section>
      </FadeInSection>

      {/* Wallet Features Section */}
      <FadeInSection>
        <section className="py-16 bg-[#050A14]">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold">Wallet Features</h2>
              <p className="text-gray-400 mt-2">Everything you need to manage your Ethereum assets</p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  icon: Wallet,
                  title: "Wallet Tracking",
                  description: "Monitor any Ethereum wallet address with detailed transaction history and balance updates"
                },
                {
                  icon: Shield,
                  title: "Secure Analytics",
                  description: "View wallet data without connecting your own wallet or sharing private keys"
                },
                {
                  icon: BarChart3,
                  title: "Visual Insights",
                  description: "Visualize transaction patterns and connections with interactive graph displays"
                },
                {
                  icon: Zap,
                  title: "Real-time Updates",
                  description: "Stay informed with live blockchain data and transaction notifications"
                }
              ].map((feature, index) => (
                <div key={index} className="bg-[#0B1017] p-6 rounded-xl border border-gray-800 hover:border-[#4ade80]/50 transition-all duration-300">
                  <div className="bg-[#4ade80]/10 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-[#4ade80]" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-gray-400">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </FadeInSection>

      {/* Latest Activity Section */}
      <FadeInSection>
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="mb-8">
              <h2 className="text-3xl font-bold">Latest Blockchain Activity</h2>
              <p className="text-gray-400 mt-2">Stay updated with recent Ethereum network activity</p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <LatestBlocks />
              <LatestTransactions />
            </div>
          </div>
        </section>
      </FadeInSection>

      {/* CTA Section */}
      <FadeInSection>
        <section className="py-16 bg-[#050A14]">
          <div className="container mx-auto px-4">
            <div className="bg-gradient-to-r from-[#0B1017] to-[#0F172A] p-8 md:p-12 rounded-2xl border border-gray-800">
              <div className="max-w-3xl mx-auto text-center">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to explore the Ethereum blockchain?</h2>
                <p className="text-gray-400 text-lg mb-8">
                  Search any wallet address to view transaction history, analyze patterns, and visualize connections.
                </p>
                <Link href="/transactions" className="bg-[#4ade80] text-black px-8 py-4 rounded-lg font-medium hover:bg-[#4ade80]/90 transition-colors inline-flex items-center justify-center text-lg">
                  Start Exploring
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </FadeInSection>

      {/* FAQ Section */}
      <FAQ />
    </main>
  )
}
