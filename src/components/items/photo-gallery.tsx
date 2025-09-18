'use client'

import { useState } from 'react'
import Image from 'next/image'
import { AnimatedButton } from '@/components/ui/animated-button'
import { AnimatedCard } from '@/components/ui/animated-card'
import { Badge } from '@/components/ui/badge'
import { motion, AnimatePresence } from 'framer-motion'
import { fadeInUp } from '@/lib/animations'
import { ChevronLeft, ChevronRight, X, ZoomIn } from 'lucide-react'

interface PhotoGalleryProps {
  images: string[]
  itemName: string
  status: string
}

export function PhotoGallery({ images, itemName, status }: PhotoGalleryProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Use placeholder if no images
  const displayImages = images.length > 0 ? images : ['/placeholder-item.png']
  const selectedImage = displayImages[selectedImageIndex]

  const nextImage = () => {
    setSelectedImageIndex((prev) => 
      prev === displayImages.length - 1 ? 0 : prev + 1
    )
  }

  const previousImage = () => {
    setSelectedImageIndex((prev) => 
      prev === 0 ? displayImages.length - 1 : prev - 1
    )
  }

  const openFullscreen = () => {
    setIsFullscreen(true)
  }

  const closeFullscreen = () => {
    setIsFullscreen(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') nextImage()
    if (e.key === 'ArrowLeft') previousImage()
    if (e.key === 'Escape') closeFullscreen()
  }

  return (
    <div className="space-y-6">
      {/* Main Image Display */}
      <AnimatedCard className="relative overflow-hidden bg-muted/30 border-border/50 shadow-soft-shadow dark:shadow-dark-shadow">
        <motion.div 
          variants={fadeInUp}
          className="relative h-96 w-full cursor-zoom-in group"
          onClick={openFullscreen}
          onKeyDown={handleKeyDown}
          tabIndex={0}
          role="button"
          aria-label="Open image in fullscreen"
        >
          <Image
            src={selectedImage}
            alt={`${itemName} - Image ${selectedImageIndex + 1}`}
            fill
            className="object-contain transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, 50vw"
            priority
          />
          
          {/* Gradient Overlays */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent pointer-events-none" />
          
          {/* Status Badge Overlay */}
          <motion.div 
            className="absolute top-4 right-4"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
          >
            <Badge 
              variant={status === 'AVAILABLE' ? 'default' : 'secondary'}
              className={`backdrop-blur-sm shadow-sm font-medium ${
                status === 'AVAILABLE' 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
                  : status === 'BORROWED'
                  ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800'
                  : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800'
              }`}
            >
              {status.toLowerCase().replace('_', ' ')}
            </Badge>
          </motion.div>

          {/* Zoom Icon */}
          <motion.div 
            className="absolute top-4 left-4 opacity-0 group-hover:opacity-100 transition-opacity"
            initial={{ opacity: 0 }}
            whileHover={{ scale: 1.1 }}
          >
            <div className="p-2 bg-background/80 backdrop-blur-sm rounded-xl shadow-sm">
              <ZoomIn className="h-4 w-4 text-muted-foreground" />
            </div>
          </motion.div>

          {/* Navigation Arrows */}
          {displayImages.length > 1 && (
            <>
              <motion.div
                className="absolute left-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <AnimatedButton
                  variant="secondary"
                  size="icon"
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation()
                    previousImage()
                  }}
                  className="bg-background/80 backdrop-blur-sm border-border/50 shadow-sm hover:bg-background/90"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="h-4 w-4" />
                </AnimatedButton>
              </motion.div>
              <motion.div
                className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <AnimatedButton
                  variant="secondary"
                  size="icon"
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation()
                    nextImage()
                  }}
                  className="bg-background/80 backdrop-blur-sm border-border/50 shadow-sm hover:bg-background/90"
                  aria-label="Next image"
                >
                  <ChevronRight className="h-4 w-4" />
                </AnimatedButton>
              </motion.div>
            </>
          )}

          {/* Image Counter */}
          {displayImages.length > 1 && (
            <motion.div 
              className="absolute bottom-4 left-1/2 -translate-x-1/2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Badge variant="secondary" className="bg-background/80 backdrop-blur-sm text-foreground border-border/50 shadow-sm">
                {selectedImageIndex + 1} / {displayImages.length}
              </Badge>
            </motion.div>
          )}
        </motion.div>
      </AnimatedCard>

      {/* Thumbnail Strip */}
      {displayImages.length > 1 && (
        <motion.div 
          className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide"
          variants={fadeInUp}
          initial="hidden"
          animate="visible"
        >
          {displayImages.map((image, index) => (
            <motion.button
              key={index}
              onClick={() => setSelectedImageIndex(index)}
              className={`relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-2xl border-2 transition-all duration-300 ${
                index === selectedImageIndex
                  ? 'border-primary ring-2 ring-primary/20 scale-105'
                  : 'border-border/50 hover:border-border'
              }`}
              aria-label={`View image ${index + 1}`}
              whileHover={{ scale: index === selectedImageIndex ? 1.05 : 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <Image
                src={image}
                alt={`${itemName} thumbnail ${index + 1}`}
                fill
                className="object-cover transition-transform duration-300"
                sizes="80px"
              />
            </motion.button>
          ))}
        </motion.div>
      )}

      {/* Fullscreen Modal */}
      <AnimatePresence>
        {isFullscreen && (
          <motion.div 
            className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeFullscreen}
            onKeyDown={handleKeyDown}
            tabIndex={0}
            role="dialog"
            aria-modal="true"
            aria-label="Fullscreen image view"
          >
            {/* Close Button */}
            <motion.div
              className="absolute top-4 right-4 z-10"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
            >
              <AnimatedButton
                variant="secondary"
                size="icon"
                onClick={closeFullscreen}
                className="bg-background/90 backdrop-blur-sm border-border/50 shadow-lg hover:bg-background"
                aria-label="Close fullscreen"
              >
                <X className="h-4 w-4" />
              </AnimatedButton>
            </motion.div>

            {/* Fullscreen Image */}
            <motion.div 
              className="relative w-full h-full max-w-7xl max-h-full"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", damping: 20 }}
            >
              <Image
                src={selectedImage}
                alt={`${itemName} - Fullscreen view`}
                fill
                className="object-contain"
                sizes="100vw"
                onClick={(e) => e.stopPropagation()}
              />

              {/* Fullscreen Navigation */}
              {displayImages.length > 1 && (
                <>
                  <motion.div
                    className="absolute left-4 top-1/2 -translate-y-1/2"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <AnimatedButton
                      variant="secondary"
                      size="lg"
                      onClick={(e: React.MouseEvent) => {
                        e.stopPropagation()
                        previousImage()
                      }}
                      className="bg-background/90 backdrop-blur-sm border-border/50 shadow-lg hover:bg-background"
                      aria-label="Previous image"
                    >
                      <ChevronLeft className="h-6 w-6" />
                    </AnimatedButton>
                  </motion.div>
                  <motion.div
                    className="absolute right-4 top-1/2 -translate-y-1/2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <AnimatedButton
                      variant="secondary"
                      size="lg"
                      onClick={(e: React.MouseEvent) => {
                        e.stopPropagation()
                        nextImage()
                      }}
                      className="bg-background/90 backdrop-blur-sm border-border/50 shadow-lg hover:bg-background"
                      aria-label="Next image"
                    >
                      <ChevronRight className="h-6 w-6" />
                    </AnimatedButton>
                  </motion.div>
                </>
              )}

              {/* Fullscreen Counter */}
              {displayImages.length > 1 && (
                <motion.div 
                  className="absolute bottom-4 left-1/2 -translate-x-1/2"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <Badge variant="secondary" className="bg-background/90 backdrop-blur-sm text-foreground border-border/50 text-lg px-6 py-2 shadow-lg">
                    {selectedImageIndex + 1} / {displayImages.length}
                  </Badge>
                </motion.div>
              )}
            </motion.div>

            {/* Instructions */}
            <motion.div 
              className="absolute bottom-4 right-4 text-white/70 text-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <p>Use arrow keys to navigate • ESC to close</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
