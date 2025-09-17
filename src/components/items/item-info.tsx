import { ItemCondition, ItemStatus } from '@prisma/client'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface ItemInfoProps {
  item: {
    id: string
    name: string
    description: string | null
    category: string
    tags: string[]
    condition: ItemCondition
    status: ItemStatus
    location: string | null
    serialNumber: string | null
    barcode: string | null
    qrCode: string | null
    value: number | null
    createdAt: Date
    updatedAt: Date
    department: {
      id: string
      name: string
      description: string | null
    } | null
    createdBy: {
      id: string
      name: string | null
      email: string
      role: string
    }
    availability: {
      isAvailable: boolean
      nextAvailableDate: Date | null
      activeReservations: number
      pendingReservations: number
    }
    statistics: {
      totalReservations: number
      completedReservations: number
      totalReturns: number
      averageRating: number | null
    }
    recentActivity: Array<{
      type: 'reservation' | 'return'
      date: Date
      status: string
      user: {
        id: string
        name: string | null
        email: string
      }
      details: string
    }>
  }
  userRole: string
}

function getConditionColor(condition: ItemCondition): string {
  switch (condition) {
    case 'EXCELLENT':
      return 'bg-green-50 text-green-700 border-green-200'
    case 'GOOD':
      return 'bg-blue-50 text-blue-700 border-blue-200'
    case 'FAIR':
      return 'bg-yellow-50 text-yellow-700 border-yellow-200'
    case 'POOR':
      return 'bg-orange-50 text-orange-700 border-orange-200'
    case 'DAMAGED':
      return 'bg-red-50 text-red-700 border-red-200'
    default:
      return 'bg-gray-50 text-gray-700 border-gray-200'
  }
}

function getStatusColor(status: ItemStatus): string {
  switch (status) {
    case 'AVAILABLE':
      return 'bg-green-100 text-green-800 border-green-200'
    case 'RESERVED':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    case 'BORROWED':
      return 'bg-blue-100 text-blue-800 border-blue-200'
    case 'MAINTENANCE':
      return 'bg-orange-100 text-orange-800 border-orange-200'
    case 'RETIRED':
      return 'bg-gray-100 text-gray-800 border-gray-200'
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

export function ItemInfo({ item, userRole }: ItemInfoProps) {
  const canEdit = ['MANAGER', 'SUPER_ADMIN', 'STAFF'].includes(userRole)
  const canReserve = item.availability.isAvailable && ['BORROWER', 'STAFF'].includes(userRole)

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">{item.name}</h1>
          <div className="flex items-center gap-2">
            <Badge 
              variant="outline"
              className={getStatusColor(item.status)}
            >
              {item.status.toLowerCase().replace('_', ' ')}
            </Badge>
            <Badge 
              variant="outline"
              className={getConditionColor(item.condition)}
            >
              {item.condition.toLowerCase()}
            </Badge>
            <span className="text-sm text-gray-500 capitalize">
              {item.category}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          {canReserve && (
            <Button>
              Reserve Item
            </Button>
          )}
          {canEdit && (
            <Button variant="outline" asChild>
              <Link href={`/items/edit/${item.id}`}>
                Edit Item
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Availability Info */}
      {!item.availability.isAvailable && (
        <Card className="p-4 bg-yellow-50 border-yellow-200">
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-yellow-400 mt-0.5" />
            <div>
              <h3 className="font-medium text-yellow-800">Currently Unavailable</h3>
              <p className="text-sm text-yellow-700 mt-1">
                {item.availability.activeReservations > 0 && (
                  <>This item is currently borrowed. </>
                )}
                {item.availability.nextAvailableDate && (
                  <>Expected to be available on {formatDate(item.availability.nextAvailableDate)}.</>
                )}
                {item.availability.pendingReservations > 0 && (
                  <> {item.availability.pendingReservations} pending reservation(s).</>
                )}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Description */}
      {item.description && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Description</h2>
          <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
            {item.description}
          </p>
        </Card>
      )}

      {/* Item Details */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Item Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div>
              <span className="text-sm font-medium text-gray-500">Category</span>
              <p className="text-gray-900 capitalize">{item.category}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-500">Condition</span>
              <p className="text-gray-900 capitalize">{item.condition.toLowerCase()}</p>
            </div>
            {item.location && (
              <div>
                <span className="text-sm font-medium text-gray-500">Location</span>
                <p className="text-gray-900">{item.location}</p>
              </div>
            )}
            {item.value && (
              <div>
                <span className="text-sm font-medium text-gray-500">Estimated Value</span>
                <p className="text-gray-900">${item.value.toLocaleString()}</p>
              </div>
            )}
          </div>
          <div className="space-y-3">
            {item.serialNumber && (
              <div>
                <span className="text-sm font-medium text-gray-500">Serial Number</span>
                <p className="text-gray-900 font-mono">{item.serialNumber}</p>
              </div>
            )}
            {item.barcode && (
              <div>
                <span className="text-sm font-medium text-gray-500">Barcode</span>
                <p className="text-gray-900 font-mono">{item.barcode}</p>
              </div>
            )}
            {item.department && (
              <div>
                <span className="text-sm font-medium text-gray-500">Department</span>
                <p className="text-gray-900">{item.department.name}</p>
              </div>
            )}
            <div>
              <span className="text-sm font-medium text-gray-500">Added</span>
              <p className="text-gray-900">{formatDate(item.createdAt)}</p>
            </div>
          </div>
        </div>

        {/* Tags */}
        {item.tags.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <span className="text-sm font-medium text-gray-500 block mb-2">Tags</span>
            <div className="flex flex-wrap gap-2">
              {item.tags.map((tag, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Statistics */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Usage Statistics</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {item.statistics.totalReservations}
            </div>
            <div className="text-sm text-gray-500">Total Reservations</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {item.statistics.completedReservations}
            </div>
            <div className="text-sm text-gray-500">Completed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {item.statistics.totalReturns}
            </div>
            <div className="text-sm text-gray-500">Returns</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {item.statistics.averageRating ? item.statistics.averageRating.toFixed(1) : 'N/A'}
            </div>
            <div className="text-sm text-gray-500">Avg Rating</div>
          </div>
        </div>
      </Card>

      {/* Recent Activity */}
      {item.recentActivity.length > 0 && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
          <div className="space-y-3">
            {item.recentActivity.map((activity, index) => (
              <div key={index} className="flex items-start gap-3 pb-3 border-b border-gray-100 last:border-0">
                <div className={`w-2 h-2 rounded-full mt-2 ${
                  activity.type === 'reservation' ? 'bg-blue-400' : 'bg-green-400'
                }`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900">
                      {activity.user.name || activity.user.email}
                    </p>
                    <span className="text-xs text-gray-500">
                      {formatDate(activity.date)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 capitalize">
                    {activity.details}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Creator Info */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Item Information</h2>
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div>
            <span>Added by: </span>
            <span className="font-medium">
              {item.createdBy.name || item.createdBy.email}
            </span>
            <span className="ml-2 px-2 py-1 bg-gray-100 rounded text-xs">
              {item.createdBy.role.toLowerCase().replace('_', ' ')}
            </span>
          </div>
          <div>
            Last updated: {formatDate(item.updatedAt)}
          </div>
        </div>
      </Card>
    </div>
  )
}
