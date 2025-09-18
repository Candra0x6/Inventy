'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X, AlertTriangle, CheckCircle, Clock, Package, XCircle } from 'lucide-react'
import { AnimatedButton } from '@/components/ui/animated-button'
import { AnimatedCard } from '@/components/ui/animated-card'

interface ConfirmationDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  type?: 'warning' | 'info' | 'success' | 'destructive'
  icon?: React.ReactNode
  loading?: boolean
  itemName?: string
  details?: { label: string; value: string }[]
}

export function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'info',
  icon,
  loading = false,
  itemName,
  details = []
}: ConfirmationDialogProps) {
  const getTypeStyles = () => {
    switch (type) {
      case 'warning':
        return {
          iconBg: 'bg-amber-100 dark:bg-amber-900/30',
          iconColor: 'text-amber-600',
          confirmButton: 'bg-amber-600 hover:bg-amber-700 text-white',
          defaultIcon: <AlertTriangle className="h-6 w-6" />
        }
      case 'destructive':
        return {
          iconBg: 'bg-red-100 dark:bg-red-900/30',
          iconColor: 'text-red-600',
          confirmButton: 'bg-red-600 hover:bg-red-700 text-white',
          defaultIcon: <AlertTriangle className="h-6 w-6" />
        }
      case 'success':
        return {
          iconBg: 'bg-green-100 dark:bg-green-900/30',
          iconColor: 'text-green-600',
          confirmButton: 'bg-green-600 hover:bg-green-700 text-white',
          defaultIcon: <CheckCircle className="h-6 w-6" />
        }
      default:
        return {
          iconBg: 'bg-blue-100 dark:bg-blue-900/30',
          iconColor: 'text-blue-600',
          confirmButton: 'bg-primary hover:bg-primary/90 text-primary-foreground',
          defaultIcon: <Package className="h-6 w-6" />
        }
    }
  }

  const styles = getTypeStyles()

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />
          
          {/* Dialog */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              className="w-full max-w-md"
            >
              <AnimatedCard className="bg-background border border-border shadow-2xl">
                <div className="p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${styles.iconBg}`}>
                        <div className={styles.iconColor}>
                          {icon || styles.defaultIcon}
                        </div>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold">{title}</h3>
                        {itemName && (
                          <p className="text-sm text-muted-foreground mt-1">
                            Item: <span className="font-medium">{itemName}</span>
                          </p>
                        )}
                      </div>
                    </div>
                    <AnimatedButton
                      variant="ghost"
                      size="sm"
                      onClick={onClose}
                      className="h-8 w-8 p-0"
                      disabled={loading}
                    >
                      <X className="h-4 w-4" />
                    </AnimatedButton>
                  </div>

                  {/* Content */}
                  <div className="space-y-4">
                    <p className="text-muted-foreground">{description}</p>
                    
                    {/* Details */}
                    {details.length > 0 && (
                      <div className="bg-muted/30 rounded-lg p-3 space-y-2">
                        {details.map((detail, index) => (
                          <div key={index} className="flex justify-between text-sm">
                            <span className="text-muted-foreground">{detail.label}:</span>
                            <span className="font-medium">{detail.value}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 mt-6">
                    <AnimatedButton
                      variant="outline"
                      onClick={onClose}
                      disabled={loading}
                      className="flex-1"
                    >
                      {cancelText}
                    </AnimatedButton>
                    <AnimatedButton
                      onClick={onConfirm}
                      disabled={loading}
                      className={`flex-1 ${styles.confirmButton}`}
                    >
                      {loading ? (
                        <div className="flex items-center space-x-2">
                          <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          <span>Processing...</span>
                        </div>
                      ) : (
                        confirmText
                      )}
                    </AnimatedButton>
                  </div>
                </div>
              </AnimatedCard>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}

// Specialized dialog components for common actions
interface ExtendDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  itemName: string
  currentDueDate: string
  newDueDate?: string
  loading?: boolean
}

export function ExtendDialog({
  isOpen,
  onClose,
  onConfirm,
  itemName,
  currentDueDate,
  newDueDate,
  loading = false
}: ExtendDialogProps) {
  const details = [
    { label: 'Current Due Date', value: currentDueDate },
    ...(newDueDate ? [{ label: 'New Due Date', value: newDueDate }] : [])
  ]

  return (
    <ConfirmationDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title="Extend Borrowing Period"
      description="Are you sure you want to extend the borrowing period for this item?"
      confirmText="Extend"
      type="warning"
      icon={<Clock className="h-6 w-6" />}
      itemName={itemName}
      details={details}
      loading={loading}
    />
  )
}

interface ReturnDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  itemName: string
  borrowedDate: string
  dueDate: string
  isOverdue?: boolean
  loading?: boolean
}

export function ReturnDialog({
  isOpen,
  onClose,
  onConfirm,
  itemName,
  borrowedDate,
  dueDate,
  isOverdue = false,
  loading = false
}: ReturnDialogProps) {
  const details = [
    { label: 'Borrowed Date', value: borrowedDate },
    { label: 'Due Date', value: dueDate },
    ...(isOverdue ? [{ label: 'Status', value: 'Overdue' }] : [])
  ]

  return (
    <ConfirmationDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title="Return Item"
      description={
        isOverdue
          ? "This item is overdue. Returning it now will help maintain your trust score."
          : "Are you sure you want to return this item? Make sure the item is in good condition."
      }
      confirmText="Return Item"
      type={isOverdue ? "warning" : "success"}
      icon={<CheckCircle className="h-6 w-6" />}
      itemName={itemName}
      details={details}
      loading={loading}
    />
  )
}

interface CancelDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  itemName: string
  reservationDate: string
  startDate: string
  loading?: boolean
}

export function CancelDialog({
  isOpen,
  onClose,
  onConfirm,
  itemName,
  reservationDate,
  startDate,
  loading = false
}: CancelDialogProps) {
  const details = [
    { label: 'Reserved On', value: reservationDate },
    { label: 'Start Date', value: startDate }
  ]

  return (
    <ConfirmationDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title="Cancel Reservation"
      description="Are you sure you want to cancel this reservation? This action cannot be undone and may affect your ability to reserve items in the future."
      confirmText="Cancel Reservation"
      cancelText="Keep Reservation"
      type="destructive"
      icon={<XCircle className="h-6 w-6" />}
      itemName={itemName}
      details={details}
      loading={loading}
    />
  )
}