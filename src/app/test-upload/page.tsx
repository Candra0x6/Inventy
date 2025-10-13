'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { AnimatedCard } from '@/components/ui/animated-card'
import { LoanLetterUpload } from '@/components/reservations/loan-letter-upload'
import { fadeInUp } from '@/lib/animations'

export default function LoanLetterTestPage() {
  const [uploadedFile, setUploadedFile] = useState<{ url: string; fileName: string } | null>(null)

  const handleFileUploaded = (data: { url: string; fileName: string }) => {
    setUploadedFile(data)
  }

  const handleFileDeleted = () => {
    setUploadedFile(null)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold">Loan Letter Upload Test</h1>
            <p className="text-muted-foreground">
              Test the loan letter upload functionality
            </p>
          </div>

          <AnimatedCard className="p-8">
            <motion.div variants={fadeInUp} className="space-y-6">
              <h2 className="text-2xl font-semibold">Upload Test</h2>
              
              {/* Test Upload Component */}
              <LoanLetterUpload
                reservationId="test-reservation-id"
                existingFile={uploadedFile ? {
                  url: uploadedFile.url,
                  fileName: uploadedFile.fileName,
                  uploadedAt: new Date().toISOString()
                } : undefined}
                onFileUploaded={handleFileUploaded}
                onFileDeleted={handleFileDeleted}
              />

              {/* Display Upload Result */}
              {uploadedFile && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h3 className="font-semibold text-green-800 mb-2">Upload Successful!</h3>
                  <p className="text-green-700">
                    <strong>File:</strong> {uploadedFile.fileName}
                  </p>
                  <p className="text-green-700">
                    <strong>URL:</strong> {uploadedFile.url}
                  </p>
                </div>
              )}
            </motion.div>
          </AnimatedCard>
        </motion.div>
      </div>
    </div>
  )
}
