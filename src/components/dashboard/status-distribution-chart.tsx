'use client'

import { BarChart3 } from 'lucide-react'

interface StatusDistributionChartProps {
  data: Record<string, number>
  isLoading: boolean
}

function StatusDistributionChart({ data, isLoading }: StatusDistributionChartProps) {
  const statusColors = {
    AVAILABLE: { bg: 'bg-green-500', text: 'text-green-700', name: 'Available' },
    BORROWED: { bg: 'bg-orange-500', text: 'text-orange-700', name: 'Borrowed' },
    RESERVED: { bg: 'bg-yellow-500', text: 'text-yellow-700', name: 'Reserved' },
    MAINTENANCE: { bg: 'bg-purple-500', text: 'text-purple-700', name: 'Maintenance' },
    RETIRED: { bg: 'bg-gray-500', text: 'text-gray-700', name: 'Retired' }
  }

  const totalItems = Object.values(data).reduce((sum, count) => sum + count, 0)

  const statusData = Object.entries(data)
    .filter(([, count]) => count > 0)
    .map(([status, count]) => ({
      status,
      count,
      percentage: totalItems > 0 ? (count / totalItems) * 100 : 0,
      color: statusColors[status as keyof typeof statusColors] || { 
        bg: 'bg-gray-400', 
        text: 'text-gray-600', 
        name: status 
      }
    }))
    .sort((a, b) => b.count - a.count)

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center mb-4">
          <BarChart3 className="h-5 w-5 text-gray-400 mr-2" />
          <div className="h-6 w-48 bg-gray-200 rounded animate-pulse"></div>
        </div>
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="flex justify-between">
                <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 w-12 bg-gray-200 rounded animate-pulse"></div>
              </div>
              <div className="h-3 bg-gray-200 rounded animate-pulse"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <BarChart3 className="h-5 w-5 text-gray-400 mr-2" />
          <h3 className="text-lg font-medium text-gray-900">Status Distribution</h3>
        </div>
        <div className="text-sm text-gray-500">
          Total: {totalItems.toLocaleString()} items
        </div>
      </div>

      {statusData.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p>No items found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {statusData.map(({ status, count, percentage, color }) => (
            <div key={status} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className={`w-3 h-3 rounded-full ${color.bg} mr-2`}></div>
                  <span className="text-sm font-medium text-gray-900">
                    {color.name}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">
                    {count.toLocaleString()}
                  </span>
                  <span className={`text-sm font-medium ${color.text}`}>
                    {percentage.toFixed(1)}%
                  </span>
                </div>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${color.bg} transition-all duration-500 ease-out`}
                  style={{ width: `${percentage}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary Stats */}
      {statusData.length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Most Common:</span>
              <span className="ml-2 font-medium text-gray-900">
                {statusData[0]?.color.name}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Unique Statuses:</span>
              <span className="ml-2 font-medium text-gray-900">
                {statusData.length}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default StatusDistributionChart