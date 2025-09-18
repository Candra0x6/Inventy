import { Suspense } from 'react'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { ItemSearch } from '@/components/items/item-search'
import { ItemCard } from '@/components/items/item-card'
import { AnimatedButton } from '@/components/ui/animated-button'
import Link from 'next/link'
import { ItemCondition, ItemStatus } from '@prisma/client'

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

interface ItemData {
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

interface ItemsPageProps {
  searchParams: Promise<SearchParams>
}

async function fetchItems(searchParams: SearchParams) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    redirect('/auth/login')
  }

  // Extract query parameters
  const search = searchParams.search || ''
  const category = searchParams.category || ''
  const status = searchParams.status as ItemStatus | ''
  const condition = searchParams.condition as ItemCondition | ''
  const tags = searchParams.tags?.split(',').filter(Boolean) || []
  const page = parseInt(searchParams.page || '1')
  const limit = parseInt(searchParams.limit || '12')
  const sortBy = searchParams.sortBy || 'createdAt'
  const sortOrder = searchParams.sortOrder || 'desc'

  // Build where clause
  const where: {
    OR?: Array<{
      name?: { contains: string; mode: 'insensitive' }
      description?: { contains: string; mode: 'insensitive' }
      serialNumber?: { contains: string; mode: 'insensitive' }
    }>
    category?: string
    status?: ItemStatus
    condition?: ItemCondition
    tags?: { hasSome: string[] }
  } = {}

  // Search filter
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { serialNumber: { contains: search, mode: 'insensitive' } },
    ]
  }

  // Category filter
  if (category) {
    where.category = category
  }

  // Status filter
  if (status) {
    where.status = status
  }

  // Condition filter
  if (condition) {
    where.condition = condition
  }

  // Tags filter
  if (tags.length > 0) {
    where.tags = {
      hasSome: tags
    }
  }

  // Calculate pagination
  const skip = (page - 1) * limit

  // Build orderBy clause
  const orderBy: {
    name?: 'asc' | 'desc'
    category?: 'asc' | 'desc'
    createdAt?: 'asc' | 'desc'
    updatedAt?: 'asc' | 'desc'
  } = {}
  if (sortBy === 'name' || sortBy === 'category' || sortBy === 'createdAt' || sortBy === 'updatedAt') {
    orderBy[sortBy] = sortOrder as 'asc' | 'desc'
  } else {
    orderBy.createdAt = 'desc'
  }

  // Execute queries
  const [items, totalCount] = await Promise.all([
    prisma.item.findMany({
      where,
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
        _count: {
          select: {
            reservations: {
              where: {
                status: 'ACTIVE'
              }
            }
          }
        }
      },
      orderBy,
      skip,
      take: limit,
    }),
    prisma.item.count({ where })
  ])

  // Calculate pagination info
  const totalPages = Math.ceil(totalCount / limit)
  const hasNextPage = page < totalPages
  const hasPrevPage = page > 1

  // Get unique categories and tags for filter options
  const [categories, allTags] = await Promise.all([
    prisma.item.groupBy({
      by: ['category'],
      _count: {
        category: true
      }
    }),
    prisma.item.findMany({
      select: {
        tags: true
      }
    })
  ])

  // Process tags to get unique values with counts
  const tagCounts: Record<string, number> = {}
  allTags.forEach(item => {
    item.tags.forEach(tag => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1
    })
  })

  const uniqueTags = Object.entries(tagCounts).map(([tag, count]) => ({
    tag,
    count
  }))

  return {
    items,
    pagination: {
      page,
      limit,
      totalCount,
      totalPages,
      hasNextPage,
      hasPrevPage,
    },
    filters: {
      categories: categories.map(c => ({
        category: c.category,
        count: c._count.category
      })),
      tags: uniqueTags,
      statuses: Object.values(ItemStatus),
      conditions: Object.values(ItemCondition),
    }
  }
}

function ItemsGridSkeleton() {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {[...Array(12)].map((_, i) => (
        <div 
          key={i} 
          className="h-80 bg-muted rounded-xl animate-pulse card-shadow"
        />
      ))}
    </div>
  )
}

function SimplePaginationControls({ pagination, currentParams }: {
  pagination: {
    page: number
    totalPages: number
    hasNextPage: boolean
    hasPrevPage: boolean
    totalCount: number
    limit: number
  }
  currentParams: SearchParams
}) {
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
    <div className="flex items-center justify-between mt-8">
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
    </div>
  )
}

async function ItemsContent({ searchParams }: { searchParams: SearchParams }) {
  const data = await fetchItems(searchParams)
  const { items, pagination, filters } = data

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <ItemSearch 
        categories={filters.categories}
        tags={filters.tags}
        totalCount={pagination.totalCount}
      />

      {/* Results Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          {pagination.totalCount} {pagination.totalCount === 1 ? 'Item' : 'Items'}
        </h2>
        
   
      </div>

      {/* Items Grid */}
      {items.length > 0 ? (
        <>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((item: ItemData) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <SimplePaginationControls 
              pagination={pagination} 
              currentParams={searchParams}
            />
          )}
        </>
      ) : (
        <div className="text-center py-12">
          <div className="text-muted-foreground text-lg mb-4">
            No items found
          </div>
          <p className="text-muted-foreground mb-6">
            {Object.keys(searchParams).length > 0 
              ? 'Try adjusting your search criteria or filters'
              : 'Get started by adding your first item'
            }
          </p>
          <Link href="/items/add">
            <AnimatedButton>
              Add First Item
            </AnimatedButton>
          </Link>
        </div>
      )}
    </div>
  )
}

export default async function ItemsPage({ searchParams }: ItemsPageProps) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    redirect('/auth/login')
  }

  const resolvedParams = await searchParams

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 max-w-5xl mx-auto">
      <div className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent mb-2">
                Items Catalog
              </h1>
              <p className="text-muted-foreground text-lg">
                Browse and manage your organization&apos;s inventory
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <Suspense fallback={<ItemsGridSkeleton />}>
          <ItemsContent searchParams={resolvedParams} />
        </Suspense>
      </div>
    </div>
  )
}
