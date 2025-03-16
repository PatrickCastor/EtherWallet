import axios from 'axios';

/**
 * Interface for price data point
 */
export interface PriceData {
  date: string;
  price: number;
}

// WebSocket connection pool to prevent rapid connections/disconnections
let activeWebSocket: WebSocket | null = null;
let activeCallbacks: Set<(price: number) => void> = new Set();
let connectionAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 2000; // 2 seconds
let reconnectTimeout: NodeJS.Timeout | null = null;
let pingInterval: NodeJS.Timeout | null = null;

/**
 * Fetches historical ETH price data from CoinGecko API
 * @param days Number of days of historical data to fetch
 * @returns Array of price data points
 */
export async function getHistoricalPriceData(days: number): Promise<PriceData[]> {
  try {
    // Use CoinGecko API instead of Binance
    const response = await axios.get(
      `https://api.coingecko.com/api/v3/coins/ethereum/market_chart`, {
        params: {
          vs_currency: 'usd',
          days: days,
          interval: days <= 1 ? 'minute' : days <= 7 ? 'hourly' : 'daily'
        },
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'NodeFlow Ethereum Explorer'
        }
      }
    );

    if (!response.data || !response.data.prices) {
      throw new Error('Invalid response from CoinGecko API');
    }

    // Format the data for our chart
    const priceData: PriceData[] = response.data.prices.map((item: [number, number]) => ({
      date: new Date(item[0]).toISOString(),
      price: parseFloat(item[1].toFixed(2))
    }));

    return priceData;
  } catch (error) {
    console.error('Error fetching historical price data:', error);
    // Use fallback data if API fails
    return generateFallbackPriceData(days);
  }
}

/**
 * Fetches the current ETH price from CoinGecko
 * @returns Current ETH price in USD
 */
export async function getCurrentPrice(): Promise<number> {
  try {
    const response = await axios.get(
      'https://api.coingecko.com/api/v3/simple/price',
      {
        params: {
          ids: 'ethereum',
          vs_currencies: 'usd'
        },
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'NodeFlow Ethereum Explorer'
        }
      }
    );

    if (!response.data?.ethereum?.usd) {
      throw new Error('Invalid response format');
    }

    return response.data.ethereum.usd;
  } catch (error) {
    console.error('Error fetching current price:', error);
    throw new Error('Failed to fetch current price');
  }
}

// Improved WebSocket connection management
function getSharedWebSocketConnection(): WebSocket {
  if (activeWebSocket && activeWebSocket.readyState === WebSocket.OPEN) {
    return activeWebSocket;
  }
  
  // Close any existing connection
  if (activeWebSocket) {
    closeWebSocketConnection();
  }
  
  // Create a new connection using alternative WebSocket endpoint
  const ws = new WebSocket('wss://ws.coincap.io/prices?assets=ethereum');
  
  ws.onopen = () => {
    console.log('WebSocket connection established');
    connectionAttempts = 0;
    
    if (pingInterval) clearInterval(pingInterval);
    pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000);
  };
  
  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      
      // CoinCap format is different from Binance
      if (data.ethereum) {
        const currentPrice = parseFloat(data.ethereum);
        if (isNaN(currentPrice)) {
          console.warn('Received invalid price data', data);
          return;
        }
        
        // Call all registered callbacks with the new price
        activeCallbacks.forEach(callback => {
          try {
            callback(currentPrice);
          } catch (err) {
            console.error('Error in price update callback:', err);
          }
        });
      }
    } catch (error) {
      console.error('Error processing WebSocket message:', error);
    }
  };
  
  // Handle errors with reconnection logic
  ws.onerror = (error) => {
    console.warn('WebSocket connection error:', error);
    scheduleReconnect();
  };
  
  // Handle connection close
  ws.onclose = (event) => {
    console.log(`WebSocket connection closed: ${event.code} ${event.reason}`);
    
    // Clear ping interval
    if (pingInterval) {
      clearInterval(pingInterval);
      pingInterval = null;
    }
    
    // Attempt to reconnect if the connection was closed unexpectedly
    if (event.code !== 1000 && event.code !== 1001) {
      scheduleReconnect();
    }
  };
  
  activeWebSocket = ws;
  return ws;
}

// Schedule a reconnection attempt
function scheduleReconnect() {
  // Only attempt reconnection if we haven't exceeded the maximum attempts
  // and there are still active callbacks
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }
  
  if (connectionAttempts < MAX_RECONNECT_ATTEMPTS && activeCallbacks.size > 0) {
    connectionAttempts++;
    console.log(`Attempting to reconnect (${connectionAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);
    
    // Use exponential backoff for reconnection
    const delay = RECONNECT_DELAY * Math.pow(2, connectionAttempts - 1);
    reconnectTimeout = setTimeout(() => {
      reconnectTimeout = null;
      if (activeCallbacks.size > 0) {
        getSharedWebSocketConnection();
      }
    }, delay);
  } else if (connectionAttempts >= MAX_RECONNECT_ATTEMPTS) {
    console.error('Maximum WebSocket reconnection attempts reached');
  }
}

// Function to properly close a WebSocket connection
function closeWebSocketConnection() {
  if (!activeWebSocket) return;
  
  // Clear any pending reconnect
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }
  
  // Clear ping interval
  if (pingInterval) {
    clearInterval(pingInterval);
    pingInterval = null;
  }
  
  try {
    const ws = activeWebSocket;
    
    // Remove event handlers to prevent reconnection attempts
    ws.onclose = null;
    ws.onerror = null;
    
    // Close the connection cleanly with normal closure code
    if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
      ws.close(1000, 'Normal closure');
    }
    
    activeWebSocket = null;
  } catch (e) {
    console.error('Error closing WebSocket connection:', e);
    activeWebSocket = null;
  }
}

// Make sure to clean up all WebSocket connections when the module is unloaded
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', closeWebSocketConnection);
}

/**
 * Sets up a WebSocket connection for real-time ETH price updates
 * @param onUpdate Callback function to handle price updates
 * @returns Cleanup function to close the WebSocket connection
 */
export function setupRealtimePriceUpdates(onUpdate: (price: number) => void): () => void {
  // Add the callback to our active callbacks
  activeCallbacks.add(onUpdate);
  
  // Ensure we have an active connection
  getSharedWebSocketConnection();
  
  // Return cleanup function that removes this callback
  return () => {
    activeCallbacks.delete(onUpdate);
    
    // If there are no more callbacks, close the connection
    if (activeCallbacks.size === 0) {
      closeWebSocketConnection();
    }
  };
}

/**
 * Fallback function to generate mock price data when API fails
 * @param days Number of days of data to generate
 * @returns Array of mock price data points
 */
export function generateFallbackPriceData(days: number): PriceData[] {
  const data: PriceData[] = [];
  const now = Date.now();
  const basePrice = 3000; // Base ETH price
  
  // Generate data points with 5-day sampling for longer periods
  const sampleInterval = days > 90 ? 5 : 1; // Use 5-day sampling for periods longer than 90 days
  
  for (let i = 0; i < days; i += sampleInterval) {
    const time = now - (days * 24 * 60 * 60 * 1000) + (i * 24 * 60 * 60 * 1000);
    // Create some random price movement
    const randomFactor = 0.98 + (Math.random() * 0.04); // Random factor between 0.98 and 1.02
    const price = basePrice * randomFactor * (1 + Math.sin(i / 48) * 0.05);
    
    data.push({
      date: new Date(time).toISOString(),
      price: parseFloat(price.toFixed(2))
    });
  }
  
  return data;
} 