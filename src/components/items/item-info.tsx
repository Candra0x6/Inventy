'use client'

import { ItemCondition, ItemStatus } from '@prisma/client'
import { Badge } from '@/components/ui/badge'
import { AnimatedCard } from '@/components/ui/animated-card'
import { AnimatedButton } from '@/components/ui/animated-button'
import { motion } from 'framer-motion'
import { fadeInUp, staggerContainer } from '@/lib/animations'
import Link from 'next/link'
import { 
  Edit3, 
  MapPin, 
  Calendar, 
  DollarSign, 
  Hash, 
  Barcode, 
  Building2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  Package,
  Settings,
  User,
  Tag,
  BarChart3
} from 'lucide-react'

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
      return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
    case 'GOOD':
      return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800'
    case 'FAIR':
      return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800'
    case 'POOR':
      return 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800'
    case 'DAMAGED':
      return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800'
    default:
      return 'bg-muted text-muted-foreground border-muted'
  }
}

function getStatusColor(status: ItemStatus): string {
  switch (status) {
    case 'AVAILABLE':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
    case 'RESERVED':
      return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800'
    case 'BORROWED':
      return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800'
    case 'MAINTENANCE':
      return 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800'
    case 'RETIRED':
      return 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-950 dark:text-slate-300 dark:border-slate-800'
    default:
      return 'bg-muted text-muted-foreground border-muted'
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
    <motion.div 
      className="space-y-8"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      {/* Header Section */}
      <motion.div variants={fadeInUp} className="flex items-start justify-between">
        <div className="space-y-4">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground via-foreground to-muted-foreground bg-clip-text text-transparent">
            {item.name}
          </h1>
          <div className="flex items-center gap-3 flex-wrap">
            <Badge 
              variant="outline"
              className={`${getStatusColor(item.status)} font-medium shadow-sm`}
            >
              <div className="flex items-center gap-2">
                {item.status === 'AVAILABLE' ? (
                  <CheckCircle2 className="h-3 w-3" />
                ) : item.status === 'BORROWED' ? (
                  <Clock className="h-3 w-3" />
                ) : (
                  <AlertTriangle className="h-3 w-3" />
                )}
                {item.status.toLowerCase().replace('_', ' ')}
              </div>
            </Badge>
            <Badge 
              variant="outline"
              className={`${getConditionColor(item.condition)} font-medium shadow-sm`}
            >
              {item.condition.toLowerCase()}
            </Badge>
            <span className="text-sm text-muted-foreground capitalize bg-muted/50 px-3 py-1 rounded-xl">
              {item.category}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <motion.div 
          className="flex gap-3"
          variants={fadeInUp}
        >
          {canReserve && (
            <AnimatedButton>
              Reserve Item
            </AnimatedButton>
          )}
          {canEdit && (
            <AnimatedButton variant="outline" asChild>
              <Link href={`/items/edit/${item.id}`}>
                <Edit3 className="h-4 w-4 mr-2" />
                Edit Item
              </Link>
            </AnimatedButton>
          )}
        </motion.div>
      </motion.div>

      {/* Availability Info */}
      {!item.availability.isAvailable && (
        <motion.div variants={fadeInUp}>
          <AnimatedCard className="p-6 bg-gradient-to-br from-amber-50/80 to-orange-50/80 dark:from-amber-950/50 dark:to-orange-950/50 border-amber-200/50 dark:border-amber-800/50 backdrop-blur-sm shadow-lg">
            <div className="flex items-start gap-4">
              <div className="w-6 h-6 rounded-full bg-gradient-to-r from-amber-400 to-orange-400 flex items-center justify-center shadow-sm mt-0.5">
                <Clock className="h-3 w-3 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-amber-900 dark:text-amber-200 text-lg">Currently Unavailable</h3>
                <p className="text-amber-800 dark:text-amber-300 mt-2 leading-relaxed">
                  {item.availability.activeReservations > 0 && (
                    <>This item is currently borrowed. </>
                  )}
                  {item.availability.nextAvailableDate && (
                    <>Expected to be available on {formatDate(item.availability.nextAvailableDate)}. </>
                  )}
                  {item.availability.pendingReservations > 0 && (
                    <>{item.availability.pendingReservations} pending reservation(s). </>
                  )}
                </p>
              </div>
            </div>
          </AnimatedCard>
        </motion.div>
      )}

      {/* Description */}
      {item.description && (
        <motion.div variants={fadeInUp}>
          <AnimatedCard className="p-8 bg-gradient-to-br from-background to-muted/30 backdrop-blur-sm border border-border/50 shadow-lg">
            <h2 className="text-2xl font-semibold mb-6 flex items-center gap-3">
              <FileText className="h-6 w-6 text-primary" />
              Description
            </h2>
            <p className="text-foreground leading-relaxed whitespace-pre-wrap bg-muted/30 p-6 rounded-xl border border-border/30">
              {item.description}
            </p>
          </AnimatedCard>
        </motion.div>
      )}

      {/* Item Details */}
      <motion.div variants={fadeInUp}>
        <AnimatedCard className="p-8 bg-gradient-to-br from-background to-muted/30 backdrop-blur-sm border border-border/50 shadow-lg">
          <h2 className="text-2xl font-semibold mb-6 flex items-center gap-3">
            <Package className="h-6 w-6 text-primary" />
            Item Details
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Tag className="h-4 w-4" />
                  Category
                </div>
                <p className="text-foreground capitalize font-medium">{item.category}</p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Settings className="h-4 w-4" />
                  Condition
                </div>
                <p className="text-foreground capitalize font-medium">{item.condition.toLowerCase()}</p>
              </div>
             
            
            </div>
            <div className="space-y-6">
           {item.location && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    Location
                  </div>
                  <p className="text-foreground font-medium">{item.location}</p>
                </div>
              )}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  Added
                </div>
                <p className="text-foreground font-medium">{formatDate(item.createdAt)}</p>
              </div>
            </div>
          </div>

          {/* Tags */}
          {item.tags.length > 0 && (
            <div className="mt-8 pt-6 border-t border-border/30">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-4">
                <Tag className="h-4 w-4" />
                Tags
              </div>
              <div className="flex flex-wrap gap-3">
                {item.tags.map((tag, index) => (
                  <Badge key={index} variant="secondary" className="px-3 py-1 text-sm font-medium bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 transition-colors">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </AnimatedCard>
      </motion.div>

      {/* Statistics */}
      <motion.div variants={fadeInUp}>
        <AnimatedCard className="p-8 bg-gradient-to-br from-background to-muted/30 backdrop-blur-sm border border-border/50 shadow-lg">
          <h2 className="text-2xl font-semibold mb-6 flex items-center gap-3">
            <BarChart3 className="h-6 w-6 text-primary" />
            Usage Statistics
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-muted/30 rounded-xl border border-border/30">
              <div className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 dark:from-blue-400 dark:to-blue-600 bg-clip-text text-transparent">
                {item.statistics.totalReservations}
              </div>
              <div className="text-sm text-muted-foreground mt-2 font-medium">Total Reservations</div>
            </div>
            <div className="text-center p-4 bg-muted/30 rounded-xl border border-border/30">
              <div className="text-3xl font-bold bg-gradient-to-r from-green-600 to-green-800 dark:from-green-400 dark:to-green-600 bg-clip-text text-transparent">
                {item.statistics.completedReservations}
              </div>
              <div className="text-sm text-muted-foreground mt-2 font-medium">Completed</div>
            </div>
            <div className="text-center p-4 bg-muted/30 rounded-xl border border-border/30">
              <div className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-purple-800 dark:from-purple-400 dark:to-purple-600 bg-clip-text text-transparent">
                {item.statistics.totalReturns}
              </div>
              <div className="text-sm text-muted-foreground mt-2 font-medium">Returns</div>
            </div>
          </div>
        </AnimatedCard>
      </motion.div>

      {/* Recent Activity */}
      {item.recentActivity.length > 0 && (
        <motion.div variants={fadeInUp}>
          <AnimatedCard className="p-8 bg-gradient-to-br from-background to-muted/30 backdrop-blur-sm border border-border/50 shadow-lg">
            <h2 className="text-2xl font-semibold mb-6 flex items-center gap-3">
              <Clock className="h-6 w-6 text-primary" />
              Recent Activity
            </h2>
            <div className="space-y-4">
              {item.recentActivity.map((activity, index) => (
                <motion.div 
                  key={index} 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-start gap-4 p-4 bg-muted/30 rounded-xl border border-border/30 hover:bg-muted/40 transition-colors"
                >
                  <div className={`w-3 h-3 rounded-full mt-2 ${
                    activity.type === 'reservation' 
                      ? 'bg-gradient-to-r from-blue-400 to-blue-600' 
                      : 'bg-gradient-to-r from-green-400 to-green-600'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-foreground">
                        {activity.user.name || activity.user.email}
                      </p>
                      <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-md">
                        {formatDate(activity.date)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground capitalize mt-1">
                      {activity.details}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </AnimatedCard>
        </motion.div>
      )}

      {/* Creator Info */}
      <motion.div variants={fadeInUp}>
        <AnimatedCard className="p-8 bg-gradient-to-br from-background to-muted/30 backdrop-blur-sm border border-border/50 shadow-lg">
          <h2 className="text-2xl font-semibold mb-6 flex items-center gap-3">
            <User className="h-6 w-6 text-primary" />
            Item Information
          </h2>
          <div className="flex flex-col items-start justify-start">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <User className="h-4 w-4" />
                <span>Added by:</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-medium text-foreground">
                  {item.createdBy.name || item.createdBy.email}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>Last updated: {formatDate(item.updatedAt)}</span>
            </div>
          </div>
        </AnimatedCard>
      </motion.div>
    </motion.div>
  )
}
