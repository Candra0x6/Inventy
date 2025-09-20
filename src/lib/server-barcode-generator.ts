import { supabaseAdmin } from '@/lib/supabase/server'
import QRCode from 'qrcode'
import { createCanvas } from 'canvas'

export interface ServerQRCodeOptions {
  width?: number
  height?: number
  margin?: number
  color?: {
    dark?: string
    light?: string
  }
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H'
}

/**
 * Generate QR code using qrcode library
 */
async function generateQRCodeBuffer(value: string, options: ServerQRCodeOptions = {}): Promise<Buffer> {
  const {
    width = 256,
    height = 256,
    margin = 4,
    color = {
      dark: '#000000',
      light: '#FFFFFF'
    },
    errorCorrectionLevel = 'M'
  } = options

  // Create a canvas
  const canvas = createCanvas(width, height)

  // Generate QR code using qrcode library
  const qrOptions = {
    width,
    height,
    margin,
    color,
    errorCorrectionLevel
  }

  // Generate QR code on canvas
  await QRCode.toCanvas(canvas, value, qrOptions)

  // Convert canvas to buffer
  return canvas.toBuffer('image/png')
}

/**
 * Upload QR code image to Supabase storage
 */
export async function uploadBarcodeToSupabase(
  value: string,
  itemId: string,
  options: ServerQRCodeOptions = {}
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    // Generate barcode buffer
    const barcodeBuffer = await generateQRCodeBuffer(value, options)
    
    // Create filename
    const filename = `qrcodes/${itemId}_${value}.png`
    
    // Upload to Supabase storage
    const { error } = await supabaseAdmin.storage
      .from('item-images')
      .upload(filename, barcodeBuffer, {
        contentType: 'image/png',
        upsert: true
      })

    if (error) {
      console.error('Supabase upload error:', error)
      return {
        success: false,
        error: `Upload failed: ${error.message}`
      }
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from('item-images')
      .getPublicUrl(filename)

    return {
      success: true,
      url: urlData.publicUrl
    }

  } catch (error) {
    console.error('Barcode generation and upload error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

/**
 * Generate and upload QR code for an item
 */
export async function generateAndUploadBarcode(
  itemId: string,
  options: ServerQRCodeOptions = {}
): Promise<{ success: boolean; barcodeUrl?: string; barcodeValue?: string; error?: string }> {
  try {
    // Use item ID as barcode value
    const barcodeValue = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/items/${itemId}`
    
    // Upload barcode to Supabase
    const uploadResult = await uploadBarcodeToSupabase(barcodeValue, itemId, options)
    
    if (!uploadResult.success) {
      return {
        success: false,
        error: uploadResult.error
      }
    }

    return {
      success: true,
      barcodeUrl: uploadResult.url,
      barcodeValue
    }

  } catch (error) {
    console.error('Generate and upload barcode error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

/**
 * Generate QR code data URL (for immediate use)
 */
export async function generateBarcodeDataUrl(value: string, options: ServerQRCodeOptions = {}): Promise<string> {
  const barcodeBuffer = await generateQRCodeBuffer(value, options)
  const base64 = barcodeBuffer.toString('base64')
  return `data:image/png;base64,${base64}`
}