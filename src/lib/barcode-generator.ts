import JsBarcode from 'jsbarcode'

export interface BarcodeGenerationOptions {
  format?: 'CODE128' | 'EAN13' | 'EAN8' | 'UPC' | 'CODE39' | 'ITF14' | 'pharmacode'
  width?: number
  height?: number
  displayValue?: boolean
  fontSize?: number
  textMargin?: number
  background?: string
  lineColor?: string
}

export interface BarcodeResult {
  success: boolean
  dataUrl?: string
  error?: string
}

/**
 * Generate a barcode image as a data URL
 */
export function generateBarcode(
  value: string, 
  options: BarcodeGenerationOptions = {}
): BarcodeResult {
  try {
    if (!value || value.trim().length === 0) {
      return {
        success: false,
        error: 'Barcode value cannot be empty'
      }
    }

    // Create a canvas element
    const canvas = document.createElement('canvas')
    
    // Default options
    const defaultOptions: BarcodeGenerationOptions = {
      format: 'CODE128',
      width: 2,
      height: 100,
      displayValue: true,
      fontSize: 14,
      textMargin: 2,
      background: '#ffffff',
      lineColor: '#000000',
      ...options
    }

    // Generate barcode
    JsBarcode(canvas, value, {
      format: defaultOptions.format,
      width: defaultOptions.width,
      height: defaultOptions.height,
      displayValue: defaultOptions.displayValue,
      fontSize: defaultOptions.fontSize,
      textMargin: defaultOptions.textMargin,
      background: defaultOptions.background,
      lineColor: defaultOptions.lineColor,
    })

    // Convert to data URL
    const dataUrl = canvas.toDataURL('image/png')
    
    return {
      success: true,
      dataUrl
    }
  } catch (error) {
    console.error('Barcode generation error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate barcode'
    }
  }
}

/**
 * Generate a random barcode value
 */
export function generateRandomBarcode(length: number = 12): string {
  const digits = '0123456789'
  let result = ''
  
  for (let i = 0; i < length; i++) {
    result += digits.charAt(Math.floor(Math.random() * digits.length))
  }
  
  return result
}

/**
 * Validate barcode format
 */
export function validateBarcodeFormat(value: string, format: string): boolean {
  if (!value || value.trim().length === 0) {
    return false
  }

  const trimmedValue = value.trim()

  switch (format.toUpperCase()) {
    case 'CODE128':
      // CODE128 can contain ASCII characters 0-127
      return /^[\x00-\x7F]+$/.test(trimmedValue) && trimmedValue.length >= 1
    
    case 'EAN13':
      // EAN13 must be exactly 13 digits
      return /^\d{13}$/.test(trimmedValue)
    
    case 'EAN8':
      // EAN8 must be exactly 8 digits
      return /^\d{8}$/.test(trimmedValue)
    
    case 'UPC':
    case 'UPCA':
      // UPC-A must be exactly 12 digits
      return /^\d{12}$/.test(trimmedValue)
    
    case 'UPCE':
      // UPC-E must be exactly 6 or 8 digits
      return /^\d{6}$/.test(trimmedValue) || /^\d{8}$/.test(trimmedValue)
    
    case 'CODE39':
      // CODE39 can contain A-Z, 0-9, and some special characters
      return /^[A-Z0-9\-. $\/+%*]+$/.test(trimmedValue) && trimmedValue.length >= 1
    
    case 'ITF14':
      // ITF14 must be exactly 14 digits
      return /^\d{14}$/.test(trimmedValue)
    
    case 'PHARMACODE':
      // Pharmacode must be a number between 3 and 131070
      const num = parseInt(trimmedValue, 10)
      return !isNaN(num) && num >= 3 && num <= 131070
    
    default:
      // For unknown formats, just check if it's not empty
      return trimmedValue.length >= 1
  }
}

/**
 * Generate barcode with validation
 */
export function generateValidatedBarcode(
  value: string,
  options: BarcodeGenerationOptions = {}
): BarcodeResult {
  const format = options.format || 'CODE128'
  
  if (!validateBarcodeFormat(value, format)) {
    return {
      success: false,
      error: `Invalid barcode format for ${format}. Please check the value format requirements.`
    }
  }

  return generateBarcode(value, options)
}

/**
 * Download barcode as image file
 */
export function downloadBarcode(
  value: string,
  filename: string = 'barcode.png',
  options: BarcodeGenerationOptions = {}
): boolean {
  const result = generateBarcode(value, options)
  
  if (!result.success || !result.dataUrl) {
    console.error('Failed to generate barcode for download:', result.error)
    return false
  }

  try {
    // Create download link
    const link = document.createElement('a')
    link.download = filename
    link.href = result.dataUrl
    
    // Trigger download
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    return true
  } catch (error) {
    console.error('Failed to download barcode:', error)
    return false
  }
}

/**
 * Copy barcode data URL to clipboard
 */
export async function copyBarcodeToClipboard(
  value: string,
  options: BarcodeGenerationOptions = {}
): Promise<boolean> {
  const result = generateBarcode(value, options)
  
  if (!result.success || !result.dataUrl) {
    console.error('Failed to generate barcode for clipboard:', result.error)
    return false
  }

  try {
    // Convert data URL to blob
    const response = await fetch(result.dataUrl)
    const blob = await response.blob()
    
    // Copy to clipboard
    await navigator.clipboard.write([
      new ClipboardItem({
        [blob.type]: blob
      })
    ])
    
    return true
  } catch (error) {
    console.error('Failed to copy barcode to clipboard:', error)
    return false
  }
}

/**
 * Get supported barcode formats
 */
export function getSupportedFormats(): Array<{
  value: string
  label: string
  description: string
}> {
  return [
    {
      value: 'CODE128',
      label: 'Code 128',
      description: 'High-density barcode that can encode all 128 ASCII characters'
    },
    {
      value: 'EAN13',
      label: 'EAN-13',
      description: 'European Article Number, 13 digits for retail products'
    },
    {
      value: 'EAN8',
      label: 'EAN-8',
      description: 'Shorter version of EAN-13, 8 digits for small packages'
    },
    {
      value: 'UPC',
      label: 'UPC-A',
      description: 'Universal Product Code, 12 digits used in North America'
    },
    {
      value: 'CODE39',
      label: 'Code 39',
      description: 'Alphanumeric barcode commonly used in automotive and defense'
    },
    {
      value: 'ITF14',
      label: 'ITF-14',
      description: 'Interleaved 2 of 5, 14 digits for shipping containers'
    },
    {
      value: 'pharmacode',
      label: 'Pharmacode',
      description: 'Pharmaceutical barcode for medication packaging'
    }
  ]
}
