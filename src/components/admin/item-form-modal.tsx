'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { AnimatedButton } from '@/components/ui/animated-button'
import { Badge } from '@/components/ui/badge'
import { 
  Upload,
  X,
  Plus,
  Save,
  Package,
  Tag,
  MapPin,
  Hash,
  DollarSign,
  AlertTriangle
} from 'lucide-react'
import { ItemCondition, ItemStatus } from '@prisma/client'
import Image from 'next/image'
import { supabase } from '@/lib/supabase/client'

interface ItemFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (itemData: ItemFormData) => Promise<void>
  item?: {
    id: string
    name: string
    description: string | null
    category: string
    tags: string[]
    condition: ItemCondition
    status: ItemStatus
    location: string | null
    serialNumber: string | null
    qrCode: string | null
    barcode: string | null
    images: string[]
    value: number | null
  } | null
  mode: 'add' | 'edit'
}

// Types
export interface ItemFormData {
  name: string
  description: string
  category: string
  tags: string[]
  condition: ItemCondition
  status: ItemStatus
  location: string
  serialNumber: string
  value: number | null
  images: string[]
}

interface ValidationErrors {
  name?: string
  category?: string
  description?: string
  value?: string
  serialNumber?: string
  location?: string
  images?: string
}

const CONDITIONS: ItemCondition[] = ['EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'DAMAGED']
const STATUSES: ItemStatus[] = ['AVAILABLE', 'RESERVED', 'BORROWED', 'MAINTENANCE', 'RETIRED']

export default function ItemFormModal({ 
  isOpen, 
  onClose, 
  onSave, 
  item, 
  mode 
}: ItemFormModalProps) {
  const [formData, setFormData] = useState<ItemFormData>({
    name: '',
    description: '',
    category: '',
    tags: [],
    condition: 'EXCELLENT',
    status: 'AVAILABLE',
    location: '',
    serialNumber: '',
    value: null,
    images: []
  })

  const [tagInput, setTagInput] = useState('')
  const [errors, setErrors] = useState<ValidationErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadingImages, setUploadingImages] = useState(false)
  const [imageUploadProgress, setImageUploadProgress] = useState<{ [key: string]: number }>({})
  const [availableCategories, setAvailableCategories] = useState<string[]>([])

  // Reset form when modal opens/closes or item changes
  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && item) {
        setFormData({
          name: item.name,
          description: item.description || '',
          category: item.category,
          tags: [...item.tags],
          condition: item.condition,
          status: item.status,
          location: item.location || '',
          serialNumber: item.serialNumber || '',
          value: item.value,
          images: [...item.images]
        })
      } else {
        setFormData({
          name: '',
          description: '',
          category: '',
          tags: [],
          condition: 'EXCELLENT',
          status: 'AVAILABLE',
          location: '',
          serialNumber: '1',
          value: 1,
          images: []
        })
      }
      setErrors({})
      setTagInput('')
      fetchCategories()
    }
  }, [isOpen, mode, item])

  // Fetch available categories
  const fetchCategories = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/categories`)
      if (response.ok) {
        const data = await response.json()
        setAvailableCategories(data.categories.map((cat: { name: string }) => cat.name))
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error)
    }
  }

  // Form validation
  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Item name is required'
    } else if (formData.name.length < 2) {
      newErrors.name = 'Item name must be at least 2 characters'
    }

    if (!formData.category.trim()) {
      newErrors.category = 'Category is required'
    }

    if (formData.description && formData.description.length > 500) {
      newErrors.description = 'Description must be less than 500 characters'
    }

    if (formData.location && formData.location.length > 100) {
      newErrors.location = 'Location must be less than 100 characters'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)

    try {
      await onSave(formData)
      onClose()
    } catch (error) {
      console.error('Failed to save item:', error)
      setErrors({ name: 'Failed to save item. Please try again.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle input changes
  const handleInputChange = (field: keyof ItemFormData, value: string | number | boolean | string[] | null) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error for this field when user starts typing
    if (errors[field as keyof ValidationErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  // Handle tag operations
  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      handleInputChange('tags', [...formData.tags, tagInput.trim()])
      setTagInput('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    handleInputChange('tags', formData.tags.filter(tag => tag !== tagToRemove))
  }

  const handleTagKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTag()
    }
  }

  // Handle image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    const newImageUrls = await uploadImages(files)
    if (newImageUrls.length > 0) {
      handleInputChange('images', [...formData.images, ...newImageUrls])
    }
  }

  const uploadImages = async (files: FileList) => {
    if (!files || files.length === 0) return []

    setUploadingImages(true)
    const uploadedUrls: string[] = []
    const progressMap: { [key: string]: number } = {}

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const fileId = `${Date.now()}-${i}-${Math.random()}`
        progressMap[fileId] = 0
        setImageUploadProgress(prev => ({ ...prev, [fileId]: 0 }))

        // Simulate upload progress
        const progressInterval = setInterval(() => {
          setImageUploadProgress(prev => {
            const currentProgress = prev[fileId] || 0
            if (currentProgress >= 90) {
              clearInterval(progressInterval)
              return prev
            }
            return { ...prev, [fileId]: Math.min(currentProgress + Math.random() * 20, 90) }
          })
        }, 200)

        const fileExt = file.name.split('.').pop()
        const fileName = `items/${item?.id}/item-${Date.now()}-${Math.random()}.${fileExt}`
        
        const { data, error } = await supabase.storage
          .from('item-images')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false,
            contentType: file.type,
            duplex: 'half' as const
          })

        clearInterval(progressInterval)
        setImageUploadProgress(prev => ({ ...prev, [fileId]: 100 }))

        if (error) {
          console.error('Upload error:', error)
          setImageUploadProgress(prev => {
            const newProgress = { ...prev }
            delete newProgress[fileId]
            return newProgress
          })
          continue
        }

        const { data: urlData } = supabase.storage
          .from('item-images')
          .getPublicUrl(data.path)

        if (urlData?.publicUrl) {
          uploadedUrls.push(urlData.publicUrl)
        }

        // Clean up progress after a delay
        setTimeout(() => {
          setImageUploadProgress(prev => {
            const newProgress = { ...prev }
            delete newProgress[fileId]
            return newProgress
          })
        }, 1000)
      }

      return uploadedUrls
    } catch (error) {
      console.error('Error uploading images:', error)
      return []
    } finally {
      setUploadingImages(false)
    }
  }

  const removeImage = (indexToRemove: number) => {
    handleInputChange('images', formData.images.filter((_, index) => index !== indexToRemove))
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold mb-2">
            {mode === 'add' ? 'Add New Item' : 'Edit Item'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'add' 
              ? 'Create a new item in your inventory system' 
              : 'Update the selected item information'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b border-border/50 pb-2">
              Basic Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Item Name */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Item Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Enter item name"
                  className={`w-full px-3 py-2 border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors ${errors.name ? 'border-red-500' : 'border-border'}`}
                  required
                />
                {errors.name && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4" />
                    {errors.name}
                  </p>
                )}
              </div>

              {/* Category */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  Category *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    list="categories"
                    value={formData.category}
                    onChange={(e) => handleInputChange('category', e.target.value)}
                    placeholder="Enter or select category"
                    className={`w-full px-3 py-2 border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors ${errors.category ? 'border-red-500' : 'border-border'}`}
                    required
                  />
                  <datalist id="categories">
                    {availableCategories.map((category) => (
                      <option key={category} value={category} />
                    ))}
                  </datalist>
                </div>
                {errors.category && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4" />
                    {errors.category}
                  </p>
                )}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Enter item description"
                rows={3}
                className={`w-full px-3 py-2 border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors resize-none ${errors.description ? 'border-red-500' : 'border-border'}`}
                maxLength={500}
              />
              <div className="flex justify-between items-center">
                {errors.description && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4" />
                    {errors.description}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  {formData.description.length}/500 characters
                </p>
              </div>
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Tags
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={handleTagKeyPress}
                  placeholder="Enter tag and press Enter"
                  className="flex-1 px-3 py-2 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                />
                <AnimatedButton
                  type="button"
                  onClick={addTag}
                  variant="outline"
                  size="sm"
                  disabled={!tagInput.trim()}
                >
                  <Plus className="h-4 w-4" />
                </AnimatedButton>
              </div>
              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.tags.map((tag) => (
                    <Badge 
                      key={tag} 
                      variant="secondary" 
                      className="flex items-center gap-1"
                    >
                      {tag}
                      <X 
                        className="h-3 w-3 cursor-pointer hover:text-destructive" 
                        onClick={() => removeTag(tag)}
                      />
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Status and Condition */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b border-border/50 pb-2">
              Status & Condition
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Status */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => handleInputChange('status', e.target.value as ItemStatus)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                >
                  {STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>

              {/* Condition */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Condition
                </label>
                <select
                  value={formData.condition}
                  onChange={(e) => handleInputChange('condition', e.target.value as ItemCondition)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                >
                  {CONDITIONS.map((condition) => (
                    <option key={condition} value={condition}>
                      {condition}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Additional Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b border-border/50 pb-2">
              Additional Details
            </h3>
            
            <div className="">
              {/* Location */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Location
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  placeholder="e.g., Building A, Room 101"
                  className={`w-full px-3 py-2 border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors ${errors.location ? 'border-red-500' : 'border-border'}`}
                />
                {errors.location && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4" />
                    {errors.location}
                  </p>
                )}
              </div>

            </div>
          </div>

          {/* Images */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b border-border/50 pb-2">
              Images
            </h3>
            
            {/* Image Upload */}
            <div className="space-y-4">
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                <input
                  type="file"
                  id="image-upload"
                  multiple
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <label htmlFor="image-upload" className="cursor-pointer">
                  <div className="flex flex-col items-center space-y-2">
                    <div className="p-3 bg-muted/50 rounded-full">
                      <Upload className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {uploadingImages ? 'Uploading...' : 'Click to upload images'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Supports multiple files up to 5MB each
                      </p>
                    </div>
                  </div>
                </label>
              </div>

              {errors.images && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4" />
                  {errors.images}
                </p>
              )}

              {/* Upload Progress */}
              {Object.keys(imageUploadProgress).length > 0 && (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-foreground">Upload Progress</p>
                  {Object.entries(imageUploadProgress).map(([fileId, progress]) => (
                    <div key={fileId} className="space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-muted-foreground">
                          File {parseInt(fileId.split('-')[1]) + 1}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {Math.round(progress)}%
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-primary h-2 rounded-full transition-all duration-300 ease-out"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Image Preview */}
              {formData.images.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {formData.images.map((image, index) => (
                    <div key={index} className="relative group">
                      <Image
                        src={image}
                        alt={`Preview ${index + 1}`}
                        width={200}
                        height={150}
                        className="w-full h-32 rounded-lg object-cover border border-border/50"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute top-2 right-2 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-border/50">
            <AnimatedButton 
              type="button"
              onClick={onClose}
              variant="outline"
              className="flex-1 sm:flex-initial"
              disabled={isSubmitting}
            >
              Cancel
            </AnimatedButton>
            <AnimatedButton 
              type="submit"
              className="flex-1 sm:flex-initial"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="mr-2"
                >
                  <Package className="h-4 w-4" />
                </motion.div>
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {isSubmitting 
                ? 'Saving...' 
                : mode === 'add' ? 'Create Item' : 'Update Item'
              }
            </AnimatedButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}