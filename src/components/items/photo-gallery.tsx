'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

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
    <div className="space-y-4">
      {/* Main Image Display */}
      <Card className="relative overflow-hidden bg-gray-50">
        <div 
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
            className="object-contain transition-transform duration-200 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, 50vw"
            priority
          />
          
          {/* Status Overlay */}
          <div className="absolute top-4 right-4">
            <Badge 
              variant={status === 'AVAILABLE' ? 'default' : 'secondary'}
              className={
                status === 'AVAILABLE' 
                  ? 'bg-green-100 text-green-800 border-green-200'
                  : status === 'BORROWED'
                  ? 'bg-blue-100 text-blue-800 border-blue-200'
                  : 'bg-yellow-100 text-yellow-800 border-yellow-200'
              }
            >
              {status.toLowerCase().replace('_', ' ')}
            </Badge>
          </div>

          {/* Navigation Arrows */}
          {displayImages.length > 1 && (
            <>
              <Button
                variant="secondary"
                size="sm"
                className="absolute left-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation()
                  previousImage()
                }}
                aria-label="Previous image"
              >
                ←
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation()
                  nextImage()
                }}
                aria-label="Next image"
              >
                →
              </Button>
            </>
          )}

          {/* Image Counter */}
          {displayImages.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
              <Badge variant="secondary" className="bg-black/50 text-white border-0">
                {selectedImageIndex + 1} / {displayImages.length}
              </Badge>
            </div>
          )}
        </div>
      </Card>

      {/* Thumbnail Strip */}
      {displayImages.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {displayImages.map((image, index) => (
            <button
              key={index}
              onClick={() => setSelectedImageIndex(index)}
              className={`relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg border-2 transition-all ${
                index === selectedImageIndex
                  ? 'border-blue-500 ring-2 ring-blue-200'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              aria-label={`View image ${index + 1}`}
            >
              <Image
                src={image}
                alt={`${itemName} thumbnail ${index + 1}`}
                fill
                className="object-cover"
                sizes="80px"
              />
            </button>
          ))}
        </div>
      )}

      {/* Fullscreen Modal */}
      {isFullscreen && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={closeFullscreen}
          onKeyDown={handleKeyDown}
          tabIndex={0}
          role="dialog"
          aria-modal="true"
          aria-label="Fullscreen image view"
        >
          {/* Close Button */}
          <Button
            variant="secondary"
            size="sm"
            className="absolute top-4 right-4 z-10"
            onClick={closeFullscreen}
            aria-label="Close fullscreen"
          >
            ✕
          </Button>

          {/* Fullscreen Image */}
          <div className="relative w-full h-full max-w-7xl max-h-full">
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
                <Button
                  variant="secondary"
                  size="lg"
                  className="absolute left-4 top-1/2 -translate-y-1/2"
                  onClick={(e) => {
                    e.stopPropagation()
                    previousImage()
                  }}
                  aria-label="Previous image"
                >
                  ←
                </Button>
                <Button
                  variant="secondary"
                  size="lg"
                  className="absolute right-4 top-1/2 -translate-y-1/2"
                  onClick={(e) => {
                    e.stopPropagation()
                    nextImage()
                  }}
                  aria-label="Next image"
                >
                  →
                </Button>
              </>
            )}

            {/* Fullscreen Counter */}
            {displayImages.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
                <Badge variant="secondary" className="bg-black/70 text-white border-0 text-lg px-4 py-2">
                  {selectedImageIndex + 1} / {displayImages.length}
                </Badge>
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="absolute bottom-4 right-4 text-white/70 text-sm">
            <p>Use arrow keys to navigate • ESC to close</p>
          </div>
        </div>
      )}
    </div>
  )
}
