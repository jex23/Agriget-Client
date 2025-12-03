import React from 'react';
import { Box, Text, VStack, HStack } from '@chakra-ui/react';

interface DataPoint {
  label: string;
  value: number;
}

interface LineChartProps {
  data: DataPoint[];
  color?: string;
  height?: number;
  title?: string;
  valuePrefix?: string;
  showGrid?: boolean;
}

const LineChart: React.FC<LineChartProps> = ({
  data,
  color = '#3182ce',
  height = 200,
  title,
  valuePrefix = '',
  showGrid = true
}) => {
  if (!data || data.length === 0) {
    return (
      <Box textAlign="center" py={8} color="gray.500">
        <Text>No data available</Text>
      </Box>
    );
  }

  const padding = { top: 20, right: 20, bottom: 40, left: 60 };
  const chartWidth = 600;
  const chartHeight = height;
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;

  // Calculate min and max values
  const values = data.map(d => d.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const valueRange = maxValue - minValue || 1;

  // Add some padding to the range
  const yMin = minValue - valueRange * 0.1;
  const yMax = maxValue + valueRange * 0.1;
  const yRange = yMax - yMin || 1;

  // Calculate points
  const points = data.map((d, i) => {
    const x = padding.left + (i / (data.length - 1 || 1)) * innerWidth;
    const y = padding.top + innerHeight - ((d.value - yMin) / yRange) * innerHeight;
    return { x, y, ...d };
  });

  // Create path
  const pathD = points.reduce((path, point, i) => {
    if (i === 0) {
      return `M ${point.x} ${point.y}`;
    }
    return `${path} L ${point.x} ${point.y}`;
  }, '');

  // Create area path (for gradient fill)
  const areaPathD = `${pathD} L ${points[points.length - 1].x} ${chartHeight - padding.bottom} L ${padding.left} ${chartHeight - padding.bottom} Z`;

  // Calculate Y-axis ticks
  const yTicks = 5;
  const yTickValues = Array.from({ length: yTicks }, (_, i) => {
    return yMin + (yRange / (yTicks - 1)) * i;
  });

  // Format number for display
  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toFixed(0);
  };

  return (
    <VStack align="stretch" w="full">
      {title && (
        <Text fontWeight="bold" fontSize="md" color="gray.700" mb={2}>
          {title}
        </Text>
      )}
      <Box position="relative" w="full" overflowX="auto">
        <svg
          width={chartWidth}
          height={chartHeight}
          style={{ minWidth: '100%', display: 'block' }}
        >
          <defs>
            <linearGradient id={`gradient-${color}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.3" />
              <stop offset="100%" stopColor={color} stopOpacity="0.05" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {showGrid && yTickValues.map((tick, i) => {
            const y = padding.top + innerHeight - ((tick - yMin) / yRange) * innerHeight;
            return (
              <line
                key={`grid-${i}`}
                x1={padding.left}
                y1={y}
                x2={chartWidth - padding.right}
                y2={y}
                stroke="#e2e8f0"
                strokeWidth="1"
              />
            );
          })}

          {/* Area fill */}
          <path
            d={areaPathD}
            fill={`url(#gradient-${color})`}
          />

          {/* Line */}
          <path
            d={pathD}
            fill="none"
            stroke={color}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data points */}
          {points.map((point, i) => (
            <g key={`point-${i}`}>
              <circle
                cx={point.x}
                cy={point.y}
                r="5"
                fill="white"
                stroke={color}
                strokeWidth="3"
              />
              <circle
                cx={point.x}
                cy={point.y}
                r="8"
                fill="transparent"
                style={{ cursor: 'pointer' }}
              >
                <title>{`${point.label}: ${valuePrefix}${point.value.toLocaleString()}`}</title>
              </circle>
            </g>
          ))}

          {/* Y-axis */}
          <line
            x1={padding.left}
            y1={padding.top}
            x2={padding.left}
            y2={chartHeight - padding.bottom}
            stroke="#cbd5e0"
            strokeWidth="2"
          />

          {/* X-axis */}
          <line
            x1={padding.left}
            y1={chartHeight - padding.bottom}
            x2={chartWidth - padding.right}
            y2={chartHeight - padding.bottom}
            stroke="#cbd5e0"
            strokeWidth="2"
          />

          {/* Y-axis labels */}
          {yTickValues.map((tick, i) => {
            const y = padding.top + innerHeight - ((tick - yMin) / yRange) * innerHeight;
            return (
              <text
                key={`y-label-${i}`}
                x={padding.left - 10}
                y={y + 4}
                textAnchor="end"
                fontSize="11"
                fill="#718096"
              >
                {valuePrefix}{formatNumber(tick)}
              </text>
            );
          })}

          {/* X-axis labels */}
          {points.map((point, i) => {
            // Show every nth label to avoid crowding
            const showLabel = data.length <= 7 || i % Math.ceil(data.length / 7) === 0 || i === data.length - 1;
            if (!showLabel) return null;

            return (
              <text
                key={`x-label-${i}`}
                x={point.x}
                y={chartHeight - padding.bottom + 20}
                textAnchor="middle"
                fontSize="11"
                fill="#718096"
              >
                {point.label}
              </text>
            );
          })}
        </svg>
      </Box>

      {/* Legend */}
      <HStack justify="center" gap={4} pt={2}>
        <HStack gap={2}>
          <Box w="12px" h="12px" bg={color} borderRadius="full" />
          <Text fontSize="xs" color="gray.600">
            {title || 'Value'}
          </Text>
        </HStack>
      </HStack>
    </VStack>
  );
};

export default LineChart;
