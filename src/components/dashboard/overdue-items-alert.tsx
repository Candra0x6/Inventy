import { AlertTriangle, Clock, User, X } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

interface OverdueItem {
  id: string
  name: string
  status: string
  borrower: {
    id: string
    name: string | null
    email: string
  }
  dueDate: string
  daysOverdue: number
}

interface OverdueItemsAlertProps {
  count: number
  items: OverdueItem[]
}

function OverdueItemsAlert({ count, items }: OverdueItemsAlertProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)

  if (isDismissed || count === 0) {
    return null
  }

  const criticalOverdue = items.filter(item => item.daysOverdue > 7).length
  const severityLevel = criticalOverdue > 0 ? 'critical' : count > 5 ? 'high' : 'medium'
  
  const alertStyles = {
    critical: 'bg-red-50 border-red-200 text-red-800',
    high: 'bg-orange-50 border-orange-200 text-orange-800',
    medium: 'bg-yellow-50 border-yellow-200 text-yellow-800'
  }

  const iconStyles = {
    critical: 'text-red-500',
    high: 'text-orange-500',
    medium: 'text-yellow-500'
  }

  return (
    <div className={`border rounded-lg p-4 ${alertStyles[severityLevel]}`}>
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <AlertTriangle className={`h-5 w-5 ${iconStyles[severityLevel]}`} />
        </div>
        
        <div className="ml-3 flex-1">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">
              {count} {count === 1 ? 'Item' : 'Items'} Overdue
              {criticalOverdue > 0 && (
                <span className="ml-2 text-xs font-normal">
                  ({criticalOverdue} critical)
                </span>
              )}
            </h3>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-xs underline hover:no-underline"
              >
                {isExpanded ? 'Hide details' : 'Show details'}
              </button>
              <button
                onClick={() => setIsDismissed(true)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          
          <div className="mt-1 text-sm">
            <p>
              These items are past their return date and need immediate attention.
              {criticalOverdue > 0 && (
                <span className="font-medium"> {criticalOverdue} items are over a week overdue.</span>
              )}
            </p>
          </div>

          {isExpanded && (
            <div className="mt-4 space-y-3">
              {items.slice(0, 10).map((item) => (
                <div key={item.id} className="bg-white bg-opacity-60 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <Link 
                          href={`/items/${item.id}`}
                          className="font-medium text-gray-900 hover:text-blue-600"
                        >
                          {item.name}
                        </Link>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          item.daysOverdue > 7 
                            ? 'bg-red-100 text-red-800' 
                            : item.daysOverdue > 3 
                            ? 'bg-orange-100 text-orange-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {item.daysOverdue} {item.daysOverdue === 1 ? 'day' : 'days'} overdue
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-4 mt-1 text-xs text-gray-600">
                        <div className="flex items-center">
                          <User className="h-3 w-3 mr-1" />
                          <span>{item.borrower.name || item.borrower.email}</span>
                        </div>
                        <div className="flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          <span>Due: {new Date(item.dueDate).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex-shrink-0 ml-4">
                      <Link
                        href={`/items/${item.id}`}
                        className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-white bg-blue-600 hover:bg-blue-700"
                      >
                        Manage
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
              
              {items.length > 10 && (
                <div className="text-center pt-2">
                  <Link 
                    href="/items?overdue=true"
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    View all {items.length} overdue items
                  </Link>
                </div>
              )}
            </div>
          )}

          <div className="mt-3 flex items-center space-x-4">
            <Link 
              href="/items?overdue=true"
              className="inline-flex items-center px-3 py-2 border border-transparent text-xs font-medium rounded text-white bg-blue-600 hover:bg-blue-700"
            >
              View All Overdue
            </Link>
            <Link 
              href="/items?status=BORROWED"
              className="text-xs text-blue-600 hover:text-blue-800 underline"
            >
              View all borrowed items
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default OverdueItemsAlert