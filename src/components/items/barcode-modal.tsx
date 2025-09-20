'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AnimatedButton } from '@/components/ui/animated-button'
import { generateBarcode } from '@/lib/barcode-generator'
import { X, Download, Copy, Check } from 'lucide-react'
import { toast } from 'sonner'
import Image from 'next/image'

interface BarcodeModalProps {
  isOpen: boolean
  onClose: () => void
  itemName: string
  barcode: string | null
  itemId: string
}

export function BarcodeModal({ isOpen, onClose, itemName, barcode, itemId }: BarcodeModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [copied, setCopied] = useState(false)

 
  // Handle copy barcode value
  const handleCopyBarcode = async () => {
    if (barcode) {
      try {
        await navigator.clipboard.writeText(barcode)
        setCopied(true)
        toast.success('Barcode copied to clipboard')
        setTimeout(() => setCopied(false), 2000)
      } catch {
        toast.error('Failed to copy barcode')
      }
    }
  }

  // Handle download barcode image
  const handleDownloadBarcode = async () => {
    if (barcode) {
      try {
        // Fetch the image from the URL
        const response = await fetch(barcode)
        if (!response.ok) {
          throw new Error('Failed to fetch barcode image')
        }

        const blob = await response.blob()
        const url = URL.createObjectURL(blob)

        const link = document.createElement('a')
        link.href = url
        link.download = `${itemName.replace(/\s+/g, '_')}_barcode.png`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)

        // Clean up the blob URL
        URL.revokeObjectURL(url)

        toast.success('Barcode image downloaded')
      } catch (error) {
        console.error('Error downloading barcode:', error)
        toast.error('Failed to download barcode image')
      }
    }
  }
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Item Barcode</span>
            <AnimatedButton
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </AnimatedButton>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Item Info */}
          <div className="text-center space-y-2">
            <h3 className="font-semibold text-lg">{itemName}</h3>
            <p className="text-sm text-muted-foreground">
              ID: {itemId}
            </p>
          </div>

          {/* Barcode Display */}
          <div className="bg-white  rounded-2xl border-2 border-border/20 shadow-inner">
            <AnimatePresence mode="wait">
              {isLoading ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center justify-center h-32"
                >
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </motion.div>
              ) : barcode ? (
                <motion.div
                  key="barcode"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="w-full h-full"
                >
                  <Image
                    src={barcode}
                    alt={`Barcode for ${itemName}`}
                    width={300}
                    height={500}
                    className="w-full h-full max-w-xs mx-auto"
                    unoptimized={true}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="no-barcode"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center py-8"
                >
                  <div className="text-4xl opacity-20 mb-4">📊</div>
                  <p className="text-muted-foreground">No barcode available for this item</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Actions */}
          {barcode && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex gap-3"
            >
              <AnimatedButton
                variant="outline"
                onClick={handleCopyBarcode}
                className="flex-1"
                disabled={copied}
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Code
                  </>
                )}
              </AnimatedButton>
              <AnimatedButton
                variant="default"
                onClick={handleDownloadBarcode}
                className="flex-1"
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </AnimatedButton>
            </motion.div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}