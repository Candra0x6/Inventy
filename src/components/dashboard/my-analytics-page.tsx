'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { AnimatedButton } from '@/components/ui/animated-button'
import { AnimatedCard } from '@/components/ui/animated-card'
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { useAuth } from '@/lib/auth/auth-context'
import { LoadingState } from '@/components/ui/loading-states'
import { fadeInUp, staggerContainer } from '@/lib/animations'
import {
  BarChart3,
  TrendingUp
} from 'lucide-react'

interface UsageAnalytics {
  averageBorrowDuration: number
  punctualityRate: number
  mostBorrowedCategories: { category: string; count: number }[]
  borrowingTrends: { month: string; count: number }[]
}

export default function MyAnalyticsPage() {
  const { user } = useAuth()
  const [usageAnalytics, setUsageAnalytics] = useState<UsageAnalytics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      fetchAnalytics()
    }
  }, [user])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/user/usage-analytics')
      if (response.ok) {
        const data = await response.json()
        setUsageAnalytics(data)
      }
    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        <LoadingState
          variant="page"
          message="Loading your analytics..."
          className="max-w-7xl mx-auto px-4 lg:px-6 py-8"
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-8">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="space-y-8"
        >
          {/* Header */}
          <motion.div variants={fadeInUp}>
            <AnimatedCard className="bg-gradient-to-br from-background to-muted/20 backdrop-blur-sm border border-border/40 shadow-sm overflow-hidden">
              <div className="p-8">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                      My Analytics
                    </h1>
                    <p className="text-muted-foreground mt-2">
                      Track your borrowing patterns and usage statistics
                    </p>
                  </div>
                  <Link href="/dashboard">
                    <AnimatedButton variant="outline">
                      Back to Overview
                    </AnimatedButton>
                  </Link>
                </div>
              </div>
            </AnimatedCard>
          </motion.div>

          {/* Main Content */}
          <motion.div variants={fadeInUp}>
            <AnimatedCard className="bg-gradient-to-br from-background to-muted/20 backdrop-blur-sm border border-border/40 shadow-sm overflow-hidden">
              <div className="p-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Usage Statistics */}
                  <AnimatedCard className="bg-gradient-to-br from-background to-muted/30 backdrop-blur-sm border border-border/50 shadow-lg">
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <BarChart3 className="h-5 w-5" />
                        <span>Usage Statistics</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                            <div className="text-2xl font-bold text-blue-600">
                              {usageAnalytics?.averageBorrowDuration?.toFixed(1) || '0'} days
                            </div>
                            <div className="text-sm text-muted-foreground">Avg. Borrow Duration</div>
                          </div>
                          <div className="text-center p-4 bg-green-50 dark:bg-green-900/30 rounded-lg">
                            <div className="text-2xl font-bold text-green-600">
                              {usageAnalytics?.punctualityRate?.toFixed(1) || '0'}%
                            </div>
                            <div className="text-sm text-muted-foreground">On-time Return Rate</div>
                          </div>
                        </div>

                        <div>
                          <h4 className="font-medium mb-3">Most Borrowed Categories</h4>
                          <div className="space-y-3">
                            {usageAnalytics?.mostBorrowedCategories?.map((cat) => (
                              <div key={cat.category} className="flex items-center justify-between">
                                <span className="text-sm">{cat.category}</span>
                                <div className="flex items-center space-x-2">
                                  <Progress value={(cat.count / Math.max(...(usageAnalytics?.mostBorrowedCategories?.map(c => c.count) || [1]))) * 100} className="w-20 h-2" />
                                  <span className="text-sm font-medium w-8">{cat.count}</span>
                                </div>
                              </div>
                            )) || (
                              <p className="text-sm text-muted-foreground text-center py-4">No usage data available</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </AnimatedCard>

                  {/* Borrowing Trends */}
                  <AnimatedCard className="bg-gradient-to-br from-background to-muted/30 backdrop-blur-sm border border-border/50 shadow-lg">
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <TrendingUp className="h-5 w-5" />
                        <span>Borrowing Trends</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {usageAnalytics?.borrowingTrends?.map((trend) => (
                          <div key={trend.month} className="flex items-center justify-between">
                            <span className="text-sm">{trend.month}</span>
                            <div className="flex items-center space-x-2">
                              <Progress
                                value={(trend.count / Math.max(...(usageAnalytics?.borrowingTrends?.map(t => t.count) || [1]))) * 100}
                                className="w-24 h-2"
                              />
                              <span className="text-sm font-medium w-8">{trend.count}</span>
                            </div>
                          </div>
                        )) || (
                          <p className="text-sm text-muted-foreground text-center py-8">No trend data available</p>
                        )}
                      </div>
                    </CardContent>
                  </AnimatedCard>
                </div>
              </div>
            </AnimatedCard>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}