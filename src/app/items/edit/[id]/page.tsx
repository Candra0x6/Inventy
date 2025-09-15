'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { ItemForm } from '@/components/items/item-form'
import { Card } from '@/components/ui/card'

interface ItemFormData {
  name: string
  description?: string
  category: string
  tags: string[]
  condition: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'DAMAGED'
  status: 'AVAILABLE' | 'RESERVED' | 'BORROWED' | 'MAINTENANCE' | 'RETIRED'
  location?: string
  serialNumber?: string
  barcode?: string
  value?: number
  departmentId?: string
  images: string[]
}

interface Item extends ItemFormData {
  id: string
  organizationId: string
  createdById: string
  createdAt: string
  updatedAt: string
  department?: {
    id: string
    name: string
  }
  createdBy: {
    id: string
    name: string | null
    email: string
  }
}

interface EditItemPageProps {
  params: Promise<{
    id: string
  }>
}

export default function EditItemPage({ params }: EditItemPageProps) {
  const [item, setItem] = useState<Item | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const { data: session, status } = useSession()

  useEffect(() => {
    const loadItem = async () => {
      try {
        const resolvedParams = await params
        const response = await fetch(`/api/items/${resolvedParams.id}`)
        
        if (!response.ok) {
          if (response.status === 404) {
            setError('Item not found')
          } else {
            const errorData = await response.json()
            setError(errorData.error || 'Failed to load item')
          }
          return
        }

        const itemData = await response.json()
        setItem(itemData)
      } catch (err) {
        console.error('Error loading item:', err)
        setError('Failed to load item')
      } finally {
        setIsLoadingData(false)
      }
    }

    if (status !== 'loading') {
      loadItem()
    }
  }, [params, status])

  if (status === 'loading' || isLoadingData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  if (!session) {
    router.push('/auth/login')
    return null
  }

  // Check if user has permission to edit items
  if (!['MANAGER', 'SUPER_ADMIN', 'STAFF'].includes(session.user.role)) {
    router.push('/unauthorized')
    return null
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => router.back()}
            className="text-blue-600 hover:text-blue-800 underline"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  if (!item) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Item not found</div>
      </div>
    )
  }

  const handleSubmit = async (data: ItemFormData) => {
    setIsLoading(true)
    
    try {
      const response = await fetch(`/api/items/${item.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update item')
      }

      // Redirect to the item's detail page
      router.push(`/items/${item.id}`)
    } catch (error) {
      console.error('Error updating item:', error)
      alert(error instanceof Error ? error.message : 'Failed to update item')
    } finally {
      setIsLoading(false)
    }
  }

  const initialData: Partial<ItemFormData> = {
    name: item.name,
    description: item.description,
    category: item.category,
    tags: item.tags,
    condition: item.condition,
    status: item.status,
    location: item.location,
    serialNumber: item.serialNumber,
    barcode: item.barcode,
    value: item.value,
    departmentId: item.department?.id || item.departmentId,
    images: item.images
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Edit Item</h1>
        <p className="text-gray-600">
          Update the details for &quot;{item.name}&quot;
        </p>
      </div>

      <Card className="p-6">
        <ItemForm
          initialData={initialData}
          onSubmit={handleSubmit}
          isEditing={true}
          isLoading={isLoading}
        />
      </Card>
    </div>
  )
}
