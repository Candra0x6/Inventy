import { Package, Search, Plus, BarChart3, Settings, Users } from 'lucide-react'
import Link from 'next/link'

interface QuickActionsProps {
  userRole?: string
  totalItems: number
  availableItems: number
}

function QuickActions({ userRole, totalItems, availableItems }: QuickActionsProps) {
  const canManageItems = ['MANAGER', 'SUPER_ADMIN', 'STAFF'].includes(userRole || '')
  
  const actions = [
    {
      name: 'Browse Items',
      href: '/items',
      icon: <Search className="h-5 w-5" />,
      description: 'Search and filter inventory',
      color: 'bg-blue-500 hover:bg-blue-600',
      show: true
    },
    {
      name: 'Add Item',
      href: '/items/add',
      icon: <Plus className="h-5 w-5" />,
      description: 'Add new item to inventory',
      color: 'bg-green-500 hover:bg-green-600',
      show: canManageItems
    },
    {
      name: 'Scan Barcode',
      href: '/items/scan',
      icon: <BarChart3 className="h-5 w-5" />,
      description: 'Quick item lookup',
      color: 'bg-purple-500 hover:bg-purple-600',
      show: true
    },
    {
      name: 'Manage Users',
      href: '/admin/users',
      icon: <Users className="h-5 w-5" />,
      description: 'User management',
      color: 'bg-orange-500 hover:bg-orange-600',
      show: userRole === 'SUPER_ADMIN'
    }
  ]

  const visibleActions = actions.filter(action => action.show)

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Quick Actions</h3>
          <Package className="h-5 w-5 text-gray-400" />
        </div>

        <div className="space-y-3">
          {visibleActions.map((action) => (
            <Link
              key={action.name}
              href={action.href}
              className={`block w-full text-left p-3 rounded-lg text-white transition-colors ${action.color}`}
            >
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  {action.icon}
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium">{action.name}</p>
                  <p className="text-xs opacity-90">{action.description}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Status Summary */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Inventory Summary</h4>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Total Items:</span>
              <span className="font-medium text-gray-900">{totalItems.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Available:</span>
              <span className="font-medium text-green-600">{availableItems.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Availability Rate:</span>
              <span className="font-medium text-blue-600">
                {totalItems > 0 ? Math.round((availableItems / totalItems) * 100) : 0}%
              </span>
            </div>
          </div>
        </div>

        {/* Role-specific information */}
        {canManageItems && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Management Tools</h4>
            <div className="grid grid-cols-2 gap-2">
              <Link
                href="/items?status=MAINTENANCE"
                className="text-xs text-center py-2 px-3 bg-purple-50 text-purple-700 rounded hover:bg-purple-100 transition-colors"
              >
                Maintenance Queue
              </Link>
              <Link
                href="/items?overdue=true"
                className="text-xs text-center py-2 px-3 bg-red-50 text-red-700 rounded hover:bg-red-100 transition-colors"
              >
                Overdue Items
              </Link>
            </div>
          </div>
        )}

        {/* Quick Settings */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <Link
            href="/profile"
            className="flex items-center text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            <Settings className="h-4 w-4 mr-2" />
            Profile Settings
          </Link>
        </div>
      </div>
    </div>
  )
}

export default QuickActions