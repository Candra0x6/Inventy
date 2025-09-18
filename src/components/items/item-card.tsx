'use client'

import { ItemCondition, ItemStatus } from '@prisma/client'
import { Badge } from '@/components/ui/badge'
import { AnimatedCard } from '@/components/ui/animated-card'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { fadeInUp } from '@/lib/animations'

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

export function ItemCard({ item }: ItemCardProps) {
  const primaryImage = item.images[0] || '/placeholder-item.png'
  console.log(item)
  return (
    <motion.div
      variants={fadeInUp}
      whileHover={{ y: -8 }}
      className="h-full"
    >
      <AnimatedCard className="group overflow-hidden bg-background/80 backdrop-blur-sm border-border/50 shadow-soft-shadow dark:shadow-dark-shadow h-full flex flex-col p-0">
        <Link href={`/items/${item.id}`} className="h-full flex flex-col">
          {/* Image Section */}
          <div className="relative h-48 w-full overflow-hidden bg-muted/30">
            <Image
              
              src={primaryImage}
              alt={item.name}
              fill
              className="object-cover "
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
            
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
            
            {/* Status Badge Overlay */}
            <motion.div 
              className="absolute top-3 right-3"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.3 }}
            >
              <Badge 
                variant="secondary"
                className={`${getStatusColor(item.status)} text-xs font-medium shadow-sm backdrop-blur-sm`}
              >
                {item.status.toLowerCase().replace('_', ' ')}
              </Badge>
            </motion.div>

            {/* Active Reservations Badge */}
            {item._count.reservations > 0 && (
              <motion.div 
                className="absolute top-3 left-3"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3, duration: 0.3 }}
              >
                <Badge 
                  variant="secondary"
                  className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800 text-xs shadow-sm backdrop-blur-sm"
                >
                  {item._count.reservations} reserved
                </Badge>
              </motion.div>
            )}
          </div>

          {/* Content Section */}
          <div className="p-4 space-y-4 flex-1 flex flex-col">
            {/* Title and Category */}
            <div className="space-y-1">
              <h3 className="font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors duration-300">
                {item.name}
              </h3>
              <p className="text-sm text-muted-foreground capitalize">
                {item.category}
              </p>
            </div>

            {/* Description */}
            {item.description && (
              <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                {item.description}
              </p>
            )}

            {/* Condition and Location */}
            <div className="flex items-center justify-between">
              <Badge 
                variant="outline"
                className={`${getConditionColor(item.condition)} text-xs font-medium`}
              >
                {item.condition.toLowerCase()}
              </Badge>
              
              {item.location && (
                <span className="text-xs text-muted-foreground truncate ml-2 flex items-center gap-1">
                  <span className="opacity-60">📍</span>
                  {item.location}
                </span>
              )}
            </div>

            {/* Tags */}
            {item.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {item.tags.slice(0, 3).map((tag, index) => (
                  <Badge 
                    key={index}
                    variant="secondary" 
                    className="text-xs bg-muted/50 text-muted-foreground hover:bg-muted transition-colors"
                  >
                    {tag}
                  </Badge>
                ))}
                {item.tags.length > 3 && (
                  <Badge 
                    variant="secondary" 
                    className="text-xs bg-muted/30 text-muted-foreground/70"
                  >
                    +{item.tags.length - 3}
                  </Badge>
                )}
              </div>
            )}

          </div>
        </Link>
      </AnimatedCard>
    </motion.div>
  )
}
