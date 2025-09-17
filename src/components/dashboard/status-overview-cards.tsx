import { Package, CheckCircle, Clock, Settings, AlertTriangle } from 'lucide-react'

interface StatusOverviewCardsProps {
  data: {
    statusCounts: Record<string, number>
  } | null
  isLoading: boolean
}

interface StatusCardProps {
  title: string
  value: number
  icon: React.ReactNode
  color: string
  bgColor: string
  isLoading: boolean
  subtitle?: string
}

function StatusCard({ title, value, icon, color, bgColor, isLoading, subtitle }: StatusCardProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center">
        <div className={`${bgColor} rounded-lg p-3`}>
          <div className={color}>
            {icon}
          </div>
        </div>
        <div className="ml-4 flex-1">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-600">{title}</p>
          </div>
          {isLoading ? (
            <div className="h-8 w-16 bg-gray-200 rounded animate-pulse mt-1"></div>
          ) : (
            <p className="text-2xl font-semibold text-gray-900">{value.toLocaleString()}</p>
          )}
          {subtitle && !isLoading && (
            <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
          )}
        </div>
      </div>
    </div>
  )
}

function StatusOverviewCards({ data, isLoading }: StatusOverviewCardsProps) {
  const statusCounts = data?.statusCounts || {}
  
  const totalItems = Object.values(statusCounts).reduce((sum, count) => sum + count, 0)
  const availableItems = statusCounts.AVAILABLE || 0
  const borrowedItems = statusCounts.BORROWED || 0
  const maintenanceItems = statusCounts.MAINTENANCE || 0
  const reservedItems = statusCounts.RESERVED || 0
  const retiredItems = statusCounts.RETIRED || 0

  const utilizationRate = totalItems > 0 ? Math.round((borrowedItems / totalItems) * 100) : 0
  const availabilityRate = totalItems > 0 ? Math.round((availableItems / totalItems) * 100) : 0

  const cards = [
    {
      title: 'Total Items',
      value: totalItems,
      icon: <Package className="h-6 w-6" />,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      subtitle: `${availabilityRate}% available`
    },
    {
      title: 'Available',
      value: availableItems,
      icon: <CheckCircle className="h-6 w-6" />,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      subtitle: 'Ready to borrow'
    },
    {
      title: 'Currently Borrowed',
      value: borrowedItems,
      icon: <Clock className="h-6 w-6" />,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      subtitle: `${utilizationRate}% utilization`
    },
    {
      title: 'In Maintenance',
      value: maintenanceItems,
      icon: <Settings className="h-6 w-6" />,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      subtitle: 'Being serviced'
    }
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">Status Overview</h3>
        {!isLoading && (
          <div className="text-sm text-gray-500">
            Last updated: {new Date().toLocaleTimeString()}
          </div>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {cards.map((card, index) => (
          <StatusCard
            key={index}
            title={card.title}
            value={card.value}
            icon={card.icon}
            color={card.color}
            bgColor={card.bgColor}
            isLoading={isLoading}
            subtitle={card.subtitle}
          />
        ))}
      </div>

      {/* Additional Status Breakdown */}
      {!isLoading && (reservedItems > 0 || retiredItems > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reservedItems > 0 && (
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center">
                <div className="bg-yellow-100 rounded-lg p-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">Reserved Items</p>
                  <p className="text-lg font-semibold text-yellow-600">{reservedItems}</p>
                </div>
              </div>
            </div>
          )}
          
          {retiredItems > 0 && (
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center">
                <div className="bg-gray-100 rounded-lg p-2">
                  <Package className="h-5 w-5 text-gray-600" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">Retired Items</p>
                  <p className="text-lg font-semibold text-gray-600">{retiredItems}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default StatusOverviewCards