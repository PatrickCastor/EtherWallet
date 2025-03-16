"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Loader2, RefreshCw, Clipboard, Check } from "lucide-react"
import { useNotification, NOTIFICATION_MESSAGES } from "@/lib/notification-context"

/**
 * Transaction interface defining the structure of transaction data
 */
interface Transaction {
  hash: string
  time: string
  amount: string
  type: string
  from: string
  to: string
}

/**
 * LatestTransactions Component
 * 
 * Displays a list of recent cryptocurrency transactions with details
 * including hash, time, amount, and transaction type.
 * Fetches real-time data from Etherscan.
 */
const LatestTransactions: React.FC = () => {
  const [latestTransactions, setLatestTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null)
  const { showNotification } = useNotification()
  
  // Add a flag to track if component is mounted
  const isMountedRef = useRef(true)
  
  // Create fallback transaction data
  const generateFallbackTransactions = (count: number = 6): Transaction[] => {
    const fallbackTxs: Transaction[] = []
    const now = Date.now()
    
    // Common Ethereum addresses for demo purposes
    const addresses = [
      '0xae2fc483527b8ef99eb5d9b44875f005ba1fae13',
      '0x7c92e8d9b8ab45f3eb18a29c6a4a5bb5aae26c8d',
      '0xb8c9f9e7d93d42a13a5c35e8c8a5e16c8c7c8a5e',
      '0xd8e7c8a5e16c8c7c8a5e16c8c7c8a5e16c8c7c8a',
      '0xe16c8c7c8a5e16c8c7c8a5e16c8c7c8a5e16c8c7'
    ]
    
    for (let i = 0; i < count; i++) {
      // Determine if transaction is incoming or outgoing
      const isOutgoing = Math.random() > 0.5
      
      // Generate a random transaction hash
      const hash = '0x' + [...Array(64)].map(() => Math.floor(Math.random() * 16).toString(16)).join('')
      
      // Set from/to addresses based on direction
      const from = isOutgoing ? addresses[0] : addresses[Math.floor(Math.random() * (addresses.length - 1)) + 1]
      const to = isOutgoing ? addresses[Math.floor(Math.random() * (addresses.length - 1)) + 1] : addresses[0]
      
      // Generate a random ETH amount
      const amount = `${(Math.random() * 2 + 0.01).toFixed(4)} ETH`
      
      fallbackTxs.push({
        hash,
        time: new Date(now - i * 60000).toLocaleTimeString(), // 1 minute per transaction
        amount,
        type: Math.random() > 0.3 ? 'Transfer' : 'Contract Call',
        from,
        to
      })
    }
    
    return fallbackTxs
  }

  const copyToClipboard = (address: string) => {
    navigator.clipboard.writeText(address)
      .then(() => {
        setCopiedAddress(address);
        showNotification(
          `${NOTIFICATION_MESSAGES.ADDRESS_COPIED} (${address.substring(0, 6)}...${address.slice(-4)})`, 
          'success', 
          2000
        );
        // Reset copied state after 2 seconds
        setTimeout(() => {
          if (isMountedRef.current) {
            setCopiedAddress(null)
          }
        }, 2000);
      })
      .catch(err => {
        console.error('Failed to copy address:', err);
        showNotification('Failed to copy address', 'error');
      });
  };

  const fetchTransactions = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/transactions?count=6')
      
      // Check if component is still mounted before updating state
      if (!isMountedRef.current) return
      
      const data = await response.json()
      
      if (data.status === 'success' && Array.isArray(data.data) && data.data.length > 0) {
        setLatestTransactions(data.data)
        setLastUpdated(data.lastUpdated)
        setError(null)
        setRetryCount(0)
      } else {
        const errorMsg = data.error || 'Failed to fetch transactions'
        console.warn(errorMsg)
        setError(errorMsg)
        
        // Use existing transactions or fallback if we have no transactions
        if (latestTransactions.length === 0) {
          setLatestTransactions(generateFallbackTransactions())
          setLastUpdated(new Date().toISOString())
        }
        
        // Auto-retry up to 3 times with increasing delay
        if (retryCount < 3) {
          const retryDelay = Math.pow(2, retryCount) * 1000; // Exponential backoff
          setTimeout(() => {
            if (isMountedRef.current) {
              setRetryCount(prev => prev + 1);
              fetchTransactions();
            }
          }, retryDelay);
        }
      }
    } catch (err) {
      // Check if component is still mounted before updating state
      if (!isMountedRef.current) return
      
      setError('Error connecting to API')
      console.error('Error fetching transactions:', err)
      
      // Use existing transactions or fallback if we have no transactions
      if (latestTransactions.length === 0) {
        setLatestTransactions(generateFallbackTransactions())
        setLastUpdated(new Date().toISOString())
      }
      
      // Auto-retry up to 3 times with increasing delay
      if (retryCount < 3) {
        const retryDelay = Math.pow(2, retryCount) * 1000; // Exponential backoff
        setTimeout(() => {
          if (isMountedRef.current) {
            setRetryCount(prev => prev + 1);
            fetchTransactions();
          }
        }, retryDelay);
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false)
      }
    }
  }

  useEffect(() => {
    isMountedRef.current = true
    fetchTransactions()
    
    return () => {
      // Set the mounted ref to false when component unmounts
      isMountedRef.current = false
    }
  }, [])

  const handleManualRefresh = () => {
    setRetryCount(0);
    fetchTransactions();
  };

  return (
    <div className="bg-[#0B1017] rounded-lg p-6 h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-medium text-white">Latest Transactions</h2>
        <div className="flex items-center space-x-4">
          {lastUpdated && (
            <div className="text-xs text-gray-400">
              Updated: {new Date(lastUpdated).toLocaleTimeString()}
            </div>
          )}
          <button 
            onClick={handleManualRefresh} 
            disabled={isLoading}
            className="text-xs bg-gray-800 hover:bg-gray-700 text-white px-2 py-1 rounded-md transition-colors disabled:opacity-50 flex items-center"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                Refreshing...
              </>
            ) : (
              <>
                <RefreshCw className="h-3 w-3 mr-1" />
                Refresh
              </>
            )}
          </button>
          <a 
            href="https://etherscan.io/txs" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-sm text-[#4ADE80] hover:text-[#3FCF70] transition-colors"
          >
            View all
          </a>
        </div>
      </div>
      
      {/* Loading state */}
      {isLoading && latestTransactions.length === 0 && (
        <div className="flex justify-center items-center py-8">
          <Loader2 className="h-8 w-8 text-[#4ADE80] animate-spin" />
        </div>
      )}
      
      {/* Error state */}
      {error && !isLoading && (
        <div className="flex flex-col items-center py-4">
          <div className="text-red-400 text-center mb-2">
            {error}
          </div>
          <button 
            onClick={handleManualRefresh}
            className="px-3 py-1 bg-gray-800 hover:bg-gray-700 text-white rounded-md text-sm flex items-center"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Retry
          </button>
        </div>
      )}
      
      {/* Transaction list container */}
      {latestTransactions.length > 0 && (
        <div className="space-y-4 flex-grow overflow-auto">
          {/* Map through transactions and render each one */}
          {latestTransactions.map((transaction, index) => (
            <div key={index} className="flex justify-between items-start py-3 border-b border-[#1E2631] last:border-0">
              <div className="space-y-1">
                <div className="text-white font-medium">
                  <a 
                    href={`https://etherscan.io/tx/${transaction.hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-[#4ADE80] transition-colors"
                  >
                    {transaction.hash ? `${transaction.hash.substring(0, 10)}...${transaction.hash.slice(-4)}` : 'Unknown Hash'}
                  </a>
                </div>
                <div className="text-sm text-gray-400 flex space-x-2">
                  <span>{transaction.time}</span>
                  <span>•</span>
                  <span className="flex items-center">
                    <a 
                      href={`https://etherscan.io/address/${transaction.from}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-[#4ADE80] transition-colors mr-1"
                    >
                      From: {transaction.from ? `${transaction.from.substring(0, 6)}...` : 'Unknown'}
                    </a>
                    <button
                      onClick={() => copyToClipboard(transaction.from)}
                      className="ml-1 px-1.5 py-0.5 bg-gray-800 hover:bg-gray-700 rounded-md text-xs transition-colors flex items-center"
                      title="Copy wallet address"
                    >
                      {copiedAddress === transaction.from ? (
                        <>
                          <Check className="h-3 w-3 mr-1 text-green-400" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Clipboard className="h-3 w-3 mr-1" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </span>
                </div>

                {transaction.to && (
                  <div className="text-sm text-gray-400 flex space-x-2 mt-1">
                    <span className="flex items-center">
                      <a 
                        href={`https://etherscan.io/address/${transaction.to}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-[#4ADE80] transition-colors mr-1"
                      >
                        To: {transaction.to.substring(0, 6)}...
                      </a>
                      <button
                        onClick={() => copyToClipboard(transaction.to)}
                        className="ml-1 px-1.5 py-0.5 bg-gray-800 hover:bg-gray-700 rounded-md text-xs transition-colors flex items-center"
                        title="Copy wallet address"
                      >
                        {copiedAddress === transaction.to ? (
                          <>
                            <Check className="h-3 w-3 mr-1 text-green-400" />
                            <span>Copied!</span>
                          </>
                        ) : (
                          <>
                            <Clipboard className="h-3 w-3 mr-1" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </span>
                  </div>
                )}
              </div>
              <div className="text-right space-y-1">
                <div className="text-white">{transaction.amount}</div>
                <div className="text-sm text-gray-400">{transaction.type}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default LatestTransactions
