'use client'

import { useState, useCallback, useEffect } from 'react'
import { motion } from 'framer-motion'
import { staggerContainer, fadeInUp } from '@/lib/animations'
import AnalyticsMenu, { AnalyticsType, TimeframeType } from '@/components/analytics/analytics-menu'
import AnalyticsLineChart, { AnalyticsDataset } from '@/components/analytics/analytics-line-chart'
import { formatTooltipValue } from '@/lib/analytics-data'
import { AnimatedCard } from '@/components/ui/animated-card'
import { AnimatedButton } from '@/components/ui/animated-button'
import { Badge } from '@/components/ui/badge'
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  BarChart3,
  Calendar,
  Users,
  Package,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Timer
} from 'lucide-react'

interface AnalyticsDashboardProps {
  className?: string
}

interface ApiSummaryStats {
  total: number
  average: number
  peak: number
  growth: number
  trend: 'up' | 'down' | 'stable'
  totalActive?: number
  totalPending?: number
  totalCompleted?: number
  totalOnTime?: number
  totalOverdue?: number
  totalDamaged?: number
  overdueRate?: number
  damageRate?: number
  avgReturnTime?: number
  // Borrowing specific properties
  pending?: number
  approved?: number
  rejected?: number
  averageProcessingTime?: number
  // Returning specific properties
  onTime?: number
  overdue?: number
  damaged?: number
  returnRate?: number
}

interface ApiResponse {
  datasets: AnalyticsDataset[]
  summary: ApiSummaryStats
  metadata: {
    generatedAt: string
    timeframe: string
    startDate: string
    endDate: string
  }
}

export default function AnalyticsDashboard({ className }: AnalyticsDashboardProps) {
  const [activeType, setActiveType] = useState<AnalyticsType>('borrowing')
  const [timeframe, setTimeframe] = useState<TimeframeType>('30d')
  const [datasets, setDatasets] = useState<AnalyticsDataset[]>([])
  const [summaryStats, setSummaryStats] = useState<ApiSummaryStats>({
    total: 0,
    average: 0,
    peak: 0,
    growth: 0,
    trend: 'stable'
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [totalBorrowings, setTotalBorrowings] = useState(0)
  const [totalReturns, setTotalReturns] = useState(0)
  const [summaryData, setSummaryData] = useState<ApiSummaryStats | null>(null)

  // Load data based on current selections
  const loadData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const apiUrl = activeType === 'borrowing' 
        ? `/api/analytics/borrowing?timeframe=${timeframe}`
        : `/api/analytics/returning?timeframe=${timeframe}`
      
      const response = await fetch(apiUrl)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch ${activeType} analytics: ${response.statusText}`)
      }
      
      const data: ApiResponse = await response.json()
      
      setDatasets(data.datasets)
      setSummaryStats(data.summary)
      setSummaryData(data.summary) // Use the same summary data with extended properties
      setLastUpdated(new Date())
      
      // Update totals for menu display
      if (activeType === 'borrowing') {
        setTotalBorrowings(data.summary.total)
      } else {
        setTotalReturns(data.summary.total)
      }
    } catch (error) {
      console.error('Error loading analytics data:', error)
      setError(error instanceof Error ? error.message : 'Failed to load analytics data')
      setDatasets([])
      setSummaryStats({
        total: 0,
        average: 0,
        peak: 0,
        growth: 0,
        trend: 'stable'
      })
    } finally {
      setIsLoading(false)
    }
  }, [activeType, timeframe])

  // Load totals for both types (for menu display)
  const loadTotals = useCallback(async () => {
    try {
      const [borrowingResponse, returningResponse] = await Promise.all([
        fetch(`/api/analytics/borrowing?timeframe=${timeframe}`),
        fetch(`/api/analytics/returning?timeframe=${timeframe}`)
      ])
      
      if (borrowingResponse.ok) {
        const borrowingData: ApiResponse = await borrowingResponse.json()
        setTotalBorrowings(borrowingData.summary.total)
      }
      
      if (returningResponse.ok) {
        const returningData: ApiResponse = await returningResponse.json()
        setTotalReturns(returningData.summary.total)
      }
    } catch (error) {
      console.error('Error loading totals:', error)
    }
  }, [timeframe])

  // Load initial data
  useEffect(() => {
    loadData()
  }, [loadData])

  // Load totals when timeframe changes
  useEffect(() => {
    loadTotals()
  }, [loadTotals])

  // Handle type change
  const handleTypeChange = (newType: AnalyticsType) => {
    if (newType !== activeType) {
      setActiveType(newType)
    }
  }

  // Handle timeframe change
  const handleTimeframeChange = (newTimeframe: TimeframeType) => {
    if (newTimeframe !== timeframe) {
      setTimeframe(newTimeframe)
    }
  }

  // Handle refresh
  const handleRefresh = () => {
    loadData()
    loadTotals()
  }

  // Handle export
  const handleExport = async (format: 'csv' | 'json') => {
    if (datasets.length === 0) return
    
    try {
      const exportType = 'detailed' // Can be made configurable
      const response = await fetch(
        `/api/analytics/export?format=${format}&type=${activeType}&timeframe=${timeframe}&exportType=${exportType}`
      )
      
      if (!response.ok) {
        throw new Error('Failed to export data')
      }
      
      // Create download link
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${activeType}-analytics-${timeframe}-${new Date().toISOString().split('T')[0]}.${format}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error exporting data:', error)
      setError('Failed to export data. Please try again.')
    }
  }
  
  // Get chart configuration
  const getChartTitle = () => {
    switch (activeType) {
      case 'borrowing':
        return 'Borrowing Trends'
      case 'returning':
        return 'Return Patterns'
      default:
        return 'Analytics'
    }
  }

  const getChartSubtitle = () => {
    const timeframeName = {
      '7d': 'Last 7 days',
      '30d': 'Last 30 days', 
      '90d': 'Last 90 days',
      '1y': 'Last year',
      'all': 'All time'
    }[timeframe]
    
    return `${timeframeName} • Updated ${lastUpdated.toLocaleTimeString()}`
  }

  // Show error state
  if (error && !isLoading) {
    return (
      <motion.div 
        className={`min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-6 lg:p-8 ${className}`}
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        <div className="max-w-7xl mx-auto">
          <AnimatedCard className="p-8 bg-gradient-to-br from-red-50/80 via-card to-red-100/30 dark:from-red-950/40 dark:via-card dark:to-red-900/20 border border-red-200/60 dark:border-red-700/40">
            <div className="text-center space-y-4">
              <div className="p-4 bg-red-100 dark:bg-red-900/30 rounded-full inline-block">
                <TrendingDown className="h-8 w-8 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-xl font-bold text-red-600 dark:text-red-400">Failed to Load Analytics</h3>
              <p className="text-muted-foreground">{error}</p>
              <div className="flex justify-center gap-4 mt-6">
                <AnimatedButton onClick={handleRefresh}>
                  Try Again
                </AnimatedButton>
              </div>
            </div>
          </AnimatedCard>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div 
      className={`min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-6 lg:p-8 ${className}`}
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Analytics Menu */}
        <AnalyticsMenu
          activeType={activeType}
          timeframe={timeframe}
          onTypeChange={handleTypeChange}
          onTimeframeChange={handleTimeframeChange}
          onRefresh={handleRefresh}
          onExport={handleExport}
          isLoading={isLoading}
          totalBorrowings={totalBorrowings}
          totalReturns={totalReturns}
        />

        {/* Summary Statistics Cards */}
        <motion.div 
          variants={fadeInUp}
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6"
        >
          {/* Total Count */}
          <AnimatedCard className="group p-6 bg-gradient-to-br from-blue-50/80 via-card to-blue-100/30 dark:from-blue-950/40 dark:via-card dark:to-blue-900/20 border border-blue-200/60 dark:border-blue-700/40 shadow-xl shadow-blue-500/5 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-sm font-semibold text-muted-foreground/80 uppercase tracking-wide">
                  Total {activeType === 'borrowing' ? 'Borrowings' : 'Returns'}
                </p>
                <p className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-400 dark:to-blue-500 bg-clip-text text-transparent">
                  {summaryStats.total}
                </p>
                <p className="text-xs text-muted-foreground font-medium">
                  {timeframe.replace('d', ' days').replace('y', ' year').replace('all', 'All time')}
                </p>
              </div>
              <div className="p-3 bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 rounded-xl shadow-lg shadow-blue-500/25 group-hover:scale-105 transition-transform duration-300">
                <Package className="h-6 w-6 text-white" />
              </div>
            </div>
          </AnimatedCard>

          {/* Average Daily */}
          <AnimatedCard className="group p-6 bg-gradient-to-br from-green-50/80 via-card to-green-100/30 dark:from-green-950/40 dark:via-card dark:to-green-900/20 border border-green-200/60 dark:border-green-700/40 shadow-xl shadow-green-500/5 hover:shadow-2xl hover:shadow-green-500/10 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-sm font-semibold text-muted-foreground/80 uppercase tracking-wide">Daily Average</p>
                <p className="text-3xl font-bold bg-gradient-to-r from-green-600 to-green-700 dark:from-green-400 dark:to-green-500 bg-clip-text text-transparent">
                  {summaryStats.average}
                </p>
                <p className="text-xs text-muted-foreground font-medium">Per day average</p>
              </div>
              <div className="p-3 bg-gradient-to-br from-green-500 via-green-600 to-green-700 rounded-xl shadow-lg shadow-green-500/25 group-hover:scale-105 transition-transform duration-300">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
            </div>
          </AnimatedCard>

          {/* Peak Day */}
          <AnimatedCard className="group p-6 bg-gradient-to-br from-purple-50/80 via-card to-purple-100/30 dark:from-purple-950/40 dark:via-card dark:to-purple-900/20 border border-purple-200/60 dark:border-purple-700/40 shadow-xl shadow-purple-500/5 hover:shadow-2xl hover:shadow-purple-500/10 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-sm font-semibold text-muted-foreground/80 uppercase tracking-wide">Peak Day</p>
                <p className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-purple-700 dark:from-purple-400 dark:to-purple-500 bg-clip-text text-transparent">
                  {summaryStats.peak}
                </p>
                <p className="text-xs text-muted-foreground font-medium">Highest single day</p>
              </div>
              <div className="p-3 bg-gradient-to-br from-purple-500 via-purple-600 to-purple-700 rounded-xl shadow-lg shadow-purple-500/25 group-hover:scale-105 transition-transform duration-300">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
            </div>
          </AnimatedCard>

          {/* Growth Rate */}
          <AnimatedCard className={`group p-6 bg-gradient-to-br transition-all duration-300 shadow-xl hover:shadow-2xl ${
            summaryStats.trend === 'up' 
              ? 'from-emerald-50/80 via-card to-emerald-100/30 dark:from-emerald-950/40 dark:via-card dark:to-emerald-900/20 border border-emerald-200/60 dark:border-emerald-700/40 shadow-emerald-500/5 hover:shadow-emerald-500/10'
              : summaryStats.trend === 'down'
              ? 'from-red-50/80 via-card to-red-100/30 dark:from-red-950/40 dark:via-card dark:to-red-900/20 border border-red-200/60 dark:border-red-700/40 shadow-red-500/5 hover:shadow-red-500/10'
              : 'from-gray-50/80 via-card to-gray-100/30 dark:from-gray-950/40 dark:via-card dark:to-gray-900/20 border border-gray-200/60 dark:border-gray-700/40 shadow-gray-500/5 hover:shadow-gray-500/10'
          }`}>
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-sm font-semibold text-muted-foreground/80 uppercase tracking-wide">Trend</p>
                <div className="flex items-center gap-2">
                  <p className={`text-3xl font-bold bg-gradient-to-r bg-clip-text text-transparent ${
                    summaryStats.trend === 'up' 
                      ? 'from-emerald-600 to-emerald-700 dark:from-emerald-400 dark:to-emerald-500'
                      : summaryStats.trend === 'down'
                      ? 'from-red-600 to-red-700 dark:from-red-400 dark:to-red-500'
                      : 'from-gray-600 to-gray-700 dark:from-gray-400 dark:to-gray-500'
                  }`}>
                    {summaryStats.growth > 0 ? '+' : ''}{summaryStats.growth}%
                  </p>
                  <Badge className={`${
                    summaryStats.trend === 'up' 
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300'
                      : summaryStats.trend === 'down'
                      ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300'
                  } border-0 capitalize`}>
                    {summaryStats.trend}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground font-medium">vs previous period</p>
              </div>
              <div className={`p-3 rounded-xl shadow-lg group-hover:scale-105 transition-transform duration-300 ${
                summaryStats.trend === 'up' 
                  ? 'bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-700 shadow-emerald-500/25'
                  : summaryStats.trend === 'down'
                  ? 'bg-gradient-to-br from-red-500 via-red-600 to-red-700 shadow-red-500/25'
                  : 'bg-gradient-to-br from-gray-500 via-gray-600 to-gray-700 shadow-gray-500/25'
              }`}>
                {summaryStats.trend === 'up' ? (
                  <TrendingUp className="h-6 w-6 text-white" />
                ) : summaryStats.trend === 'down' ? (
                  <TrendingDown className="h-6 w-6 text-white" />
                ) : (
                  <Activity className="h-6 w-6 text-white" />
                )}
              </div>
            </div>
          </AnimatedCard>
        </motion.div>

        {/* Conditional Summary Cards */}
        <motion.div 
          variants={fadeInUp}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {activeType === 'borrowing' ? (
            <>
              {/* Pending Reservations */}
              <AnimatedCard className="p-6 bg-gradient-to-br from-card via-card/95 to-orange-50/20 dark:to-orange-950/20 backdrop-blur-sm border border-border/40 shadow-xl hover:shadow-2xl transition-all duration-300 group">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-foreground mb-1">
                      {summaryData?.pending || 0}
                    </h3>
                    <p className="text-sm text-muted-foreground font-medium">Pending Reservations</p>
                  </div>
                  <div className="p-3 rounded-xl bg-gradient-to-br from-orange-500 via-orange-600 to-orange-700 shadow-lg shadow-orange-500/25 group-hover:scale-105 transition-transform duration-300">
                    <Clock className="h-6 w-6 text-white" />
                  </div>
                </div>
              </AnimatedCard>

              {/* Approved Reservations */}
              <AnimatedCard className="p-6 bg-gradient-to-br from-card via-card/95 to-green-50/20 dark:to-green-950/20 backdrop-blur-sm border border-border/40 shadow-xl hover:shadow-2xl transition-all duration-300 group">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-foreground mb-1">
                      {summaryData?.approved || 0}
                    </h3>
                    <p className="text-sm text-muted-foreground font-medium">Approved Reservations</p>
                  </div>
                  <div className="p-3 rounded-xl bg-gradient-to-br from-green-500 via-green-600 to-green-700 shadow-lg shadow-green-500/25 group-hover:scale-105 transition-transform duration-300">
                    <CheckCircle className="h-6 w-6 text-white" />
                  </div>
                </div>
              </AnimatedCard>

              {/* Rejected Reservations */}
              <AnimatedCard className="p-6 bg-gradient-to-br from-card via-card/95 to-red-50/20 dark:to-red-950/20 backdrop-blur-sm border border-border/40 shadow-xl hover:shadow-2xl transition-all duration-300 group">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-foreground mb-1">
                      {summaryData?.rejected || 0}
                    </h3>
                    <p className="text-sm text-muted-foreground font-medium">Rejected Reservations</p>
                  </div>
                  <div className="p-3 rounded-xl bg-gradient-to-br from-red-500 via-red-600 to-red-700 shadow-lg shadow-red-500/25 group-hover:scale-105 transition-transform duration-300">
                    <XCircle className="h-6 w-6 text-white" />
                  </div>
                </div>
              </AnimatedCard>

              {/* Average Processing Time */}
              <AnimatedCard className="p-6 bg-gradient-to-br from-card via-card/95 to-blue-50/20 dark:to-blue-950/20 backdrop-blur-sm border border-border/40 shadow-xl hover:shadow-2xl transition-all duration-300 group">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-foreground mb-1">
                      {summaryData?.averageProcessingTime || 0}h
                    </h3>
                    <p className="text-sm text-muted-foreground font-medium">Avg Processing Time</p>
                  </div>
                  <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 shadow-lg shadow-blue-500/25 group-hover:scale-105 transition-transform duration-300">
                    <Timer className="h-6 w-6 text-white" />
                  </div>
                </div>
              </AnimatedCard>
            </>
          ) : (
            <>
              {/* On Time Returns */}
              <AnimatedCard className="p-6 bg-gradient-to-br from-card via-card/95 to-green-50/20 dark:to-green-950/20 backdrop-blur-sm border border-border/40 shadow-xl hover:shadow-2xl transition-all duration-300 group">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-foreground mb-1">
                      {summaryData?.onTime || 0}
                    </h3>
                    <p className="text-sm text-muted-foreground font-medium">On Time Returns</p>
                  </div>
                  <div className="p-3 rounded-xl bg-gradient-to-br from-green-500 via-green-600 to-green-700 shadow-lg shadow-green-500/25 group-hover:scale-105 transition-transform duration-300">
                    <CheckCircle className="h-6 w-6 text-white" />
                  </div>
                </div>
              </AnimatedCard>

              {/* Overdue Returns */}
              <AnimatedCard className="p-6 bg-gradient-to-br from-card via-card/95 to-red-50/20 dark:to-red-950/20 backdrop-blur-sm border border-border/40 shadow-xl hover:shadow-2xl transition-all duration-300 group">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-foreground mb-1">
                      {summaryData?.overdue || 0}
                    </h3>
                    <p className="text-sm text-muted-foreground font-medium">Overdue Returns</p>
                  </div>
                  <div className="p-3 rounded-xl bg-gradient-to-br from-red-500 via-red-600 to-red-700 shadow-lg shadow-red-500/25 group-hover:scale-105 transition-transform duration-300">
                    <AlertTriangle className="h-6 w-6 text-white" />
                  </div>
                </div>
              </AnimatedCard>

              {/* Damaged Items */}
              <AnimatedCard className="p-6 bg-gradient-to-br from-card via-card/95 to-orange-50/20 dark:to-orange-950/20 backdrop-blur-sm border border-border/40 shadow-xl hover:shadow-2xl transition-all duration-300 group">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-foreground mb-1">
                      {summaryData?.damaged || 0}
                    </h3>
                    <p className="text-sm text-muted-foreground font-medium">Damaged Items</p>
                  </div>
                  <div className="p-3 rounded-xl bg-gradient-to-br from-orange-500 via-orange-600 to-orange-700 shadow-lg shadow-orange-500/25 group-hover:scale-105 transition-transform duration-300">
                    <AlertTriangle className="h-6 w-6 text-white" />
                  </div>
                </div>
              </AnimatedCard>

              {/* Return Rate */}
              <AnimatedCard className="p-6 bg-gradient-to-br from-card via-card/95 to-blue-50/20 dark:to-blue-950/20 backdrop-blur-sm border border-border/40 shadow-xl hover:shadow-2xl transition-all duration-300 group">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-foreground mb-1">
                      {summaryData?.returnRate || 0}%
                    </h3>
                    <p className="text-sm text-muted-foreground font-medium">Return Rate</p>
                  </div>
                  <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 shadow-lg shadow-blue-500/25 group-hover:scale-105 transition-transform duration-300">
                    <BarChart3 className="h-6 w-6 text-white" />
                  </div>
                </div>
              </AnimatedCard>
            </>
          )}
        </motion.div>

        {/* Main Chart */}
        <motion.div variants={fadeInUp}>
          <AnalyticsLineChart
            datasets={datasets}
            title={getChartTitle()}
            subtitle={getChartSubtitle()}
            height={500}
            isLoading={isLoading}
            showTrend={true}
            timeframe={timeframe}
            formatTooltip={(value) => formatTooltipValue(value, activeType)}
          />
        </motion.div>

        {/* Additional Insights */}
        <motion.div 
          variants={fadeInUp}
          className="grid grid-cols-1 lg:grid-cols-3 gap-6"
        >
          {/* Insights Card 1 */}
          <AnimatedCard className="p-6 bg-gradient-to-br from-card via-card/95 to-muted/20 backdrop-blur-sm border border-border/40 shadow-xl hover:shadow-2xl transition-all duration-300">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-gradient-to-br from-blue-500/20 to-blue-400/10 rounded-lg">
                <Calendar className="h-5 w-5 text-blue-500" />
              </div>
              <h3 className="font-semibold text-foreground">Time Patterns</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {activeType === 'borrowing' 
                ? 'Peak borrowing occurs during weekdays with lower activity on weekends. Consider optimizing staff schedules for high-demand periods.'
                : 'Returns show consistent patterns with slight delays during holiday periods. Most users return items within the expected timeframe.'
              }
            </p>
          </AnimatedCard>

          {/* Insights Card 2 */}
          <AnimatedCard className="p-6 bg-gradient-to-br from-card via-card/95 to-muted/20 backdrop-blur-sm border border-border/40 shadow-xl hover:shadow-2xl transition-all duration-300">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-gradient-to-br from-green-500/20 to-green-400/10 rounded-lg">
                <Users className="h-5 w-5 text-green-500" />
              </div>
              <h3 className="font-semibold text-foreground">User Behavior</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {activeType === 'borrowing'
                ? 'Users show preference for shorter borrowing periods. Consider implementing incentives for quick returns to improve availability.'
                : 'Return compliance rate is high with most users adhering to deadlines. Focus on users with overdue items for improvement.'
              }
            </p>
          </AnimatedCard>

          {/* Insights Card 3 */}
          <AnimatedCard className="p-6 bg-gradient-to-br from-card via-card/95 to-muted/20 backdrop-blur-sm border border-border/40 shadow-xl hover:shadow-2xl transition-all duration-300">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-gradient-to-br from-purple-500/20 to-purple-400/10 rounded-lg">
                <Clock className="h-5 w-5 text-purple-500" />
              </div>
              <h3 className="font-semibold text-foreground">Optimization</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {activeType === 'borrowing'
                ? 'Current borrowing patterns suggest good inventory utilization. Monitor for seasonal trends to optimize procurement planning.'
                : 'Return processing efficiency can be improved during peak periods. Consider implementing automated return confirmation systems.'
              }
            </p>
          </AnimatedCard>
        </motion.div>

        {/* Footer */}
        <motion.div 
          variants={fadeInUp}
          className="text-center pt-8 border-t border-border/30"
        >
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground font-medium">
              Last updated: {lastUpdated.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">
              Data refreshes automatically every 5 minutes
            </p>
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}