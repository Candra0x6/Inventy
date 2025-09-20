'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { staggerContainer, fadeInUp } from '@/lib/animations'
import { PhotoGallery } from '@/components/items/photo-gallery'
import { ItemInfo } from '@/components/items/item-info'
import { BarcodeModal } from '@/components/items/barcode-modal'
import { AnimatedButton } from '@/components/ui/animated-button'
import { AnimatedCard } from '@/components/ui/animated-card'
import { ItemCondition, ItemStatus } from '@prisma/client'
import Link from 'next/link'
import { ArrowLeft, QrCode, History, Heart } from 'lucide-react'

interface ItemDetailClientProps {
  item: {
    id: string
    name: string
    description: string | null
    category: string
    tags: string[]
    condition: ItemCondition
    status: ItemStatus
    location: string | null
    serialNumber: string | null
    barcode: string | null
    qrCode: string | null
    value: number | null
    images: string[]
    createdAt: Date
    updatedAt: Date
    department: {
      id: string
      name: string
      description: string | null
    } | null
    createdBy: {
      id: string
      name: string | null
      email: string
      role: string
    }
    availability: {
      isAvailable: boolean
      nextAvailableDate: Date | null
      activeReservations: number
      pendingReservations: number
    }
    statistics: {
      totalReservations: number
      completedReservations: number
      totalReturns: number
      averageRating: number | null
    }
    recentActivity: Array<{
      type: 'reservation' | 'return'
      date: Date
      status: string
      user: {
        id: string
        name: string | null
        email: string
      }
      details: string
    }>
  }
  userRole: string
}

export function ItemDetailPageClient({ item, userRole }: ItemDetailClientProps) {
  const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false)

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-8 max-w-5xl mx-auto">
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="max-w-7xl mx-auto"
      >
        {/* Breadcrumb Navigation */}
        <motion.nav 
          variants={fadeInUp}
          className="flex items-center space-x-3 text-sm text-muted-foreground mb-8"
        >
          <Link 
            href="/items" 
            className="hover:text-foreground transition-colors flex items-center gap-2 group"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
            Items
          </Link>
          <span className="text-border">•</span>
          <Link 
            href={`/items?category=${encodeURIComponent(item.category)}`}
            className="hover:text-foreground transition-colors capitalize"
          >
            {item.category}
          </Link>
          <span className="text-border">•</span>
          <span className="text-foreground font-medium">{item.name}</span>
        </motion.nav>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Photo Gallery Section */}
          <motion.div variants={fadeInUp} className="space-y-6">
            <PhotoGallery 
              images={item.images}
              itemName={item.name}
              status={item.status}
            />
            
            {/* Quick Actions */}
            <motion.div 
              variants={fadeInUp}
              className="flex flex-wrap gap-3"
            >
              {item.status === 'AVAILABLE' && (
                <AnimatedButton size="sm" asChild>
                  <Link href={`/reservations?itemId=${item.id}`}>
                    <Heart className="h-4 w-4 mr-2" />
                    Reserve Item
                  </Link>
                </AnimatedButton>
              )}
              <AnimatedButton 
                variant="outline" 
                size="sm" 
                onClick={() => setIsBarcodeModalOpen(true)}
              >
                <QrCode className="h-4 w-4 mr-2" />
                QR Code
              </AnimatedButton>
              
            </motion.div>
          </motion.div>

          {/* Item Information Section */}
          <motion.div variants={fadeInUp}>
            <ItemInfo 
              item={item}
              userRole={userRole}
            />
          </motion.div>
        </div>

        {/* Related Items Section */}
        <motion.div variants={fadeInUp} className="mt-16">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
              Related Items
            </h2>
            <AnimatedButton variant="outline" asChild>
              <Link href={`/items?category=${encodeURIComponent(item.category)}`}>
                View All in {item.category}
              </Link>
            </AnimatedButton>
          </div>
          
          <AnimatedCard className="p-12 text-center border-dashed border-2 border-border/50 bg-muted/20">
            <div className="space-y-4">
              <div className="text-6xl opacity-20">📦</div>
              <div className="space-y-2">
                <p className="text-muted-foreground text-lg">Related items will be displayed here</p>
                <p className="text-sm text-muted-foreground/70">
                  Items from the same category or with similar tags
                </p>
              </div>
            </div>
          </AnimatedCard>
        </motion.div>

        {/* Action Bar - Fixed at bottom on mobile */}
        <motion.div 
          variants={fadeInUp}
          className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-md border-t border-border/50 p-4 lg:hidden shadow-dark-shadow z-50"
        >
          <div className="flex gap-3 max-w-sm mx-auto">
            {item.availability?.isAvailable && ['BORROWER', 'STAFF'].includes(userRole) && (
              <AnimatedButton className="flex-1">
                Reserve Item
              </AnimatedButton>
            )}
            <AnimatedButton variant="outline" className="flex-1" asChild>
              <Link href={`/items/${item.id}/contact`}>
                Contact Owner
              </Link>
            </AnimatedButton>
          </div>
        </motion.div>

        {/* Add padding for mobile action bar */}
        <div className="h-20 lg:hidden" />

        {/* Barcode Modal */}
        <BarcodeModal
          isOpen={isBarcodeModalOpen}
          onClose={() => setIsBarcodeModalOpen(false)}
          itemName={item.name}
          barcode={item.barcode}
          itemId={item.id}
        />
      </motion.div>
    </div>
  )
}

export function ItemDetailSkeletonClient() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-8 max-w-5xl mx-auto">
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="max-w-7xl mx-auto"
      >
        {/* Breadcrumb Skeleton */}
        <motion.div variants={fadeInUp} className="h-4 bg-muted/50 rounded-xl w-48 mb-8 animate-pulse" />
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Gallery Skeleton */}
          <motion.div variants={fadeInUp} className="space-y-6">
            <div className="h-96 bg-muted/50 rounded-3xl animate-pulse shadow-soft-shadow" />
            <div className="flex gap-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-20 w-20 bg-muted/50 rounded-2xl animate-pulse" />
              ))}
            </div>
          </motion.div>
          
          {/* Info Skeleton */}
          <motion.div variants={fadeInUp} className="space-y-8">
            <div className="space-y-4">
              <div className="h-10 bg-muted/50 rounded-xl w-3/4 animate-pulse" />
              <div className="flex gap-3">
                <div className="h-8 bg-muted/50 rounded-xl w-24 animate-pulse" />
                <div className="h-8 bg-muted/50 rounded-xl w-28 animate-pulse" />
              </div>
            </div>
            
            {[...Array(3)].map((_, i) => (
              <AnimatedCard key={i} className="p-8">
                <div className="h-6 bg-muted/50 rounded-xl w-32 mb-6 animate-pulse" />
                <div className="space-y-3">
                  <div className="h-4 bg-muted/30 rounded-xl animate-pulse" />
                  <div className="h-4 bg-muted/30 rounded-xl w-3/4 animate-pulse" />
                </div>
              </AnimatedCard>
            ))}
          </motion.div>
        </div>
      </motion.div>
    </div>
  )
}