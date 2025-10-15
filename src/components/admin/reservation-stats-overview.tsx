'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { AnimatedCard } from '@/components/ui/animated-card'
import { Badge } from '@/components/ui/badge'
import { fadeInUp, staggerContainer } from '@/lib/animations'
import { 
  Calendar, 
  Clock, 
  CheckCircle, 
  Users, 
  Package,
  TrendingUp,
  AlertTriangle,
  Activity,
  Target,
  Award
} from 'lucide-react'

interface ReservationStats {
  overview: {
    totalReservations: number
    pendingReservations: number
    approvedReservations: number
    rejectedReservations: number
    cancelledReservations: number
    completedReservations: number
    activeReservations: number
  }
  trends: {
    weeklyGrowth: number
    monthlyGrowth: number
    approvalRate: number
    utilizationRate: number
  }
  insights: {
    totalUsers: number
    activeUsers: number
    totalItems: number
    availableItems: number
    popularItems: Array<{
      id: string
      name: string
      reservationCount: number
    }>
    peakReservationDays: string[]
  }
  recentActivity: Array<{
    id: string
    type: 'created' | 'approved' | 'rejected' | 'cancelled' | 'completed'
    userName: string
    itemName: string
    timestamp: string
  }>
}

interface ReservationStatsOverviewProps {
  className?: string
}

export default function ReservationStatsOverview({ className }: ReservationStatsOverviewProps) {
  const [data, setData] = useState<ReservationStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setIsLoading(true)
        const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/admin/reservations/stats`)
        if (!response.ok) {
          throw new Error('Failed to fetch statistics')
        }
        const stats = await response.json()
        setData(stats)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch statistics')
      } finally {
        setIsLoading(false)
      }
    }

    fetchStats()
  }, [])

  if (isLoading) {
    return (
      <div className={`space-y-8 ${className}`}>
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="space-y-6"
        >
          <motion.div variants={fadeInUp} className="space-y-4">
            <div className="h-8 bg-muted/50 rounded-xl w-80 animate-pulse" />
            <div className="h-6 bg-muted/30 rounded-xl w-full max-w-md animate-pulse" />
          </motion.div>
          
          <motion.div variants={fadeInUp} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <AnimatedCard key={i} className="p-6 bg-gradient-to-br from-background to-muted/30 backdrop-blur-sm border border-border/50 shadow-lg">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="h-12 w-12 bg-muted/30 rounded-xl animate-pulse" />
                    <div className="h-6 w-16 bg-muted/20 rounded-lg animate-pulse" />
                  </div>
                  <div className="space-y-2">
                    <div className="h-4 bg-muted/30 rounded-xl w-24 animate-pulse" />
                    <div className="h-8 bg-muted/50 rounded-xl w-16 animate-pulse" />
                    <div className="h-3 bg-muted/20 rounded-xl w-20 animate-pulse" />
                  </div>
                </div>
              </AnimatedCard>
            ))}
          </motion.div>
        </motion.div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className={`space-y-8 ${className}`}>
        <AnimatedCard className="p-8 bg-gradient-to-br from-background to-muted/30 backdrop-blur-sm border border-border/50 shadow-lg">
          <motion.div 
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            className="text-center text-destructive"
          >
            <div className="p-4 bg-destructive/10 rounded-full w-fit mx-auto mb-4">
              <AlertTriangle className="h-12 w-12" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Error Loading Statistics</h3>
            <p className="text-sm text-muted-foreground">{error || 'No data available'}</p>
          </motion.div>
        </AnimatedCard>
      </div>
    )
  }

  const statCards = [
    {
      title: 'Total Reservations',
      value: data.overview.totalReservations,
      icon: Calendar,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      trend: `+${data.trends.weeklyGrowth}% this week`,
    },
    {
      title: 'Pending Review',
      value: data.overview.pendingReservations,
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      badge: data.overview.pendingReservations > 0 ? 'urgent' : undefined,
    },
    {
      title: 'Active Reservations',
      value: data.overview.activeReservations,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Completed',
      value: data.overview.completedReservations,
      icon: CheckCircle,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },

  
  ]

  const issueCards = [
    {
      title: 'Rejected',
      value: data.overview.rejectedReservations,
      color: 'text-red-600',
    },
    {
      title: 'Cancelled',
      value: data.overview.cancelledReservations,
      color: 'text-orange-600',
    }
  ]

  return (
    <motion.div 
      className={`space-y-8 ${className} mb-5`}
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      {/* Enhanced Header */}
      <motion.div variants={fadeInUp} className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-primary/20 to-primary/10 backdrop-blur-sm rounded-xl border border-primary/20">
            <Activity className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Reservation Statistics
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed">
              Overview of reservation management and system performance
            </p>
          </div>
        </div>
      </motion.div>

      {/* Main Stats Grid */}
      <motion.div variants={fadeInUp} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, index) => (
          <AnimatedCard 
            key={index} 
            className="group p-6 bg-gradient-to-br from-background to-muted/30 backdrop-blur-sm border border-border/50 shadow-lg hover:shadow-xl transition-all duration-300"
          >
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className={`p-3 rounded-xl transition-transform duration-300 group-hover:scale-110 ${
                  card.bgColor.includes('blue') ? 'bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-900/30 dark:to-blue-800/20' :
                  card.bgColor.includes('yellow') ? 'bg-gradient-to-br from-yellow-100 to-yellow-50 dark:from-yellow-900/30 dark:to-yellow-800/20' :
                  card.bgColor.includes('green') ? 'bg-gradient-to-br from-green-100 to-green-50 dark:from-green-900/30 dark:to-green-800/20' :
                  card.bgColor.includes('purple') ? 'bg-gradient-to-br from-purple-100 to-purple-50 dark:from-purple-900/30 dark:to-purple-800/20' :
                  card.bgColor.includes('indigo') ? 'bg-gradient-to-br from-indigo-100 to-indigo-50 dark:from-indigo-900/30 dark:to-indigo-800/20' :
                  card.bgColor.includes('emerald') ? 'bg-gradient-to-br from-emerald-100 to-emerald-50 dark:from-emerald-900/30 dark:to-emerald-800/20' :
                  'bg-gradient-to-br from-muted/20 to-muted/10'
                }`}>
                  <card.icon className={`h-6 w-6 ${card.color} dark:opacity-80`} />
                </div>
                {card.badge === 'urgent' && (
                  <Badge className="bg-red-500 text-white text-xs animate-pulse">
                    Needs Attention
                  </Badge>
                )}
              </div>
              
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">{card.title}</h3>
                <p className="text-3xl font-bold">{card.value}</p>
                {card.trend && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    {card.trend.includes('+') && <TrendingUp className="h-3 w-3 text-green-500" />}
                    {card.trend}
                  </p>
                )}
              </div>
            </motion.div>
          </AnimatedCard>
        ))}
      </motion.div>

      {/* Issues Alert */}
      {(data.overview.rejectedReservations > 0 || data.overview.cancelledReservations > 0) && (
        <motion.div variants={fadeInUp}>
          <AnimatedCard className="p-6 bg-gradient-to-br from-background to-muted/30 backdrop-blur-sm border border-orange-200 dark:border-orange-800 shadow-lg">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 bg-gradient-to-br from-orange-100 to-orange-50 dark:from-orange-900/30 dark:to-orange-800/20 rounded-xl">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
              </div>
              <h3 className="text-lg font-semibold">Issues Requiring Attention</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {issueCards.map((card, index) => (
                <motion.div 
                  key={index} 
                  whileHover={{ scale: 1.02 }}
                  className="p-4 bg-muted/30 backdrop-blur-sm rounded-xl border border-border/50"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">{card.title}</span>
                    <span className={`text-2xl font-bold ${card.color}`}>{card.value}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </AnimatedCard>
        </motion.div>
      )}

      {/* Popular Items */}
      {data.insights.popularItems.length > 0 && (
        <motion.div variants={fadeInUp}>
          <AnimatedCard className="p-6 bg-gradient-to-br from-background to-muted/30 backdrop-blur-sm border border-border/50 shadow-lg mb-5">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 bg-gradient-to-br from-yellow-100 to-yellow-50 dark:from-yellow-900/30 dark:to-yellow-800/20 rounded-xl">
                <Award className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <h3 className="text-lg font-semibold">Most Reserved Items</h3>
            </div>
            <div className="space-y-3">
              {data.insights.popularItems.slice(0, 5).map((item, index) => (
                <motion.div 
                  key={item.id} 
                  whileHover={{ scale: 1.01, x: 4 }}
                  className="flex items-center justify-between p-4 bg-muted/30 backdrop-blur-sm rounded-xl border border-border/50 transition-all duration-200"
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-primary/20 to-primary/10 rounded-lg border border-primary/20">
                      <span className="text-sm font-bold text-primary">#{index + 1}</span>
                    </div>
                    <span className="font-medium">{item.name}</span>
                  </div>
                  <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                    {item.reservationCount} reservations
                  </Badge>
                </motion.div>
              ))}
            </div>
          </AnimatedCard>
        </motion.div>
      )}
    </motion.div>
  )
}