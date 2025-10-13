import { supabaseAdmin } from './server'

export interface FileUploadOptions {
  bucket: string
  folder?: string
  allowedTypes?: string[]
  maxSizeInBytes?: number
}

export interface FileUploadResult {
  success: boolean
  url?: string
  error?: string
  fileName?: string
  filePath?: string
}

const LOAN_LETTERS_BUCKET = 'loan-letters'

export async function uploadFileToSupabase(
  file: File,
  options: FileUploadOptions
): Promise<FileUploadResult> {
  try {
    // Validate file type
    if (options.allowedTypes && !options.allowedTypes.includes(file.type)) {
      return {
        success: false,
        error: `File type ${file.type} is not allowed. Allowed types: ${options.allowedTypes.join(', ')}`
      }
    }

    // Validate file size
    if (options.maxSizeInBytes && file.size > options.maxSizeInBytes) {
      const maxSizeMB = options.maxSizeInBytes / (1024 * 1024)
      return {
        success: false,
        error: `File size ${(file.size / (1024 * 1024)).toFixed(2)}MB exceeds maximum allowed size of ${maxSizeMB}MB`
      }
    }

    // Generate unique filename
    const fileExt = file.name.split('.').pop()
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2)
    const uniqueFileName = `${timestamp}-${randomString}.${fileExt}`
    
    // Create file path with folder if specified
    const filePath = options.folder 
      ? `${options.folder}/${uniqueFileName}`
      : uniqueFileName

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const fileBuffer = new Uint8Array(arrayBuffer)

    // Upload to Supabase Storage
    const { data, error } = await supabaseAdmin.storage
      .from(options.bucket)
      .upload(filePath, fileBuffer, {
        contentType: file.type,
        duplex: 'half'
      })

    if (error) {
      console.error('Supabase upload error:', error)
      return {
        success: false,
        error: `Upload failed: ${error.message}`
      }
    }

    // Get public URL
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from(options.bucket)
      .getPublicUrl(data.path)

    return {
      success: true,
      url: publicUrl,
      fileName: file.name,
      filePath: data.path
    }
  } catch (error) {
    console.error('File upload error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

export async function uploadLoanLetter(file: File, reservationId: string): Promise<FileUploadResult> {
  const options: FileUploadOptions = {
    bucket: LOAN_LETTERS_BUCKET,
    folder: `reservations/${reservationId}`,
    allowedTypes: [
      'application/pdf',
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/webp',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ],
    maxSizeInBytes: 10 * 1024 * 1024 // 10MB
  }

  return uploadFileToSupabase(file, options)
}

export async function deleteFileFromSupabase(
  bucket: string,
  filePath: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabaseAdmin.storage
      .from(bucket)
      .remove([filePath])

    if (error) {
      return {
        success: false,
        error: `Delete failed: ${error.message}`
      }
    }

    return { success: true }
  } catch (error) {
    console.error('File delete error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

export async function deleteLoanLetter(filePath: string): Promise<{ success: boolean; error?: string }> {
  return deleteFileFromSupabase(LOAN_LETTERS_BUCKET, filePath)
}

// Utility function to get file type icon
export function getFileTypeIcon(fileName: string): string {
  const extension = fileName.split('.').pop()?.toLowerCase()
  
  switch (extension) {
    case 'pdf':
      return '📄'
    case 'doc':
    case 'docx':
      return '📝'
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'webp':
      return '🖼️'
    default:
      return '📎'
  }
}

// Utility function to format file size
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}
