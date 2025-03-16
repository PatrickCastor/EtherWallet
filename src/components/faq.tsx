/**
 * FAQ Component
 *
 * This component renders a Frequently Asked Questions (FAQ) section with expandable question-answer pairs
 * and a set of tutorial videos. It uses the FadeInSection component for smooth animations.
 */

"use client"

import { useState } from "react"
import { Plus, Minus } from "lucide-react"
import { FadeInSection } from "./fade-in-section"

/**
 * FAQ function component
 * @returns JSX.Element
 */
export function FAQ() {
  const [openQuestion, setOpenQuestion] = useState<number | null>(null)

  // Define an array of FAQ items
  const questions = [
    {
      question: "What is NodeFlow?",
      answer:
        "NodeFlow is a comprehensive Ethereum blockchain explorer and wallet analytics tool that allows you to track transactions, analyze wallet activity, and visualize blockchain data without connecting your own wallet.",
    },
    {
      question: "Do I need to connect my wallet to use NodeFlow?",
      answer:
        "No, NodeFlow is view-only. You can search for any Ethereum wallet address to explore its transaction history and connections without connecting your own wallet or sharing private keys.",
    },
    {
      question: "What information can I see about a wallet?",
      answer:
        "You can view transaction history, wallet balance, connected addresses, transaction patterns, and visualize connections between wallets through our interactive graph visualization.",
    },
    {
      question: "Is the blockchain data shown in real-time?",
      answer:
        "Yes, we provide real-time data from the Ethereum blockchain. Our platform fetches the latest transactions, blocks, and price information to give you up-to-date insights.",
    },
    {
      question: "How accurate is the transaction graph visualization?",
      answer: "Our transaction graph shows direct (one-hop) connections between wallets based on actual transaction data from the Ethereum blockchain. You can explore further connections by clicking on connected addresses.",
    },
    {
      question: "Can I use this platform to track my own wallet?",
      answer: "Absolutely! Simply enter your Ethereum wallet address in the search bar to view your transaction history, balance, and connections to other wallets.",
    },
  ]

  // Define an array of tutorial video information
  const tutorials = [
    {
      id: "TDGq4aeevgY",
      title: "Vitalik Buterin: The Ethereum Visionary",
    },
    {
      id: "1Hu8lzoi0Tw",
      title: "What is Ethereum? A Beginner's Explanation",
    },
    {
      id: "Yb6825iv0Vk",
      title: "Understanding Ethereum Gas Fees & Transactions",
    },
  ]

  // Render the FAQ section with questions, answers, and tutorial videos
  return (
    <section className="py-16">
      <div className="container mx-auto px-4">
        <FadeInSection>
          <div className="text-center mb-12">
            <p className="text-sm">
              Popular <span className="text-[#4ade80]">questions</span>
            </p>
            <h2 className="text-4xl font-bold mt-2">Frequently Asked Questions</h2>
            <p className="text-gray-400 mt-4">Learn more about our Ethereum wallet explorer and analytics platform</p>
          </div>
        </FadeInSection>

        <div className="max-w-3xl mx-auto">
          {/* Render each FAQ item */}
          {questions.map((q, index) => (
            <FadeInSection key={index}>
              <div className="mb-4 bg-white/5 rounded-lg overflow-hidden">
                <div
                  className="p-4 flex justify-between items-center cursor-pointer"
                  onClick={() => setOpenQuestion(openQuestion === index ? null : index)}
                >
                  <h3 className="text-lg">{q.question}</h3>
                  {openQuestion === index ? (
                    <Minus className="w-5 h-5 text-[#4ade80] transition-transform" />
                  ) : (
                    <Plus className="w-5 h-5 text-[#4ade80] transition-transform" />
                  )}
                </div>
                <div
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    openQuestion === index ? "max-h-40" : "max-h-0"
                  }`}
                >
                  <div className="p-4 pt-0 text-gray-400">{q.answer}</div>
                </div>
              </div>
            </FadeInSection>
          ))}
        </div>
      </div>
      <FadeInSection>
        <div className="mt-16">
          <h2 className="text-3xl font-bold text-center mb-8">Learn About Ethereum</h2>
          <div className="grid md:grid-cols-3 gap-6 max-w-7xl mx-auto">
            {/* Render tutorial video iframes */}
            {tutorials.map((tutorial, index) => (
              <div
                key={tutorial.id}
                className={`aspect-video bg-white/5 rounded-lg overflow-hidden ${index === 1 ? "md:col-start-2" : ""}`}
              >
                <iframe
                  width="100%"
                  height="100%"
                  src={`https://www.youtube.com/embed/${tutorial.id}`}
                  title={tutorial.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="border-0"
                />
              </div>
            ))}
          </div>
        </div>
      </FadeInSection>
    </section>
  )
}

