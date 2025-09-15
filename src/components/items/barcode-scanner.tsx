'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Camera, Square, Zap, AlertCircle, CheckCircle2 } from 'lucide-react'

interface BarcodeScannerProps {
  onScanSuccess: (barcode: string) => void
  onScanError?: (error: string) => void
  isActive?: boolean
  className?: string
}

interface ScanResult {
  barcode: string
  format: string
  timestamp: Date
}

export function BarcodeScanner({ 
  onScanSuccess, 
  onScanError, 
  isActive = false,
  className = '' 
}: BarcodeScannerProps) {
  const [isScanning, setIsScanning] = useState(false)
  const [scanError, setScanError] = useState<string | null>(null)
  const [lastScan, setLastScan] = useState<ScanResult | null>(null)
  const [cameraPermission, setCameraPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt')
  const scannerRef = useRef<Html5QrcodeScanner | null>(null)
  const elementId = 'barcode-scanner-container'

  const stopScanner = useCallback(() => {
    if (scannerRef.current) {
      try {
        scannerRef.current.clear()
        scannerRef.current = null
      } catch (error) {
        console.warn('Error stopping scanner:', error)
      }
    }
    setIsScanning(false)
  }, [])

  const checkCameraPermission = async () => {
    try {
      const permission = await navigator.permissions.query({ name: 'camera' as PermissionName })
      setCameraPermission(permission.state)
      
      permission.addEventListener('change', () => {
        setCameraPermission(permission.state)
      })
    } catch {
      console.warn('Permission API not supported')
    }
  }

  const requestCameraPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      stream.getTracks().forEach(track => track.stop())
      setCameraPermission('granted')
      return true
    } catch (error) {
      setCameraPermission('denied')
      setScanError('Camera access denied. Please enable camera permissions.')
      return false
    }
  }

  const startScanner = useCallback(async () => {
    if (isScanning || scannerRef.current) return

    // Check camera permission first
    if (cameraPermission !== 'granted') {
      const granted = await requestCameraPermission()
      if (!granted) return
    }

    try {
      setScanError(null)
      setIsScanning(true)

      const scanner = new Html5QrcodeScanner(
        elementId,
        {
          fps: 10,
          qrbox: { width: 300, height: 200 },
          aspectRatio: 1.777778, // 16:9
          formatsToSupport: [
            Html5QrcodeSupportedFormats.QR_CODE,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.CODE_93,
            Html5QrcodeSupportedFormats.CODABAR,
            Html5QrcodeSupportedFormats.ITF,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
          ],
          showTorchButtonIfSupported: true,
          showZoomSliderIfSupported: true,
        },
        false // verbose
      )

      scanner.render(
        (decodedText, decodedResult) => {
          const scanResult: ScanResult = {
            barcode: decodedText,
            format: decodedResult.result.format?.formatName || 'Unknown',
            timestamp: new Date()
          }
          
          setLastScan(scanResult)
          onScanSuccess(decodedText)
          
          // Auto-stop scanner after successful scan
          setTimeout(() => {
            stopScanner()
          }, 1000)
        },
        (errorMessage) => {
          // Only log errors that aren't "No QR code found"
          if (!errorMessage.includes('No MultiFormat Readers were able to detect the code')) {
            console.warn('Scan error:', errorMessage)
            if (onScanError) {
              onScanError(errorMessage)
            }
          }
        }
      )

      scannerRef.current = scanner
    } catch (error) {
      console.error('Failed to start scanner:', error)
      setScanError('Failed to start camera. Please check permissions.')
      setIsScanning(false)
    }
  }, [isScanning, cameraPermission, onScanSuccess, onScanError, stopScanner])

  useEffect(() => {
    // Check camera permissions on mount
    checkCameraPermission()
    
    return () => {
      stopScanner()
    }
  }, [stopScanner])

  useEffect(() => {
    if (isActive && !isScanning) {
      startScanner()
    } else if (!isActive && isScanning) {
      stopScanner()
    }
  }, [isActive, isScanning, startScanner, stopScanner])

  const toggleScanner = () => {
    if (isScanning) {
      stopScanner()
    } else {
      startScanner()
    }
  }

  return (
    <Card className={`w-full max-w-2xl mx-auto ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5" />
          Barcode Scanner
          {isScanning && (
            <Badge variant="secondary" className="animate-pulse">
              <Zap className="h-3 w-3 mr-1" />
              Scanning
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Camera Permission Status */}
        {cameraPermission === 'denied' && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <span className="text-sm text-red-700">
              Camera access is required for barcode scanning. Please enable camera permissions.
            </span>
          </div>
        )}

        {/* Scanner Container */}
        <div className="relative">
          <div 
            id={elementId} 
            className={`w-full ${isScanning ? 'block' : 'hidden'}`}
            style={{ minHeight: '300px' }}
          />
          
          {!isScanning && (
            <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
              <Square className="h-16 w-16 text-gray-400 mb-4" />
              <p className="text-gray-600 text-center mb-4">
                Click the button below to start scanning barcodes and QR codes
              </p>
              <Button 
                onClick={toggleScanner}
                disabled={cameraPermission === 'denied'}
                className="flex items-center gap-2"
              >
                <Camera className="h-4 w-4" />
                Start Scanner
              </Button>
            </div>
          )}
        </div>

        {/* Controls */}
        {isScanning && (
          <div className="flex justify-center">
            <Button 
              onClick={stopScanner}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Square className="h-4 w-4" />
              Stop Scanner
            </Button>
          </div>
        )}

        {/* Last Scan Result */}
        {lastScan && (
          <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <div className="flex-1">
              <p className="text-sm font-medium text-green-800">
                Last scanned: {lastScan.barcode}
              </p>
              <p className="text-xs text-green-600">
                Format: {lastScan.format} • {lastScan.timestamp.toLocaleTimeString()}
              </p>
            </div>
          </div>
        )}

        {/* Error Display */}
        {scanError && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <span className="text-sm text-red-700">{scanError}</span>
          </div>
        )}

        {/* Scanner Tips */}
        <div className="text-xs text-gray-500 space-y-1">
          <p>• Hold the barcode steady within the scanning area</p>
          <p>• Ensure good lighting for better scan accuracy</p>
          <p>• Supported formats: QR, EAN-13, EAN-8, Code 128, Code 39, UPC-A/E</p>
        </div>
      </CardContent>
    </Card>
  )
}
