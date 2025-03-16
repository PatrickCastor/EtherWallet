import type React from "react"

interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    name?: string;
    dataKey?: string;
    color?: string;
  }>;
  label?: string;
  labelFormatter?: (label: string) => string;
  valueFormatter?: (value: number) => string;
  labelKey?: string;
  valueKey?: string;
}

/**
 * ChartTooltip Component
 * 
 * A reusable tooltip component for charts that displays data in a consistent format.
 * Can be customized with formatters for labels and values.
 */
const ChartTooltip: React.FC<ChartTooltipProps> = ({ 
  active, 
  payload, 
  label,
  labelFormatter,
  valueFormatter,
  labelKey = "date",
  valueKey = "value"
}) => {
  if (!active || !payload || !payload.length) {
    return null;
  }

  const formattedLabel = labelFormatter ? labelFormatter(label || '') : label;
  const formattedValue = valueFormatter 
    ? valueFormatter(payload[0].value) 
    : payload[0].value.toLocaleString();

  return (
    <div className="bg-gray-800/90 p-3 rounded-md border border-gray-700 shadow-lg backdrop-blur-sm transition-opacity duration-150 ease-in-out">
      <p className="text-gray-300 mb-1 font-medium">{formattedLabel}</p>
      {payload.map((entry, index) => (
        <p 
          key={`item-${index}`} 
          className="font-bold text-lg"
          style={{ color: entry.color || '#4ADE80' }}
        >
          {valueFormatter 
            ? valueFormatter(entry.value) 
            : entry.value.toLocaleString()}
        </p>
      ))}
    </div>
  );
};

export default ChartTooltip

