'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { AnimatedButton } from '@/components/ui/animated-button'
import { AnimatedCard } from '@/components/ui/animated-card'
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { useAuth } from '@/lib/auth/auth-context'
import { ResponsiveFilter } from '@/components/ui/responsive-components'
import { LoadingState, EmptyState } from '@/components/ui/loading-states'
import { ExtendDialog, ReturnDialog, CancelDialog } from '@/components/ui/confirmation-dialog'
import { fadeInUp, staggerContainer } from '@/lib/animations'
import {
  Package,
  CheckCircle,
  AlertTriangle,
  Download,
  XCircle,
  Eye,
  MapPin,
  Clock,
  Search
} from 'lucide-react'
import { Item, Reservation } from '@prisma/client'

interface BorrowedItem {
  id: string
  reservation: Reservation
  item: Item
  daysRemaining: number
  isOverdue: boolean
  daysOverdue: number
  canExtend: boolean
  canReturn: boolean
  canCancel: boolean
}

export default function MyItemsPage() {
  const { user } = useAuth()
  const [borrowedItems, setBorrowedItems] = useState<BorrowedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'overdue' | 'due_soon'>('all')
  const [extendDialog, setExtendDialog] = useState<{ isOpen: boolean; item: BorrowedItem | null; loading: boolean }>({ isOpen: false, item: null, loading: false })
  const [returnDialog, setReturnDialog] = useState<{ isOpen: boolean; item: BorrowedItem | null; loading: boolean }>({ isOpen: false, item: null, loading: false })
  const [cancelDialog, setCancelDialog] = useState<{ isOpen: boolean; item: BorrowedItem | null; loading: boolean }>({ isOpen: false, item: null, loading: false })

  useEffect(() => {
    if (user) {
      fetchBorrowedItems()
    }
  }, [user])

  const fetchBorrowedItems = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/user/borrowed-items')
      if (response.ok) {
        const data = await response.json()
        setBorrowedItems(data.items || [])
      }
    } catch (error) {
      console.error('Error fetching borrowed items:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleExtendBorrowing = (item: BorrowedItem) => {
    setExtendDialog({ isOpen: true, item, loading: false })
  }

  const confirmExtendBorrowing = async () => {
    if (!extendDialog.item) return

    setExtendDialog(prev => ({ ...prev, loading: true }))
    try {
      const response = await fetch(`/api/reservations/${extendDialog.item!.reservation.id}/extend`, {
        method: 'POST',
      })
      if (response.ok) {
        await fetchBorrowedItems()
        setExtendDialog({ isOpen: false, item: null, loading: false })
      }
    } catch (error) {
      console.error('Error extending borrowing:', error)
      setExtendDialog(prev => ({ ...prev, loading: false }))
    }
  }

  const handleReturnItem = (item: BorrowedItem) => {
    setReturnDialog({ isOpen: true, item, loading: false })
  }

  const confirmReturnItem = async () => {
    if (!returnDialog.item) return

    setReturnDialog(prev => ({ ...prev, loading: true }))
    try {
      const response = await fetch(`/api/reservations/${returnDialog.item!.reservation.id}/return`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          itemId: returnDialog.item!.item.id,
          conditionOnReturn: 'GOOD',
          notes: 'Returned via dashboard'
        })
      })

      const data = await response.json()
      
      if (response.ok) {
        const message = data.autoApproved 
          ? 'Item returned successfully!'
          : 'Return request submitted and pending approval.'
        
        console.log(message)
        
        await fetchBorrowedItems()
        setReturnDialog({ isOpen: false, item: null, loading: false })
      } else {
        console.error('Return failed:', data.error)
        alert(data.error || 'Failed to return item. Please try again.')
        setReturnDialog(prev => ({ ...prev, loading: false }))
      }
    } catch (error) {
      console.error('Error returning item:', error)
      alert('Network error. Please try again.')
      setReturnDialog(prev => ({ ...prev, loading: false }))
    }
  }

  const handleCancelReservation = (item: BorrowedItem) => {
    setCancelDialog({ isOpen: true, item, loading: false })
  }

  const confirmCancelReservation = async () => {
    if (!cancelDialog.item) return

    setCancelDialog(prev => ({ ...prev, loading: true }))
    try {
      const response = await fetch(`/api/reservations/${cancelDialog.item!.reservation.id}`, {
        method: 'DELETE',
      })
      if (response.ok) {
        await fetchBorrowedItems()
        setCancelDialog({ isOpen: false, item: null, loading: false })
      }
    } catch (error) {
      console.error('Error cancelling reservation:', error)
      setCancelDialog(prev => ({ ...prev, loading: false }))
    }
  }

  const getFilteredItems = () => {
    switch (filterStatus) {
      case 'active':
        return borrowedItems.filter(item => !item.isOverdue && item.daysRemaining > 0)
      case 'overdue':
        return borrowedItems.filter(item => item.isOverdue)
      case 'due_soon':
        return borrowedItems.filter(item => item.daysRemaining <= 3 && item.daysRemaining > 0)
      default:
        return borrowedItems
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        <LoadingState
          variant="page"
          message="Loading your borrowed items..."
          className="max-w-7xl mx-auto px-4 lg:px-6 py-8"
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-8">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="space-y-8"
        >
          {/* Header */}
          <motion.div variants={fadeInUp}>
            <AnimatedCard className="bg-gradient-to-br from-background to-muted/20 backdrop-blur-sm border border-border/40 shadow-sm overflow-hidden">
              <div className="p-8">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                      My Borrowed Items
                    </h1>
                    <p className="text-muted-foreground mt-2">
                      Manage and track all your borrowed items
                    </p>
                  </div>
                  <Link href="/dashboard">
                    <AnimatedButton variant="outline">
                      Back to Overview
                    </AnimatedButton>
                  </Link>
                </div>
              </div>
            </AnimatedCard>
          </motion.div>

          {/* Main Content */}
          <motion.div variants={fadeInUp}>
            <AnimatedCard className="bg-gradient-to-br from-background to-muted/20 backdrop-blur-sm border border-border/40 shadow-sm overflow-hidden">
              <div className="p-8">
                <div className="space-y-6">
                  {/* Responsive Filters */}
                  <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                    <div className="flex items-center space-x-4 w-full sm:w-auto">
                      <Label className="text-sm font-medium whitespace-nowrap">Filter:</Label>
                      <ResponsiveFilter
                        options={[
                          { value: 'all', label: 'All Items', count: borrowedItems.length },
                          { value: 'active', label: 'Active', count: borrowedItems.filter(i => !i.isOverdue && i.daysRemaining > 0).length },
                          { value: 'overdue', label: 'Overdue', count: borrowedItems.filter(i => i.isOverdue).length },
                          { value: 'due_soon', label: 'Due Soon', count: borrowedItems.filter(i => i.daysRemaining <= 3 && i.daysRemaining > 0).length }
                        ]}
                        value={filterStatus}
                        onChange={(value) => setFilterStatus(value as 'all' | 'active' | 'overdue' | 'due_soon')}
                        className="flex-1 sm:flex-none"
                      />
                    </div>
                    <AnimatedButton variant="outline" size="sm" className="w-full sm:w-auto">
                      <Download className="h-4 w-4 mr-2" />
                      Export List
                    </AnimatedButton>
                  </div>

                  {/* Items Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {getFilteredItems().map((item) => (
                      <AnimatedCard
                        key={item.id}
                        className={`bg-gradient-to-br from-background to-muted/30 backdrop-blur-sm border border-border/50 shadow-lg hover:shadow-xl transition-all duration-300 ${
                          item.isOverdue
                            ? 'border-red-200 dark:border-red-800'
                            : item.daysRemaining <= 3
                            ? 'border-orange-200 dark:border-orange-800'
                            : 'border-green-200 dark:border-green-800'
                        }`}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <CardTitle className="text-lg">{item.item.name}</CardTitle>
                              <p className="text-sm text-muted-foreground">{item.item.category}</p>
                              {item.item.location && (
                                <div className="flex items-center mt-1 text-sm text-muted-foreground">
                                  <MapPin className="h-3 w-3 mr-1" />
                                  {item.item.location}
                                </div>
                              )}
                            </div>
                            {item.item.images && item.item.images[0] && (
                              <div className="w-16 h-16 bg-muted/20 rounded-lg flex items-center justify-center">
                                <Package className="h-8 w-8 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {/* Status and Timeline */}
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>Borrowed:</span>
                              <span>{new Date(item.reservation.startDate).toLocaleDateString()}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span>Due Date:</span>
                              <span className={item.isOverdue ? 'text-red-600 font-medium' : ''}>
                                {new Date(item.reservation.endDate).toLocaleDateString()}
                              </span>
                            </div>

                            {item.isOverdue ? (
                              <Badge variant="destructive" className="w-full justify-center">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                {item.daysOverdue} days overdue
                              </Badge>
                            ) : (
                              <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                  <span>Time Remaining:</span>
                                  <span className={item.daysRemaining <= 3 ? 'text-orange-600 font-medium' : ''}>
                                    {item.daysRemaining} days
                                  </span>
                                </div>
                                <Progress
                                  value={100 - (item.daysRemaining / ((new Date(item.reservation.endDate).getTime() - new Date(item.reservation.startDate).getTime()) / (1000 * 60 * 60 * 24))) * 100}
                                  className="h-2"
                                />
                              </div>
                            )}
                          </div>

                          {/* Purpose */}
                          {item.reservation.purpose && (
                            <div className="text-sm">
                              <span className="text-muted-foreground">Purpose: </span>
                              <span>{item.reservation.purpose}</span>
                            </div>
                          )}

                          {/* Action Buttons */}
                          <div className="flex gap-2">
                            <AnimatedButton
                              variant="outline"
                              size="sm"
                              className="flex-1"
                              onClick={() => window.location.href = `/items/${item.item.id}`}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </AnimatedButton>

                            {item.canExtend && (
                              <AnimatedButton
                                variant="outline"
                                size="sm"
                                onClick={() => handleExtendBorrowing(item)}
                              >
                                <Clock className="h-4 w-4 mr-1" />
                                Extend
                              </AnimatedButton>
                            )}

                            {item.canReturn && (
                              <AnimatedButton
                                size="sm"
                                onClick={() => handleReturnItem(item)}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Return
                              </AnimatedButton>
                            )}

                            {item.canCancel && (
                              <AnimatedButton
                                variant="outline"
                                size="sm"
                                onClick={() => handleCancelReservation(item)}
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Cancel
                              </AnimatedButton>
                            )}
                          </div>
                        </CardContent>
                      </AnimatedCard>
                    ))}
                  </div>

                  {getFilteredItems().length === 0 && (
                    <EmptyState
                      icon={<Package className="h-16 w-16 mx-auto text-muted-foreground/50" />}
                      title="No items found"
                      description={
                        filterStatus === 'all'
                          ? "You haven't borrowed any items yet."
                          : `No items match the "${filterStatus}" filter.`
                      }
                      action={
                        <AnimatedButton onClick={() => window.location.href = '/items'}>
                          <Search className="h-4 w-4 mr-2" />
                          Browse Available Items
                        </AnimatedButton>
                      }
                    />
                  )}
                </div>
              </div>
            </AnimatedCard>
          </motion.div>
        </motion.div>
      </div>

      {/* Dialogs */}
      <ExtendDialog
        isOpen={extendDialog.isOpen}
        onClose={() => setExtendDialog({ isOpen: false, item: null, loading: false })}
        onConfirm={confirmExtendBorrowing}
        itemName={extendDialog.item?.item.name || ''}
        currentDueDate={extendDialog.item ? new Date(extendDialog.item.reservation.endDate).toLocaleDateString() : ''}
        newDueDate={extendDialog.item ? new Date(new Date(extendDialog.item.reservation.endDate).getTime() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString() : ''}
        loading={extendDialog.loading}
      />

      <ReturnDialog
        isOpen={returnDialog.isOpen}
        onClose={() => setReturnDialog({ isOpen: false, item: null, loading: false })}
        onConfirm={confirmReturnItem}
        itemName={returnDialog.item?.item.name || ''}
        borrowedDate={returnDialog.item ? new Date(returnDialog.item.reservation.startDate).toLocaleDateString() : ''}
        dueDate={returnDialog.item ? new Date(returnDialog.item.reservation.endDate).toLocaleDateString() : ''}
        isOverdue={returnDialog.item?.isOverdue || false}
        loading={returnDialog.loading}
      />

      <CancelDialog
        isOpen={cancelDialog.isOpen}
        onClose={() => setCancelDialog({ isOpen: false, item: null, loading: false })}
        onConfirm={confirmCancelReservation}
        itemName={cancelDialog.item?.item.name || ''}
        reservationDate={cancelDialog.item ? new Date(cancelDialog.item.reservation.createdAt || cancelDialog.item.reservation.startDate).toLocaleDateString() : ''}
        startDate={cancelDialog.item ? new Date(cancelDialog.item.reservation.startDate).toLocaleDateString() : ''}
        loading={cancelDialog.loading}
      />
    </div>
  )
}