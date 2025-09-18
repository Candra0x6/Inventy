'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { AnimatedButton } from '@/components/ui/animated-button'
import { AnimatedCard } from '@/components/ui/animated-card'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { fadeInUp, staggerContainer } from '@/lib/animations'
import { 
  ArrowLeft, 
  Calendar, 
  User, 
  Clock, 
  MapPin, 
  FileText, 
  Package, 
  Shield, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Trash2
} from 'lucide-react'

interface ReservationWithDetails {
  id: string
  startDate: string
  endDate: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED'
  purpose?: string
  notes?: string
  createdAt: string
  updatedAt: string
  item: {
    id: string
    name: string
    category: string
    status: string
    images: string[]
    location?: string
    condition: string
  }
  user: {
    id: string
    name: string
    email: string
    avatar?: string
    role: string
  }
  returns?: Array<{
    id: string
    returnDate: string
    conditionOnReturn: string
    status: string
  }>
}

interface ReservationDetailPageProps {
  params: {
    id: string
  }
}

export default function ReservationDetailPage({ params }: ReservationDetailPageProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const [reservation, setReservation] = useState<ReservationWithDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [showApprovalForm, setShowApprovalForm] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')

  // Fetch reservation details
  useEffect(() => {
    const fetchReservation = async () => {
      try {
        const response = await fetch(`/api/reservations/${params.id}`)
        if (!response.ok) {
          if (response.status === 404) {
            toast.error('Reservation not found')
            router.push('/reservations')
            return
          }
          throw new Error('Failed to fetch reservation')
        }
        const { reservation } = await response.json()
        setReservation(reservation)
      } catch (error) {
        console.error('Error fetching reservation:', error)
        toast.error('Failed to load reservation details')
        router.push('/reservations')
      } finally {
        setLoading(false)
      }
    }

    fetchReservation()
  }, [params.id, router])

  // Check if user can manage this reservation
  const canManage = () => {
    if (!session?.user || !reservation) return false
    
    const isOwner = reservation.user.id === session.user.id
    const isAdmin = ['SUPER_ADMIN', 'MANAGER', 'STAFF'].includes(session.user.role || '')
    
    return isOwner || isAdmin
  }

  // Check if user can approve/reject
  const canApprove = () => {
    if (!session?.user) return false
    return ['SUPER_ADMIN', 'MANAGER', 'STAFF'].includes(session.user.role || '')
  }

  // Update reservation status
  const updateReservationStatus = async (
    status: string, 
    rejectionReason?: string
  ) => {
    if (!reservation) return

    try {
      setUpdating(true)
      
      const response = await fetch(`/api/reservations/${reservation.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status,
          rejectionReason,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update reservation')
      }

      const { reservation: updatedReservation } = await response.json()
      setReservation(updatedReservation)
      setShowApprovalForm(false)
      setRejectionReason('')
      
      toast.success('Reservation updated successfully!')
    } catch (error) {
      console.error('Error updating reservation:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to update reservation')
    } finally {
      setUpdating(false)
    }
  }

  // Cancel reservation
  const cancelReservation = async () => {
    if (!reservation) return
    
    if (!confirm('Are you sure you want to cancel this reservation?')) {
      return
    }

    try {
      setUpdating(true)
      
      const response = await fetch(`/api/reservations/${reservation.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'CANCELLED',
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to cancel reservation')
      }

      const { reservation: updatedReservation } = await response.json()
      setReservation(updatedReservation)
      
      toast.success('Reservation cancelled successfully!')
    } catch (error) {
      console.error('Error cancelling reservation:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to cancel reservation')
    } finally {
      setUpdating(false)
    }
  }

  // Delete reservation
  const deleteReservation = async () => {
    if (!reservation) return
    
    if (!confirm('Are you sure you want to delete this reservation? This action cannot be undone.')) {
      return
    }

    try {
      setUpdating(true)
      
      const response = await fetch(`/api/reservations/${reservation.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete reservation')
      }
      
      toast.success('Reservation deleted successfully!')
      router.push('/reservations')
    } catch (error) {
      console.error('Error deleting reservation:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to delete reservation')
    } finally {
      setUpdating(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'secondary'
      case 'APPROVED': return 'default'
      case 'ACTIVE': return 'default'
      case 'COMPLETED': return 'outline'
      case 'REJECTED': return 'destructive'
      case 'CANCELLED': return 'destructive'
      default: return 'outline'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 max-w-5xl mx-auto">
        <div className="container mx-auto px-4 py-8">
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="space-y-8"
          >
            <motion.div variants={fadeInUp} className="space-y-4">
              <div className="h-4 bg-muted/50 rounded-xl w-24 animate-pulse" />
              <div className="h-8 bg-muted/50 rounded-xl w-80 animate-pulse" />
              <div className="h-6 bg-muted/30 rounded-xl w-60 animate-pulse" />
            </motion.div>
            
            <motion.div variants={fadeInUp} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <AnimatedCard className="p-8 bg-gradient-to-br from-background to-muted/30 backdrop-blur-sm border border-border/50 shadow-lg">
                <div className="space-y-6">
                  <div className="h-6 bg-muted/50 rounded-xl w-48 animate-pulse" />
                  <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="space-y-2">
                        <div className="h-4 bg-muted/30 rounded-xl w-24 animate-pulse" />
                        <div className="h-5 bg-muted/50 rounded-xl w-full animate-pulse" />
                      </div>
                    ))}
                  </div>
                </div>
              </AnimatedCard>
              
              <AnimatedCard className="p-8 bg-gradient-to-br from-background to-muted/30 backdrop-blur-sm border border-border/50 shadow-lg">
                <div className="space-y-6">
                  <div className="h-6 bg-muted/50 rounded-xl w-40 animate-pulse" />
                  <div className="h-48 bg-muted/30 rounded-2xl animate-pulse" />
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="space-y-2">
                        <div className="h-4 bg-muted/30 rounded-xl w-20 animate-pulse" />
                        <div className="h-5 bg-muted/50 rounded-xl w-32 animate-pulse" />
                      </div>
                    ))}
                  </div>
                </div>
              </AnimatedCard>
            </motion.div>
          </motion.div>
        </div>
      </div>
    )
  }

  if (!reservation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        <div className="container mx-auto px-4 py-8">
          <AnimatedCard className="max-w-md mx-auto p-8 bg-gradient-to-br from-background to-muted/30 backdrop-blur-sm border border-border/50 shadow-lg text-center">
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              className="space-y-6"
            >
              <motion.div variants={fadeInUp} className="text-6xl opacity-20">
                <AlertTriangle className="h-16 w-16 mx-auto" />
              </motion.div>
              
              <motion.div variants={fadeInUp} className="space-y-4">
                <h1 className="text-2xl font-bold">Reservation Not Found</h1>
                <p className="text-muted-foreground leading-relaxed">
                  The reservation you&apos;re looking for doesn&apos;t exist or has been removed.
                </p>
                <AnimatedButton 
                  onClick={() => router.push('/reservations')}
                  className="mt-6"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Reservations
                </AnimatedButton>
              </motion.div>
            </motion.div>
          </AnimatedCard>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 max-w-5xl mx-auto ">
      <div className="container mx-auto px-4 py-8">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="space-y-8"
        >
          {/* Header */}
          <motion.div variants={fadeInUp} className="space-y-6">
            <AnimatedButton
              variant="outline"
              size="sm"
              onClick={() => router.back()}
              className="backdrop-blur-sm bg-background/50 border-border/50"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </AnimatedButton>
            
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                    Reservation Details
                  </h1>
                  <p className="text-muted-foreground text-lg">
                    View and manage reservation information
                  </p>
                </div>
                
                <div className="flex items-center gap-4 flex-wrap">
                  <Badge 
                    variant={getStatusColor(reservation.status)}
                    className="px-3 py-1 text-sm font-medium"
                  >
                    <div className={`w-2 h-2 rounded-full mr-2 ${
                      reservation.status === 'APPROVED' || reservation.status === 'ACTIVE' ? 'bg-green-500' :
                      reservation.status === 'PENDING' ? 'bg-amber-500' :
                      reservation.status === 'COMPLETED' ? 'bg-blue-500' :
                      'bg-red-500'
                    }`} />
                    {reservation.status}
                  </Badge>
                  
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span className="text-sm">
                      Created {new Date(reservation.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Action Buttons */}
              {canManage() && (
                <div className="flex flex-wrap gap-3">
                  {canApprove() && reservation.status === 'PENDING' && (
                    <>
                      <AnimatedButton
                        onClick={() => updateReservationStatus('APPROVED')}
                        disabled={updating}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        {updating ? 'Approving...' : 'Approve'}
                      </AnimatedButton>
                      <AnimatedButton
                        variant="outline"
                        onClick={() => setShowApprovalForm(true)}
                        disabled={updating}
                        className="border-red-200 text-red-600 hover:bg-red-50"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Reject
                      </AnimatedButton>
                    </>
                  )}
                  
                  {['PENDING', 'APPROVED'].includes(reservation.status) && (
                    <AnimatedButton
                      variant="outline"
                      onClick={cancelReservation}
                      disabled={updating}
                      className="border-amber-200 text-amber-600 hover:bg-amber-50"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      {updating ? 'Cancelling...' : 'Cancel'}
                    </AnimatedButton>
                  )}
                  
                  {canApprove() && ['CANCELLED', 'REJECTED'].includes(reservation.status) && (
                    <AnimatedButton
                      variant="destructive"
                      onClick={deleteReservation}
                      disabled={updating}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {updating ? 'Deleting...' : 'Delete'}
                    </AnimatedButton>
                  )}
                </div>
              )}
            </div>
          </motion.div>

          <motion.div 
            variants={fadeInUp} 
            className="grid grid-cols-1 lg:grid-cols-2 gap-8"
          >
            {/* Reservation Details */}
            <AnimatedCard className="p-8 bg-gradient-to-br from-background to-muted/30 backdrop-blur-sm border border-border/50 shadow-lg">
              <motion.div
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
                className="space-y-6"
              >
                <motion.div variants={fadeInUp} className="flex items-center gap-3">
                  <FileText className="h-6 w-6 text-primary" />
                  <h2 className="text-2xl font-semibold">Reservation Information</h2>
                </motion.div>
                
                <motion.div variants={fadeInUp} className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      Item
                    </Label>
                    <div className="bg-muted/30 rounded-xl p-4">
                      <AnimatedButton
                        variant="link"
                        className="p-0 h-auto font-semibold text-lg text-primary hover:text-primary/80"
                        onClick={() => router.push(`/items/${reservation.item.id}`)}
                      >
                        {reservation.item.name}
                      </AnimatedButton>
                      <p className="text-sm text-muted-foreground mt-1">{reservation.item.category}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Reserved by
                    </Label>
                    <div className="bg-muted/30 rounded-xl p-4">
                      <p className="font-medium">{reservation.user.name}</p>
                      <p className="text-sm text-muted-foreground">{reservation.user.email}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Reservation Period
                    </Label>
                    <div className="bg-muted/30 rounded-xl p-4 space-y-2">
                      <p className="font-medium">
                        {new Date(reservation.startDate).toLocaleDateString()} - {' '}
                        {new Date(reservation.endDate).toLocaleDateString()}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>
                          Duration: {Math.ceil(
                            (new Date(reservation.endDate).getTime() - new Date(reservation.startDate).getTime()) 
                            / (1000 * 60 * 60 * 24)
                          )} days
                        </span>
                      </div>
                    </div>
                  </div>

                  {reservation.purpose && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Purpose
                      </Label>
                      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
                        <p className="leading-relaxed">{reservation.purpose}</p>
                      </div>
                    </div>
                  )}

                  {reservation.notes && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Notes
                      </Label>
                      <div className="bg-muted/30 rounded-xl p-4">
                        <p className="leading-relaxed">{reservation.notes}</p>
                      </div>
                    </div>
                  )}
                </motion.div>
              </motion.div>
            </AnimatedCard>

            {/* Item Details */}
            <AnimatedCard className="p-8 bg-gradient-to-br from-background to-muted/30 backdrop-blur-sm border border-border/50 shadow-lg">
              <motion.div
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
                className="space-y-6"
              >
                <motion.div variants={fadeInUp} className="flex items-center gap-3">
                  <Package className="h-6 w-6 text-primary" />
                  <h2 className="text-2xl font-semibold">Item Information</h2>
                </motion.div>
                
                <motion.div variants={fadeInUp} className="space-y-6">
                  {reservation.item.images.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">Image</Label>
                      <div className="relative overflow-hidden rounded-2xl border border-border/30">
                        <Image
                          src={reservation.item.images[0]}
                          alt={reservation.item.name}
                          width={400}
                          height={256}
                          className="w-full h-64 object-cover transition-transform hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Status
                    </Label>
                    <div className="bg-muted/30 rounded-xl p-4">
                      <Badge 
                        variant={
                          reservation.item.status === 'AVAILABLE' ? 'default' :
                          reservation.item.status === 'RESERVED' ? 'secondary' :
                          'outline'
                        }
                        className="px-3 py-1 text-sm font-medium"
                      >
                        <div className={`w-2 h-2 rounded-full mr-2 ${
                          reservation.item.status === 'AVAILABLE' ? 'bg-green-500' :
                          reservation.item.status === 'RESERVED' ? 'bg-amber-500' :
                          'bg-gray-500'
                        }`} />
                        {reservation.item.status}
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Condition
                    </Label>
                    <div className="bg-muted/30 rounded-xl p-4">
                      <p className="font-medium">{reservation.item.condition}</p>
                    </div>
                  </div>

                  {reservation.item.location && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        Location
                      </Label>
                      <div className="bg-muted/30 rounded-xl p-4">
                        <p className="font-medium">{reservation.item.location}</p>
                      </div>
                    </div>
                  )}
                </motion.div>
              </motion.div>
            </AnimatedCard>
          </motion.div>

          {/* Rejection Form Modal */}
          {showApprovalForm && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="w-full max-w-md"
              >
                <AnimatedCard className="p-8 bg-gradient-to-br from-background to-muted/30 backdrop-blur-sm border border-border/50 shadow-2xl">
                  <motion.div
                    variants={staggerContainer}
                    initial="hidden"
                    animate="visible"
                    className="space-y-6"
                  >
                    <motion.div variants={fadeInUp} className="flex items-center gap-3">
                      <XCircle className="h-6 w-6 text-red-500" />
                      <h3 className="text-xl font-semibold">Reject Reservation</h3>
                    </motion.div>
                    
                    <motion.div variants={fadeInUp} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="rejectionReason" className="text-sm font-medium text-muted-foreground">
                          Reason for rejection
                        </Label>
                        <textarea
                          id="rejectionReason"
                          rows={4}
                          className="w-full px-4 py-3 bg-background/50 border border-border/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 resize-none transition-all placeholder:text-muted-foreground/60"
                          placeholder="Please provide a clear reason for rejecting this reservation..."
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                        />
                      </div>
                      
                      <div className="flex gap-3 pt-2">
                        <AnimatedButton
                          variant="outline"
                          onClick={() => {
                            setShowApprovalForm(false)
                            setRejectionReason('')
                          }}
                          disabled={updating}
                          className="flex-1"
                        >
                          Cancel
                        </AnimatedButton>
                        <AnimatedButton
                          variant="destructive"
                          onClick={() => updateReservationStatus('REJECTED', rejectionReason)}
                          disabled={updating || !rejectionReason.trim()}
                          className="flex-1"
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          {updating ? 'Rejecting...' : 'Reject'}
                        </AnimatedButton>
                      </div>
                    </motion.div>
                  </motion.div>
                </AnimatedCard>
              </motion.div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  )
}