import { supabaseAdmin } from '@/lib/supabase/server'
import JsBarcode from 'jsbarcode'
import { createCanvas } from 'canvas'

export interface ServerBarcodeOptions {
  format?: 'CODE128' | 'EAN13' | 'EAN8' | 'UPC' | 'CODE39' | 'ITF14'
  width?: number
  height?: number
  displayValue?: boolean
  fontSize?: number
  background?: string
  lineColor?: string
}

/**
 * Generate barcode using JsBarcode and Canvas
 */
function generateBarcodeBuffer(value: string, options: ServerBarcodeOptions = {}): Buffer {
  const {
    format = 'CODE128',
    width = 2,
    height = 100,
    displayValue = true,
    fontSize = 14,
    background = '#ffffff',
    lineColor = '#000000'
  } = options

  // Create a canvas
  const canvas = createCanvas(400, height + (displayValue ? fontSize + 20 : 10))
  
  // Generate barcode using JsBarcode
  JsBarcode(canvas, value, {
    format,
    width,
    height,
    fontSize,
    background,
    lineColor,
    textMargin: 10,
    margin: 10
  })

  // Convert canvas to buffer
  return canvas.toBuffer('image/png')
}

/**
 * Upload barcode image to Supabase storage
 */
export async function uploadBarcodeToSupabase(
  value: string,
  itemId: string,
  options: ServerBarcodeOptions = {}
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    // Generate barcode buffer
    const barcodeBuffer = generateBarcodeBuffer(value, options)
    
    // Create filename
    const filename = `barcodes/${itemId}_${value}.png`
    
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
 * Generate and upload barcode for an item
 */
export async function generateAndUploadBarcode(
  itemId: string,
  options: ServerBarcodeOptions = {}
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
 * Generate barcode data URL (for immediate use)
 */
export function generateBarcodeDataUrl(value: string, options: ServerBarcodeOptions = {}): string {
  const barcodeBuffer = generateBarcodeBuffer(value, options)
  const base64 = barcodeBuffer.toString('base64')
  return `data:image/png;base64,${base64}`
}