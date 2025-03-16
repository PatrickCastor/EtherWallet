"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Loader2, RefreshCw } from "lucide-react"

/**
 * Block interface defining the structure of block data
 */
interface Block {
  number: number
  time: string
  transactions: number
  hash: string
  gasUsed: number
  gasLimit: number
  status: string
  size: number
}

/**
 * LatestBlocks Component
 * 
 * Displays a list of recent blockchain blocks with details
 * including block number, time, and transaction count.
 * Fetches real-time data from Etherscan.
 */
const LatestBlocks: React.FC = () => {
  const [latestBlocks, setLatestBlocks] = useState<Block[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  
  // Add a flag to track if component is mounted
  const isMountedRef = useRef(true)
  
  // Create fallback block data
  const generateFallbackBlocks = (count: number = 5): Block[] => {
    const fallbackBlocks: Block[] = []
    const now = Date.now()
    
    for (let i = 0; i < count; i++) {
      const blockNumber = 18000000 - i
      fallbackBlocks.push({
        number: blockNumber,
        time: new Date(now - i * 15000).toLocaleTimeString(), // 15 seconds per block
        transactions: Math.floor(Math.random() * 100) + 50,
        hash: `0x${[...Array(64)].map(() => Math.floor(Math.random() * 16).toString(16)).join('')}`,
        gasUsed: Math.floor(Math.random() * 15000000) + 5000000,
        gasLimit: 30000000,
        status: i === 0 ? 'Finalized' : 'Confirmed',
        size: Math.floor(Math.random() * 50000) + 20000
      })
    }
    
    return fallbackBlocks
  }

  const fetchBlocks = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/blocks?count=5')
      
      // Check if component is still mounted before updating state
      if (!isMountedRef.current) return
      
      const data = await response.json()
      
      if (data.status === 'success' && Array.isArray(data.data) && data.data.length > 0) {
        setLatestBlocks(data.data)
        setLastUpdated(data.lastUpdated)
        setError(null)
        setRetryCount(0)
      } else {
        const errorMsg = data.error || 'Failed to fetch blocks'
        console.warn(errorMsg)
        setError(errorMsg)
        
        // Use existing blocks or fallback if we have no blocks
        if (latestBlocks.length === 0) {
          setLatestBlocks(generateFallbackBlocks())
          setLastUpdated(new Date().toISOString())
        }
        
        // Auto-retry up to 3 times with increasing delay
        if (retryCount < 3) {
          const retryDelay = Math.pow(2, retryCount) * 1000; // Exponential backoff
          setTimeout(() => {
            if (isMountedRef.current) {
              setRetryCount(prev => prev + 1);
              fetchBlocks();
            }
          }, retryDelay);
        }
      }
    } catch (err) {
      // Check if component is still mounted before updating state
      if (!isMountedRef.current) return
      
      setError('Error connecting to API')
      console.error('Error fetching blocks:', err)
      
      // Use existing blocks or fallback if we have no blocks
      if (latestBlocks.length === 0) {
        setLatestBlocks(generateFallbackBlocks())
        setLastUpdated(new Date().toISOString())
      }
      
      // Auto-retry up to 3 times with increasing delay
      if (retryCount < 3) {
        const retryDelay = Math.pow(2, retryCount) * 1000; // Exponential backoff
        setTimeout(() => {
          if (isMountedRef.current) {
            setRetryCount(prev => prev + 1);
            fetchBlocks();
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
    fetchBlocks()
    
    return () => {
      // Set the mounted ref to false when component unmounts
      isMountedRef.current = false
    }
  }, [])

  const handleManualRefresh = () => {
    setRetryCount(0);
    fetchBlocks();
  };

  return (
    <div className="bg-[#0B1017] rounded-lg p-6 h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-medium text-white">Latest Blocks</h2>
        <div className="flex items-center space-x-4">
          {lastUpdated && (
            <div className="text-xs text-gray-400">
              Updated: {new Date(lastUpdated).toLocaleTimeString()}
            </div>
          )}
          <button 
            onClick={handleManualRefresh} 
            disabled={isLoading}
            className="text-xs bg-gray-800 hover:bg-gray-700 text-white px-2 py-1 rounded-md transition-colors disabled:opacity-50 hover:cursor-pointer flex items-center"
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
            href="https://etherscan.io/blocks" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-sm text-[#4ADE80] hover:text-[#3FCF70] transition-colors"
          >
            View all
          </a>
        </div>
      </div>
      
      {/* Loading state */}
      {isLoading && latestBlocks.length === 0 && (
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
      
      {/* Block list container */}
      {latestBlocks.length > 0 && (
        <div className="space-y-4 flex-grow overflow-auto">
          {/* Map through blocks and render each one */}
          {latestBlocks.map((block, index) => (
            <div key={index} className="flex justify-between items-start py-3 border-b border-[#1E2631] last:border-0">
              <div className="space-y-1">
                <div className="text-white font-medium">
                  <a 
                    href={`https://etherscan.io/block/${block.number}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-[#4ADE80] transition-colors"
                  >
                    {block.number}
                  </a>
                </div>
                <div className="text-sm text-gray-400">{block.time}</div>
                
                {/* Status */}
                <div className="text-sm">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs ${
                    block.status === 'Finalized' 
                      ? 'bg-green-900/30 text-green-400' 
                      : 'bg-yellow-900/30 text-yellow-400'
                  }`}>
                    {block.status}
                  </span>
                </div>
                
                {/* Block Hash (shortened) */}
                <div className="text-sm text-gray-500 mt-1">
                  Hash: <span className="text-gray-400">{block.hash ? `${block.hash.substring(0, 8)}...${block.hash.slice(-6)}` : 'Unavailable'}</span>
                </div>
              </div>
              
              <div className="space-y-1 text-right">
                {/* Transactions */}
                <div className="text-sm text-gray-400">
                  <a 
                    href={`https://etherscan.io/txs?block=${block.number}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-[#4ADE80] transition-colors"
                  >
                    Transactions: {block.transactions || 0}
                  </a>
                </div>
                
                {/* Gas Stats */}
                <div className="text-sm text-gray-500">
                  Gas used: <span className="text-gray-400">{(block.gasUsed / 1e6).toFixed(2)}M</span>
                </div>
                
                <div className="text-sm text-gray-500">
                  Gas limit: <span className="text-gray-400">{(block.gasLimit / 1e6).toFixed(2)}M</span>
                </div>
                
                {/* Size */}
                <div className="text-sm text-gray-500">
                  Size: <span className="text-gray-400">{(block.size / 1024).toFixed(2)} KB</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default LatestBlocks
