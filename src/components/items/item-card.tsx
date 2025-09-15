import { ItemCondition, ItemStatus } from '@prisma/client'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import Link from 'next/link'
import Image from 'next/image'

interface ItemCardProps {
  item: {
    id: string
    name: string
    description: string | null
    category: string
    tags: string[]
    condition: ItemCondition
    status: ItemStatus
    location: string | null
    images: string[]
    value: number | null
    department: {
      id: string
      name: string
    } | null
    createdBy: {
      id: string
      name: string | null
      email: string
    }
    _count: {
      reservations: number
    }
    createdAt: Date
    updatedAt: Date
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

export function ItemCard({ item }: ItemCardProps) {
  const primaryImage = item.images[0] || '/placeholder-item.png'

  return (
    <Card className="group hover:shadow-lg transition-shadow duration-200 overflow-hidden">
      <Link href={`/items/${item.id}`} className="block">
        {/* Image Section */}
        <div className="relative h-48 w-full overflow-hidden bg-gray-100">
          <Image
            src={primaryImage}
            alt={item.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-200"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
          
          {/* Status Badge Overlay */}
          <div className="absolute top-3 right-3">
            <Badge 
              variant="secondary"
              className={`${getStatusColor(item.status)} text-xs font-medium`}
            >
              {item.status.toLowerCase().replace('_', ' ')}
            </Badge>
          </div>

          {/* Active Reservations Badge */}
          {item._count.reservations > 0 && (
            <div className="absolute top-3 left-3">
              <Badge 
                variant="secondary"
                className="bg-blue-100 text-blue-800 border-blue-200 text-xs"
              >
                {item._count.reservations} reserved
              </Badge>
            </div>
          )}
        </div>

        {/* Content Section */}
        <div className="p-4 space-y-3">
          {/* Title and Category */}
          <div>
            <h3 className="font-semibold text-gray-900 line-clamp-1 group-hover:text-blue-600 transition-colors">
              {item.name}
            </h3>
            <p className="text-sm text-gray-500 capitalize">
              {item.category}
            </p>
          </div>

          {/* Description */}
          {item.description && (
            <p className="text-sm text-gray-600 line-clamp-2">
              {item.description}
            </p>
          )}

          {/* Condition and Location */}
          <div className="flex items-center justify-between">
            <Badge 
              variant="outline"
              className={`${getConditionColor(item.condition)} text-xs`}
            >
              {item.condition.toLowerCase()}
            </Badge>
            
            {item.location && (
              <span className="text-xs text-gray-500 truncate ml-2">
                📍 {item.location}
              </span>
            )}
          </div>

          {/* Tags */}
          {item.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {item.tags.slice(0, 3).map((tag, index) => (
                <Badge 
                  key={index}
                  variant="secondary" 
                  className="text-xs bg-gray-100 text-gray-700"
                >
                  {tag}
                </Badge>
              ))}
              {item.tags.length > 3 && (
                <Badge 
                  variant="secondary" 
                  className="text-xs bg-gray-100 text-gray-500"
                >
                  +{item.tags.length - 3}
                </Badge>
              )}
            </div>
          )}

          {/* Department and Value */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            {item.department && (
              <span className="text-xs text-gray-500">
                {item.department.name}
              </span>
            )}
            
            {item.value && (
              <span className="text-xs font-medium text-gray-700">
                ${item.value.toLocaleString()}
              </span>
            )}
          </div>
        </div>
      </Link>
    </Card>
  )
}
