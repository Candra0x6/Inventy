'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  BarChart3, 
  TrendingUp, 
  ArrowLeftRight, 
  Calendar,
  Download,
  RefreshCw,
  Filter
} from 'lucide-react'
import { AnimatedButton } from '@/components/ui/animated-button'
import { Badge } from '@/components/ui/badge'
import { fadeInUp, staggerContainer } from '@/lib/animations'

export type AnalyticsType = 'borrowing' | 'returning'
export type TimeframeType = '7d' | '30d' | '90d' | '1y' | 'all'

interface AnalyticsMenuProps {
  activeType: AnalyticsType
  timeframe: TimeframeType
  onTypeChange: (type: AnalyticsType) => void
  onTimeframeChange: (timeframe: TimeframeType) => void
  onRefresh: () => void
  onExport: (format: 'csv' | 'json') => void
  isLoading?: boolean
  totalBorrowings?: number
  totalReturns?: number
}

const menuItems: Array<{
  key: AnalyticsType
  label: string
  icon: typeof BarChart3
  description: string
  color: string
  bgColor: string
  borderColor: string
}> = [
  {
    key: 'borrowing',
    label: 'Borrowing Analytics',
    icon: TrendingUp,
    description: 'Track borrowing patterns and trends',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50/80 dark:bg-blue-950/30',
    borderColor: 'border-blue-200/60 dark:border-blue-700/40'
  },
  {
    key: 'returning',
    label: 'Return Analytics',
    icon: ArrowLeftRight,
    description: 'Monitor return patterns and performance',
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-50/80 dark:bg-green-950/30',
    borderColor: 'border-green-200/60 dark:border-green-700/40'
  }
]

const timeframeOptions: Array<{
  key: TimeframeType
  label: string
  shortLabel: string
}> = [
  { key: '7d', label: 'Last 7 Days', shortLabel: '7D' },
  { key: '30d', label: 'Last 30 Days', shortLabel: '30D' },
  { key: '90d', label: 'Last 90 Days', shortLabel: '90D' },
  { key: '1y', label: 'Last Year', shortLabel: '1Y' },
  { key: 'all', label: 'All Time', shortLabel: 'All' }
]

export default function AnalyticsMenu({
  activeType,
  timeframe,
  onTypeChange,
  onTimeframeChange,
  onRefresh,
  onExport,
  isLoading = false,
  totalBorrowings = 0,
  totalReturns = 0
}: AnalyticsMenuProps) {
  const [exportLoading, setExportLoading] = useState(false)

  const handleExport = async (format: 'csv' | 'json') => {
    setExportLoading(true)
    try {
      await onExport(format)
    } finally {
      setExportLoading(false)
    }
  }

  const activeMenuItem = menuItems.find(item => item.key === activeType)

  return (
    <motion.div 
      className="bg-gradient-to-br from-card via-card/95 to-muted/20 backdrop-blur-xl border border-border/40 rounded-2xl shadow-2xl shadow-primary/5 w-full"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      {/* Header Section */}
      <motion.div 
        variants={fadeInUp}
        className="p-8 border-b border-border/30 bg-gradient-to-r from-transparent to-primary/5"
      >2
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6">
          {/* Title and Description */}
          <div className="flex items-center space-x-6">
            <div className="p-3 bg-gradient-to-br from-primary/20 to-primary/10 backdrop-blur-sm rounded-2xl border border-primary/20">
              <BarChart3 className="h-8 w-8 text-primary" />
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                Analytics Dashboard
              </h1>
              <p className="text-muted-foreground text-lg">
                Comprehensive insights into your inventory patterns
              </p>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 px-4 py-2 bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200/50 dark:border-blue-700/40 rounded-xl">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                {totalBorrowings} Borrowings
              </span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-green-50/80 dark:bg-green-950/30 border border-green-200/50 dark:border-green-700/40 rounded-xl">
              <ArrowLeftRight className="h-4 w-4 text-green-500" />
              <span className="text-sm font-semibold text-green-700 dark:text-green-300">
                {totalReturns} Returns
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Navigation and Controls */}
      <motion.div 
        variants={fadeInUp}
        className="p-8 space-y-8"
      >
        {/* Analytics Type Selector */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Filter className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">Analytics Type</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {menuItems.map((item) => {
              const isActive = item.key === activeType
              const Icon = item.icon
              
              return (
                <motion.button
                  key={item.key}
                  onClick={() => onTypeChange(item.key)}
                  className={`group relative p-6 rounded-2xl border-2 transition-all duration-300 text-left ${
                    isActive
                      ? `${item.bgColor} ${item.borderColor} shadow-lg scale-[1.02]`
                      : 'bg-muted/20 border-border/40 hover:bg-muted/30 hover:border-border/60 hover:scale-[1.01]'
                  }`}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-xl transition-all duration-300 ${
                      isActive 
                        ? 'bg-white/80 dark:bg-gray-900/80 shadow-lg' 
                        : 'bg-muted/40 group-hover:bg-muted/60'
                    }`}>
                      <Icon className={`h-6 w-6 ${isActive ? item.color : 'text-muted-foreground'}`} />
                    </div>
                    <div className="flex-1 space-y-2">
                      <h4 className={`font-bold text-lg ${isActive ? item.color : 'text-foreground'}`}>
                        {item.label}
                      </h4>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {item.description}
                      </p>
                      {isActive && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.1 }}
                        >
                          <Badge className={`${item.bgColor.replace('/80', '')} ${item.color} border-0 shadow-sm`}>
                            Active
                          </Badge>
                        </motion.div>
                      )}
                    </div>
                  </div>
                  
                  {/* Active indicator */}
                  {isActive && (
                    <motion.div
                      className={`absolute -inset-1 rounded-2xl ${item.bgColor.replace('/80', '/20')} blur-sm -z-10`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3 }}
                    />
                  )}
                </motion.button>
              )
            })}
          </div>
        </div>

        {/* Controls Section */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 p-6 bg-gradient-to-r from-muted/20 via-muted/10 to-muted/20 rounded-2xl border border-border/30">
          {/* Timeframe Selector */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">Time Period</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {timeframeOptions.map((option) => (
                <AnimatedButton
                  key={option.key}
                  onClick={() => onTimeframeChange(option.key)}
                  variant={timeframe === option.key ? "default" : "outline"}
                  size="sm"
                  className={`transition-all duration-300 ${
                    timeframe === option.key 
                      ? 'bg-primary text-primary-foreground shadow-lg scale-105' 
                      : 'hover:bg-muted/60 hover:scale-105'
                  }`}
                >
                  <span className="hidden sm:inline">{option.label}</span>
                  <span className="sm:hidden">{option.shortLabel}</span>
                </AnimatedButton>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <AnimatedButton
              onClick={onRefresh}
              disabled={isLoading}
              variant="outline"
              size="sm"
              className="border-border/50 hover:bg-muted/50"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </AnimatedButton>
            
            <div className="flex gap-2">
              <AnimatedButton
                onClick={() => handleExport('csv')}
                disabled={exportLoading || isLoading}
                variant="outline"
                size="sm"
                className="border-border/50 hover:bg-muted/50"
              >
                <Download className="h-4 w-4 mr-2" />
                CSV
              </AnimatedButton>
              <AnimatedButton
                onClick={() => handleExport('json')}
                disabled={exportLoading || isLoading}
                variant="outline"
                size="sm"
                className="border-border/50 hover:bg-muted/50"
              >
                <Download className="h-4 w-4 mr-2" />
                JSON
              </AnimatedButton>
            </div>
          </div>
        </div>

        {/* Current Selection Summary */}
        {activeMenuItem && (
          <motion.div 
            className="flex items-center justify-center gap-4 p-4 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 rounded-xl border border-primary/20"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-foreground">
                Viewing {activeMenuItem.label.toLowerCase()} for {timeframeOptions.find(t => t.key === timeframe)?.label.toLowerCase()}
              </span>
            </div>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  )
}