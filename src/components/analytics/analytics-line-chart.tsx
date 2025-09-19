'use client'

import { useRef } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartOptions,
  TooltipItem
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, Activity } from 'lucide-react'
import { fadeInUp } from '@/lib/animations'

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

export interface AnalyticsDataPoint {
  date: string
  count: number
  label?: string
}

export interface AnalyticsDataset {
  label: string
  data: AnalyticsDataPoint[]
  color: string
  fillColor?: string
  borderWidth?: number
}

interface AnalyticsLineChartProps {
  datasets: AnalyticsDataset[]
  title: string
  subtitle?: string
  height?: number
  isLoading?: boolean
  showTrend?: boolean
  timeframe: string
  formatTooltip?: (value: number, label: string) => string
}

export default function AnalyticsLineChart({
  datasets,
  title,
  subtitle,
  height = 400,
  isLoading = false,
  showTrend = true,
  timeframe,
  formatTooltip
}: AnalyticsLineChartProps) {
  const chartRef = useRef<ChartJS<'line', number[], string>>(null)

  // Prepare chart data
  const chartData = {
    labels: datasets[0]?.data.map(point => {
      const date = new Date(point.date)
      if (timeframe === '7d' || timeframe === '30d') {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      } else if (timeframe === '90d') {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      } else {
        return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
      }
    }) || [],
    datasets: datasets.map(dataset => ({
      label: dataset.label,
      data: dataset.data.map(point => point.count),
      borderColor: dataset.color,
      backgroundColor: dataset.fillColor || `${dataset.color}20`,
      borderWidth: dataset.borderWidth || 3,
      fill: true,
      tension: 0.4,
      pointBackgroundColor: dataset.color,
      pointBorderColor: '#ffffff',
      pointBorderWidth: 2,
      pointRadius: 6,
      pointHoverRadius: 8,
      pointHoverBackgroundColor: dataset.color,
      pointHoverBorderColor: '#ffffff',
      pointHoverBorderWidth: 3,
    }))
  }

  // Chart options with responsive design
  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top' as const,
        align: 'end' as const,
        labels: {
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 20,
          font: {
            size: 12,
            weight: 600,
          },
          color: '#6b7280'
        }
      },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.95)',
        titleColor: '#f9fafb',
        bodyColor: '#f9fafb',
        borderColor: '#374151',
        borderWidth: 1,
        cornerRadius: 12,
        padding: 16,
        titleFont: {
          size: 14,
          weight: 600,
        },
        bodyFont: {
          size: 13,
          weight: 500,
        },
        callbacks: {
          title: (context) => {
            return `${context[0].label}`
          },
          label: (context: TooltipItem<'line'>) => {
            const dataset = datasets[context.datasetIndex]
            const value = context.parsed.y
            
            if (formatTooltip) {
              return `${dataset.label}: ${formatTooltip(value, context.label)}`
            }
            
            return `${dataset.label}: ${value}`
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(156, 163, 175, 0.1)',
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          drawBorder: false,
        },
        ticks: {
          color: '#9ca3af',
          font: {
            size: 11,
            weight: 500,
          },
          maxTicksLimit: 8,
        },
        border: {
          display: false,
        }
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(156, 163, 175, 0.1)',
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          drawBorder: false,
        },
        ticks: {
          color: '#9ca3af',
          font: {
            size: 11,
            weight: 500,
          },
          callback: function(value) {
            return Number.isInteger(value) ? value : ''
          }
        },
        border: {
          display: false,
        }
      }
    },
    elements: {
      point: {
        hoverRadius: 8,
      },
      line: {
        borderCapStyle: 'round' as const,
        borderJoinStyle: 'round' as const,
      }
    },
    layout: {
      padding: {
        top: 20,
        bottom: 20,
        left: 10,
        right: 10,
      }
    }
  }

  // Calculate trend for the first dataset
  const calculateTrend = () => {
    if (!datasets[0] || datasets[0].data.length < 2) return null
    
    const data = datasets[0].data
    const recent = data.slice(-7) // Last 7 data points
    const previous = data.slice(-14, -7) // Previous 7 data points
    
    if (recent.length === 0 || previous.length === 0) return null
    
    const recentAvg = recent.reduce((sum, point) => sum + point.count, 0) / recent.length
    const previousAvg = previous.reduce((sum, point) => sum + point.count, 0) / previous.length
    
    const percentChange = previousAvg > 0 ? ((recentAvg - previousAvg) / previousAvg) * 100 : 0
    
    return {
      direction: percentChange > 0 ? 'up' : percentChange < 0 ? 'down' : 'stable',
      percentage: Math.abs(percentChange),
      isPositive: percentChange > 0
    }
  }

  const trend = showTrend ? calculateTrend() : null

  // Loading skeleton
  if (isLoading) {
    return (
      <motion.div 
        variants={fadeInUp}
        className="bg-gradient-to-br from-card via-card/95 to-muted/20 backdrop-blur-sm border border-border/40 rounded-2xl p-8 shadow-xl"
        style={{ height: height + 100 }}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="space-y-2">
            <div className="h-6 w-48 bg-gradient-to-r from-muted via-muted/80 to-muted rounded-lg animate-pulse"></div>
            <div className="h-4 w-32 bg-gradient-to-r from-muted via-muted/80 to-muted rounded animate-pulse"></div>
          </div>
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-muted-foreground animate-pulse" />
            <div className="h-4 w-20 bg-gradient-to-r from-muted via-muted/80 to-muted rounded animate-pulse"></div>
          </div>
        </div>
        <div className="relative">
          <div 
            className="bg-gradient-to-br from-muted/20 via-muted/10 to-muted/5 rounded-xl animate-pulse"
            style={{ height }}
          ></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="p-4 bg-gradient-to-br from-primary/10 to-primary/5 rounded-full">
              <Activity className="h-8 w-8 text-primary animate-pulse" />
            </div>
          </div>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div 
      variants={fadeInUp}
      className="bg-gradient-to-br from-card via-card/95 to-muted/20 backdrop-blur-sm border border-border/40 rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
        <div className="space-y-2">
          <h3 className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            {title}
          </h3>
          {subtitle && (
            <p className="text-muted-foreground text-sm font-medium">{subtitle}</p>
          )}
        </div>
        
        {/* Trend Indicator */}
        {trend && (
          <motion.div 
            className={`flex items-center gap-2 px-4 py-2 rounded-full border ${
              trend.direction === 'up' 
                ? 'bg-green-50/80 dark:bg-green-950/30 border-green-200/50 dark:border-green-700/50' 
                : trend.direction === 'down'
                ? 'bg-red-50/80 dark:bg-red-950/30 border-red-200/50 dark:border-red-700/50'
                : 'bg-gray-50/80 dark:bg-gray-950/30 border-gray-200/50 dark:border-gray-700/50'
            }`}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            {trend.direction === 'up' ? (
              <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
            ) : trend.direction === 'down' ? (
              <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
            ) : (
              <Activity className="h-4 w-4 text-gray-600 dark:text-gray-400" />
            )}
            <span className={`text-sm font-semibold ${
              trend.direction === 'up' 
                ? 'text-green-700 dark:text-green-300' 
                : trend.direction === 'down'
                ? 'text-red-700 dark:text-red-300'
                : 'text-gray-700 dark:text-gray-300'
            }`}>
              {trend.direction === 'stable' ? 'Stable' : `${trend.percentage.toFixed(1)}%`}
            </span>
          </motion.div>
        )}
      </div>

      {/* Chart Container */}
      <motion.div 
        className="relative"
        style={{ height }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <Line ref={chartRef} data={chartData} options={options} />
      </motion.div>

      {/* Footer Info */}
      <div className="mt-6 pt-4 border-t border-border/30">
        <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-4">
            <span className="font-medium">Period: {timeframe.replace('d', ' days').replace('y', ' year').replace('all', 'All time')}</span>
            {datasets.length > 1 && (
              <span className="font-medium">{datasets.length} metrics tracked</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span className="font-medium">Live Data</span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}