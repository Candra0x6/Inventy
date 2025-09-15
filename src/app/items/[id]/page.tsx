import { Suspense } from 'react'
import { notFound, redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PhotoGallery } from '@/components/items/photo-gallery'
import { ItemInfo } from '@/components/items/item-info'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import Link from 'next/link'

interface ItemPageProps {
  params: Promise<{
    id: string
  }>
}

async function fetchItemData(id: string) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    redirect('/auth/login')
  }

  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
  const response = await fetch(`${baseUrl}/api/items/${id}`, {
    cache: 'no-store', // Ensure fresh data
  })

  if (response.status === 404) {
    notFound()
  }

  if (!response.ok) {
    throw new Error('Failed to fetch item data')
  }

  return response.json()
}

function ItemDetailSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumb Skeleton */}
      <div className="h-4 bg-gray-200 rounded w-48 mb-6 animate-pulse" />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Gallery Skeleton */}
        <div className="space-y-4">
          <div className="h-96 bg-gray-200 rounded-lg animate-pulse" />
          <div className="flex gap-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 w-20 bg-gray-200 rounded-lg animate-pulse" />
            ))}
          </div>
        </div>
        
        {/* Info Skeleton */}
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="h-8 bg-gray-200 rounded w-3/4 animate-pulse" />
            <div className="flex gap-2">
              <div className="h-6 bg-gray-200 rounded w-20 animate-pulse" />
              <div className="h-6 bg-gray-200 rounded w-24 animate-pulse" />
            </div>
          </div>
          
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="p-6">
              <div className="h-6 bg-gray-200 rounded w-32 mb-4 animate-pulse" />
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

async function ItemDetailContent({ id }: { id: string }) {
  const [item, session] = await Promise.all([
    fetchItemData(id),
    getServerSession(authOptions)
  ])

  if (!session?.user) {
    redirect('/auth/login')
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center space-x-2 text-sm text-gray-600 mb-6">
        <Link href="/items" className="hover:text-gray-900 transition-colors">
          Items
        </Link>
        <span>/</span>
        <Link 
          href={`/items?category=${encodeURIComponent(item.category)}`}
          className="hover:text-gray-900 transition-colors capitalize"
        >
          {item.category}
        </Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">{item.name}</span>
      </nav>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Photo Gallery Section */}
        <div className="space-y-4">
          <PhotoGallery 
            images={item.images}
            itemName={item.name}
            status={item.status}
          />
          
          {/* Quick Actions */}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/items/${item.id}/qr`}>
                View QR Code
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/items/${item.id}/history`}>
                View History
              </Link>
            </Button>
          </div>
        </div>

        {/* Item Information Section */}
        <div>
          <ItemInfo 
            item={item}
            userRole={session.user.role}
          />
        </div>
      </div>

      {/* Related Items Section */}
      <div className="mt-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Related Items</h2>
          <Button variant="outline" asChild>
            <Link href={`/items?category=${encodeURIComponent(item.category)}`}>
              View All in {item.category}
            </Link>
          </Button>
        </div>
        
        <Card className="p-6 text-center text-gray-500">
          <p>Related items will be displayed here</p>
          <p className="text-sm mt-2">
            Items from the same category or with similar tags
          </p>
        </Card>
      </div>

      {/* Action Bar - Fixed at bottom on mobile */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 lg:hidden">
        <div className="flex gap-2 max-w-sm mx-auto">
          {item.availability.isAvailable && ['BORROWER', 'STAFF'].includes(session.user.role) && (
            <Button className="flex-1">
              Reserve Item
            </Button>
          )}
          <Button variant="outline" className="flex-1" asChild>
            <Link href={`/items/${item.id}/contact`}>
              Contact Owner
            </Link>
          </Button>
        </div>
      </div>

      {/* Add padding for mobile action bar */}
      <div className="h-20 lg:hidden" />
    </div>
  )
}

export default async function ItemDetailPage({ params }: ItemPageProps) {
  const { id } = await params

  return (
    <Suspense fallback={<ItemDetailSkeleton />}>
      <ItemDetailContent id={id} />
    </Suspense>
  )
}

// Metadata generation for SEO
export async function generateMetadata({ params }: ItemPageProps) {
  try {
    const { id } = await params
    const item = await fetchItemData(id)
    
    return {
      title: `${item.name} | Brocy Inventory`,
      description: item.description || `${item.name} - ${item.category} in ${item.condition.toLowerCase()} condition`,
      openGraph: {
        title: item.name,
        description: item.description || `${item.category} available for borrowing`,
        images: item.images.length > 0 ? [item.images[0]] : [],
      },
    }
  } catch {
    return {
      title: 'Item Details | Brocy Inventory',
      description: 'View item details and availability',
    }
  }
}
