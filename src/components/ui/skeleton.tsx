'use client'

import { motion } from 'framer-motion'
import { staggerContainer, fadeInUp } from '@/lib/animations'

interface SkeletonProps {
  className?: string
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <motion.div
      className={`bg-muted/50 rounded-xl animate-pulse ${className}`}
      initial={{ opacity: 0.3 }}
      animate={{ opacity: [0.3, 0.6, 0.3] }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: "easeInOut"
      }}
    />
  )
}

export function ItemCardSkeleton() {
  return (
    <motion.div
      variants={fadeInUp}
      className="bg-background/80 backdrop-blur-sm border border-border/50 rounded-3xl shadow-soft-shadow dark:shadow-dark-shadow overflow-hidden"
    >
      {/* Image skeleton */}
      <Skeleton className="h-48 w-full rounded-t-3xl rounded-b-none" />
      
      <div className="p-6 space-y-4">
        {/* Title and category */}
        <div className="space-y-2">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        
        {/* Description */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
        
        {/* Condition and location */}
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-4 w-24" />
        </div>
        
        {/* Tags */}
        <div className="flex gap-2">
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-6 w-14" />
        </div>
        
        {/* Value */}
        <div className="flex justify-end pt-4 border-t border-border/30">
          <Skeleton className="h-5 w-16" />
        </div>
      </div>
    </motion.div>
  )
}

export function ItemsGridSkeleton() {
  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
    >
      {Array.from({ length: 8 }).map((_, index) => (
        <ItemCardSkeleton key={index} />
      ))}
    </motion.div>
  )
}

export function SearchFiltersSkeleton() {
  return (
    <motion.div
      variants={fadeInUp}
      className="bg-background/80 backdrop-blur-sm border border-border/50 rounded-3xl shadow-soft-shadow dark:shadow-dark-shadow p-6 space-y-6"
    >
      {/* Search bar */}
      <div className="flex gap-2">
        <Skeleton className="h-12 flex-1" />
        <Skeleton className="h-12 w-20" />
        <Skeleton className="h-12 w-16" />
      </div>
      
      {/* Sort controls */}
      <div className="flex gap-4 items-center bg-muted/30 p-4 rounded-2xl">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-10 w-48" />
      </div>
      
      {/* Filter categories */}
      <div className="space-y-4">
        {/* Category filters */}
        <div>
          <Skeleton className="h-5 w-20 mb-2" />
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-8 w-20" />
            ))}
          </div>
        </div>
        
        {/* Status filters */}
        <div>
          <Skeleton className="h-5 w-16 mb-2" />
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-8 w-24" />
            ))}
          </div>
        </div>
        
        {/* Condition filters */}
        <div>
          <Skeleton className="h-5 w-20 mb-2" />
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-8 w-20" />
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export function DashboardCardSkeleton() {
  return (
    <motion.div
      variants={fadeInUp}
      className="bg-background/80 backdrop-blur-sm border border-border/50 rounded-3xl shadow-soft-shadow dark:shadow-dark-shadow p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
      <Skeleton className="h-8 w-20 mb-2" />
      <Skeleton className="h-4 w-40" />
    </motion.div>
  )
}

export function TableRowSkeleton() {
  return (
    <motion.tr
      variants={fadeInUp}
      className="border-b border-border/50"
    >
      <td className="p-4"><Skeleton className="h-4 w-32" /></td>
      <td className="p-4"><Skeleton className="h-4 w-24" /></td>
      <td className="p-4"><Skeleton className="h-6 w-20" /></td>
      <td className="p-4"><Skeleton className="h-4 w-28" /></td>
      <td className="p-4"><Skeleton className="h-4 w-20" /></td>
      <td className="p-4">
        <div className="flex gap-2">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-8" />
        </div>
      </td>
    </motion.tr>
  )
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="bg-background/80 backdrop-blur-sm border border-border/50 rounded-3xl shadow-soft-shadow dark:shadow-dark-shadow overflow-hidden"
    >
      <div className="p-6 border-b border-border/50">
        <Skeleton className="h-6 w-48" />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-border/50">
            <tr>
              {Array.from({ length: 6 }).map((_, index) => (
                <th key={index} className="p-4 text-left">
                  <Skeleton className="h-4 w-20" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, index) => (
              <TableRowSkeleton key={index} />
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  )
}

export function FormSkeleton() {
  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="bg-background/80 backdrop-blur-sm border border-border/50 rounded-3xl shadow-soft-shadow dark:shadow-dark-shadow p-6 space-y-6"
    >
      <div className="space-y-4">
        {/* Form fields */}
        {Array.from({ length: 4 }).map((_, index) => (
          <motion.div key={index} variants={fadeInUp} className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-12 w-full" />
          </motion.div>
        ))}
      </div>
      
      {/* Action buttons */}
      <motion.div variants={fadeInUp} className="flex gap-4 pt-4">
        <Skeleton className="h-12 w-24" />
        <Skeleton className="h-12 w-20" />
      </motion.div>
    </motion.div>
  )
}