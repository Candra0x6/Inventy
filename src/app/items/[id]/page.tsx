import { Suspense } from 'react'
import { notFound, redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { ItemDetailPageClient, ItemDetailSkeletonClient } from './item-detail-client'

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

  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/items/${id}`, {
    cache: 'no-store', // Ensure fresh data
  })

  if (response.status === 404) {
    notFound()
  }

  console.log('Fetch item response status:', response.status)
  if (!response.ok) {
    throw new Error('Failed to fetch item data')
  }

  return response.json()
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
    <ItemDetailPageClient 
      item={item}
      userRole={session.user.role}
    />
  )
}

export default async function ItemDetailPage({ params }: ItemPageProps) {
  const { id } = await params

  return (
    <Suspense fallback={<ItemDetailSkeletonClient />}>
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
