'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Scan, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarcodeScanner } from '@/components/items/barcode-scanner'
import { BarcodeSearch } from '@/components/items/barcode-search'

interface Item {
  id: string
  name: string
  description?: string
  category: string
  status: string
  condition: string
  organization: {
    name: string
  }
}

export default function ScanPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'scanner' | 'search'>('scanner')
  const [lastScannedItem, setLastScannedItem] = useState<Item | null>(null)

  const handleScanSuccess = (barcode: string) => {
    console.log('Scanned barcode:', barcode)
    // The BarcodeSearch component will handle the API call
  }

  const handleScanError = (error: string) => {
    console.error('Scan error:', error)
  }

  const handleItemFound = (item: Item) => {
    setLastScannedItem(item)
    // Optionally navigate to item details
    // router.push(`/items/${item.id}`)
  }

  const handleError = (error: string) => {
    console.error('Search error:', error)
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        
        <div>
          <h1 className="text-2xl font-bold">Barcode Scanner</h1>
          <p className="text-muted-foreground">
            Scan or search for items using barcodes and QR codes
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6">
        <Button
          variant={activeTab === 'scanner' ? 'default' : 'outline'}
          onClick={() => setActiveTab('scanner')}
          className="flex items-center gap-2"
        >
          <Scan className="h-4 w-4" />
          Scanner
        </Button>
        
        <Button
          variant={activeTab === 'search' ? 'default' : 'outline'}
          onClick={() => setActiveTab('search')}
          className="flex items-center gap-2"
        >
          <Search className="h-4 w-4" />
          Search
        </Button>
      </div>

      {/* Content */}
      <div className="space-y-6">
        {activeTab === 'scanner' && (
          <div className="space-y-6">
            <BarcodeScanner
              onScanSuccess={handleScanSuccess}
              onScanError={handleScanError}
              isActive={activeTab === 'scanner'}
            />
            
            {/* Auto-search when barcode is scanned */}
            <BarcodeSearch
              onItemFound={handleItemFound}
              onError={handleError}
              showScanner={false}
            />
          </div>
        )}

        {activeTab === 'search' && (
          <BarcodeSearch
            onItemFound={handleItemFound}
            onError={handleError}
            showScanner={true}
          />
        )}

        {/* Recent Scan Results */}
        {lastScannedItem && (
          <Card className="border-2 border-primary/20">
            <CardHeader>
              <CardTitle className="text-lg">Recently Found Item</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <h3 className="font-semibold">{lastScannedItem.name}</h3>
                {lastScannedItem.description && (
                  <p className="text-sm text-muted-foreground">
                    {lastScannedItem.description}
                  </p>
                )}
                <div className="flex gap-2">
                  <span className="text-sm">
                    <strong>Category:</strong> {lastScannedItem.category}
                  </span>
                  <span className="text-sm">
                    <strong>Status:</strong> {lastScannedItem.status}
                  </span>
                </div>
                <div className="pt-2">
                  <Button
                    size="sm"
                    onClick={() => router.push(`/items/${lastScannedItem.id}`)}
                  >
                    View Details
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Instructions */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="text-lg">How to Use</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-start gap-2">
            <Scan className="h-4 w-4 mt-0.5 text-muted-foreground" />
            <div>
              <strong>Scanner Tab:</strong> Use your camera to scan barcodes and QR codes directly. 
              Position the code within the scanning area and wait for automatic detection.
            </div>
          </div>
          
          <div className="flex items-start gap-2">
            <Search className="h-4 w-4 mt-0.5 text-muted-foreground" />
            <div>
              <strong>Search Tab:</strong> Manually enter a barcode or use the scan button to search for items. 
              Useful when you have the code but can&apos;t use the camera scanner.
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-muted rounded-lg">
            <p className="text-xs text-muted-foreground">
              <strong>Supported formats:</strong> QR codes, EAN-13, EAN-8, Code 128, Code 39, Code 93, 
              Codabar, ITF, UPC-A, and UPC-E
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
