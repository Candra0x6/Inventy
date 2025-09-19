'use client'

import { motion } from 'framer-motion'
import { fadeInUp } from '@/lib/animations'
import { 
  Package, 
  CheckCircle,
  AlertTriangle,
  Clock,
  BarChart3
} from 'lucide-react'
import { ItemStatus, ItemCondition } from '@prisma/client'

// Extended types for the statistics interface
interface ExtendedItem {
  id: string
  name: string
  description: string | null
  category: string
  tags: string[]
  condition: ItemCondition
  status: ItemStatus
  location: string | null
  serialNumber: string | null
  qrCode: string | null
  barcode: string | null
  images: string[]
  value: number | null
  createdAt: string
  updatedAt: string
  createdBy: {
    id: string
    name: string | null
    email: string
  }
  _count: {
    reservations: number
  }
}

interface ItemStatisticsCardsProps {
  items: ExtendedItem[]
  className?: string
}

export default function ItemStatisticsCards({ items, className }: ItemStatisticsCardsProps) {
  return (
    <motion.div variants={fadeInUp} className={`space-y-6 ${className || ''}`}>
      {/* Statistics Header */}
      <div className="flex items-center space-x-4">
        <div className="p-2 bg-gradient-to-br from-indigo-500/20 to-indigo-400/10 backdrop-blur-sm rounded-xl border border-indigo-500/20">
          <BarChart3 className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
        </div>
        <div>
          <h3 className="text-lg lg:text-xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Inventory Overview
          </h3>
          <p className="text-muted-foreground text-sm">
            Real-time statistics and status distribution
          </p>
        </div>
      </div>

      {/* Statistics Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Items */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/30 p-4 rounded-xl border border-blue-200/50 dark:border-blue-800/50 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Package className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Total Items</p>
              <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{items.length}</p>
            </div>
          </div>
        </div>

        {/* Available Items */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/50 dark:to-green-900/30 p-4 rounded-xl border border-green-200/50 dark:border-green-800/50 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-green-700 dark:text-green-300">Available</p>
              <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                {items.filter(item => item.status === 'AVAILABLE').length}
              </p>
            </div>
          </div>
        </div>

        {/* Borrowed Items */}
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/50 dark:to-orange-900/30 p-4 rounded-xl border border-orange-200/50 dark:border-orange-800/50 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-orange-500/20 rounded-lg">
              <Clock className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-orange-700 dark:text-orange-300">Borrowed</p>
              <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">
                {items.filter(item => item.status === 'BORROWED').length}
              </p>
            </div>
          </div>
        </div>

        {/* Maintenance Items */}
        <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/50 dark:to-red-900/30 p-4 rounded-xl border border-red-200/50 dark:border-red-800/50 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-red-500/20 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-red-700 dark:text-red-300">Maintenance</p>
              <p className="text-2xl font-bold text-red-900 dark:text-red-100">
                {items.filter(item => item.status === 'MAINTENANCE').length}
              </p>
            </div>
          </div>
        </div>
      </div>

    
    </motion.div>
  )
}

// Named export for convenience
export { ItemStatisticsCards }