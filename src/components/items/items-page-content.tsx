'use client'

import { motion } from 'framer-motion'
import { AnimatedCard } from '@/components/ui/animated-card'
import { AnimatedButton } from '@/components/ui/animated-button'
import { fadeInUp, staggerContainer, pageTransition } from '@/lib/animations'
import { Plus, Package, TrendingUp } from 'lucide-react'
import Link from 'next/link'

interface ItemsPageContentProps {
  children: React.ReactNode
}

export function ItemsPageContent({ children }: ItemsPageContentProps) {
  return (
    <motion.div
      variants={pageTransition}
      initial="initial"
      animate="animate"
      exit="exit"
      className="container mx-auto px-4 py-8"
    >
      {children}
    </motion.div>
  )
}

interface ItemsHeaderProps {
  totalCount: number
}

export function ItemsHeader({ totalCount }: ItemsHeaderProps) {
  return (
    <motion.div 
      className="mb-8"
      variants={fadeInUp}
      initial="initial"
      animate="animate"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent mb-2">
            Items Catalog
          </h1>
          <p className="text-muted-foreground text-lg">
            Browse and manage your organization&apos;s inventory
          </p>
        </div>
        <AnimatedCard className="p-4 bg-gradient-to-r from-primary/10 to-blue-600/10 border-primary/20">
          <div className="flex items-center space-x-3">
            <Package className="w-8 h-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">{totalCount}</p>
              <p className="text-sm text-muted-foreground">Total Items</p>
            </div>
          </div>
        </AnimatedCard>
      </div>
    </motion.div>
  )
}

interface ItemsGridProps {
  children: React.ReactNode
}

export function ItemsGrid({ children }: ItemsGridProps) {
  return (
    <motion.div
      className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      {children}
    </motion.div>
  )
}

interface ItemsResultsHeaderProps {
  totalCount: number
}

export function ItemsResultsHeader({ totalCount }: ItemsResultsHeaderProps) {
  return (
    <motion.div 
      className="flex items-center justify-between mb-6"
      variants={fadeInUp}
      initial="initial"
      animate="animate"
    >
      <div className="flex items-center space-x-3">
        <TrendingUp className="w-5 h-5 text-primary" />
        <h2 className="text-2xl font-semibold">
          {totalCount} {totalCount === 1 ? 'Item' : 'Items'}
        </h2>
      </div>
      
      <AnimatedButton size="lg">
        <Plus className="w-4 h-4 mr-2" />
        <Link href="/items/add">Add Item</Link>
      </AnimatedButton>
    </motion.div>
  )
}

interface EmptyStateProps {
  hasFilters: boolean
}

export function EmptyState({ hasFilters }: EmptyStateProps) {
  return (
    <motion.div
      className="text-center py-16"
      variants={fadeInUp}
      initial="initial"
      animate="animate"
    >
      <AnimatedCard className="max-w-md mx-auto p-8 text-center">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
          <Package className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-xl font-semibold mb-2">No items found</h3>
        <p className="text-muted-foreground mb-6">
          {hasFilters 
            ? 'Try adjusting your search criteria or filters'
            : 'Get started by adding your first item'
          }
        </p>
        <AnimatedButton size="lg">
          <Plus className="w-4 h-4 mr-2" />
          <Link href="/items/add">
            {hasFilters ? 'Add Item' : 'Add First Item'}
          </Link>
        </AnimatedButton>
      </AnimatedCard>
    </motion.div>
  )
}