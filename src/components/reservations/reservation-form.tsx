'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { z } from 'zod'

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
    <Card className={`p-6 ${className}`}>
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold">Reserve Item</h3>
          <p className="text-sm text-gray-600 mt-1">
            Request to borrow &quot;{itemName}&quot;
          </p>
        </div>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                min={today}
                max={maxDate}
                {...register('startDate')}
                onChange={(e) => {
                  register('startDate').onChange(e)
                  setAvailabilityCheck(null)
                }}
              />
              {errors.startDate && (
                <p className="text-sm text-red-600 mt-1">
                  {errors.startDate.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                min={startDate || today}
                max={maxDate}
                {...register('endDate')}
                onChange={(e) => {
                  register('endDate').onChange(e)
                  setAvailabilityCheck(null)
                }}
              />
              {errors.endDate && (
                <p className="text-sm text-red-600 mt-1">
                  {errors.endDate.message}
                </p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="purpose">Purpose (Optional)</Label>
            <Input
              id="purpose"
              placeholder="What will you use this item for?"
              {...register('purpose')}
            />
          </div>

          <div>
            <Label htmlFor="notes">Additional Notes (Optional)</Label>
            <textarea
              id="notes"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Any additional information..."
              {...register('notes')}
            />
          </div>

          {/* Availability Check Button */}
          {startDate && endDate && (
            <div className="flex justify-center">
              <Button
                type="button"
                variant="outline"
                onClick={checkAvailability}
                disabled={checkingAvailability}
                className="w-full md:w-auto"
              >
                {checkingAvailability ? 'Checking...' : 'Check Availability'}
              </Button>
            </div>
          )}

          {/* Availability Results */}
          {availabilityCheck && (
            <div className={`p-4 rounded-lg ${
              availabilityCheck.available 
                ? 'bg-green-50 border border-green-200' 
                : 'bg-red-50 border border-red-200'
            }`}>
              <div className="flex items-center">
                <div className={`w-3 h-3 rounded-full mr-2 ${
                  availabilityCheck.available ? 'bg-green-500' : 'bg-red-500'
                }`} />
                <p className={`font-medium ${
                  availabilityCheck.available ? 'text-green-800' : 'text-red-800'
                }`}>
                  {availabilityCheck.available 
                    ? 'Item is available for selected dates' 
                    : availabilityCheck.reason || 'Item is not available'
                  }
                </p>
              </div>
              
              {!availabilityCheck.available && availabilityCheck.reservations && availabilityCheck.reservations.length > 0 && (
                <div className="mt-3">
                  <p className="text-sm text-red-700 font-medium mb-2">Conflicting reservations:</p>
                  <div className="space-y-1">
                    {availabilityCheck.reservations.map((reservation) => (
                      <div key={reservation.id} className="text-sm text-red-600">
                        {new Date(reservation.startDate).toLocaleDateString()} - {' '}
                        {new Date(reservation.endDate).toLocaleDateString()} by {reservation.user.name}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isSubmitting}
                className="flex-1"
              >
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              disabled={isSubmitting || (availabilityCheck !== null && !availabilityCheck.available)}
              className="flex-1"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Reservation'}
            </Button>
          </div>
        </form>
      </div>
    </Card>
  )
}