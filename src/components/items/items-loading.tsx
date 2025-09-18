'use client'

import { motion } from 'framer-motion'
import { staggerContainer } from '@/lib/animations'
import { ItemsGridSkeleton, SearchFiltersSkeleton } from '@/components/ui/skeleton'

export function ItemsLoadingState() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-8">
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="max-w-7xl mx-auto space-y-8"
      >
        {/* Header skeleton */}
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <div className="h-8 w-32 bg-muted/50 rounded-xl animate-pulse" />
            <div className="h-5 w-48 bg-muted/30 rounded-xl animate-pulse" />
          </div>
          <div className="h-12 w-32 bg-primary/20 rounded-2xl animate-pulse" />
        </div>

        {/* Search and filters loading */}
        <SearchFiltersSkeleton />

        {/* Items grid loading */}
        <ItemsGridSkeleton />

        {/* Pagination loading */}
        <div className="flex justify-center items-center gap-2 pt-8">
          <div className="h-10 w-20 bg-muted/50 rounded-xl animate-pulse" />
          <div className="h-10 w-10 bg-muted/50 rounded-xl animate-pulse" />
          <div className="h-10 w-10 bg-muted/50 rounded-xl animate-pulse" />
          <div className="h-10 w-10 bg-muted/50 rounded-xl animate-pulse" />
          <div className="h-10 w-20 bg-muted/50 rounded-xl animate-pulse" />
        </div>
      </motion.div>
    </div>
  )
}