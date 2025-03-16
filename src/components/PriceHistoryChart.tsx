"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from "recharts"
import ChartTooltip from "./ChartTooltip"
import { Loader2, RefreshCw, Wifi } from "lucide-react"
import { setupRealtimePriceUpdates, PriceData } from "@/lib/priceApi"
import { useNotification, NOTIFICATION_MESSAGES } from "@/lib/notification-context"
import { useApiNotification } from "@/hooks/useApiNotification"

// Define time range options
type TimeRange = '1H' | '4H' | '1D' | '1W' | '1M' | '3M' | 'ALL';

// Functional component to render the price history chart
const PriceHistoryChart: React.FC = () => {
  const [data, setData] = useState<PriceData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>('1M')
  const [isLiveUpdating, setIsLiveUpdating] = useState(false)
  const [currentPrice, setCurrentPrice] = useState<number | null>(null)
  const [priceChangeColor, setPriceChangeColor] = useState<string>('text-white')
  const [isHovering, setIsHovering] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [selectedDataPoint, setSelectedDataPoint] = useState<PriceData | null>(null)
  const wsCleanupRef = useRef<(() => void) | null>(null)
  const previousPriceRef = useRef<number | null>(null)
  const chartRef = useRef<HTMLDivElement>(null)

  // Initialize notification system
  const { showNotification } = useNotification()
  const apiNotification = useApiNotification<PriceData[]>()

  // Handle time range change with debounce
  const [debouncedRangeChange, setDebouncedRangeChange] = useState<NodeJS.Timeout | null>(null);

  // Check if the device is mobile
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    // Check on mount
    checkIfMobile();
    
    // Add resize listener
    window.addEventListener('resize', checkIfMobile);
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', checkIfMobile);
    };
  }, []);

  // Add CSS to hide x-axis on mobile
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const style = document.createElement('style');
      style.innerHTML = `
        @media (max-width: 767px) {
          .recharts-xAxis,
          .recharts-xAxis .recharts-cartesian-axis-tick-line,
          .recharts-xAxis .recharts-cartesian-axis-line,
          .recharts-xAxis text,
          .recharts-xAxis .recharts-layer,
          .recharts-xAxis tspan {
            opacity: 0 !important;
            display: none !important;
            height: 0 !important;
            font-size: 0 !important;
          }
        }
      `;
      document.head.appendChild(style);
      
      return () => {
        document.head.removeChild(style);
      };
    }
  }, []);

  // Map time range to days parameter for API
  const getTimeRangeDays = (range: TimeRange): number | string => {
    switch (range) {
      case '1H': return 0.042; // 1 hour = 1/24 days
      case '4H': return 0.167; // 4 hours = 4/24 days
      case '1D': return 1;
      case '1W': return 7;
      case '1M': return 30;
      case '3M': return 90;
      case 'ALL': return 'max'; // Use 'max' to get the complete history
      default: return 30;
    }
  };

  // Updated fetch function to use the apiNotification hook
  const fetchPriceHistory = async (range: TimeRange = selectedTimeRange) => {
    // Reset state for new fetch
    setError(null);
    setIsLoading(true);
    setRetryCount(0);
    
    try {
      const days = getTimeRangeDays(range);
      
      // Use the API notification hook to handle the API call with notifications
      const result = await apiNotification.executeApiCall(
        async () => {
          const response = await fetch(`/api/price?days=${days}`);
          if (!response.ok) {
            throw new Error(`Failed to fetch price data: ${response.statusText}`);
          }
          const data = await response.json();
          return data.data;
        },
        {
          loadingMessage: NOTIFICATION_MESSAGES.LOADING_DATA,
          successMessage: NOTIFICATION_MESSAGES.DATA_REFRESHED,
          context: 'price',
          // Always show success notification
          showSuccessNotification: true,
          // Only show loading for longer time ranges
          showLoadingNotification: range === '1M' || range === '3M' || range === 'ALL'
        }
      );
      
      if (result) {
        setData(result);
        setLastUpdated(new Date().toISOString());
        setIsLoading(false);
      }
    } catch (err) {
      // Error handling is done by the apiNotification hook
      setIsLoading(false);
    }
  };

  // Updated setupWebSocket function to use notifications
  const setupWebSocket = () => {
    // Clean up existing connection if any
    if (wsCleanupRef.current) {
      wsCleanupRef.current();
      wsCleanupRef.current = null;
    }
    
    try {
      // Setup WebSocket for live price updates
      const cleanup = setupRealtimePriceUpdates((price) => {
        try {
          updateCurrentPrice(price);
          
          // Add the new price to the chart data for shorter time ranges
          if (['1H', '4H', '1D'].includes(selectedTimeRange)) {
            setData(prevData => {
              // Create a copy of the data
              const newData = [...prevData];
              
              // Add new data point or update the last one if it's very recent
              const now = new Date();
              const newDataPoint = {
                date: now.toISOString(),
                price: price
              };
              
              // If the last data point is within the last minute, update it instead of adding a new one
              if (newData.length > 0) {
                const lastPoint = newData[newData.length - 1];
                const lastDate = new Date(lastPoint.date);
                const diffSeconds = (now.getTime() - lastDate.getTime()) / 1000;
                
                if (diffSeconds < 60) {
                  newData[newData.length - 1] = newDataPoint;
                  return newData;
                }
              }
              
              // Otherwise add a new point and remove the oldest if we have too many
              newData.push(newDataPoint);
              if (newData.length > 100) {
                newData.shift();
              }
              
              return newData;
            });
          }
        } catch (error) {
          console.error('Error processing price update:', error);
        }
      });
      
      wsCleanupRef.current = cleanup;
      setIsLiveUpdating(true);
      // Connection established notification is now handled in the useEffect
    } catch (err) {
      console.error('Failed to setup real-time price updates');
      setIsLiveUpdating(false);
      showNotification(NOTIFICATION_MESSAGES.CONNECTION_ERROR, 'error');
    }
  };
  
  // Updated handle retry
  const handleRetry = (range: TimeRange) => {
    if (retryCount < 3) {
      setRetryCount(prev => prev + 1);
      fetchPriceHistory(range);
    } else {
      showNotification(NOTIFICATION_MESSAGES.SERVER_ERROR, 'error');
    }
  };

  // Update current price with visual indicator
  const updateCurrentPrice = (newPrice: number) => {
    // Store previous price for comparison
    previousPriceRef.current = currentPrice;
    
    // Update current price
    setCurrentPrice(newPrice);
    
    // Set color based on price change
    if (previousPriceRef.current !== null) {
      if (newPrice > previousPriceRef.current) {
        setPriceChangeColor('text-green-400');
      } else if (newPrice < previousPriceRef.current) {
        setPriceChangeColor('text-red-400');
      } else {
        setPriceChangeColor('text-white');
      }
      
      // Reset color after a short delay
      setTimeout(() => {
        setPriceChangeColor('text-white');
      }, 1000);
    }
  };

  useEffect(() => {
    // Track if the component is still mounted
    let isMounted = true;
    
    const initChart = async () => {
      try {
        await fetchPriceHistory();
        
        // Only proceed if the component is still mounted
        if (isMounted) {
          // Setup WebSocket for real-time updates
          setupWebSocket();
          
          // Always show connection established notification
          setTimeout(() => {
            if (isMounted) {
              showNotification(NOTIFICATION_MESSAGES.CONNECTION_ESTABLISHED, 'success');
            }
          }, 100);
        }
      } catch (error) {
        console.error('Error initializing chart:', error);
      }
    };
    
    initChart();
    
    // Cleanup function
    return () => {
      isMounted = false;
      if (wsCleanupRef.current) {
        wsCleanupRef.current();
        wsCleanupRef.current = null;
      }
    };
  }, []);

  // Handle time range change with debounce
  const handleTimeRangeChange = (range: TimeRange) => {
    // Prevent multiple rapid changes by debouncing
    if (debouncedRangeChange) {
      clearTimeout(debouncedRangeChange);
    }
    
    // Set the selected time range immediately for UI feedback
    setSelectedTimeRange(range);
    
    // But debounce the actual data fetching and WebSocket setup
    const timer = setTimeout(() => {
      fetchPriceHistory(range);
      
      // Re-setup WebSocket with new time range
      setupWebSocket();
    }, 300); // 300ms debounce
    
    setDebouncedRangeChange(timer);
  };

  // Cleanup the debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debouncedRangeChange) {
        clearTimeout(debouncedRangeChange);
      }
    };
  }, [debouncedRangeChange]);

  // Format date for tooltip
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    
    // Format based on time range
    if (selectedTimeRange === '1H' || selectedTimeRange === '4H') {
      return date.toLocaleString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric',
        hour: 'numeric', 
        minute: 'numeric' 
      });
    } else if (selectedTimeRange === 'ALL') {
      return date.toLocaleDateString('en-US', { 
        month: 'long', 
        day: 'numeric', 
        year: 'numeric' 
      });
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'long', 
        day: 'numeric', 
        year: 'numeric' 
      });
    }
  }

  // Format date specifically for mobile tooltip to ensure full information
  const formatMobileTooltipDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'long', 
      day: 'numeric', 
      year: 'numeric',
      hour: 'numeric',
      minute: 'numeric'
    });
  }

  // Format value for tooltip
  const formatValue = (value: number) => {
    return `$${value.toLocaleString()}`;
  }

  // Custom tick component for X-axis with better positioning
  const CustomXAxisTick = (props: any) => {
    const { x, y, payload } = props;
    const date = new Date(payload.value);
    
    // Format based on time range
    let formattedDate;
    if (selectedTimeRange === '1H' || selectedTimeRange === '4H') {
      formattedDate = `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
    } else if (selectedTimeRange === '1D') {
      formattedDate = `${date.getHours()}:00`;
    } else if (selectedTimeRange === 'ALL') {
      // For ALL time view, show month and year
      const month = date.toLocaleString('default', { month: 'short' });
      const year = date.getFullYear();
      formattedDate = `${month} ${year}`;
    } else {
      // For other time ranges, show month/day
      formattedDate = `${date.getMonth() + 1}/${date.getDate()}`;
    }
    
    return (
      <g transform={`translate(${x},${y})`}>
        <text 
          x={0} 
          y={0} 
          dy={16} 
          textAnchor="middle" 
          fill="#4B5563"
        >
          {formattedDate}
        </text>
      </g>
    );
  };

  // Time range button component
  const TimeRangeButton = ({ range, current }: { range: TimeRange, current: TimeRange }) => (
    <button
      onClick={() => handleTimeRangeChange(range)}
      className={`px-3 py-1 rounded-md text-sm font-medium transition-colors hover:cursor-pointer ${
        range === current
          ? 'bg-[#4ADE80] text-black'
          : 'bg-[#1E2631] text-gray-400 hover:bg-[#2A3441] hover:text-white'
      }`}
    >
      {range}
    </button>
  );

  // Handle mouse enter/leave for the chart
  const handleMouseEnter = () => {
    if (!isMobile) {
      setIsHovering(true);
    }
  };

  const handleMouseLeave = () => {
    if (!isMobile) {
      setIsHovering(false);
    }
  };

  // Mobile touch handlers for the tooltip functionality
  const handleTouch = () => {
    if (isMobile) {
      setIsHovering(true);
    }
  };

  // Handle clicks on chart (for mobile)
  const handleChartClick = () => {
    if (isMobile) {
      // Toggle hovering state on click for mobile
      setIsHovering(!isHovering);
    }
  };

  // Update data source text
  const getDataSourceText = () => {
    return 'Data source: Binance';
  };

  // Handle chart click for mobile devices
  const handleChartClickMobile = (data: any) => {
    if (!isMobile) return;
    
    if (data && data.activePayload && data.activePayload.length > 0) {
      const clickedData = data.activePayload[0].payload;
      setSelectedDataPoint(clickedData);
    }
  };

  // Close tooltip when clicking elsewhere
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (chartRef.current && !chartRef.current.contains(event.target as Node)) {
        setSelectedDataPoint(null);
      }
    };

    if (isMobile) {
      document.addEventListener('click', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isMobile]);

  return (
    <div className="w-full h-full mt-16">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center">
          <h3 className="text-lg font-semibold text-white">ETH Price History</h3>
          <div className="ml-3 flex items-center text-green-400 text-xs animate-pulse">
            <Wifi className="h-3 w-3 mr-1" />
            <span>Live</span>
          </div>
          {currentPrice && (
            <div className={`ml-4 text-lg font-bold ${priceChangeColor}`}>
              ${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          )}
        </div>
      </div>
      
      {/* Time range selector */}
      <div className="flex flex-wrap space-x-2 mb-4">
        <TimeRangeButton range="1H" current={selectedTimeRange} />
        <TimeRangeButton range="4H" current={selectedTimeRange} />
        <TimeRangeButton range="1D" current={selectedTimeRange} />
        <TimeRangeButton range="1W" current={selectedTimeRange} />
        <TimeRangeButton range="1M" current={selectedTimeRange} />
        <TimeRangeButton range="3M" current={selectedTimeRange} />
        <TimeRangeButton range="ALL" current={selectedTimeRange} />
      </div>
      
      <div 
        ref={chartRef} 
        className="h-[300px] w-full relative" 
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleTouch} 
        onTouchStart={handleTouch}
      >
        {/* Data source indicator - repositioned to top-right */}
        <div className="absolute top-2 right-2 text-xs text-gray-500 bg-gray-900/70 px-2 py-1 rounded-md backdrop-blur-sm z-10">
          {getDataSourceText()}
          {isLiveUpdating && (
            <span className="inline-flex items-center ml-1">
              • <Wifi className="h-3 w-3 text-green-500 ml-1 animate-pulse" />
            </span>
          )}
        </div>
        
        {isLoading && data.length === 0 ? (
          <div className="absolute inset-0 flex justify-center items-center bg-[#0B1017]/70 z-10">
            <Loader2 className="h-8 w-8 text-[#4ADE80] animate-spin" />
          </div>
        ) : error ? (
          <div className="absolute inset-0 flex flex-col justify-center items-center bg-[#0B1017]/70 z-10">
            <div className="text-red-400 text-center p-4">
              {error}
            </div>
            <button 
              onClick={() => {
                setRetryCount(0);
                fetchPriceHistory();
              }}
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
          </div>
        ) : data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart 
              data={data}
              margin={{ top: 10, right: 30, left: 20, bottom: isMobile ? 0 : 40 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1E2631" vertical={false} />
              <XAxis 
                dataKey="date" 
                stroke={isMobile ? "transparent" : "#4B5563"}
                tick={isMobile ? {} : <CustomXAxisTick />}
                tickLine={false}
                axisLine={!isMobile}
                height={isMobile ? 0 : 40}
                padding={{ left: 10, right: 10 }}
                interval={selectedTimeRange === 'ALL' ? Math.floor(data.length / 10) : Math.floor(data.length / 15)}
              />
              <YAxis 
                stroke="#4B5563" 
                tick={{ fill: "#4B5563" }} 
                tickLine={{ stroke: "#1E2631" }}
                tickFormatter={(value) => `$${value}`}
                domain={['auto', 'auto']}
                width={60}
              />
              <Tooltip 
                content={
                  <ChartTooltip 
                    labelFormatter={formatDate}
                    valueFormatter={formatValue}
                  />
                }
                cursor={{ stroke: '#4ADE80', strokeWidth: 1 }}
                isAnimationActive={false}
                active={isHovering}
                trigger={isMobile ? "click" : "hover"}
              />
              <Line 
                type="monotone" 
                dataKey="price" 
                stroke="#4ADE80" 
                strokeWidth={2} 
                dot={false}
                activeDot={{ r: 6, fill: "#4ADE80", stroke: "#fff" }}
                name="Price (USD)"
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="absolute inset-0 flex justify-center items-center">
            <p className="text-gray-500">No data available</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default PriceHistoryChart
