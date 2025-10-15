'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { 
  AlertTriangle, 
  Camera, 
  X, 
  Upload, 
  CheckCircle,
  DollarSign,
  Clock,
  Wrench
} from 'lucide-react'

interface DamageReportFormProps {
  returnId: string
  itemName: string
  itemImages?: string[]
  onSubmit?: (data: DamageReportData) => Promise<void>
  onCancel?: () => void
  initialData?: Partial<DamageReportData>
}

interface DamageReportData {
  damageType: 'PHYSICAL' | 'FUNCTIONAL' | 'COSMETIC' | 'MISSING_PARTS' | 'OTHER'
  severity: 'MINOR' | 'MODERATE' | 'MAJOR' | 'TOTAL_LOSS'
  description: string
  damageImages: string[]
  estimatedRepairCost?: number
  isRepairable?: boolean
  affectsUsability: boolean
  witnessDetails?: string
  incidentDate?: string
}

const damageTypes = [
  { value: 'PHYSICAL', label: 'Physical Damage', description: 'Scratches, dents, cracks, or breaks' },
  { value: 'FUNCTIONAL', label: 'Functional Issue', description: 'Device not working properly' },
  { value: 'COSMETIC', label: 'Cosmetic Damage', description: 'Appearance damage that doesn\'t affect function' },
  { value: 'MISSING_PARTS', label: 'Missing Parts', description: 'Components or accessories missing' },
  { value: 'OTHER', label: 'Other', description: 'Other type of damage not listed above' }
] as const

const severityLevels = [
  { 
    value: 'MINOR', 
    label: 'Minor', 
    description: 'Small damage, easily repairable',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-300'
  },
  { 
    value: 'MODERATE', 
    label: 'Moderate', 
    description: 'Noticeable damage, may require professional repair',
    color: 'bg-orange-100 text-orange-800 border-orange-300'
  },
  { 
    value: 'MAJOR', 
    label: 'Major', 
    description: 'Significant damage, expensive to repair',
    color: 'bg-red-100 text-red-800 border-red-300'
  },
  { 
    value: 'TOTAL_LOSS', 
    label: 'Total Loss', 
    description: 'Item cannot be repaired or is completely destroyed',
    color: 'bg-gray-100 text-gray-800 border-gray-300'
  }
] as const

export default function DamageReportForm({
  returnId,
  itemName,
  itemImages = [],
  onSubmit,
  onCancel,
  initialData
}: DamageReportFormProps) {
  const [formData, setFormData] = useState<DamageReportData>({
    damageType: initialData?.damageType || 'PHYSICAL',
    severity: initialData?.severity || 'MINOR',
    description: initialData?.description || '',
    damageImages: initialData?.damageImages || [],
    estimatedRepairCost: initialData?.estimatedRepairCost,
    isRepairable: initialData?.isRepairable,
    affectsUsability: initialData?.affectsUsability ?? false,
    witnessDetails: initialData?.witnessDetails || '',
    incidentDate: initialData?.incidentDate || new Date().toISOString().slice(0, 16)
  })

  const [loading, setLoading] = useState(false)
  const [uploadingImages, setUploadingImages] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.description || formData.description.length < 10) {
      newErrors.description = 'Description must be at least 10 characters'
    }

    if (formData.estimatedRepairCost !== undefined && formData.estimatedRepairCost < 0) {
      newErrors.estimatedRepairCost = 'Repair cost cannot be negative'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleImageUpload = async (files: FileList) => {
    setUploadingImages(true)
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('type', 'damage-evidence')

        const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/upload`, {
          method: 'POST',
          body: formData
        })

        if (!response.ok) {
          throw new Error('Upload failed')
        }

        const data = await response.json()
        return data.url
      })

      const uploadedUrls = await Promise.all(uploadPromises)
      setFormData(prev => ({
        ...prev,
        damageImages: [...prev.damageImages, ...uploadedUrls]
      }))
    } catch (error) {
      console.error('Error uploading images:', error)
      setErrors(prev => ({ ...prev, images: 'Failed to upload images' }))
    } finally {
      setUploadingImages(false)
    }
  }

  const handleRemoveImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      damageImages: prev.damageImages.filter((_, i) => i !== index)
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setLoading(true)
    try {
      if (onSubmit) {
        await onSubmit(formData)
      } else {
        // Default API call
        const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/returns/damage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            returnId,
            ...formData
          })
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.message || 'Failed to submit damage report')
        }
      }
    } catch (error) {
      console.error('Error submitting damage report:', error)
      setErrors(prev => ({ 
        ...prev, 
        submit: error instanceof Error ? error.message : 'Failed to submit damage report' 
      }))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="max-w-4xl mx-auto p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="border-b pb-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <h2 className="text-xl font-semibold">Damage Report</h2>
          </div>
          <p className="text-gray-600">
            Report damage for: <span className="font-medium">{itemName}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Item Images Reference */}
          {itemImages.length > 0 && (
            <div>
              <Label className="text-sm font-medium text-gray-700">Original Item Images</Label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {itemImages.slice(0, 3).map((image, index) => (
                  <div key={index} className="relative aspect-video">
                    <Image
                      src={image}
                      alt={`${itemName} original`}
                      fill
                      className="object-cover rounded border opacity-60"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Damage Type Selection */}
          <div>
            <Label className="text-sm font-medium text-gray-700">Damage Type</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
              {damageTypes.map((type) => (
                <label
                  key={type.value}
                  className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                    formData.damageType === type.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="damageType"
                    value={type.value}
                    checked={formData.damageType === type.value}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      damageType: e.target.value as typeof prev.damageType 
                    }))}
                    className="sr-only"
                  />
                  <div className="font-medium text-sm">{type.label}</div>
                  <div className="text-xs text-gray-500 mt-1">{type.description}</div>
                </label>
              ))}
            </div>
          </div>

          {/* Severity Level */}
          <div>
            <Label className="text-sm font-medium text-gray-700">Severity Level</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
              {severityLevels.map((severity) => (
                <label
                  key={severity.value}
                  className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                    formData.severity === severity.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="severity"
                    value={severity.value}
                    checked={formData.severity === severity.value}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      severity: e.target.value as typeof prev.severity 
                    }))}
                    className="sr-only"
                  />
                  <Badge className={`text-xs ${severity.color}`}>
                    {severity.label}
                  </Badge>
                  <div className="text-xs text-gray-500 mt-1">{severity.description}</div>
                </label>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description" className="text-sm font-medium text-gray-700">
              Detailed Description *
            </Label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe the damage in detail, including when and how it occurred..."
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={4}
              required
            />
            {errors.description && (
              <p className="text-red-500 text-xs mt-1">{errors.description}</p>
            )}
          </div>

          {/* Damage Images */}
          <div>
            <Label className="text-sm font-medium text-gray-700">
              Damage Evidence Photos
            </Label>
            <div className="mt-2">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                <div className="text-center">
                  <Camera className="mx-auto h-8 w-8 text-gray-400" />
                  <div className="mt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingImages}
                      className="relative"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {uploadingImages ? 'Uploading...' : 'Upload Photos'}
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={(e) => e.target.files && handleImageUpload(e.target.files)}
                      className="hidden"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Upload clear photos showing the damage
                  </p>
                </div>
              </div>

              {/* Uploaded Images */}
              {formData.damageImages.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mt-4">
                  {formData.damageImages.map((image, index) => (
                    <div key={index} className="relative aspect-video">
                      <Image
                        src={image}
                        alt={`Damage evidence ${index + 1}`}
                        fill
                        className="object-cover rounded border"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemoveImage(index)}
                        className="absolute top-1 right-1 w-6 h-6 p-0 bg-red-500 text-white border-red-500 hover:bg-red-600"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {errors.images && (
              <p className="text-red-500 text-xs mt-1">{errors.images}</p>
            )}
          </div>

          {/* Additional Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Repair Cost */}
            <div>
              <Label htmlFor="repairCost" className="text-sm font-medium text-gray-700">
                Estimated Repair Cost
              </Label>
              <div className="relative mt-1">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="repairCost"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.estimatedRepairCost || ''}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    estimatedRepairCost: e.target.value ? parseFloat(e.target.value) : undefined 
                  }))}
                  placeholder="0.00"
                  className="pl-10"
                />
              </div>
              {errors.estimatedRepairCost && (
                <p className="text-red-500 text-xs mt-1">{errors.estimatedRepairCost}</p>
              )}
            </div>

            {/* Incident Date */}
            <div>
              <Label htmlFor="incidentDate" className="text-sm font-medium text-gray-700">
                When did the damage occur?
              </Label>
              <div className="relative mt-1">
                <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="incidentDate"
                  type="datetime-local"
                  value={formData.incidentDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, incidentDate: e.target.value }))}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          {/* Repair Status */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Wrench className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Repair Assessment</span>
            </div>
            
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.isRepairable ?? false}
                onChange={(e) => setFormData(prev => ({ ...prev, isRepairable: e.target.checked }))}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Item is repairable</span>
            </label>

            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.affectsUsability}
                onChange={(e) => setFormData(prev => ({ ...prev, affectsUsability: e.target.checked }))}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Damage affects item usability</span>
            </label>
          </div>

          {/* Witness Details */}
          <div>
            <Label htmlFor="witnessDetails" className="text-sm font-medium text-gray-700">
              Witness Information (Optional)
            </Label>
            <textarea
              id="witnessDetails"
              value={formData.witnessDetails}
              onChange={(e) => setFormData(prev => ({ ...prev, witnessDetails: e.target.value }))}
              placeholder="Names and contact information of any witnesses to the damage..."
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={2}
            />
          </div>

          {/* Submit Error */}
          {errors.submit && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-red-600 text-sm">{errors.submit}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={loading}
              >
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              disabled={loading || uploadingImages}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Submitting...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Submit Damage Report
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </Card>
  )
}