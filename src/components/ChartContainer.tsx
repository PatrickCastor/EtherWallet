import type React from "react"
import { Loader2 } from "lucide-react"

interface ChartContainerProps {
  title: string;
  isLoading?: boolean;
  error?: string | null;
  lastUpdated?: string | null;
  onRefresh?: () => void;
  config?: {
    [key: string]: {
      label: string;
      color: string;
    }
  };
  children: React.ReactNode;
}

/**
 * ChartContainer Component
 * 
 * A reusable container for charts that provides consistent styling and behavior.
 * Includes loading states, error handling, and refresh functionality.
 */
const ChartContainer: React.FC<ChartContainerProps> = ({ 
  title,
  isLoading = false,
  error = null,
  lastUpdated = null,
  onRefresh,
  config,
  children 
}) => {
  return (
    <div className="w-full h-full bg-[#0B1017] rounded-lg p-4 relative">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <div className="flex items-center space-x-3">
          {lastUpdated && (
            <div className="text-xs text-gray-400">
              Updated: {new Date(lastUpdated).toLocaleTimeString()}
            </div>
          )}
          {onRefresh && (
            <button 
              onClick={onRefresh} 
              disabled={isLoading}
              className="text-xs bg-gray-800 hover:bg-gray-700 text-white px-2 py-1 rounded-md transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Refreshing...' : 'Refresh'}
            </button>
          )}
        </div>
      </div>
      
      {/* Legend */}
      {config && Object.keys(config).length > 0 && (
        <div className="flex flex-wrap gap-3 mb-3">
          {Object.entries(config).map(([key, { label, color }]) => (
            <div key={key} className="flex items-center">
              <div 
                className="w-3 h-3 rounded-full mr-1" 
                style={{ backgroundColor: color }}
              ></div>
              <span className="text-xs text-gray-400">{label}</span>
            </div>
          ))}
        </div>
      )}
      
      {/* Content */}
      <div className="w-full h-[calc(100%-40px)] text-gray-400 relative">
        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 flex justify-center items-center bg-[#0B1017]/70 z-10">
            <Loader2 className="h-8 w-8 text-[#4ADE80] animate-spin" />
          </div>
        )}
        
        {/* Error message */}
        {error && (
          <div className="absolute inset-0 flex justify-center items-center bg-[#0B1017]/70 z-10">
            <div className="text-red-400 text-center p-4">
              {error}
            </div>
          </div>
        )}
        
        {/* Chart content */}
        {children}
      </div>
    </div>
  )
}

export default ChartContainer

