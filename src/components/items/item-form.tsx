'use client'

import { useState, useRef } from 'react'
import { useForm } from 'react-hook-form'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { supabase } from '@/lib/supabase/client'
import { ItemCondition, ItemStatus } from '@prisma/client'

interface ItemFormData {
  name: string
  description?: string
  category: string
  tags: string[]
  condition: ItemCondition
  status: ItemStatus
  location?: string
  serialNumber?: string
  barcode?: string
  value?: number
  departmentId?: string
  images: string[]
}

interface ItemFormProps {
  initialData?: Partial<ItemFormData>
  onSubmit: (data: ItemFormData) => Promise<void>
  isEditing?: boolean
  isLoading?: boolean
}

export function ItemForm({ initialData, onSubmit, isEditing = false, isLoading = false }: ItemFormProps) {
  const [uploadingImages, setUploadingImages] = useState(false)
  const [tagInput, setTagInput] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors }
  } = useForm<ItemFormData>({
    defaultValues: {
      name: initialData?.name || '',
      description: initialData?.description || '',
      category: initialData?.category || '',
      tags: initialData?.tags || [],
      condition: initialData?.condition || ItemCondition.EXCELLENT,
      status: initialData?.status || ItemStatus.AVAILABLE,
      location: initialData?.location || '',
      serialNumber: initialData?.serialNumber || '',
      barcode: initialData?.barcode || '',
      value: initialData?.value || undefined,
      departmentId: initialData?.departmentId || '',
      images: initialData?.images || []
    }
  })

  const watchedImages = watch('images')
  const watchedTags = watch('tags')

  const handleFormSubmit = async (data: ItemFormData) => {
    await onSubmit(data)
  }

  const uploadImages = async (files: FileList) => {
    if (!files || files.length === 0) return []

    setUploadingImages(true)
    const uploadedUrls: string[] = []

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const fileExt = file.name.split('.').pop()
        const fileName = `${Date.now()}-${Math.random()}.${fileExt}`
        
        const { data, error } = await supabase.storage
          .from('item-images')
          .upload(fileName, file)

        if (error) {
          console.error('Upload error:', error)
          continue
        }

        const { data: urlData } = supabase.storage
          .from('item-images')
          .getPublicUrl(data.path)

        if (urlData?.publicUrl) {
          uploadedUrls.push(urlData.publicUrl)
        }
      }

      return uploadedUrls
    } catch (error) {
      console.error('Error uploading images:', error)
      return []
    } finally {
      setUploadingImages(false)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    const newImageUrls = await uploadImages(files)
    if (newImageUrls.length > 0) {
      const currentImages = watchedImages || []
      setValue('images', [...currentImages, ...newImageUrls])
    }
  }

  const removeImage = (indexToRemove: number) => {
    const currentImages = watchedImages || []
    setValue('images', currentImages.filter((_, index) => index !== indexToRemove))
  }

  const addTag = () => {
    if (tagInput.trim() && !watchedTags.includes(tagInput.trim())) {
      setValue('tags', [...watchedTags, tagInput.trim()])
      setTagInput('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    setValue('tags', watchedTags.filter(tag => tag !== tagToRemove))
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTag()
    }
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Basic Information */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              {...register('name', { required: 'Name is required' })}
              className={errors.name ? 'border-red-500' : ''}
            />
            {errors.name && (
              <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="category">Category *</Label>
            <Input
              id="category"
              {...register('category', { required: 'Category is required' })}
              placeholder="e.g., Electronics, Furniture, Tools"
              className={errors.category ? 'border-red-500' : ''}
            />
            {errors.category && (
              <p className="text-sm text-red-500 mt-1">{errors.category.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              {...register('description')}
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Detailed description of the item..."
            />
          </div>

          <div>
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              {...register('location')}
              placeholder="e.g., Building A, Room 101, Shelf 3"
            />
          </div>
        </div>

        {/* Additional Details */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="condition">Condition</Label>
            <select
              id="condition"
              {...register('condition')}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {Object.values(ItemCondition).map(condition => (
                <option key={condition} value={condition}>
                  {condition.charAt(0) + condition.slice(1).toLowerCase()}
                </option>
              ))}
            </select>
          </div>

          {isEditing && (
            <div>
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                {...register('status')}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {Object.values(ItemStatus).map(status => (
                  <option key={status} value={status}>
                    {status.charAt(0) + status.slice(1).toLowerCase()}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <Label htmlFor="serialNumber">Serial Number</Label>
            <Input
              id="serialNumber"
              {...register('serialNumber')}
              placeholder="Unique identifier"
            />
          </div>

          <div>
            <Label htmlFor="barcode">Barcode</Label>
            <Input
              id="barcode"
              {...register('barcode')}
              placeholder="Barcode value"
            />
          </div>

          <div>
            <Label htmlFor="value">Estimated Value</Label>
            <Input
              id="value"
              type="number"
              step="0.01"
              {...register('value', { 
                setValueAs: (value: string) => value === '' ? undefined : parseFloat(value)
              })}
              placeholder="0.00"
            />
          </div>
        </div>
      </div>

      {/* Tags Section */}
      <div>
        <Label>Tags</Label>
        <div className="flex flex-wrap gap-2 mb-2">
          {watchedTags.map((tag, index) => (
            <span
              key={index}
              className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="text-blue-600 hover:text-blue-800"
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Add a tag..."
            className="flex-1"
          />
          <Button type="button" onClick={addTag} variant="outline">
            Add Tag
          </Button>
        </div>
      </div>

      {/* Images Section */}
      <div>
        <Label>Images</Label>
        <div className="mt-2">
          <Button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            variant="outline"
            disabled={uploadingImages}
          >
            {uploadingImages ? 'Uploading...' : 'Upload Images'}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />
        </div>

        {watchedImages && watchedImages.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            {watchedImages.map((imageUrl, index) => (
              <Card key={index} className="relative p-2">
                <div className="relative aspect-square">
                  <Image
                    src={imageUrl}
                    alt={`Item image ${index + 1}`}
                    fill
                    className="object-cover rounded"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600"
                  >
                    ×
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Submit Button */}
      <div className="flex justify-end gap-4">
        <Button type="button" variant="outline" onClick={() => window.history.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading || uploadingImages}>
          {isLoading ? 'Saving...' : isEditing ? 'Update Item' : 'Create Item'}
        </Button>
      </div>
    </form>
  )
}
