'use client'

import { useState } from 'react'
import { Search, Loader2, Package, AlertCircle, Camera, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BarcodeScanner } from './barcode-scanner'

interface Item {
  id: string
  name: string
  description?: string
  category: string
  tags: string[]
  condition: string
  status: string
  location?: string
  serialNumber?: string
  qrCode?: string
  barcode?: string
  images: string[]
  value?: number
  organization: {
    id: string
    name: string
  }
  department?: {
    id: string
    name: string
  }
  createdBy: {
    id: string
    name?: string
    email: string
  }
  currentReservation?: {
    id: string
    status: string
    startDate: string
    endDate: string
    user: {
      id: string
      name?: string
      email: string
    }
  }
  createdAt: string
  updatedAt: string
}

interface BarcodeSearchResult {
  success: boolean
  item?: Item
  error?: string
}

interface BarcodeSearchProps {
  onItemFound?: (item: Item) => void
  onError?: (error: string) => void
  className?: string
  showScanner?: boolean
}

export function BarcodeSearch({ 
  onItemFound, 
  onError, 
  className = '',
  showScanner = true 
}: BarcodeSearchProps) {
  const [barcode, setBarcode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [searchResult, setSearchResult] = useState<BarcodeSearchResult | null>(null)
  const [showScannerModal, setShowScannerModal] = useState(false)

  const searchByBarcode = async (barcodeValue: string) => {
    if (!barcodeValue.trim()) {
      setSearchResult({ success: false, error: 'Please enter a barcode' })
      return
    }

    setIsLoading(true)
    setSearchResult(null)

    try {
      const response = await fetch(`/api/items/barcode?barcode=${encodeURIComponent(barcodeValue)}`)
      const data = await response.json()

      if (response.ok && data.success) {
        setSearchResult({ success: true, item: data.item })
        if (onItemFound) {
          onItemFound(data.item)
        }
      } else {
        const error = data.error || 'Failed to search for item'
        setSearchResult({ success: false, error })
        if (onError) {
          onError(error)
        }
      }
    } catch {
      const errorMessage = 'Network error occurred while searching'
      setSearchResult({ success: false, error: errorMessage })
      if (onError) {
        onError(errorMessage)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    searchByBarcode(barcode)
  }

  const handleScanSuccess = (scannedBarcode: string) => {
    setBarcode(scannedBarcode)
    setShowScannerModal(false)
    searchByBarcode(scannedBarcode)
  }

  const handleScanError = (error: string) => {
    console.error('Scan error:', error)
    if (onError) {
      onError(`Scanner error: ${error}`)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'available':
        return 'bg-green-100 text-green-800'
      case 'reserved':
        return 'bg-yellow-100 text-yellow-800'
      case 'borrowed':
        return 'bg-blue-100 text-blue-800'
      case 'maintenance':
        return 'bg-orange-100 text-orange-800'
      case 'retired':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getConditionColor = (condition: string) => {
    switch (condition.toLowerCase()) {
      case 'excellent':
        return 'bg-green-100 text-green-800'
      case 'good':
        return 'bg-blue-100 text-blue-800'
      case 'fair':
        return 'bg-yellow-100 text-yellow-800'
      case 'poor':
        return 'bg-orange-100 text-orange-800'
      case 'damaged':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Barcode Search
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Search Form */}
          <form onSubmit={handleSubmit} className="flex gap-2">
            <div className="flex-1">
              <Input
                type="text"
                placeholder="Enter barcode or QR code..."
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                disabled={isLoading}
              />
            </div>
            
            <Button type="submit" disabled={isLoading || !barcode.trim()}>
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              Search
            </Button>
            
            {showScanner && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowScannerModal(true)}
                disabled={isLoading}
              >
                <Camera className="h-4 w-4" />
                Scan
              </Button>
            )}
          </form>

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span>Searching for item...</span>
            </div>
          )}

          {/* Error State */}
          {searchResult && !searchResult.success && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
              <span className="text-sm text-red-700">{searchResult.error}</span>
            </div>
          )}

          {/* Success State - Item Found */}
          {searchResult && searchResult.success && searchResult.item && (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="pt-4">
                <div className="space-y-3">
                  {/* Item Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg text-green-800">
                        {searchResult.item.name}
                      </h3>
                      {searchResult.item.description && (
                        <p className="text-sm text-green-600 mt-1">
                          {searchResult.item.description}
                        </p>
                      )}
                    </div>
                    <Package className="h-6 w-6 text-green-600 flex-shrink-0" />
                  </div>

                  {/* Item Details */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="font-medium">Category:</span>
                      <span className="ml-1">{searchResult.item.category}</span>
                    </div>
                    
                    <div>
                      <span className="font-medium">Location:</span>
                      <span className="ml-1">{searchResult.item.location || 'Not specified'}</span>
                    </div>
                    
                    {searchResult.item.serialNumber && (
                      <div>
                        <span className="font-medium">Serial:</span>
                        <span className="ml-1">{searchResult.item.serialNumber}</span>
                      </div>
                    )}
                    
                    <div>
                      <span className="font-medium">Organization:</span>
                      <span className="ml-1">{searchResult.item.organization.name}</span>
                    </div>
                  </div>

                  {/* Status and Condition */}
                  <div className="flex gap-2">
                    <Badge className={getStatusColor(searchResult.item.status)}>
                      {searchResult.item.status}
                    </Badge>
                    <Badge className={getConditionColor(searchResult.item.condition)}>
                      {searchResult.item.condition}
                    </Badge>
                  </div>

                  {/* Current Reservation */}
                  {searchResult.item.currentReservation && (
                    <div className="p-2 bg-yellow-50 border border-yellow-200 rounded">
                      <p className="text-sm font-medium text-yellow-800">
                        Currently Reserved
                      </p>
                      <p className="text-xs text-yellow-600">
                        By: {searchResult.item.currentReservation.user.name || searchResult.item.currentReservation.user.email}
                      </p>
                      <p className="text-xs text-yellow-600">
                        Until: {new Date(searchResult.item.currentReservation.endDate).toLocaleDateString()}
                      </p>
                    </div>
                  )}

                  {/* Tags */}
                  {searchResult.item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {searchResult.item.tags.map((tag, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* View Details Link */}
                  <div className="pt-2 border-t border-green-200">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => window.open(`/items/${searchResult.item?.id}`, '_blank')}
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      View Full Details
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* Scanner Modal */}
      {showScannerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold">Scan Barcode</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowScannerModal(false)}
              >
                ✕
              </Button>
            </div>
            
            <div className="p-4">
              <BarcodeScanner
                onScanSuccess={handleScanSuccess}
                onScanError={handleScanError}
                isActive={showScannerModal}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
