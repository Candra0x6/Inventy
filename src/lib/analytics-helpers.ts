import { Return, DamageReport, Reservation, Item, User } from '@prisma/client'

export interface AnalyticsMetrics {
  returnRate: number
  averageReturnTime: number
  overdueRate: number
  damageRate: number
  userSatisfactionScore: number
  categoryPerformance: CategoryPerformance[]
  timelineData: TimelineData[]
}

export interface CategoryPerformance {
  category: string
  totalReturns: number
  averageReturnTime: number
  damageRate: number
  overdueRate: number
}

export interface TimelineData {
  date: string
  returns: number
  overdue: number
  damaged: number
}

export interface ReturnWithRelations extends Return {
  item: Item
  user: User
  reservation: Reservation
  damageReports: DamageReport[]
}

/**
 * Calculate comprehensive analytics metrics from return data
 */
export function calculateAnalyticsMetrics(returns: ReturnWithRelations[]): AnalyticsMetrics {
  if (returns.length === 0) {
    return {
      returnRate: 0,
      averageReturnTime: 0,
      overdueRate: 0,
      damageRate: 0,
      userSatisfactionScore: 0,
      categoryPerformance: [],
      timelineData: []
    }
  }

  // Calculate basic metrics
  const totalReturns = returns.length
  const overdueReturns = returns.filter(ret => 
    new Date(ret.returnDate) > new Date(ret.reservation.endDate)
  ).length
  const damageReturns = returns.filter(ret => ret.damageReports.length > 0).length

  // Calculate return times
  const returnTimes = returns.map(ret => {
    const plannedDays = Math.ceil(
      (new Date(ret.reservation.endDate).getTime() - new Date(ret.reservation.startDate).getTime()) / 
      (1000 * 60 * 60 * 24)
    )
    const actualDays = Math.ceil(
      (new Date(ret.returnDate).getTime() - new Date(ret.reservation.startDate).getTime()) / 
      (1000 * 60 * 60 * 24)
    )
    return { planned: plannedDays, actual: actualDays }
  })

  const averageReturnTime = returnTimes.length > 0 
    ? returnTimes.reduce((sum, time) => sum + time.actual, 0) / returnTimes.length 
    : 0

  // Calculate rates
  const overdueRate = (overdueReturns / totalReturns) * 100
  const damageRate = (damageReturns / totalReturns) * 100

  // Calculate user satisfaction score based on trust score changes
  const userTrustScores = returns.map(ret => ret.user.trustScore)
  const averageTrustScore = userTrustScores.length > 0 
    ? userTrustScores.reduce((sum, score) => sum + score, 0) / userTrustScores.length 
    : 100

  // Group by category for category performance
  const categoryGroups = returns.reduce((groups, ret) => {
    const category = ret.item.category
    if (!groups[category]) {
      groups[category] = []
    }
    groups[category].push(ret)
    return groups
  }, {} as Record<string, ReturnWithRelations[]>)

  const categoryPerformance: CategoryPerformance[] = Object.entries(categoryGroups).map(([category, categoryReturns]) => {
    const categoryOverdue = categoryReturns.filter(ret => 
      new Date(ret.returnDate) > new Date(ret.reservation.endDate)
    ).length
    const categoryDamage = categoryReturns.filter(ret => ret.damageReports.length > 0).length
    
    const categoryReturnTimes = categoryReturns.map(ret => 
      Math.ceil(
        (new Date(ret.returnDate).getTime() - new Date(ret.reservation.startDate).getTime()) / 
        (1000 * 60 * 60 * 24)
      )
    )
    const avgCategoryReturnTime = categoryReturnTimes.length > 0 
      ? categoryReturnTimes.reduce((sum, time) => sum + time, 0) / categoryReturnTimes.length 
      : 0

    return {
      category,
      totalReturns: categoryReturns.length,
      averageReturnTime: Math.round(avgCategoryReturnTime * 100) / 100,
      damageRate: Math.round((categoryDamage / categoryReturns.length) * 10000) / 100,
      overdueRate: Math.round((categoryOverdue / categoryReturns.length) * 10000) / 100
    }
  })

  // Generate timeline data (daily aggregation)
  const timelineGroups = returns.reduce((groups, ret) => {
    const date = ret.returnDate.toISOString().split('T')[0]
    if (!groups[date]) {
      groups[date] = { returns: 0, overdue: 0, damaged: 0 }
    }
    groups[date].returns++
    if (new Date(ret.returnDate) > new Date(ret.reservation.endDate)) {
      groups[date].overdue++
    }
    if (ret.damageReports.length > 0) {
      groups[date].damaged++
    }
    return groups
  }, {} as Record<string, { returns: number; overdue: number; damaged: number }>)

  const timelineData: TimelineData[] = Object.entries(timelineGroups)
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => a.date.localeCompare(b.date))

  return {
    returnRate: Math.round((totalReturns / totalReturns) * 10000) / 100, // 100% by definition for returned items
    averageReturnTime: Math.round(averageReturnTime * 100) / 100,
    overdueRate: Math.round(overdueRate * 100) / 100,
    damageRate: Math.round(damageRate * 100) / 100,
    userSatisfactionScore: Math.round(averageTrustScore * 100) / 100,
    categoryPerformance: categoryPerformance.sort((a, b) => b.totalReturns - a.totalReturns),
    timelineData
  }
}

/**
 * Generate return performance insights based on analytics data
 */
export function generateReturnInsights(metrics: AnalyticsMetrics): string[] {
  const insights: string[] = []

  // Overdue rate insights
  if (metrics.overdueRate > 20) {
    insights.push(`High overdue rate (${metrics.overdueRate}%) indicates need for better return reminders or policy adjustments.`)
  } else if (metrics.overdueRate < 5) {
    insights.push(`Excellent return compliance (${metrics.overdueRate}% overdue rate) demonstrates effective return management.`)
  }

  // Damage rate insights
  if (metrics.damageRate > 15) {
    insights.push(`High damage rate (${metrics.damageRate}%) suggests need for better item protection or user education.`)
  } else if (metrics.damageRate < 3) {
    insights.push(`Low damage rate (${metrics.damageRate}%) indicates good item handling and user responsibility.`)
  }

  // Return time insights
  if (metrics.averageReturnTime > 7) {
    insights.push(`Average return time of ${metrics.averageReturnTime} days may indicate optimal utilization of shared resources.`)
  } else if (metrics.averageReturnTime < 2) {
    insights.push(`Short average return time (${metrics.averageReturnTime} days) might suggest under-utilization or quick task completion.`)
  }

  // User satisfaction insights
  if (metrics.userSatisfactionScore > 95) {
    insights.push(`High user trust scores (${metrics.userSatisfactionScore}) indicate excellent system performance and user satisfaction.`)
  } else if (metrics.userSatisfactionScore < 80) {
    insights.push(`Lower trust scores (${metrics.userSatisfactionScore}) suggest need for improvement in return processes or penalty policies.`)
  }

  // Category performance insights
  const topPerformingCategory = metrics.categoryPerformance.find(cat => 
    cat.overdueRate < 10 && cat.damageRate < 5
  )
  if (topPerformingCategory) {
    insights.push(`${topPerformingCategory.category} category shows excellent performance with low overdue and damage rates.`)
  }

  const underperformingCategory = metrics.categoryPerformance.find(cat => 
    cat.overdueRate > 25 || cat.damageRate > 20
  )
  if (underperformingCategory) {
    insights.push(`${underperformingCategory.category} category needs attention due to high overdue (${underperformingCategory.overdueRate}%) or damage rates (${underperformingCategory.damageRate}%).`)
  }

  return insights
}

/**
 * Calculate return trends and predictions
 */
export function calculateReturnTrends(timelineData: TimelineData[]): {
  trend: 'increasing' | 'decreasing' | 'stable'
  growth: number
  prediction: number
} {
  if (timelineData.length < 7) {
    return { trend: 'stable', growth: 0, prediction: 0 }
  }

  // Calculate 7-day moving average for the last two weeks
  const recent = timelineData.slice(-14)
  const firstWeekAvg = recent.slice(0, 7).reduce((sum, day) => sum + day.returns, 0) / 7
  const secondWeekAvg = recent.slice(7, 14).reduce((sum, day) => sum + day.returns, 0) / 7

  const growth = ((secondWeekAvg - firstWeekAvg) / Math.max(firstWeekAvg, 1)) * 100

  let trend: 'increasing' | 'decreasing' | 'stable' = 'stable'
  if (Math.abs(growth) > 10) {
    trend = growth > 0 ? 'increasing' : 'decreasing'
  }

  // Simple linear prediction for next week
  const prediction = secondWeekAvg + (growth / 100) * secondWeekAvg

  return {
    trend,
    growth: Math.round(growth * 100) / 100,
    prediction: Math.round(prediction * 100) / 100
  }
}

/**
 * Format analytics data for export
 */
export function formatAnalyticsForExport(metrics: AnalyticsMetrics): unknown[] {
  return [
    { metric: 'Return Rate', value: `${metrics.returnRate}%` },
    { metric: 'Average Return Time', value: `${metrics.averageReturnTime} days` },
    { metric: 'Overdue Rate', value: `${metrics.overdueRate}%` },
    { metric: 'Damage Rate', value: `${metrics.damageRate}%` },
    { metric: 'User Satisfaction Score', value: metrics.userSatisfactionScore },
    ...metrics.categoryPerformance.map(cat => ({
      metric: `${cat.category} - Total Returns`,
      value: cat.totalReturns
    })),
    ...metrics.categoryPerformance.map(cat => ({
      metric: `${cat.category} - Avg Return Time`,
      value: `${cat.averageReturnTime} days`
    })),
    ...metrics.categoryPerformance.map(cat => ({
      metric: `${cat.category} - Damage Rate`,
      value: `${cat.damageRate}%`
    })),
    ...metrics.categoryPerformance.map(cat => ({
      metric: `${cat.category} - Overdue Rate`,
      value: `${cat.overdueRate}%`
    }))
  ]
}