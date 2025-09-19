'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { AnimatedCard } from '@/components/ui/animated-card'
import { AnimatedButton } from '@/components/ui/animated-button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { fadeInUp, staggerContainer } from '@/lib/animations'
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  XCircle,
  Clock,
  Download,
  RefreshCw,
  Calendar,
  BarChart3,
  PieChart,
  Activity,
  Users,
  Package,
  FileText
} from 'lucide-react'

interface AnalyticsData {
  summary: {
    totalReturns: number
    overdueReturns: number
    overdueRate: number
    damageReports: number
    avgPlannedTime: number
    avgActualTime: number
    penaltyCount: number
    totalPenalties: number
    avgPenalty: number
  }
  breakdowns: {
    byStatus: Array<{ status: string; count: number }>
    byCondition: Array<{ condition: string; count: number }>
    topCategories: Array<{ category: string; itemName: string; count: number }>
    topUsers: Array<{ 
      userId: string
      name: string
      email: string
      trustScore: number
      returnCount: number
      avgPenalty: number
    }>
  }
  trends: {
    daily: Array<{ date: string; count: number }>
    timeframe: string
    startDate: string
    endDate: string
  }
  metadata: {
    generatedAt: string
    timeframe: string
    filters: Record<string, unknown>
  }
}

interface ReturnAnalyticsDashboardProps {
  onClose?: () => void
}

export default function ReturnAnalyticsDashboard({ onClose }: ReturnAnalyticsDashboardProps) {
  const [loading, setLoading] = useState(true)
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [timeframe, setTimeframe] = useState<'7d' | '30d' | '90d' | '1y' | 'all'>('30d')
  const [exportLoading, setExportLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const params = new URLSearchParams({
        timeframe: timeframe
      })
      
      const response = await fetch(`/api/returns/analytics?${params}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch analytics data')
      }
      
      const data = await response.json()
      setAnalytics(data)
    } catch (error) {
      console.error('Error fetching analytics:', error)
      setError('Failed to load analytics data. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [timeframe])

  useEffect(() => {
    fetchAnalytics()
  }, [fetchAnalytics])

  const handleExport = async (format: 'csv' | 'json', type: 'summary' | 'detailed' | 'damage_reports') => {
    try {
      setExportLoading(true)
      
      const params = new URLSearchParams({
        format,
        type,
        timeframe: timeframe
      })
      
      const response = await fetch(`/api/returns/analytics/export?${params}`)
      
      if (!response.ok) {
        throw new Error('Failed to export data')
      }
      
      // Create download link
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `return-analytics-${type}-${new Date().toISOString().split('T')[0]}.${format}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error exporting data:', error)
      setError('Failed to export data. Please try again.')
    } finally {
      setExportLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'bg-green-500'
      case 'PENDING': return 'bg-yellow-500'
      case 'REJECTED': return 'bg-red-500'
      case 'DAMAGED': return 'bg-orange-500'
      default: return 'bg-gray-500'
    }
  }

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'EXCELLENT': return 'bg-green-500'
      case 'GOOD': return 'bg-blue-500'
      case 'FAIR': return 'bg-yellow-500'
      case 'POOR': return 'bg-orange-500'
      case 'DAMAGED': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  const formatTimeframe = (tf: string) => {
    switch (tf) {
      case '7d': return 'Last 7 Days'
      case '30d': return 'Last 30 Days'
      case '90d': return 'Last 90 Days'
      case '1y': return 'Last Year'
      case 'all': return 'All Time'
      default: return tf
    }
  }

  if (loading) {
    return (
      <motion.div 
        className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-8"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        <AnimatedCard className="bg-gradient-to-br from-card via-card/95 to-muted/20 backdrop-blur-xl border border-border/40 shadow-2xl shadow-primary/5">
          <motion.div 
            variants={fadeInUp}
            className="flex flex-col items-center justify-center h-96 space-y-8"
          >
            <div className="relative">
              <div className="w-20 h-20 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full flex items-center justify-center">
                <RefreshCw className="h-10 w-10 animate-spin text-primary" />
              </div>
              <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-transparent to-primary/20 rounded-full animate-pulse" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                Loading Analytics...
              </h3>
              <p className="text-muted-foreground">Gathering insights from your return data</p>
            </div>
          </motion.div>
        </AnimatedCard>
      </motion.div>
    )
  }

  if (error) {
    return (
      <motion.div 
        className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-8"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        <AnimatedCard className="bg-gradient-to-br from-card via-card/95 to-red-50/20 dark:to-red-950/20 backdrop-blur-xl border border-red-200/40 dark:border-red-700/40 shadow-2xl shadow-red-500/5">
          <motion.div 
            variants={fadeInUp}
            className="flex flex-col items-center justify-center h-96 space-y-8 text-center"
          >
            <div className="p-6 bg-gradient-to-br from-red-500/20 to-red-400/10 rounded-full">
              <AlertTriangle className="h-16 w-16 text-red-500" />
            </div>
            <div className="space-y-4">
              <h3 className="text-2xl font-bold text-red-600 dark:text-red-400">
                Unable to Load Analytics
              </h3>
              <p className="text-muted-foreground max-w-md">{error}</p>
              <AnimatedButton 
                onClick={fetchAnalytics} 
                className="mt-6"
                variant="outline"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </AnimatedButton>
            </div>
          </motion.div>
        </AnimatedCard>
      </motion.div>
    )
  }

  if (!analytics) {
    return null
  }

  return (
    <motion.div 
      className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-6 lg:p-8"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Modern Header */}
        <AnimatedCard className="bg-gradient-to-br from-card via-card/95 to-muted/20 backdrop-blur-xl border border-border/40 shadow-2xl shadow-primary/5">
          <motion.div variants={fadeInUp} className="p-8 border-b border-border/30 bg-gradient-to-r from-transparent to-primary/5">
            <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-8">
              <div className="flex items-center space-x-6">
                <div className="p-3 bg-gradient-to-br from-primary/20 to-primary/10 backdrop-blur-sm rounded-2xl border border-primary/20">
                  <BarChart3 className="h-8 w-8 text-primary" />
                </div>
                <div className="space-y-2">
                  <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                    Return Analytics Dashboard
                  </h1>
                  <p className="text-muted-foreground text-lg">
                    Comprehensive insights into return patterns and performance
                  </p>
                </div>
              </div>
              
              <div className="flex flex-wrap items-center gap-4">
                {/* Modern Timeframe Selector */}
                <div className="flex items-center gap-3">
                  <Label className="text-sm font-semibold flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-primary" />
                    Period:
                  </Label>
                  <select 
                    value={timeframe} 
                    onChange={(e) => setTimeframe(e.target.value as '7d' | '30d' | '90d' | '1y' | 'all')}
                    className="bg-background/50 backdrop-blur-sm border border-border/50 rounded-xl px-4 py-2 text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all duration-200"
                  >
                    <option value="7d">Last 7 Days</option>
                    <option value="30d">Last 30 Days</option>
                    <option value="90d">Last 90 Days</option>
                    <option value="1y">Last Year</option>
                    <option value="all">All Time</option>
                  </select>
                </div>
                
                {/* Modern Export Options */}
                <div className="flex items-center gap-2">
                  <AnimatedButton
                    onClick={() => handleExport('csv', 'summary')}
                    disabled={exportLoading}
                    variant="outline"
                    size="sm"
                    className="border-border/50 hover:bg-muted/50"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    CSV
                  </AnimatedButton>
                  <AnimatedButton
                    onClick={() => handleExport('json', 'detailed')}
                    disabled={exportLoading}
                    variant="outline"
                    size="sm"
                    className="border-border/50 hover:bg-muted/50"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    JSON
                  </AnimatedButton>
                </div>

                <div className="flex gap-2">
                  <AnimatedButton onClick={fetchAnalytics} variant="outline" size="sm">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </AnimatedButton>

                  {onClose && (
                    <AnimatedButton onClick={onClose} variant="outline" size="sm">
                      <XCircle className="h-4 w-4 mr-2" />
                      Close
                    </AnimatedButton>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatedCard>

        {/* Enhanced Summary Cards */}
        <motion.div 
          variants={fadeInUp}
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6"
        >
          <AnimatedCard className="group p-8 bg-gradient-to-br from-blue-50/80 via-card to-blue-100/30 dark:from-blue-950/40 dark:via-card dark:to-blue-900/20 border border-blue-200/60 dark:border-blue-700/40 shadow-xl shadow-blue-500/5 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div className="space-y-3">
                <p className="text-sm font-semibold text-muted-foreground/80 uppercase tracking-wide">Total Returns</p>
                <p className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-400 dark:to-blue-500 bg-clip-text text-transparent">
                  {analytics.summary.totalReturns}
                </p>
                <p className="text-xs text-muted-foreground font-medium">{formatTimeframe(timeframe)}</p>
              </div>
              <div className="p-4 bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 rounded-2xl shadow-xl shadow-blue-500/25 group-hover:scale-105 transition-transform duration-300">
                <Package className="h-8 w-8 text-white" />
              </div>
            </div>
          </AnimatedCard>

          <AnimatedCard className="group p-8 bg-gradient-to-br from-orange-50/80 via-card to-orange-100/30 dark:from-orange-950/40 dark:via-card dark:to-orange-900/20 border border-orange-200/60 dark:border-orange-700/40 shadow-xl shadow-orange-500/5 hover:shadow-2xl hover:shadow-orange-500/10 transition-all duration-300 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div className="space-y-3">
                <p className="text-sm font-semibold text-muted-foreground/80 uppercase tracking-wide">Overdue Returns</p>
                <p className="text-4xl font-bold bg-gradient-to-r from-orange-600 to-orange-700 dark:from-orange-400 dark:to-orange-500 bg-clip-text text-transparent">
                  {analytics.summary.overdueReturns}
                </p>
                <p className="text-xs text-muted-foreground font-medium">
                  {analytics.summary.overdueRate}% of all returns
                </p>
              </div>
              <div className="p-4 bg-gradient-to-br from-orange-500 via-orange-600 to-orange-700 rounded-2xl shadow-xl shadow-orange-500/25 group-hover:scale-105 transition-transform duration-300">
                <Clock className="h-8 w-8 text-white" />
              </div>
            </div>
          </AnimatedCard>

          <AnimatedCard className="group p-8 bg-gradient-to-br from-red-50/80 via-card to-red-100/30 dark:from-red-950/40 dark:via-card dark:to-red-900/20 border border-red-200/60 dark:border-red-700/40 shadow-xl shadow-red-500/5 hover:shadow-2xl hover:shadow-red-500/10 transition-all duration-300 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div className="space-y-3">
                <p className="text-sm font-semibold text-muted-foreground/80 uppercase tracking-wide">Damage Reports</p>
                <p className="text-4xl font-bold bg-gradient-to-r from-red-600 to-red-700 dark:from-red-400 dark:to-red-500 bg-clip-text text-transparent">
                  {analytics.summary.damageReports}
                </p>
                <p className="text-xs text-muted-foreground font-medium">
                  {analytics.summary.totalReturns > 0 
                    ? `${((analytics.summary.damageReports / analytics.summary.totalReturns) * 100).toFixed(1)}% of returns`
                    : 'No returns recorded'
                  }
                </p>
              </div>
              <div className="p-4 bg-gradient-to-br from-red-500 via-red-600 to-red-700 rounded-2xl shadow-xl shadow-red-500/25 group-hover:scale-105 transition-transform duration-300">
                <AlertTriangle className="h-8 w-8 text-white" />
              </div>
            </div>
          </AnimatedCard>

          <AnimatedCard className="group p-8 bg-gradient-to-br from-purple-50/80 via-card to-purple-100/30 dark:from-purple-950/40 dark:via-card dark:to-purple-900/20 border border-purple-200/60 dark:border-purple-700/40 shadow-xl shadow-purple-500/5 hover:shadow-2xl hover:shadow-purple-500/10 transition-all duration-300 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div className="space-y-3">
                <p className="text-sm font-semibold text-muted-foreground/80 uppercase tracking-wide">Total Penalties</p>
                <p className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-purple-700 dark:from-purple-400 dark:to-purple-500 bg-clip-text text-transparent">
                  {analytics.summary.totalPenalties.toFixed(1)}
                </p>
                <p className="text-xs text-muted-foreground font-medium">
                  {analytics.summary.penaltyCount} penalties applied
                </p>
              </div>
              <div className="p-4 bg-gradient-to-br from-purple-500 via-purple-600 to-purple-700 rounded-2xl shadow-xl shadow-purple-500/25 group-hover:scale-105 transition-transform duration-300">
                <TrendingDown className="h-8 w-8 text-white" />
              </div>
            </div>
          </AnimatedCard>
        </motion.div>

        {/* Enhanced Charts Grid */}
        <motion.div 
          variants={fadeInUp}
          className="grid grid-cols-1 xl:grid-cols-2 gap-8"
        >
          {/* Return Status Breakdown */}
          <AnimatedCard className="p-8 bg-gradient-to-br from-card via-card/95 to-muted/20 backdrop-blur-sm border border-border/40 shadow-xl hover:shadow-2xl transition-all duration-300">
            <div className="flex items-center gap-4 mb-8">
              <div className="p-3 bg-gradient-to-br from-blue-500/20 to-blue-400/10 rounded-xl">
                <PieChart className="h-6 w-6 text-blue-500" />
              </div>
              <h3 className="text-xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                Returns by Status
              </h3>
            </div>
            <div className="space-y-4">
              {analytics.breakdowns.byStatus.map((item, index) => (
                <motion.div 
                  key={index} 
                  className="flex items-center justify-between p-4 bg-gradient-to-r from-muted/30 to-muted/10 rounded-xl border border-border/30 hover:border-border/50 transition-all duration-200"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-4 h-4 rounded-full ${getStatusColor(item.status)} shadow-lg`}></div>
                    <span className="text-base font-semibold capitalize">{item.status.toLowerCase()}</span>
                  </div>
                  <div className="text-right space-y-1">
                    <span className="text-lg font-bold">{item.count}</span>
                    <div className="text-xs text-muted-foreground font-medium">
                      ({analytics.summary.totalReturns > 0 
                        ? ((item.count / analytics.summary.totalReturns) * 100).toFixed(1)
                        : 0}%)
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </AnimatedCard>

          {/* Return Condition Breakdown */}
          <AnimatedCard className="p-8 bg-gradient-to-br from-card via-card/95 to-muted/20 backdrop-blur-sm border border-border/40 shadow-xl hover:shadow-2xl transition-all duration-300">
            <div className="flex items-center gap-4 mb-8">
              <div className="p-3 bg-gradient-to-br from-green-500/20 to-green-400/10 rounded-xl">
                <BarChart3 className="h-6 w-6 text-green-500" />
              </div>
              <h3 className="text-xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                Returns by Condition
              </h3>
            </div>
            <div className="space-y-4">
              {analytics.breakdowns.byCondition.map((item, index) => (
                <motion.div 
                  key={index} 
                  className="flex items-center justify-between p-4 bg-gradient-to-r from-muted/30 to-muted/10 rounded-xl border border-border/30 hover:border-border/50 transition-all duration-200"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-4 h-4 rounded-full ${getConditionColor(item.condition)} shadow-lg`}></div>
                    <span className="text-base font-semibold capitalize">{item.condition.toLowerCase()}</span>
                  </div>
                  <div className="text-right space-y-1">
                    <span className="text-lg font-bold">{item.count}</span>
                    <div className="text-xs text-muted-foreground font-medium">
                      ({analytics.summary.totalReturns > 0 
                        ? ((item.count / analytics.summary.totalReturns) * 100).toFixed(1)
                        : 0}%)
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </AnimatedCard>
        </motion.div>

        {/* Enhanced Top Categories and Users */}
        <motion.div 
          variants={fadeInUp}
          className="grid grid-cols-1 xl:grid-cols-2 gap-8"
        >
          {/* Top Categories */}
          <AnimatedCard className="p-8 bg-gradient-to-br from-card via-card/95 to-muted/20 backdrop-blur-sm border border-border/40 shadow-xl hover:shadow-2xl transition-all duration-300">
            <div className="flex items-center gap-4 mb-8">
              <div className="p-3 bg-gradient-to-br from-indigo-500/20 to-indigo-400/10 rounded-xl">
                <Activity className="h-6 w-6 text-indigo-500" />
              </div>
              <h3 className="text-xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                Most Returned Categories
              </h3>
            </div>
            <div className="space-y-4">
              {analytics.breakdowns.topCategories.map((item, index) => (
                <motion.div 
                  key={index} 
                  className="flex items-center justify-between p-6 bg-gradient-to-r from-muted/30 to-muted/10 rounded-xl border border-border/30 hover:border-border/50 transition-all duration-200 group"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <div className="space-y-2">
                    <p className="font-bold text-foreground text-lg">{item.category}</p>
                    <p className="text-sm text-muted-foreground">{item.itemName}</p>
                  </div>
                  <Badge className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white border-0 shadow-lg group-hover:scale-105 transition-transform">
                    {item.count} returns
                  </Badge>
                </motion.div>
              ))}
            </div>
          </AnimatedCard>

          {/* Top Users */}
          <AnimatedCard className="p-8 bg-gradient-to-br from-card via-card/95 to-muted/20 backdrop-blur-sm border border-border/40 shadow-xl hover:shadow-2xl transition-all duration-300">
            <div className="flex items-center gap-4 mb-8">
              <div className="p-3 bg-gradient-to-br from-pink-500/20 to-pink-400/10 rounded-xl">
                <Users className="h-6 w-6 text-pink-500" />
              </div>
              <h3 className="text-xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                Most Active Users
              </h3>
            </div>
            <div className="space-y-4">
              {analytics.breakdowns.topUsers.map((user, index) => (
                <motion.div 
                  key={index} 
                  className="flex items-center justify-between p-6 bg-gradient-to-r from-muted/30 to-muted/10 rounded-xl border border-border/30 hover:border-border/50 transition-all duration-200 group"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <div className="space-y-2">
                    <p className="font-bold text-foreground text-lg">{user.name}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                    <p className="text-xs text-muted-foreground font-medium">
                      Trust Score: {user.trustScore.toFixed(1)}
                    </p>
                  </div>
                  <div className="text-right space-y-2">
                    <Badge className="bg-gradient-to-r from-pink-500 to-pink-600 text-white border-0 shadow-lg group-hover:scale-105 transition-transform">
                      {user.returnCount} returns
                    </Badge>
                    {user.avgPenalty > 0 && (
                      <p className="text-xs text-red-600 dark:text-red-400 font-semibold">
                        Avg Penalty: {user.avgPenalty.toFixed(1)}
                      </p>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </AnimatedCard>
        </motion.div>

        {/* Enhanced Performance Metrics */}
        <motion.div variants={fadeInUp}>
          <AnimatedCard className="p-8 bg-gradient-to-br from-card via-card/95 to-muted/20 backdrop-blur-sm border border-border/40 shadow-xl hover:shadow-2xl transition-all duration-300">
            <div className="flex items-center gap-4 mb-8">
              <div className="p-3 bg-gradient-to-br from-emerald-500/20 to-emerald-400/10 rounded-xl">
                <TrendingUp className="h-6 w-6 text-emerald-500" />
              </div>
              <h3 className="text-xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                Performance Metrics
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <motion.div 
                className="text-center p-8 bg-gradient-to-br from-emerald-50/80 via-emerald-50/50 to-emerald-100/30 dark:from-emerald-950/40 dark:via-emerald-950/20 dark:to-emerald-900/20 rounded-2xl border border-emerald-200/40 dark:border-emerald-700/40 shadow-lg hover:shadow-xl transition-all duration-300"
                whileHover={{ scale: 1.02 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Average Planned Duration</p>
                  <p className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-emerald-700 dark:from-emerald-400 dark:to-emerald-500 bg-clip-text text-transparent">
                    {analytics.summary.avgPlannedTime} days
                  </p>
                </div>
              </motion.div>
              <motion.div 
                className="text-center p-8 bg-gradient-to-br from-blue-50/80 via-blue-50/50 to-blue-100/30 dark:from-blue-950/40 dark:via-blue-950/20 dark:to-blue-900/20 rounded-2xl border border-blue-200/40 dark:border-blue-700/40 shadow-lg hover:shadow-xl transition-all duration-300"
                whileHover={{ scale: 1.02 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Average Actual Duration</p>
                  <p className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-400 dark:to-blue-500 bg-clip-text text-transparent">
                    {analytics.summary.avgActualTime} days
                  </p>
                </div>
              </motion.div>
              <motion.div 
                className="text-center p-8 bg-gradient-to-br from-orange-50/80 via-orange-50/50 to-orange-100/30 dark:from-orange-950/40 dark:via-orange-950/20 dark:to-orange-900/20 rounded-2xl border border-orange-200/40 dark:border-orange-700/40 shadow-lg hover:shadow-xl transition-all duration-300"
                whileHover={{ scale: 1.02 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Overdue Rate</p>
                  <p className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-orange-700 dark:from-orange-400 dark:to-orange-500 bg-clip-text text-transparent">
                    {analytics.summary.overdueRate}%
                  </p>
                </div>
              </motion.div>
            </div>
          </AnimatedCard>
        </motion.div>

        {/* Enhanced Export Options */}
        <motion.div variants={fadeInUp}>
          <AnimatedCard className="p-8 bg-gradient-to-br from-card via-card/95 to-muted/20 backdrop-blur-sm border border-border/40 shadow-xl hover:shadow-2xl transition-all duration-300">
            <div className="flex items-center gap-4 mb-8">
              <div className="p-3 bg-gradient-to-br from-gray-500/20 to-gray-400/10 rounded-xl">
                <Download className="h-6 w-6 text-gray-500" />
              </div>
              <h3 className="text-xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                Export Options
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <AnimatedButton
                onClick={() => handleExport('csv', 'summary')}
                disabled={exportLoading}
                variant="outline"
                className="w-full h-16 border-border/50 hover:bg-muted/50 transition-all duration-300 group"
              >
                <div className="flex flex-col items-center gap-2">
                  <Download className="h-5 w-5 group-hover:scale-110 transition-transform" />
                  <span className="font-semibold">Summary Report (CSV)</span>
                </div>
              </AnimatedButton>
              <AnimatedButton
                onClick={() => handleExport('csv', 'detailed')}
                disabled={exportLoading}
                variant="outline"
                className="w-full h-16 border-border/50 hover:bg-muted/50 transition-all duration-300 group"
              >
                <div className="flex flex-col items-center gap-2">
                  <FileText className="h-5 w-5 group-hover:scale-110 transition-transform" />
                  <span className="font-semibold">Detailed Report (CSV)</span>
                </div>
              </AnimatedButton>
              <AnimatedButton
                onClick={() => handleExport('csv', 'damage_reports')}
                disabled={exportLoading}
                variant="outline"
                className="w-full h-16 border-border/50 hover:bg-muted/50 transition-all duration-300 group"
              >
                <div className="flex flex-col items-center gap-2">
                  <AlertTriangle className="h-5 w-5 group-hover:scale-110 transition-transform" />
                  <span className="font-semibold">Damage Reports (CSV)</span>
                </div>
              </AnimatedButton>
            </div>
          </AnimatedCard>
        </motion.div>

        {/* Enhanced Metadata */}
        <motion.div 
          variants={fadeInUp}
          className="text-center space-y-2"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-muted/30 rounded-full border border-border/30">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground font-medium">
              Report generated at {new Date(analytics.metadata.generatedAt).toLocaleString()}
            </p>
          </div>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-muted/30 rounded-full border border-border/30">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground font-medium">
              Period: {analytics.trends.startDate.split('T')[0]} to {analytics.trends.endDate.split('T')[0]}
            </p>
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}