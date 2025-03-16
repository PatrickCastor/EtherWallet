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
 * Fetches historical ETH price data from Binance API
 * @param days Number of days of historical data to fetch
 * @returns Array of price data points
 */
export async function getHistoricalPriceData(days: number): Promise<PriceData[]> {
  try {
    // Calculate interval based on number of days
    let interval = '1h'; // Default to 1 hour intervals
    if (days <= 1) {
      interval = '5m'; // 5 minute intervals for 1 day or less
    } else if (days > 30) {
      interval = '1d'; // Daily intervals for more than 30 days
    }

    // For complete history (when days is very large), use multiple requests
    if (days > 1000) {
      return await getCompleteEthHistory();
    }

    // Calculate start time
    const endTime = Date.now();
    const startTime = endTime - (days * 24 * 60 * 60 * 1000);

    // Fetch data from Binance API
    const response = await axios.get('https://api.binance.com/api/v3/klines', {
      params: {
        symbol: 'ETHUSDT',
        interval: interval,
        startTime: startTime,
        endTime: endTime,
        limit: 1000 // Maximum allowed by Binance
      }
    });

    // Process the data
    // Binance klines format: [openTime, open, high, low, close, volume, closeTime, ...]
    const priceData: PriceData[] = response.data.map((item: any) => ({
      date: new Date(item[0]).toISOString(),
      price: parseFloat(item[4]) // Using close price
    }));

    return priceData;
  } catch (error) {
    console.error('Error fetching historical price data:', error);
    throw error;
  }
}

/**
 * Fetches complete ETH price history from Binance API using multiple requests
 * @returns Array of price data points covering the entire ETH history
 */
async function getCompleteEthHistory(): Promise<PriceData[]> {
  try {
    const allData: PriceData[] = [];
    // Use current time to ensure we get the latest data
    let endTime = Date.now();
    let hasMoreData = true;
    
    while (hasMoreData) {
      // Fetch data in chunks of 1000 daily candles
      const response = await axios.get('https://api.binance.com/api/v3/klines', {
        params: {
          symbol: 'ETHUSDT',
          interval: '1d',
          endTime: endTime,
          limit: 1000
        }
      });
      
      if (!response.data || !Array.isArray(response.data) || response.data.length === 0) {
        hasMoreData = false;
        break;
      }
      
      // Process this batch of data
      const batchData = response.data.map((item: any) => ({
        date: new Date(item[0]).toISOString(),
        price: parseFloat(item[4]) // Using close price
      }));
      
      // Add to our collection
      allData.unshift(...batchData);
      
      // Update endTime for next batch - make sure we don't get duplicate data
      endTime = new Date(batchData[0].date).getTime() - 24 * 60 * 60 * 1000;
      
      // Add a small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // If we've gone back far enough (before ETH listing on Binance), stop
      if (endTime < new Date('2017-07-01').getTime()) {
        hasMoreData = false;
      }
    }
    
    // Apply sampling to reduce data points for better performance
    // Sample every 5th point for the complete history
    const sampledData = allData.filter((_, index) => index % 5 === 0);
    
    // Make sure we include the most recent data point
    if (allData.length > 0 && sampledData[sampledData.length - 1] !== allData[allData.length - 1]) {
      sampledData.push(allData[allData.length - 1]);
    }
    
    return sampledData;
  } catch (error) {
    console.error('Error fetching complete ETH history:', error);
    return generateFallbackPriceData(365 * 2); // 2 years of fallback data
  }
}

// Improved WebSocket connection management
function getSharedWebSocketConnection(): WebSocket {
  if (activeWebSocket && activeWebSocket.readyState === WebSocket.OPEN) {
    return activeWebSocket;
  }
  
  // Close any existing connection that's not open
  if (activeWebSocket) {
    closeWebSocketConnection();
  }
  
  try {
    // Create a new connection
    const ws = new WebSocket('wss://stream.binance.com:9443/ws/ethusdt@ticker');
    
    // Reset connection attempts on successful connection
    ws.onopen = () => {
      console.log('WebSocket connection established');
      connectionAttempts = 0;
      
      // Set up a ping interval to keep the connection alive
      if (pingInterval) clearInterval(pingInterval);
      pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          try {
            ws.send(JSON.stringify({ method: 'ping' }));
          } catch (err) {
            console.error('Error sending ping:', err);
            // If ping fails, try to reconnect
            scheduleReconnect();
          }
        }
      }, 30000); // Send ping every 30 seconds
    };
    
    // Handle incoming messages and distribute to all callbacks
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Handle ping response or ticker data
        if (data.pong) {
          console.log('Received pong from server');
          return;
        }
        
        // Extract the current price
        const currentPrice = parseFloat(data.c);
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
  } catch (error) {
    console.error('Error creating WebSocket connection:', error);
    scheduleReconnect();
    // Return a dummy WebSocket object that will be replaced on reconnect
    return {
      readyState: WebSocket.CONNECTING,
      send: () => {},
      close: () => {},
      onopen: null,
      onclose: null,
      onmessage: null,
      onerror: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
      CONNECTING: WebSocket.CONNECTING,
      OPEN: WebSocket.OPEN,
      CLOSING: WebSocket.CLOSING,
      CLOSED: WebSocket.CLOSED,
      url: '',
      protocol: '',
      extensions: '',
      binaryType: 'blob',
      bufferedAmount: 0
    } as WebSocket;
  }
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
  try {
    getSharedWebSocketConnection();
  } catch (error) {
    console.error('Error setting up real-time price updates:', error);
    // Schedule a reconnect attempt even if initial connection fails
    scheduleReconnect();
  }
  
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
 * Fetches the current ETH price
 * @returns Current ETH price in USD
 */
export async function getCurrentPrice(): Promise<number> {
  try {
    const response = await axios.get('https://api.binance.com/api/v3/ticker/price', {
      params: {
        symbol: 'ETHUSDT'
      }
    });
    
    return parseFloat(response.data.price);
  } catch (error) {
    console.error('Error fetching current price:', error);
    throw new Error('Failed to fetch current price');
  }
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