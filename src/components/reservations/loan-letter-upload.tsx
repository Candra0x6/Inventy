'use client'

import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { 
  Upload, 
  FileText, 
  X, 
  AlertCircle, 
  Download,
  Trash2,
  Loader2
} from 'lucide-react'
import { AnimatedButton } from '@/components/ui/animated-button'
import { AnimatedCard } from '@/components/ui/animated-card'
import { Badge } from '@/components/ui/badge'
import { fadeInUp } from '@/lib/animations'
import { getFileTypeIcon, formatFileSize } from '@/lib/supabase/file-upload'

interface LoanLetterUploadProps {
  reservationId: string
  existingFile?: {
    url: string
    fileName: string
    uploadedAt: string
  }
  onFileUploaded: (fileData: { url: string; fileName: string }) => void
  onFileDeleted: () => void
  disabled?: boolean
  className?: string
}

interface FileUploadState {
  file: File | null
  uploading: boolean
  error: string | null
  preview: string | null
  dragActive: boolean
}

const ACCEPTED_FILE_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
]

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export function LoanLetterUpload({
  reservationId,
  existingFile,
  onFileUploaded,
  onFileDeleted,
  disabled = false,
  className = ''
}: LoanLetterUploadProps) {
  const [uploadState, setUploadState] = useState<FileUploadState>({
    file: null,
    uploading: false,
    error: null,
    preview: null,
    dragActive: false
  })

  const [deleting, setDeleting] = useState(false)

  const validateFile = (file: File): string | null => {
    if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
      return 'File type not supported. Please upload PDF, DOC, DOCX, or image files.'
    }
    
    if (file.size > MAX_FILE_SIZE) {
      return `File size must be less than ${formatFileSize(MAX_FILE_SIZE)}`
    }
    
    return null
  }

  const handleFileSelect = useCallback((file: File) => {
    if (disabled) return

    const error = validateFile(file)
    if (error) {
      setUploadState(prev => ({ ...prev, error, file: null, preview: null }))
      return
    }

    // Create preview for images
    let preview: string | null = null
    if (file.type.startsWith('image/')) {
      preview = URL.createObjectURL(file)
    }

    setUploadState(prev => ({
      ...prev,
      file,
      error: null,
      preview
    }))
  }, [disabled])

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setUploadState(prev => ({ ...prev, dragActive: false }))
    
    if (disabled) return

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }, [disabled, handleFileSelect])

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    if (!disabled) {
      setUploadState(prev => ({ ...prev, dragActive: true }))
    }
  }, [disabled])

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setUploadState(prev => ({ ...prev, dragActive: false }))
  }, [])

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  const uploadFile = async () => {
    if (!uploadState.file || disabled) return

    setUploadState(prev => ({ ...prev, uploading: true, error: null }))

    try {
      const formData = new FormData()
      formData.append('file', uploadState.file)
      formData.append('reservationId', reservationId)

      const response = await fetch('/api/reservations/loan-letter/upload', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed')
      }

      onFileUploaded({
        url: result.url,
        fileName: result.fileName
      })

      // Clear the upload state
      setUploadState({
        file: null,
        uploading: false,
        error: null,
        preview: null,
        dragActive: false
      })
    } catch (error) {
      setUploadState(prev => ({
        ...prev,
        uploading: false,
        error: error instanceof Error ? error.message : 'Upload failed'
      }))
    }
  }

  const deleteFile = async () => {
    if (!existingFile || disabled) return

    setDeleting(true)
    try {
      const response = await fetch('/api/reservations/loan-letter/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          reservationId
        })
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Delete failed')
      }

      onFileDeleted()
    } catch (error) {
      console.error('Error deleting file:', error)
      // You might want to show an error toast here
    } finally {
      setDeleting(false)
    }
  }

  const clearFile = () => {
    if (uploadState.preview) {
      URL.revokeObjectURL(uploadState.preview)
    }
    setUploadState({
      file: null,
      uploading: false,
      error: null,
      preview: null,
      dragActive: false
    })
  }

  return (
    <AnimatedCard className={`p-6 bg-gradient-to-br from-background to-muted/30 ${className}`}>
      <motion.div variants={fadeInUp} className="space-y-6">
        <div>
          <h4 className="text-lg font-semibold mb-2 flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Loan Letter Upload
          </h4>
          <p className="text-sm text-muted-foreground">
            Upload your official loan letter or authorization document (PDF, DOC, or image files up to 10MB)
          </p>
        </div>

        {/* Existing File Display */}
        {existingFile && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-200 dark:border-emerald-800"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">
                  {getFileTypeIcon(existingFile.fileName)}
                </span>
                <div>
                  <p className="font-medium text-emerald-800 dark:text-emerald-300">
                    {existingFile.fileName}
                  </p>
                  <p className="text-sm text-emerald-600 dark:text-emerald-400">
                    Uploaded {new Date(existingFile.uploadedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <AnimatedButton
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(existingFile.url, '_blank')}
                  disabled={disabled}
                >
                  <Download className="h-4 w-4 mr-1" />
                  View
                </AnimatedButton>
                <AnimatedButton
                  variant="outline"
                  size="sm"
                  onClick={deleteFile}
                  disabled={disabled || deleting}
                  className="text-red-600 hover:text-red-700"
                >
                  {deleting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </AnimatedButton>
              </div>
            </div>
          </motion.div>
        )}

        {/* Upload Area */}
        {!existingFile && (
          <>
            <div
              className={`
                relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200
                ${uploadState.dragActive 
                  ? 'border-primary bg-primary/5' 
                  : 'border-border hover:border-primary/50'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => !disabled && document.getElementById('loan-letter-input')?.click()}
            >
              <input
                id="loan-letter-input"
                type="file"
                accept={ACCEPTED_FILE_TYPES.join(',')}
                onChange={handleFileInputChange}
                className="hidden"
                disabled={disabled}
              />
              
              {uploadState.file ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-center">
                    {uploadState.preview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={uploadState.preview}
                        alt="Preview"
                        className="max-h-32 max-w-48 object-contain rounded border"
                      />
                    ) : (
                      <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                        <span className="text-3xl">
                          {getFileTypeIcon(uploadState.file.name)}
                        </span>
                        <div className="text-left">
                          <p className="font-medium">{uploadState.file.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatFileSize(uploadState.file.size)}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-3 justify-center">
                    <AnimatedButton
                      onClick={uploadFile}
                      disabled={uploadState.uploading || disabled}
                      loading={uploadState.uploading}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload File
                    </AnimatedButton>
                    <AnimatedButton
                      variant="outline"
                      onClick={clearFile}
                      disabled={uploadState.uploading || disabled}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </AnimatedButton>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
                  <div>
                    <p className="text-lg font-medium">Drop your loan letter here</p>
                    <p className="text-sm text-muted-foreground">
                      or click to select a file
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    PDF, DOC, DOCX, JPG, PNG up to 10MB
                  </Badge>
                </div>
              )}
            </div>

            {/* Error Display */}
            {uploadState.error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 rounded-lg border border-red-200 dark:border-red-800"
              >
                <AlertCircle className="h-4 w-4" />
                <p className="text-sm">{uploadState.error}</p>
              </motion.div>
            )}
          </>
        )}
      </motion.div>
    </AnimatedCard>
  )
}
