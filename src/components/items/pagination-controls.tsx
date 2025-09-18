'use client'

import { motion } from 'framer-motion'
import { AnimatedButton } from '@/components/ui/animated-button'
import { fadeInUp } from '@/lib/animations'
import Link from 'next/link'

interface SearchParams {
  search?: string
  category?: string
  status?: string
  condition?: string
  tags?: string
  departmentId?: string
  page?: string
  limit?: string
  sortBy?: string
  sortOrder?: string
}

interface PaginationControlsProps {
  pagination: {
    page: number
    totalPages: number
    hasNextPage: boolean
    hasPrevPage: boolean
    totalCount: number
    limit: number
  }
  currentParams: SearchParams
}

export function PaginationControls({ pagination, currentParams }: PaginationControlsProps) {
  const createPageUrl = (page: number) => {
    const params = new URLSearchParams()
    Object.entries(currentParams).forEach(([key, value]) => {
      if (value && key !== 'page') {
        params.set(key, value)
      }
    })
    params.set('page', page.toString())
    return `/items?${params.toString()}`
  }

  const startItem = (pagination.page - 1) * pagination.limit + 1
  const endItem = Math.min(pagination.page * pagination.limit, pagination.totalCount)

  return (
    <motion.div 
      className="flex items-center justify-between mt-8"
      variants={fadeInUp}
      initial="initial"
      animate="animate"
    >
      <div className="text-sm text-muted-foreground">
        Showing {startItem} to {endItem} of {pagination.totalCount} items
      </div>
      
      <div className="flex gap-2 items-center">
        {pagination.hasPrevPage && (
          <Link href={createPageUrl(pagination.page - 1)}>
            <AnimatedButton variant="outline" size="sm">
              Previous
            </AnimatedButton>
          </Link>
        )}
        
        <div className="flex items-center px-4 py-2 text-sm bg-muted rounded-xl border">
          Page {pagination.page} of {pagination.totalPages}
        </div>
        
        {pagination.hasNextPage && (
          <Link href={createPageUrl(pagination.page + 1)}>
            <AnimatedButton variant="outline" size="sm">
              Next
            </AnimatedButton>
          </Link>
        )}
      </div>
    </motion.div>
  )
}