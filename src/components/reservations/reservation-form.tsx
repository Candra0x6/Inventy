'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { motion } from 'framer-motion'
import { AnimatedButton } from '@/components/ui/animated-button'
import { AnimatedCard } from '@/components/ui/animated-card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { fadeInUp, staggerContainer } from '@/lib/animations'
import { z } from 'zod'
import { 
  Calendar, 
  Clock, 
  FileText, 
  CheckCircle2, 
  AlertTriangle,
  User,
  Loader2
} from 'lucide-react'

const reservationSchema = z.object({
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  purpose: z.string().optional(),
  notes: z.string().optional(),
}).refine(
  (data) => {
    const start = new Date(data.startDate)
    const end = new Date(data.endDate)
    return start < end
  },
  {
    message: 'End date must be after start date',
    path: ['endDate'],
  }
).refine(
  (data) => {
    const start = new Date(data.startDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return start >= today
  },
  {
    message: 'Start date cannot be in the past',
    path: ['startDate'],
  }
)

type ReservationFormData = z.infer<typeof reservationSchema>

interface ReservationFormProps {
  itemId: string
  itemName: string
  initialStartDate?: string
  initialEndDate?: string
  onSubmit: (data: ReservationFormData) => Promise<void>
  onCancel?: () => void
  isSubmitting?: boolean
  className?: string
}

interface AvailabilityResult {
  available: boolean
  reason?: string
  reservations?: Array<{
    id: string
    startDate: string
    endDate: string
    status: string
    user: { name: string }
  }>
}

export function ReservationForm({
  itemId,
  itemName,
  initialStartDate,
  initialEndDate,
  onSubmit,
  onCancel,
  isSubmitting = false,
  className = '',
}: ReservationFormProps) {
  const [availabilityCheck, setAvailabilityCheck] = useState<AvailabilityResult | null>(null)
  const [checkingAvailability, setCheckingAvailability] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    setError,
  } = useForm<ReservationFormData>({
    defaultValues: {
      startDate: initialStartDate || '',
      endDate: initialEndDate || '',
      purpose: '',
      notes: '',
    },
  })

  const startDate = watch('startDate')
  const endDate = watch('endDate')

  const checkAvailability = async () => {
    if (!startDate || !endDate) return

    try {
      setCheckingAvailability(true)
      const response = await fetch(
        `/api/reservations/availability?itemId=${itemId}&startDate=${startDate}&endDate=${endDate}`
      )
      
      if (!response.ok) {
        throw new Error('Failed to check availability')
      }

      const result: AvailabilityResult = await response.json()
      setAvailabilityCheck(result)
      
      if (!result.available) {
        setError('startDate', {
          type: 'manual',
          message: result.reason || 'Item is not available for selected dates'
        })
      }
    } catch (error) {
      console.error('Error checking availability:', error)
      setError('startDate', {
        type: 'manual',
        message: 'Failed to check availability'
      })
    } finally {
      setCheckingAvailability(false)
    }
  }

  const handleFormSubmit = async (data: ReservationFormData) => {
    try {
      // Validate the form data
      const validatedData = reservationSchema.parse(data)
      
      // Check availability one more time before submitting
      await checkAvailability()
      
      if (availabilityCheck && !availabilityCheck.available) {
        return
      }

      await onSubmit(validatedData)
    } catch (error) {
      if (error instanceof z.ZodError) {
        error.issues.forEach((err) => {
          if (err.path[0]) {
            setError(err.path[0] as keyof ReservationFormData, {
              type: 'manual',
              message: err.message,
            })
          }
        })
      } else {
        console.error('Error submitting reservation:', error)
      }
    }
  }

  const formatDateForInput = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const today = formatDateForInput(new Date())
  const maxDate = formatDateForInput(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)) // 1 year from now

  return (
    <AnimatedCard className={`p-8 bg-gradient-to-br from-background to-muted/30 backdrop-blur-sm border border-border/50 shadow-lg ${className}`}>
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="space-y-8"
      >
        {/* Header */}
        <motion.div variants={fadeInUp}>
          <h3 className="text-2xl font-semibold mb-2 flex items-center gap-3">
            <Calendar className="h-6 w-6 text-primary" />
            Reserve Item
          </h3>
          <p className="text-muted-foreground">
            Request to borrow &quot;{itemName}&quot;
          </p>
        </motion.div>

        <motion.form 
          variants={fadeInUp}
          onSubmit={handleSubmit(handleFormSubmit)} 
          className="space-y-6"
        >
          {/* Date Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <motion.div variants={fadeInUp}>
              <Label htmlFor="startDate" className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-3">
                <Calendar className="h-4 w-4" />
                Start Date
              </Label>
              <Input
                id="startDate"
                type="date"
                min={today}
                max={maxDate}
                className="bg-background/50 border-border/50 focus:border-primary/50 focus:ring-primary/20"
                {...register('startDate')}
                onChange={(e) => {
                  register('startDate').onChange(e)
                  setAvailabilityCheck(null)
                }}
              />
              {errors.startDate && (
                <motion.p 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-sm text-destructive mt-2 flex items-center gap-2"
                >
                  <AlertTriangle className="h-3 w-3" />
                  {errors.startDate.message}
                </motion.p>
              )}
            </motion.div>

            <motion.div variants={fadeInUp}>
              <Label htmlFor="endDate" className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-3">
                <Clock className="h-4 w-4" />
                End Date
              </Label>
              <Input
                id="endDate"
                type="date"
                min={startDate || today}
                max={maxDate}
                className="bg-background/50 border-border/50 focus:border-primary/50 focus:ring-primary/20"
                {...register('endDate')}
                onChange={(e) => {
                  register('endDate').onChange(e)
                  setAvailabilityCheck(null)
                }}
              />
              {errors.endDate && (
                <motion.p 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-sm text-destructive mt-2 flex items-center gap-2"
                >
                  <AlertTriangle className="h-3 w-3" />
                  {errors.endDate.message}
                </motion.p>
              )}
            </motion.div>
          </div>

          {/* Purpose and Notes */}
          <motion.div variants={fadeInUp}>
            <Label htmlFor="purpose" className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-3">
              <FileText className="h-4 w-4" />
              Purpose (Optional)
            </Label>
            <Input
              id="purpose"
              placeholder="What will you use this item for?"
              className="bg-background/50 border-border/50 focus:border-primary/50 focus:ring-primary/20"
              {...register('purpose')}
            />
          </motion.div>

          <motion.div variants={fadeInUp}>
            <Label htmlFor="notes" className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-3">
              <FileText className="h-4 w-4" />
              Additional Notes (Optional)
            </Label>
            <textarea
              id="notes"
              rows={4}
              className="w-full px-4 py-3 bg-background/50 border border-border/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 resize-none transition-all duration-200"
              placeholder="Any additional information..."
              {...register('notes')}
            />
          </motion.div>

          {/* Availability Check Button */}
          {startDate && endDate && (
            <motion.div variants={fadeInUp} className="flex justify-center">
              <AnimatedButton
                type="button"
                variant="outline"
                onClick={checkAvailability}
                disabled={checkingAvailability}
                className="w-full md:w-auto"
              >
                {checkingAvailability ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Checking...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Check Availability
                  </>
                )}
              </AnimatedButton>
            </motion.div>
          )}

          {/* Availability Results */}
          {availabilityCheck && (
            <motion.div 
              variants={fadeInUp}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`p-6 rounded-xl border ${
                availabilityCheck.available 
                  ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950 dark:border-emerald-800' 
                  : 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-4 h-4 rounded-full ${
                  availabilityCheck.available ? 'bg-emerald-500' : 'bg-red-500'
                }`} />
                <p className={`font-medium ${
                  availabilityCheck.available 
                    ? 'text-emerald-800 dark:text-emerald-300' 
                    : 'text-red-800 dark:text-red-300'
                }`}>
                  {availabilityCheck.available 
                    ? 'Item is available for selected dates' 
                    : availabilityCheck.reason || 'Item is not available'
                  }
                </p>
              </div>
              
              {!availabilityCheck.available && availabilityCheck.reservations && availabilityCheck.reservations.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm text-red-700 dark:text-red-300 font-medium mb-3 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Conflicting reservations:
                  </p>
                  <div className="space-y-2">
                    {availabilityCheck.reservations.map((reservation) => (
                      <div key={reservation.id} className="flex items-center gap-3 p-3 bg-background/50 rounded-lg border border-border/30">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <div className="flex-1">
                          <div className="text-sm font-medium text-foreground">
                            {reservation.user.name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(reservation.startDate).toLocaleDateString()} - {' '}
                            {new Date(reservation.endDate).toLocaleDateString()}
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {reservation.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Action Buttons */}
          <motion.div variants={fadeInUp} className="flex gap-4 pt-6">
            {onCancel && (
              <AnimatedButton
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isSubmitting}
                className="flex-1"
              >
                Cancel
              </AnimatedButton>
            )}
            <AnimatedButton
              type="submit"
              disabled={isSubmitting || (availabilityCheck !== null && !availabilityCheck.available)}
              className="flex-1"
              loading={isSubmitting}
            >
              Submit Reservation
            </AnimatedButton>
          </motion.div>
        </motion.form>
      </motion.div>
    </AnimatedCard>
  )
}