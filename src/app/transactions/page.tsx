/**
 * Transactions Page Component
 *
 * This component renders the Transactions page, which includes a search functionality
 * for wallet addresses, displays transaction history, and visualizes transaction data
 * using various charts and graphs.
 */

"use client"

import type React from "react"
import { useState, useEffect, useCallback, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import PriceHistoryChart from "../../components/PriceHistoryChart"
import LatestBlocks from "../../components/LatestBlocks"
import LatestTransactions from "../../components/LatestTransactions"
import TransactionGraph from "../../components/TransactionGraph"
import EthereumStatsCards from "../../components/EthereumStatsCards"
import { Search, Loader2 } from "lucide-react"

// Define transaction interface
interface Transaction {
  source: string
  target: string
  amount: number
  date: string
  transactionId: string
  direction: 'incoming' | 'outgoing'
  gasCost: number
}

/**
 * Transactions function component
 * Manages the state and rendering of the Transactions page
 * @returns JSX.Element
 */
function TransactionsContent() {
  const searchParams = useSearchParams()
  const [searchTerm, setSearchTerm] = useState("")
  const [validAddress, setValidAddress] = useState<string | null>(null)
  const [addressDetails, setAddressDetails] = useState<{ address: string; balance: string } | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [graphTransactions, setGraphTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isVisible, setIsVisible] = useState(false)
  
  // Add pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [totalPages, setTotalPages] = useState(1)
  
  // Add state for search cooldown and caching
  const [searchCooldown, setSearchCooldown] = useState(false)
  const [cooldownTimer, setCooldownTimer] = useState<NodeJS.Timeout | null>(null)
  const [cooldownSeconds, setCooldownSeconds] = useState(0)
  const [searchCache, setSearchCache] = useState<Map<string, any>>(new Map())
  const [lastSearchTime, setLastSearchTime] = useState(0)

  // Additional state for API pagination
  const [apiPage, setApiPage] = useState(1)
  const [apiPageSize, setApiPageSize] = useState(50)
  const [totalCount, setTotalCount] = useState(0)
  const [hasMoreTransactions, setHasMoreTransactions] = useState(false)

  // Function to validate Ethereum address
  const isValidEthereumAddress = (address: string): boolean => {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  // Function to start cooldown timer
  const startCooldown = useCallback((seconds: number) => {
    setSearchCooldown(true)
    setCooldownSeconds(seconds)
    
    // Clear any existing timer
    if (cooldownTimer) {
      clearInterval(cooldownTimer)
    }
    
    // Set up countdown timer
    const timer = setInterval(() => {
      setCooldownSeconds(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          setSearchCooldown(false)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    
    setCooldownTimer(timer)
    
    return () => {
      if (timer) clearInterval(timer)
    }
  }, [cooldownTimer])

  // Function to load more transactions
  const loadMoreTransactions = async () => {
    if (!validAddress || !hasMoreTransactions) return
    
    setIsLoading(true)
    try {
      const nextPage = apiPage + 1
      const response = await fetch(`/api/wallet?address=${validAddress}&page=${nextPage}&pageSize=${apiPageSize}`)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch more transactions: ${response.status} ${response.statusText}`)
      }
      
      const data = await response.json()
      
      if (data.transactions?.result && data.transactions.result.length > 0) {
        const newTransactions = data.transactions.result.map((tx: any) => ({
          source: tx.from,
          target: tx.to,
          amount: tx.valueInEth || 0,
          date: tx.formattedDate || new Date(parseInt(tx.timeStamp) * 1000).toLocaleString(),
          transactionId: tx.hash,
          direction: tx.direction || (tx.from.toLowerCase() === validAddress.toLowerCase() ? 'outgoing' : 'incoming'),
          gasCost: tx.gasCostEth || 0
        }))
        
        // Append new transactions to existing ones
        setTransactions(prev => [...prev, ...newTransactions])
        setApiPage(nextPage)
        
        // Check if there are more transactions to load
        setHasMoreTransactions(newTransactions.length === apiPageSize)
      } else {
        setHasMoreTransactions(false)
      }
    } catch (err) {
      console.error('Error loading more transactions:', err)
      // Show error but don't clear existing transactions
      setError(err instanceof Error ? err.message : 'Failed to load more transactions')
    } finally {
      setIsLoading(false)
    }
  }

  // Handle search submission
  const handleSearch = useCallback(async (address: string) => {
    if (!address) return;
    
    // Validate the Ethereum address format
    if (!isValidEthereumAddress(address)) {
      setError('Invalid Ethereum address format. Address must start with 0x followed by 40 hexadecimal characters.');
      setIsLoading(false);
      setValidAddress(null);
      setAddressDetails(null);
      setTransactions([]);
      setGraphTransactions([]);
      return;
    }
    
    // Check if we're in cooldown
    if (searchCooldown) {
      setError(`Please wait ${cooldownSeconds} seconds before searching again.`);
      return;
    }
    
    // Check if we need to enforce a minimum time between searches
    const now = Date.now();
    const timeSinceLastSearch = now - lastSearchTime;
    if (timeSinceLastSearch < 2000) { // 2 seconds minimum between searches
      const waitTime = Math.ceil((2000 - timeSinceLastSearch) / 1000);
      setError(`Please wait ${waitTime} seconds between searches to avoid API rate limits.`);
      startCooldown(waitTime);
      return;
    }
    
    // Check if we have cached data for this address
    if (searchCache.has(address)) {
      console.log('Using cached data for address:', address);
      const cachedData = searchCache.get(address);
      
      setValidAddress(address);
      setAddressDetails({
        address: address,
        balance: `${cachedData.balance.balanceInEth || 0} ETH`
      });
      
      if (cachedData.transactions?.result && cachedData.transactions.result.length > 0) {
        setTransactions(cachedData.formattedTransactions || []);
        setGraphTransactions(cachedData.graphTransactions || []);
      } else {
        setTransactions([]);
        setGraphTransactions([]);
      }
      
      setLastSearchTime(now);
      setError(null);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setLastSearchTime(now);
    // Reset pagination state
    setApiPage(1)
    setHasMoreTransactions(false)

    try {
      const response = await fetch(`/api/wallet?address=${address}&page=${apiPage}&pageSize=${apiPageSize}`);
      
      // Handle rate limiting
      if (response.status === 429) {
        setError('API rate limit reached. Please wait before trying again.');
        setIsLoading(false);
        startCooldown(10); // 10 second cooldown for rate limiting
        return;
      }
      
      if (!response.ok) {
        throw new Error(`Failed to fetch wallet data: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Set address details using the enhanced balance data
      setValidAddress(address);
      setAddressDetails({
        address: address,
        balance: `${data.balance.balanceInEth || 0} ETH`
      });
      
      let formattedTransactions: Transaction[] = [];
      
      // Process transaction data using the enhanced transaction data
      if (data.transactions?.result && data.transactions.result.length > 0) {
        formattedTransactions = data.transactions.result.map((tx: any) => ({
          source: tx.from,
          target: tx.to,
          amount: tx.valueInEth || 0,
          date: tx.formattedDate || new Date(parseInt(tx.timeStamp) * 1000).toLocaleString(),
          transactionId: tx.hash,
          direction: tx.direction || (tx.from.toLowerCase() === address.toLowerCase() ? 'outgoing' : 'incoming'),
          gasCost: tx.gasCostEth || 0
        }));
        setTransactions(formattedTransactions);
        
        // Check if there are potentially more transactions to load
        setHasMoreTransactions(formattedTransactions.length === apiPageSize)
        
        // Use the pre-formatted graph transactions if available, otherwise use the formatted transactions
        if (data.graphTransactions && data.graphTransactions.length > 0) {
          setGraphTransactions(data.graphTransactions);
        } else {
          setGraphTransactions(formattedTransactions);
        }
      } else {
        setTransactions([]);
        setGraphTransactions([]);
        setHasMoreTransactions(false)
      }
      
      // Cache the data
      setSearchCache(prev => {
        const newCache = new Map(prev);
        newCache.set(address, {
          ...data,
          formattedTransactions,
          timestamp: Date.now()
        });
        
        // Limit cache size to 10 entries
        if (newCache.size > 10) {
          const oldestKey = [...newCache.entries()]
            .sort((a, b) => a[1].timestamp - b[1].timestamp)[0][0];
          newCache.delete(oldestKey);
        }
        
        return newCache;
      });
      
    } catch (err) {
      console.error('Error fetching wallet data:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      setValidAddress(null);
      setAddressDetails(null);
      setTransactions([]);
      setGraphTransactions([]);
      
      // Check if the error might be due to rate limiting
      if (err instanceof Error && err.message.includes('429')) {
        startCooldown(10); // 10 second cooldown for rate limiting
      }
    } finally {
      setIsLoading(false);
    }
  }, [searchCooldown, cooldownSeconds, lastSearchTime, searchCache, startCooldown, apiPage, apiPageSize])

  const handleNodeClick = useCallback((address: string) => {
    setSearchTerm(address)
    handleSearch(address)
  }, [handleSearch])

  useEffect(() => {
    const address = searchParams.get("address")
    if (address) {
      setSearchTerm(address)
      handleSearch(address)
    }
    setIsVisible(true)
    
    // Clean up cooldown timer on unmount
    return () => {
      if (cooldownTimer) {
        clearInterval(cooldownTimer)
      }
    }
  }, [searchParams, handleSearch, cooldownTimer])

  // Clear search results and reset state
  const handleClear = () => {
    if (searchTerm) {
      setIsVisible(false)
      setTimeout(() => {
        setSearchTerm("")
        setValidAddress(null)
        setAddressDetails(null)
        setTransactions([])
        setGraphTransactions([])
        setError(null)
        setIsVisible(true)
        
        // Reset cooldown when clearing
        if (cooldownTimer) {
          clearInterval(cooldownTimer)
        }
        setSearchCooldown(false)
        setCooldownSeconds(0)
      }, 300)
    }
  }

  // Calculate total pages whenever transactions change
  useEffect(() => {
    if (transactions.length > 0) {
      setTotalPages(Math.ceil(transactions.length / pageSize))
    } else {
      setTotalPages(1)
    }
  }, [transactions, pageSize])
  
  // Function to handle page change
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
    }
  }
  
  // Function to handle page size change
  const handlePageSizeChange = (size: number) => {
    setPageSize(size)
    setCurrentPage(1) // Reset to first page when changing page size
  }
  
  // Calculate current page transactions
  const getCurrentPageTransactions = () => {
    const startIndex = (currentPage - 1) * pageSize
    const endIndex = startIndex + pageSize
    return transactions.slice(startIndex, endIndex)
  }

  return (
    <>
      <div
        className={`min-h-screen text-white transition-opacity duration-500 ${isVisible ? "opacity-100" : "opacity-0"}`}
      >
        <div className="container mx-auto px-4 py-8">
          {/* Search functionality */}
          <div className="mb-8">
            {/* Search input and buttons */}
            <div className="flex flex-col md:flex-row items-center gap-3" suppressHydrationWarning>
              <div className="w-full md:flex-1 relative">
                <div className="relative flex items-center bg-gray-900 rounded-md">
                  <Search className="absolute left-3 text-gray-400 h-4 w-4" />
                  <input
                    type="text"
                    placeholder="Search wallet address..."
                    className="w-full bg-transparent pl-9 pr-3 py-2 h-10 rounded-md focus:outline-none focus:ring-2 focus:ring-[#4ade80] focus:border-transparent"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    suppressHydrationWarning
                  />
                </div>
              </div>
              <div className="flex w-full md:w-auto gap-2 mt-2 md:mt-0">
                <button
                  className={`flex-1 md:w-24 h-10 bg-green-700 text-white rounded-md hover:bg-green-600 transition-all duration-300 flex items-center justify-center hover:cursor-pointer ${
                    isLoading || searchCooldown || !searchTerm ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                  onClick={() => handleSearch(searchTerm)}
                  disabled={isLoading || searchCooldown || !searchTerm}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : searchCooldown ? (
                    `Wait ${cooldownSeconds}s`
                  ) : (
                    "Search"
                  )}
                </button>
                <button
                  className={`flex-1 md:w-24 h-10 bg-red-700 text-white rounded-md hover:bg-red-600 transition-all duration-300 flex items-center justify-center ${
                    searchTerm ? "opacity-100 cursor-pointer" : "opacity-50 cursor-not-allowed"
                  }`}
                  onClick={handleClear}
                  disabled={!searchTerm}
                >
                  Clear
                </button>
              </div>
            </div>
            
            {error && (
              <div className="mt-4 p-4 bg-red-900/50 border border-red-700 rounded-md text-white">
                {error}
              </div>
            )}
            
            {searchCooldown && (
              <div className="mt-4 p-4 bg-yellow-900/50 border border-yellow-700 rounded-md text-white">
                <div className="flex items-center">
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  <span>Cooldown active: Please wait {cooldownSeconds} seconds before making another search to avoid API rate limits.</span>
                </div>
              </div>
            )}
          </div>

          {/* Transaction details and graph */}
          {validAddress && addressDetails && (
            <div className="space-y-6 mb-8">
              {/* Address details */}
              <div className="bg-gray-900 border-gray-800 p-6 rounded-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Address Details</h3>
                    <p className="font-mono text-gray-400">{addressDetails.address}</p>
                    <p className="text-[#4ade80] mt-2">Balance: {addressDetails.balance}</p>
                  </div>
                  <div>
                    <a 
                      href={`https://etherscan.io/address/${addressDetails.address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 text-sm flex items-center"
                    >
                      View on Etherscan
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  </div>
                </div>
              </div>

              {/* Transaction Statistics */}
              {transactions.length > 0 && (
                <div className="bg-gray-900 border-gray-800 p-6 rounded-lg">
                  <h3 className="text-xl font-semibold mb-4">Transaction Statistics</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gray-800 p-4 rounded-lg">
                      <div className="text-sm text-gray-400">Total Transactions</div>
                      <div className="text-2xl font-bold mt-1">{transactions.length}</div>
                      <div className="flex mt-2">
                        <div className="mr-4">
                          <div className="text-xs text-gray-400">Incoming</div>
                          <div className="text-green-400">{transactions.filter(tx => tx.direction === 'incoming').length}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-400">Outgoing</div>
                          <div className="text-red-400">{transactions.filter(tx => tx.direction === 'outgoing').length}</div>
                        </div>
                      </div>
                    </div>
                    <div className="bg-gray-800 p-4 rounded-lg">
                      <div className="text-sm text-gray-400">Total ETH Received</div>
                      <div className="text-2xl font-bold text-green-400 mt-1">
                        {transactions
                          .filter(tx => tx.direction === 'incoming')
                          .reduce((sum, tx) => sum + tx.amount, 0)
                          .toFixed(6)} ETH
                      </div>
                    </div>
                    <div className="bg-gray-800 p-4 rounded-lg">
                      <div className="text-sm text-gray-400">Total ETH Sent</div>
                      <div className="text-2xl font-bold text-red-400 mt-1">
                        {transactions
                          .filter(tx => tx.direction === 'outgoing')
                          .reduce((sum, tx) => sum + tx.amount, 0)
                          .toFixed(6)} ETH
                      </div>
                      <div className="text-xs text-gray-400 mt-2">
                        Gas Fees: {transactions
                          .filter(tx => tx.direction === 'outgoing')
                          .reduce((sum, tx) => sum + (tx.gasCost || 0), 0)
                          .toFixed(6)} ETH
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Transaction graph */}
              {transactions.length > 0 && (
                <div className="bg-gray-900 border-gray-800 p-6 rounded-lg">
                  <h3 className="text-xl font-semibold mb-4">Transaction Graph</h3>
                  {/* Debug information */}
                  <div className="mb-4 p-2 bg-gray-800 rounded text-xs">
                    <p>Transactions loaded: {graphTransactions.length}</p>
                    <p>Focus address: {validAddress}</p>
                    <p>First transaction sample: {graphTransactions.length > 0 ? 
                      `From: ${graphTransactions[0].source.substring(0, 10)}..., To: ${graphTransactions[0].target.substring(0, 10)}..., Amount: ${graphTransactions[0].amount}` : 'None'}</p>
                    <p>Valid connections: {graphTransactions.filter(tx => 
                      tx.source && tx.target && 
                      tx.source !== tx.target && 
                      typeof tx.amount === 'number').length}
                    </p>
                  </div>
                  <div className="h-[800px] overflow-hidden">
                    <TransactionGraph
                      transactions={graphTransactions}
                      focusAddress={validAddress || ''}
                      onNodeClick={handleNodeClick}
                    />
                  </div>
                </div>
              )}

              {/* Transaction history table */}
              {transactions.length > 0 ? (
                <div className="bg-gray-900 border-gray-800 p-6 rounded-lg">
                  <h3 className="text-xl font-semibold mb-4">Transaction History</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-800">
                      <thead>
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                            Date
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                            Transaction ID
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                            From
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                            To
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                            Amount
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                            Type
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                            Gas Cost
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800">
                        {getCurrentPageTransactions().map((tx, index) => (
                          <tr key={index} className="hover:bg-gray-800/50">
                            <td className="px-4 py-3 text-sm">{tx.date}</td>
                            <td className="px-4 py-3 text-sm font-mono">
                              <a 
                                href={`https://etherscan.io/tx/${tx.transactionId}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-400 hover:text-blue-300"
                              >
                                {tx.transactionId.substring(0, 10)}...{tx.transactionId.slice(-4)}
                              </a>
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <a 
                                href={`https://etherscan.io/address/${tx.source}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className={`hover:underline ${tx.source === validAddress ? "text-[#4ade80]" : "text-blue-400"}`}
                              >
                                {tx.source.substring(0, 6)}...{tx.source.slice(-4)}
                              </a>
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <a 
                                href={`https://etherscan.io/address/${tx.target}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className={`hover:underline ${tx.target === validAddress ? "text-[#4ade80]" : "text-blue-400"}`}
                              >
                                {tx.target.substring(0, 6)}...{tx.target.slice(-4)}
                              </a>
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <span className={tx.direction === 'incoming' ? "text-green-400" : "text-red-400"}>
                                {tx.amount.toFixed(6)} ETH
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <span className={`px-2 py-1 rounded-full text-xs ${tx.direction === 'incoming' ? "bg-green-900 text-green-300" : "bg-red-900 text-red-300"}`}>
                                {tx.direction === 'incoming' ? 'Received' : 'Sent'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-400">
                              {tx.gasCost ? `${tx.gasCost.toFixed(6)} ETH` : 'N/A'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    
                    {/* Pagination Controls */}
                    <div className="mt-8 flex flex-col md:flex-row items-center justify-between gap-4">
                      <div className="flex flex-wrap items-center gap-1">
                        <span className="text-sm text-gray-400">
                          Showing {Math.min((currentPage - 1) * pageSize + 1, transactions.length)} -
                          {Math.min(currentPage * pageSize, transactions.length)} of {transactions.length} transactions
                        </span>
                        
                        <div className="ml-4">
                          <select 
                            value={pageSize}
                            onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                            className="bg-gray-800 text-white px-2 py-1 rounded-md text-sm border border-gray-700"
                          >
                            <option value={10}>10 per page</option>
                            <option value={25}>25 per page</option>
                            <option value={50}>50 per page</option>
                            <option value={100}>100 per page</option>
                          </select>
                        </div>
                      </div>
                      
                      <div className="flex items-center">
                        <button
                          onClick={() => handlePageChange(1)}
                          disabled={currentPage === 1}
                          className="px-3 py-1 bg-gray-800 hover:bg-gray-700 text-white rounded-l-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          First
                        </button>
                        <button
                          onClick={() => handlePageChange(currentPage - 1)}
                          disabled={currentPage === 1}
                          className="px-3 py-1 bg-gray-800 hover:bg-gray-700 text-white border-l border-gray-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Previous
                        </button>
                        
                        <div className="px-4 py-1 bg-gray-700 text-white">
                          Page {currentPage} of {totalPages}
                        </div>
                        
                        <button
                          onClick={() => handlePageChange(currentPage + 1)}
                          disabled={currentPage === totalPages}
                          className="px-3 py-1 bg-gray-800 hover:bg-gray-700 text-white border-r border-gray-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Next
                        </button>
                        <button
                          onClick={() => handlePageChange(totalPages)}
                          disabled={currentPage === totalPages}
                          className="px-3 py-1 bg-gray-800 hover:bg-gray-700 text-white rounded-r-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Last
                        </button>
                      </div>
                    </div>
                    
                    {/* Load More Transactions Button */}
                    {hasMoreTransactions && (
                      <div className="mt-8 flex justify-center">
                        <button
                          onClick={loadMoreTransactions}
                          disabled={isLoading}
                          className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-md transition-colors duration-200 flex items-center"
                        >
                          {isLoading ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Loading...
                            </>
                          ) : (
                            <>Load More Transactions</>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-gray-900 border-gray-800 p-6 rounded-lg">
                  <h3 className="text-xl font-semibold mb-4">Transaction History</h3>
                  <p className="text-gray-400">No transactions found for this address.</p>
                </div>
              )}
            </div>
          )}

          {/* Charts */}
          <div className="mb-8">
            {/* Price History chart (full width) */}
            <div className="h-[400px]">
              <PriceHistoryChart />
            </div>
          </div>

          {/* Ethereum Stats Cards */}
          <EthereumStatsCards />

          {/* Latest blocks and transactions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* LatestBlocks and LatestTransactions components */}
            <LatestBlocks />
            <LatestTransactions />
          </div>
        </div>
      </div>
    </>
  )
}

export default function Transactions() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-white">Loading...</div>}>
      <TransactionsContent />
    </Suspense>
  )
}

