'use client'

import { useState } from 'react'
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

export default function AddItemPage() {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { data: session, status } = useSession()

  if (status === 'loading') {
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

  // Check if user has permission to create items
  if (!['MANAGER', 'SUPER_ADMIN', 'STAFF'].includes(session.user.role)) {
    router.push('/unauthorized')
    return null
  }

  const handleSubmit = async (data: ItemFormData) => {
    setIsLoading(true)
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

     

      const item = await response.json()
      
      // Redirect to the new item's detail page
      router.push(`/items/${item.id}`)
    } catch (error) {
      console.error('Error creating item:', error)
      alert(error instanceof Error ? error.message : 'Failed to create item')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Add New Item</h1>
        <p className="text-gray-600">
          Fill in the details below to add a new item to the inventory system.
        </p>
      </div>

      <Card className="p-6">
        <ItemForm
          onSubmit={handleSubmit}
          isLoading={isLoading}
        />
      </Card>
    </div>
  )
}
