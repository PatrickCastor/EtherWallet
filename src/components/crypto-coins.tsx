"use client"

import { useState, useEffect, useRef } from "react"
import { Loader2, RefreshCw } from "lucide-react"

// Helper function to format price with commas and two decimal places
const formatPrice = (price: number) => {
  return price.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")
}

// Define the coin data interface
interface CoinData {
  symbol: string;
  name: string;
  price: string;
  priceChange: number;
  icon: string;
  label: string;
}

// Map of symbols to full names and icons
const coinDetails: Record<string, { name: string, icon: string, label: string }> = {
  "BTCUSDT": { name: "Bitcoin", icon: "/BTC.svg", label: "Highest volume" },
  "ETHUSDT": { name: "Ethereum", icon: "/ETH.svg", label: "Top gainer" },
  "LTCUSDT": { name: "Litecoin", icon: "/Lite.svg", label: "New listing" },
  "DOTUSDT": { name: "Polkadot", icon: "/Polka.svg", label: "Most traded" },
  "SOLUSDT": { name: "Solana", icon: "/Sol.svg", label: "Biggest gainers" },
  "LINKUSDT": { name: "Chainlink", icon: "/Chainlink.svg", label: "Trending" },
};

export function CryptoCoins() {
  // State to hold the list of coins and their details
  const [coins, setCoins] = useState<CoinData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isWebSocketActive, setIsWebSocketActive] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Function to fetch price data via REST API
  const fetchPriceData = async () => {
    try {
      setIsRefreshing(true);
      const response = await fetch('https://api.binance.com/api/v3/ticker/24hr?symbols=["BTCUSDT","ETHUSDT","LTCUSDT","DOTUSDT","SOLUSDT","LINKUSDT"]');
      
      if (!response.ok) {
        throw new Error('Failed to fetch data from Binance');
      }
      
      const data = await response.json();
      
      const formattedCoins = data.map((coin: any) => {
        const symbol = coin.symbol;
        const details = coinDetails[symbol] || { 
          name: symbol.replace('USDT', ''), 
          icon: "/placeholder.svg",
          label: "Popular" 
        };
        
        return {
          symbol,
          name: details.name,
          price: formatPrice(parseFloat(coin.lastPrice)),
          priceChange: parseFloat(coin.priceChangePercent),
          icon: details.icon,
          label: details.label
        };
      });
      
      setCoins(formattedCoins);
      setLastUpdated(new Date());
      setError(null);
      return true;
    } catch (err) {
      console.error('Error fetching coin data:', err);
      setError('Failed to load cryptocurrency data');
      // Use fallback data if API fails
      if (coins.length === 0) {
        setCoins(Object.entries(coinDetails).map(([symbol, details]) => ({
          symbol,
          name: details.name,
          price: formatPrice(Math.random() * 1000),
          priceChange: (Math.random() * 10) - 5,
          icon: details.icon,
          label: details.label
        })));
      }
      return false;
    } finally {
      setIsRefreshing(false);
      if (isLoading) setIsLoading(false);
    }
  };

  // Function to close WebSocket connection
  const closeWebSocket = () => {
    if (wsRef.current) {
      try {
        // First remove event handlers to prevent further callbacks
        if (wsRef.current.onopen) wsRef.current.onopen = null;
        if (wsRef.current.onmessage) wsRef.current.onmessage = null;
        if (wsRef.current.onerror) wsRef.current.onerror = null;
        if (wsRef.current.onclose) wsRef.current.onclose = null;
        
        // Then close the connection
        wsRef.current.close();
      } catch (e) {
        console.error('Error closing WebSocket connection');
      }
      wsRef.current = null;
    }
    setIsWebSocketActive(false);
  };

  // Setup WebSocket connection for real-time updates
  const setupWebSocket = () => {
    // Close existing connection if any
    closeWebSocket();

    try {
      // Create a new WebSocket connection
      const symbols = Object.keys(coinDetails).map(s => s.toLowerCase()).join('@ticker/');
      const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${symbols}@ticker`);
      
      ws.onopen = () => {
        console.log('WebSocket connection established');
        setIsWebSocketActive(true);
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          setCoins(prevCoins => {
            return prevCoins.map(coin => {
              if (coin.symbol.toLowerCase() === data.s?.toLowerCase()) {
                return {
                  ...coin,
                  price: formatPrice(parseFloat(data.c)),
                  priceChange: parseFloat(data.P)
                };
              }
              return coin;
            });
          });
          
          setLastUpdated(new Date());
        } catch (err) {
          console.error('Error processing WebSocket message:', err);
        }
      };
      
      ws.onerror = (event) => {
        // Don't try to log the error object directly as it may be circular
        console.error('WebSocket connection error - attempting to recover');
        setIsWebSocketActive(false);
        // Fall back to REST API on WebSocket error
        fetchPriceData();
        
        // Try to reconnect after a delay if component is still mounted
        setTimeout(() => {
          if (wsRef.current === ws) { // Only reconnect if this is still the active connection
            closeWebSocket();
            setupWebSocket();
          }
        }, 5000);
      };
      
      ws.onclose = () => {
        console.log('WebSocket connection closed');
        setIsWebSocketActive(false);
      };
      
      wsRef.current = ws;
    } catch (err) {
      console.error('Error setting up WebSocket:', err);
      // Fall back to REST API
      fetchPriceData();
    }
  };

  // Set up regular refresh interval using REST API as a fallback
  const setupRefreshInterval = () => {
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
    }

    refreshIntervalRef.current = setInterval(() => {
      // If WebSocket is not active, use REST API
      if (!isWebSocketActive) {
        fetchPriceData();
      }
    }, 30000); // Refresh every 30 seconds if WebSocket is not working
  };

  // Initialize data and connections
  useEffect(() => {
    let mounted = true;
    
    const init = async () => {
      // First fetch data via REST API
      await fetchPriceData();
      
      // Only set up WebSocket and interval if component is still mounted
      if (mounted) {
        // Then try to set up WebSocket for real-time updates
        setupWebSocket();
        // Set up fallback refresh interval
        setupRefreshInterval();
      }
    };
    
    init();
    
    // Cleanup function
    return () => {
      mounted = false;
      closeWebSocket();
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    };
  }, []);

  // Handle manual refresh
  const handleRefresh = () => {
    fetchPriceData();
  };

  return (
    <section className="py-16">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <div>
            <p className="text-gray-400 mb-2">
              Featured <span className="text-[#4ade80]">crypto coins</span>
            </p>
            <h2 className="text-3xl font-bold">Top crypto coins updates</h2>
          </div>
          
          <div className="flex items-center text-xs text-gray-400">
            {lastUpdated && (
              <div className="flex items-center mr-3">
                <span className="text-yellow-400">Updated: {lastUpdated.toLocaleTimeString()}</span>
              </div>
            )}
            <div className="flex items-center text-[#4ade80] mr-3">
              <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
              <span>Auto-refreshing</span>
            </div>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="bg-gray-800 hover:bg-gray-700 text-white px-2 py-1 rounded-md text-xs flex items-center disabled:opacity-50"
            >
              {isRefreshing ? (
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
          </div>
        </div>
        
        {isLoading && coins.length === 0 ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="h-8 w-8 text-[#4ade80] animate-spin" />
          </div>
        ) : error ? (
          <div className="bg-red-900/20 border border-red-900 rounded-lg p-4 text-center text-red-400">
            {error}
            <button 
              onClick={fetchPriceData}
              className="ml-4 px-3 py-1 bg-gray-800 hover:bg-gray-700 text-white rounded-md text-sm"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {coins.map((coin) => (
              <div key={coin.symbol} className="bg-white/5 p-6 rounded-lg hover:bg-white/10 transition-colors">
                <p className="text-gray-400 text-sm mb-4">{coin.label}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center">
                      <img src={coin.icon || "/placeholder.svg"} alt={coin.name} className="w-8 h-8" />
                    </div>
                    <span className="font-medium">{coin.name}</span>
                  </div>
                  <div className={`text-xs px-2 py-1 rounded ${coin.priceChange >= 0 ? 'bg-green-900/20 text-green-400' : 'bg-red-900/20 text-red-400'}`}>
                    {coin.priceChange >= 0 ? '+' : ''}{coin.priceChange.toFixed(2)}%
                  </div>
                </div>
                <p className="text-lg font-semibold mt-2">${coin.price}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
