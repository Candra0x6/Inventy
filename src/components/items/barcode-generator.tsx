'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { Download, Copy, RefreshCw, Barcode as BarcodeIcon, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  generateBarcode, 
  generateRandomBarcode, 
  downloadBarcode, 
  copyBarcodeToClipboard,
  getSupportedFormats,
  validateBarcodeFormat,
  type BarcodeGenerationOptions 
} from '@/lib/barcode-generator'

type BarcodeFormat = 'CODE128' | 'EAN13' | 'EAN8' | 'UPC' | 'CODE39' | 'ITF14' | 'pharmacode'

interface BarcodeGeneratorProps {
  initialValue?: string
  onGenerate?: (barcode: string) => void
  className?: string
}

export function BarcodeGenerator({ 
  initialValue = '', 
  onGenerate,
  className = '' 
}: BarcodeGeneratorProps) {
  const [value, setValue] = useState(initialValue)
  const [format, setFormat] = useState<BarcodeFormat>('CODE128')
  const [barcodeImage, setBarcodeImage] = useState<string | null>(null)
  const [isValid, setIsValid] = useState(true)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [options, setOptions] = useState<BarcodeGenerationOptions>({
    format: 'CODE128',
    width: 2,
    height: 100,
    displayValue: true,
    fontSize: 14,
    background: '#ffffff',
    lineColor: '#000000'
  })

  const supportedFormats = getSupportedFormats()

  const generateBarcodeImage = useCallback(() => {
    if (!value.trim()) {
      setBarcodeImage(null)
      setIsValid(true)
      return
    }

    const isValidFormat = validateBarcodeFormat(value, format)
    setIsValid(isValidFormat)

    if (isValidFormat) {
      const result = generateBarcode(value, { ...options, format })
      
      if (result.success && result.dataUrl) {
        setBarcodeImage(result.dataUrl)
        if (onGenerate) {
          onGenerate(value)
        }
      } else {
        setBarcodeImage(null)
        setIsValid(false)
      }
    } else {
      setBarcodeImage(null)
    }
  }, [value, format, options, onGenerate])

  useEffect(() => {
    if (value.trim()) {
      generateBarcodeImage()
    } else {
      setBarcodeImage(null)
      setIsValid(true)
    }
  }, [value, format, options, generateBarcodeImage])

  const handleGenerateRandom = () => {
    let length = 12
    
    switch (format) {
      case 'EAN13':
        length = 13
        break
      case 'EAN8':
        length = 8
        break
      case 'UPC':
        length = 12
        break
      case 'ITF14':
        length = 14
        break
      case 'pharmacode':
        length = 4
        break
      default:
        length = 12
    }
    
    const randomValue = generateRandomBarcode(length)
    setValue(randomValue)
  }

  const handleDownload = () => {
    if (value.trim() && isValid) {
      const filename = `barcode-${value}-${Date.now()}.png`
      downloadBarcode(value, filename, { ...options, format })
    }
  }

  const handleCopyToClipboard = async () => {
    if (value.trim() && isValid) {
      const success = await copyBarcodeToClipboard(value, { ...options, format })
      if (success) {
        // You could show a toast notification here
        console.log('Barcode copied to clipboard')
      }
    }
  }

  const getValidationMessage = () => {
    if (!value.trim()) return null
    
    const formatInfo = supportedFormats.find(f => f.value === format)
    
    switch (format) {
      case 'EAN13':
        return !isValid ? 'EAN-13 requires exactly 13 digits' : null
      case 'EAN8':
        return !isValid ? 'EAN-8 requires exactly 8 digits' : null
      case 'UPC':
        return !isValid ? 'UPC-A requires exactly 12 digits' : null
      case 'ITF14':
        return !isValid ? 'ITF-14 requires exactly 14 digits' : null
      case 'CODE39':
        return !isValid ? 'Code 39 allows A-Z, 0-9, and -. $/+%* characters only' : null
      case 'pharmacode':
        return !isValid ? 'Pharmacode requires a number between 3 and 131070' : null
      default:
        return !isValid ? `Invalid format for ${formatInfo?.label || format}` : null
    }
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarcodeIcon className="h-5 w-5" />
          Barcode Generator
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Input Fields */}
        <div className="space-y-2">
          <Label htmlFor="barcode-value">Barcode Value</Label>
          <div className="flex gap-2">
            <Input
              id="barcode-value"
              type="text"
              placeholder="Enter barcode value..."
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className={!isValid && value.trim() ? 'border-red-300' : ''}
            />
            <Button
              variant="outline"
              onClick={handleGenerateRandom}
              className="flex items-center gap-1"
            >
              <RefreshCw className="h-4 w-4" />
              Random
            </Button>
          </div>
          
          {/* Validation Message */}
          {getValidationMessage() && (
            <p className="text-sm text-red-600">{getValidationMessage()}</p>
          )}
        </div>

        {/* Format Selection */}
        <div className="space-y-2">
          <Label htmlFor="barcode-format">Format</Label>
          <select
            id="barcode-format"
            value={format}
            onChange={(e) => {
              const newFormat = e.target.value as BarcodeFormat
              setFormat(newFormat)
              setOptions(prev => ({ ...prev, format: newFormat }))
            }}
            className="w-full p-2 border border-gray-300 rounded-md"
          >
            {supportedFormats.map((fmt) => (
              <option key={fmt.value} value={fmt.value}>
                {fmt.label} - {fmt.description}
              </option>
            ))}
          </select>
        </div>

        {/* Advanced Options */}
        <div className="space-y-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2"
          >
            <Settings className="h-4 w-4" />
            Advanced Options
          </Button>
          
          {showAdvanced && (
            <div className="grid grid-cols-2 gap-3 p-3 border rounded-lg bg-gray-50">
              <div>
                <Label htmlFor="width">Width</Label>
                <Input
                  id="width"
                  type="number"
                  min="1"
                  max="10"
                  value={options.width}
                  onChange={(e) => setOptions(prev => ({ 
                    ...prev, 
                    width: parseInt(e.target.value) || 2 
                  }))}
                />
              </div>
              
              <div>
                <Label htmlFor="height">Height</Label>
                <Input
                  id="height"
                  type="number"
                  min="50"
                  max="300"
                  value={options.height}
                  onChange={(e) => setOptions(prev => ({ 
                    ...prev, 
                    height: parseInt(e.target.value) || 100 
                  }))}
                />
              </div>
              
              <div>
                <Label htmlFor="fontSize">Font Size</Label>
                <Input
                  id="fontSize"
                  type="number"
                  min="8"
                  max="24"
                  value={options.fontSize}
                  onChange={(e) => setOptions(prev => ({ 
                    ...prev, 
                    fontSize: parseInt(e.target.value) || 14 
                  }))}
                />
              </div>
              
              <div>
                <Label htmlFor="displayValue">Show Value</Label>
                <input
                  id="displayValue"
                  type="checkbox"
                  checked={options.displayValue}
                  onChange={(e) => setOptions(prev => ({ 
                    ...prev, 
                    displayValue: e.target.checked 
                  }))}
                  className="mt-2"
                />
              </div>
            </div>
          )}
        </div>

        {/* Generated Barcode Display */}
        {barcodeImage && isValid && (
          <div className="space-y-3">
            <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg bg-white text-center">
              <Image 
                src={barcodeImage} 
                alt={`Barcode: ${value}`}
                width={300}
                height={100}
                className="mx-auto max-w-full h-auto"
                unoptimized={true}
              />
            </div>
            
            {/* Action Buttons */}
            <div className="flex gap-2 justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                className="flex items-center gap-1"
              >
                <Download className="h-4 w-4" />
                Download
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyToClipboard}
                className="flex items-center gap-1"
              >
                <Copy className="h-4 w-4" />
                Copy
              </Button>
            </div>
          </div>
        )}

        {/* No Preview Message */}
        {!barcodeImage && value.trim() && (
          <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 text-center text-gray-500">
            {isValid ? 'Generating barcode...' : 'Invalid barcode format'}
          </div>
        )}

        {/* Format Description */}
        {format && (
          <div className="text-xs text-gray-600 p-2 bg-gray-50 rounded">
            <strong>Format:</strong> {supportedFormats.find(f => f.value === format)?.description}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
