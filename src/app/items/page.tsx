import { Suspense } from 'react'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { ItemSearch } from '@/components/items/item-search'
import { ItemCard } from '@/components/items/item-card'
import { Button } from '@/components/ui/button'
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
  department: {
    id: string
    name: string
  } | null
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

  const params = new URLSearchParams()
  
  // Add all search parameters
  Object.entries(searchParams).forEach(([key, value]) => {
    if (value) {
      params.set(key, value)
    }
  })

  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
  const response = await fetch(`${baseUrl}/api/items?${params.toString()}`, {
    cache: 'no-store', // Ensure fresh data
  })

  if (!response.ok) {
    throw new Error('Failed to fetch items')
  }

  return response.json()
}

function ItemsGridSkeleton() {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {[...Array(12)].map((_, i) => (
        <div key={i} className="h-80 bg-gray-200 rounded-lg animate-pulse" />
      ))}
    </div>
  )
}

function PaginationControls({ pagination, currentParams }: {
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
    <div className="flex items-center justify-between">
      <div className="text-sm text-gray-700">
        Showing {startItem} to {endItem} of {pagination.totalCount} items
      </div>
      
      <div className="flex gap-2">
        {pagination.hasPrevPage && (
          <Link href={createPageUrl(pagination.page - 1)}>
            <Button variant="outline" size="sm">
              Previous
            </Button>
          </Link>
        )}
        
        <span className="flex items-center px-3 py-1 text-sm bg-gray-100 rounded">
          Page {pagination.page} of {pagination.totalPages}
        </span>
        
        {pagination.hasNextPage && (
          <Link href={createPageUrl(pagination.page + 1)}>
            <Button variant="outline" size="sm">
              Next
            </Button>
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
        <h2 className="text-lg font-semibold text-gray-900">
          {pagination.totalCount} {pagination.totalCount === 1 ? 'Item' : 'Items'}
        </h2>
        
        <Button asChild>
          <Link href="/items/add">
            Add Item
          </Link>
        </Button>
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
            <PaginationControls 
              pagination={pagination} 
              currentParams={searchParams}
            />
          )}
        </>
      ) : (
        <div className="text-center py-12">
          <div className="text-gray-500 text-lg mb-4">
            No items found
          </div>
          <p className="text-gray-400 mb-6">
            {Object.keys(searchParams).length > 0 
              ? 'Try adjusting your search criteria or filters'
              : 'Get started by adding your first item'
            }
          </p>
          <Button asChild>
            <Link href="/items/add">
              Add First Item
            </Link>
          </Button>
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
    <div className="container mx-auto px-4 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Items Catalog
        </h1>
        <p className="text-gray-600">
          Browse and manage your organization&apos;s inventory
        </p>
      </div>

      {/* Content */}
      <Suspense fallback={<ItemsGridSkeleton />}>
        <ItemsContent searchParams={resolvedParams} />
      </Suspense>
    </div>
  )
}
