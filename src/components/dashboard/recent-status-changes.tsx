import { Clock, User, ArrowRight } from 'lucide-react'
import Link from 'next/link'

interface StatusChange {
  id: string
  action: string
  entityId: string
  changes: {
    field: string
    from: string
    to: string
    reason?: string
  }
  user: {
    id: string
    name: string | null
    email: string
    role: string
  } | null
  createdAt: string
}

interface RecentStatusChangesProps {
  changes: StatusChange[]
  isLoading: boolean
}

function getStatusColor(status: string) {
  const colors = {
    AVAILABLE: 'text-green-600 bg-green-100',
    BORROWED: 'text-orange-600 bg-orange-100',
    RESERVED: 'text-yellow-600 bg-yellow-100',
    MAINTENANCE: 'text-purple-600 bg-purple-100',
    RETIRED: 'text-gray-600 bg-gray-100'
  }
  return colors[status as keyof typeof colors] || 'text-gray-600 bg-gray-100'
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
      {status}
    </span>
  )
}

function RecentStatusChanges({ changes, isLoading }: RecentStatusChangesProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center">
            <Clock className="h-5 w-5 text-gray-400 mr-2" />
            <div className="h-6 w-48 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-3">
                <div className="h-8 w-8 bg-gray-200 rounded-full animate-pulse"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-3 w-1/2 bg-gray-200 rounded animate-pulse"></div>
                </div>
                <div className="h-6 w-16 bg-gray-200 rounded animate-pulse"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Clock className="h-5 w-5 text-gray-400 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Recent Status Changes</h3>
          </div>
          <Link 
            href="/items" 
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            View all items
          </Link>
        </div>
      </div>
      
      <div className="p-6">
        {changes.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No recent status changes</p>
          </div>
        ) : (
          <div className="space-y-4">
            {changes.slice(0, 10).map((change) => (
              <div key={change.id} className="flex items-start space-x-3 group">
                {/* User Avatar */}
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <User className="h-4 w-4 text-blue-600" />
                  </div>
                </div>
                
                {/* Change Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <StatusBadge status={change.changes.from} />
                    <ArrowRight className="h-3 w-3 text-gray-400" />
                    <StatusBadge status={change.changes.to} />
                  </div>
                  
                  <p className="text-sm text-gray-900 group-hover:text-blue-600 transition-colors">
                    <Link href={`/items/${change.entityId}`} className="font-medium">
                      Item #{change.entityId.slice(-8)}
                    </Link>
                    {' '}status changed by{' '}
                    <span className="font-medium">
                      {change.user?.name || change.user?.email || 'System'}
                    </span>
                  </p>
                  
                  {change.changes.reason && (
                    <p className="text-xs text-gray-500 mt-1 italic">
                      &quot;{change.changes.reason}&quot;
                    </p>
                  )}
                  
                  <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                    <span>{new Date(change.createdAt).toLocaleDateString()}</span>
                    <span>{new Date(change.createdAt).toLocaleTimeString()}</span>
                    {change.user?.role && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                        {change.user.role}
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Action Type */}
                <div className="flex-shrink-0">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    change.action.includes('BULK') 
                      ? 'bg-purple-100 text-purple-800' 
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {change.action.includes('BULK') ? 'Bulk' : 'Single'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {changes.length > 10 && (
          <div className="mt-4 pt-4 border-t border-gray-200 text-center">
            <Link 
              href="/items" 
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              View {changes.length - 10} more changes
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

export default RecentStatusChanges