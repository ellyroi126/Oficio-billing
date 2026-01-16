'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'

interface ClientData {
  clientName: string
  total: number
  count?: number
}

interface TopClientsBarChartProps {
  data: ClientData[]
  maxItems?: number
}

const COLORS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#8b5cf6', // violet
  '#f59e0b', // amber
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
  '#84cc16', // lime
]

const formatCurrency = (value: number) => {
  if (value >= 1000000) {
    return `PHP ${(value / 1000000).toFixed(1)}M`
  }
  if (value >= 1000) {
    return `PHP ${(value / 1000).toFixed(0)}K`
  }
  return `PHP ${value.toFixed(0)}`
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border bg-white p-3 shadow-lg">
        <p className="font-medium text-gray-900">{label}</p>
        <p className="text-sm text-blue-600">
          Revenue: PHP {payload[0].value.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
        </p>
        {payload[0].payload.count && (
          <p className="text-sm text-gray-500">
            Payments: {payload[0].payload.count}
          </p>
        )}
      </div>
    )
  }
  return null
}

export function TopClientsBarChart({ data, maxItems = 10 }: TopClientsBarChartProps) {
  // Sort by total and take top items
  const sortedData = [...data]
    .sort((a, b) => b.total - a.total)
    .slice(0, maxItems)

  if (sortedData.length === 0) {
    return (
      <div className="flex h-80 items-center justify-center text-gray-500">
        No client data available
      </div>
    )
  }

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={sortedData}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={true} vertical={false} />
          <XAxis
            type="number"
            tickFormatter={(value) => formatCurrency(value).replace('PHP ', '')}
            tick={{ fontSize: 11, fill: '#6b7280' }}
            tickLine={false}
            axisLine={{ stroke: '#e5e7eb' }}
          />
          <YAxis
            type="category"
            dataKey="clientName"
            tick={{ fontSize: 11, fill: '#374151' }}
            tickLine={false}
            axisLine={false}
            width={95}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="total" radius={[0, 4, 4, 0]} barSize={20}>
            {sortedData.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
