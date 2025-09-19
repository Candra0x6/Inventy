import { AnalyticsDataPoint, AnalyticsDataset } from '@/components/analytics/analytics-line-chart'
import { TimeframeType } from '@/components/analytics/analytics-menu'

// Generate sample borrowing data
export function generateBorrowingData(timeframe: TimeframeType): AnalyticsDataset[] {
  const dates = generateDateRange(timeframe)
  
  // Main borrowing trend with some seasonality
  const borrowingData: AnalyticsDataPoint[] = dates.map((date, index) => {
    const baseValue = 15
    const trend = Math.sin((index / dates.length) * Math.PI * 2) * 5
    const randomVariation = Math.random() * 8 - 4
    const weekendFactor = isWeekend(date) ? -3 : 2
    
    const count = Math.max(0, Math.round(baseValue + trend + randomVariation + weekendFactor))
    
    return {
      date: date.toISOString(),
      count,
      label: `${count} items borrowed`
    }
  })

  // Peak borrowing times (higher activity periods)
  const peakBorrowingData: AnalyticsDataPoint[] = dates.map((date, index) => {
    const baseValue = 8
    const trend = Math.cos((index / dates.length) * Math.PI * 3) * 3
    const randomVariation = Math.random() * 4 - 2
    const weekendFactor = isWeekend(date) ? -2 : 1
    
    const count = Math.max(0, Math.round(baseValue + trend + randomVariation + weekendFactor))
    
    return {
      date: date.toISOString(),
      count,
      label: `${count} peak borrowings`
    }
  })

  return [
    {
      label: 'Daily Borrowings',
      data: borrowingData,
      color: '#3b82f6', // Blue
      fillColor: 'rgba(59, 130, 246, 0.1)',
      borderWidth: 3
    },
    {
      label: 'Peak Hours',
      data: peakBorrowingData,
      color: '#8b5cf6', // Purple
      fillColor: 'rgba(139, 92, 246, 0.1)',
      borderWidth: 2
    }
  ]
}

// Generate sample returning data
export function generateReturningData(timeframe: TimeframeType): AnalyticsDataset[] {
  const dates = generateDateRange(timeframe)
  
  // Main returning trend
  const returningData: AnalyticsDataPoint[] = dates.map((date, index) => {
    const baseValue = 12
    const trend = Math.sin((index / dates.length) * Math.PI * 1.5) * 4
    const randomVariation = Math.random() * 6 - 3
    const weekendFactor = isWeekend(date) ? -2 : 1
    
    const count = Math.max(0, Math.round(baseValue + trend + randomVariation + weekendFactor))
    
    return {
      date: date.toISOString(),
      count,
      label: `${count} items returned`
    }
  })

  // Overdue returns
  const overdueReturnsData: AnalyticsDataPoint[] = dates.map((date, index) => {
    const baseValue = 2
    const trend = Math.sin((index / dates.length) * Math.PI * 4) * 1.5
    const randomVariation = Math.random() * 2 - 1
    
    const count = Math.max(0, Math.round(baseValue + trend + randomVariation))
    
    return {
      date: date.toISOString(),
      count,
      label: `${count} overdue returns`
    }
  })

  // On-time returns
  const onTimeReturnsData: AnalyticsDataPoint[] = returningData.map((item, index) => ({
    date: item.date,
    count: Math.max(0, item.count - overdueReturnsData[index].count),
    label: `${Math.max(0, item.count - overdueReturnsData[index].count)} on-time returns`
  }))

  return [
    {
      label: 'On-Time Returns',
      data: onTimeReturnsData,
      color: '#10b981', // Green
      fillColor: 'rgba(16, 185, 129, 0.1)',
      borderWidth: 3
    },
    {
      label: 'Overdue Returns',
      data: overdueReturnsData,
      color: '#ef4444', // Red
      fillColor: 'rgba(239, 68, 68, 0.1)',
      borderWidth: 2
    },
    {
      label: 'Total Returns',
      data: returningData,
      color: '#6b7280', // Gray
      fillColor: 'rgba(107, 114, 128, 0.05)',
      borderWidth: 1
    }
  ]
}

// Generate date range based on timeframe
function generateDateRange(timeframe: TimeframeType): Date[] {
  const now = new Date()
  const dates: Date[] = []
  
  let days: number
  let interval: number
  
  switch (timeframe) {
    case '7d':
      days = 7
      interval = 1 // Daily
      break
    case '30d':
      days = 30
      interval = 1 // Daily
      break
    case '90d':
      days = 90
      interval = 3 // Every 3 days
      break
    case '1y':
      days = 365
      interval = 7 // Weekly
      break
    case 'all':
      days = 730 // 2 years
      interval = 14 // Bi-weekly
      break
    default:
      days = 30
      interval = 1
  }
  
  for (let i = days; i >= 0; i -= interval) {
    const date = new Date(now)
    date.setDate(now.getDate() - i)
    dates.push(date)
  }
  
  return dates
}

// Helper function to check if date is weekend
function isWeekend(date: Date): boolean {
  const dayOfWeek = date.getDay()
  return dayOfWeek === 0 || dayOfWeek === 6 // Sunday or Saturday
}

// Generate summary statistics
export function generateSummaryStats(datasets: AnalyticsDataset[]) {
  if (!datasets.length || !datasets[0].data.length) {
    return {
      total: 0,
      average: 0,
      peak: 0,
      growth: 0,
      trend: 'stable' as const
    }
  }

  const mainDataset = datasets[0]
  const values = mainDataset.data.map(point => point.count)
  
  const total = values.reduce((sum, val) => sum + val, 0)
  const average = total / values.length
  const peak = Math.max(...values)
  
  // Calculate growth (compare first quarter vs last quarter)
  const quarterLength = Math.floor(values.length / 4)
  if (quarterLength > 0) {
    const firstQuarter = values.slice(0, quarterLength)
    const lastQuarter = values.slice(-quarterLength)
    
    const firstAvg = firstQuarter.reduce((sum, val) => sum + val, 0) / firstQuarter.length
    const lastAvg = lastQuarter.reduce((sum, val) => sum + val, 0) / lastQuarter.length
    
    const growth = firstAvg > 0 ? ((lastAvg - firstAvg) / firstAvg) * 100 : 0
    const trend = growth > 5 ? 'up' : growth < -5 ? 'down' : 'stable'
    
    return {
      total: Math.round(total),
      average: Math.round(average * 10) / 10,
      peak,
      growth: Math.round(growth * 10) / 10,
      trend
    }
  }
  
  return {
    total: Math.round(total),
    average: Math.round(average * 10) / 10,
    peak,
    growth: 0,
    trend: 'stable' as const
  }
}

// Format tooltip values
export function formatTooltipValue(value: number, type: 'borrowing' | 'returning'): string {
  if (type === 'borrowing') {
    return `${value} ${value === 1 ? 'borrowing' : 'borrowings'}`
  } else {
    return `${value} ${value === 1 ? 'return' : 'returns'}`
  }
}

// Export functionality
export async function exportAnalyticsData(
  datasets: AnalyticsDataset[], 
  format: 'csv' | 'json',
  type: 'borrowing' | 'returning',
  timeframe: TimeframeType
) {
  const timestamp = new Date().toISOString().split('T')[0]
  const filename = `${type}-analytics-${timeframe}-${timestamp}.${format}`
  
  if (format === 'csv') {
    // Convert to CSV
    const headers = ['Date', ...datasets.map(d => d.label)]
    const rows = datasets[0].data.map((_, index) => {
      const date = new Date(datasets[0].data[index].date).toLocaleDateString()
      const values = datasets.map(dataset => dataset.data[index]?.count || 0)
      return [date, ...values]
    })
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n')
    
    downloadFile(csvContent, filename, 'text/csv')
  } else {
    // Convert to JSON
    const jsonData = {
      type,
      timeframe,
      exportedAt: new Date().toISOString(),
      datasets: datasets.map(dataset => ({
        label: dataset.label,
        color: dataset.color,
        data: dataset.data.map(point => ({
          date: point.date,
          count: point.count,
          formattedDate: new Date(point.date).toLocaleDateString()
        }))
      })),
      summary: generateSummaryStats(datasets)
    }
    
    downloadFile(JSON.stringify(jsonData, null, 2), filename, 'application/json')
  }
}

// Helper function to trigger download
function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  window.URL.revokeObjectURL(url)
}