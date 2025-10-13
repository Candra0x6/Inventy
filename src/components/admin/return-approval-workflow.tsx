'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { AnimatedButton } from '@/components/ui/animated-button'
import { AnimatedCard } from '@/components/ui/animated-card'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { fadeInUp, staggerContainer } from '@/lib/animations'
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  Eye,
  FileText,
  User,
  Calendar,
  Package,
  Settings,
  Search
} from 'lucide-react'
import ConditionAssessmentForm from './condition-assessment-form'

interface Return {
  id: string
  returnDate: string
  conditionOnReturn: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'DAMAGED'
  damageReport?: string
  damageImages: string[]
  penaltyApplied: boolean
  penaltyReason?: string
  penaltyAmount?: number
  notes?: string
  createdAt: string
  item: {
    id: string
    name: string
    condition: string
    category: string
  }
  user: {
    id: string
    name: string
    email: string
    trustScore: number
  }
  reservation: {
    id: string
    startDate: string
    endDate: string
  }
}

export default function ReturnApprovalWorkflow() {
  const [loading, setLoading] = useState(true)
  const [returns, setReturns] = useState<Return[]>([])
  const [selectedReturn, setSelectedReturn] = useState<Return | null>(null)
  const [showAssessmentForm, setShowAssessmentForm] = useState(false)
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'DAMAGED'>('PENDING')

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const params = new URLSearchParams()
        if (filter !== 'ALL') {
          params.append('status', filter)
        }
        params.append('limit', '50')
        
        const response = await fetch(`/api/returns?${params}`)
        if (response.ok) {
          const data = await response.json()
          setReturns(data.returns || [])
        }
      } catch (error) {
        console.error('Error fetching returns:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [filter])

  const fetchReturns = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filter !== 'ALL') {
        params.append('status', filter)
      }
      params.append('limit', '50')
      
      const response = await fetch(`/api/returns?${params}`)
      if (response.ok) {
        const data = await response.json()
        setReturns(data.returns || [])
      }
    } catch (error) {
      console.error('Error fetching returns:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (returnId: string) => {
    try {
      const response = await fetch(`/api/returns/${returnId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'APPROVED'
        }),
      })
      
      if (response.ok) {
        await fetchReturns()
        setSelectedReturn(null)
      } else {
        const error = await response.json()
        alert(`Error approving return: ${error.error}`)
      }
    } catch (error) {
      console.error('Error approving return:', error)
      alert('Error approving return')
    }
  }

  const handleReject = async (returnId: string, reason: string) => {
    try {
      const response = await fetch(`/api/returns/${returnId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'REJECTED',
          rejectionReason: reason
        }),
      })
      
      if (response.ok) {
        await fetchReturns()
        setSelectedReturn(null)
      } else {
        const error = await response.json()
        alert(`Error rejecting return: ${error.error}`)
      }
    } catch (error) {
      console.error('Error rejecting return:', error)
      alert('Error rejecting return')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case 'APPROVED':
        return 'bg-green-100 text-green-800 border-green-300'
      case 'REJECTED':
        return 'bg-red-100 text-red-800 border-red-300'
      case 'DAMAGED':
        return 'bg-orange-100 text-orange-800 border-orange-300'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'EXCELLENT':
        return 'text-green-700 border-green-500'
      case 'GOOD':
        return 'text-blue-700 border-blue-500'
      case 'FAIR':
        return 'text-yellow-700 border-yellow-500'
      case 'POOR':
        return 'text-orange-700 border-orange-500'
      case 'DAMAGED':
        return 'text-red-700 border-red-500'
      default:
        return 'text-gray-700 border-gray-500'
    }
  }

  if (showAssessmentForm && selectedReturn) {
    return (
      <ConditionAssessmentForm
        returnId={selectedReturn.id}
        onAssessmentComplete={() => {
          setShowAssessmentForm(false)
          setSelectedReturn(null)
          fetchReturns()
        }}
        onCancel={() => {
          setShowAssessmentForm(false)
          setSelectedReturn(null)
        }}
      />
    )
  }

  return (
    <motion.div 
      className="max-w-7xl mx-auto space-y-6"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      <AnimatedCard className="bg-gradient-to-br from-background to-muted/30 backdrop-blur-sm border border-border/50 shadow-lg w-full">
        <motion.div variants={fadeInUp} className="p-6 border-b border-border/50">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-gradient-to-br from-primary/20 to-primary/10 backdrop-blur-sm rounded-xl border border-primary/20">
                <Settings className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl lg:text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                  Return Approval Workflow
                </h1>
                <p className="text-muted-foreground">
                  Review and process item return requests
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Enhanced Filter Tabs */}
        <motion.div variants={fadeInUp} className="p-6 pt-0">
          <div className="flex flex-wrap gap-2 p-2 bg-muted/30 backdrop-blur-sm rounded-xl border border-border/50">
            {['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'DAMAGED'].map((status) => (
              <motion.button
                key={status}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  filter === status
                    ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                    : 'text-muted-foreground hover:text-foreground hover:bg-background/80'
                }`}
                onClick={() => setFilter(status as typeof filter)}
              >
                <div className="flex items-center space-x-2">
                  {status === 'PENDING' && <Clock className="h-4 w-4" />}
                  {status === 'APPROVED' && <CheckCircle className="h-4 w-4" />}
                  {status === 'REJECTED' && <XCircle className="h-4 w-4" />}
                  {status === 'DAMAGED' && <AlertTriangle className="h-4 w-4" />}
                  {status === 'ALL' && <FileText className="h-4 w-4" />}
                  <span>{status}</span>
                </div>
              </motion.button>
            ))}
          </div>
        </motion.div>
      </AnimatedCard>

      {loading ? (
        <motion.div 
          variants={fadeInUp}
          className="space-y-4"
        >
          <AnimatedCard className="bg-gradient-to-br from-background to-muted/30 backdrop-blur-sm border border-border/50 shadow-lg">
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              className="p-6 space-y-6"
            >
              {[...Array(5)].map((_, i) => (
                <motion.div 
                  key={i}
                  variants={fadeInUp}
                  className="h-32 bg-muted/30 rounded-xl animate-pulse"
                />
              ))}
            </motion.div>
          </AnimatedCard>
        </motion.div>
      ) : returns.length === 0 ? (
        <motion.div variants={fadeInUp}>
          <AnimatedCard className="p-12 text-center bg-gradient-to-br from-background to-muted/30 backdrop-blur-sm border border-border/50 shadow-lg">
            <motion.div 
              variants={fadeInUp}
              className="text-muted-foreground"
            >
              <div className="p-4 bg-muted/20 rounded-full w-fit mx-auto mb-6">
                <Clock className="w-12 h-12 opacity-50" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No returns found</h3>
              <p className="text-muted-foreground mb-6">
                {filter === 'ALL' ? 'No returns in the system' : `No ${filter.toLowerCase()} returns`}
              </p>
              <AnimatedButton variant="outline" onClick={() => setFilter('ALL')}>
                <Search className="h-4 w-4 mr-2" />
                Show All Returns
              </AnimatedButton>
            </motion.div>
          </AnimatedCard>
        </motion.div>
      ) : (
        <motion.div 
          variants={staggerContainer}
          className="space-y-6"
        >
          {returns.map((returnItem, index) => (
            <motion.div
              key={returnItem.id}
              variants={fadeInUp}
              transition={{ delay: index * 0.1 }}
            >
              <AnimatedCard className="overflow-hidden bg-gradient-to-br from-background to-muted/30 backdrop-blur-sm border border-border/50 shadow-lg hover:shadow-xl transition-all duration-300">
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-900/30 dark:to-blue-800/20 rounded-lg">
                          <Package className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <h3 className="text-lg font-semibold">{returnItem.item.name}</h3>
                        <Badge className={`${getStatusColor(returnItem.status)} shadow-sm`}>
                          {returnItem.status}
                        </Badge>
                        {returnItem.penaltyApplied && (
                          <Badge className="bg-red-100 text-red-800 border-red-300 shadow-sm">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Penalty Applied
                          </Badge>
                        )}
                      </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Returned By</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="text-sm">{returnItem.user.name}</span>
                      </div>
                      <p className="text-xs text-gray-500">{returnItem.user.email}</p>
                    </div>
                    
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Return Date</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-sm">{formatDate(returnItem.returnDate)}</span>
                      </div>
                    </div>
                    
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Condition</Label>
                      <div className="mt-1">
                        <Badge variant="outline" className={getConditionColor(returnItem.conditionOnReturn)}>
                          {returnItem.conditionOnReturn}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-500">Original: {returnItem.item.condition}</p>
                    </div>
                    
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Trust Score</Label>
                      <div className="mt-1">
                        <span className="text-lg font-semibold">{returnItem.user.trustScore}</span>
                        {returnItem.penaltyAmount && (
                          <span className="text-red-600 text-sm ml-2">
                            -{returnItem.penaltyAmount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {returnItem.damageReport && (
                    <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-4 h-4 text-orange-600" />
                        <Label className="text-sm font-medium text-orange-800">Damage Report</Label>
                      </div>
                      <p className="text-sm text-orange-700">{returnItem.damageReport}</p>
                    </div>
                  )}

                  {returnItem.penaltyReason && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <XCircle className="w-4 h-4 text-red-600" />
                        <Label className="text-sm font-medium text-red-800">Penalty Reason</Label>
                      </div>
                      <p className="text-sm text-red-700">{returnItem.penaltyReason}</p>
                    </div>
                  )}

                  {returnItem.notes && (
                    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="w-4 h-4 text-blue-600" />
                        <Label className="text-sm font-medium text-blue-800">Notes</Label>
                      </div>
                      <p className="text-sm text-blue-700">{returnItem.notes}</p>
                    </div>
                  )}
                    </div>

                    <div className="flex flex-col gap-2 ml-4">
                      <AnimatedButton
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedReturn(returnItem)}
                        className="whitespace-nowrap"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View Details
                      </AnimatedButton>
                      
                      {returnItem.status === 'PENDING' && (
                        <>
                          <AnimatedButton
                            size="sm"
                            onClick={() => {
                              setSelectedReturn(returnItem)
                              setShowAssessmentForm(true)
                            }}
                            className="bg-blue-600 hover:bg-blue-700 whitespace-nowrap"
                          >
                            <FileText className="w-4 h-4 mr-2" />
                            Assess Condition
                          </AnimatedButton>
                          
                          <AnimatedButton
                            size="sm"
                            onClick={() => {
                              window.open(`/returns/${returnItem.id}/damage-report`, '_blank')
                            }}
                            variant="outline"
                            className="text-orange-600 border-orange-300 hover:bg-orange-50 whitespace-nowrap"
                          >
                            <AlertTriangle className="w-4 h-4 mr-2" />
                            Report Damage
                          </AnimatedButton>
                          
                          <AnimatedButton
                            size="sm"
                            onClick={() => handleApprove(returnItem.id)}
                            className="bg-green-600 hover:bg-green-700 whitespace-nowrap"
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Quick Approve
                          </AnimatedButton>
                          
                          <AnimatedButton
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const reason = prompt('Rejection reason:')
                              if (reason) {
                                handleReject(returnItem.id, reason)
                              }
                            }}
                            className="text-red-600 border-red-300 hover:bg-red-50 whitespace-nowrap"
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            Reject
                          </AnimatedButton>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </AnimatedCard>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Return Details Modal */}
      {selectedReturn && !showAssessmentForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Return Details</h2>
                <Button
                  onClick={() => setSelectedReturn(null)}
                  variant="outline"
                  size="sm"
                >
                  Close
                </Button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Item</Label>
                    <p className="font-medium">{selectedReturn.item.name}</p>
                    <p className="text-sm text-gray-600">{selectedReturn.item.category}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Status</Label>
                    <Badge className={getStatusColor(selectedReturn.status)}>
                      {selectedReturn.status}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Original Condition</Label>
                    <Badge variant="outline" className={getConditionColor(selectedReturn.item.condition)}>
                      {selectedReturn.item.condition}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Return Condition</Label>
                    <Badge variant="outline" className={getConditionColor(selectedReturn.conditionOnReturn)}>
                      {selectedReturn.conditionOnReturn}
                    </Badge>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-500">Return Period</Label>
                  <p className="text-sm">
                    {formatDate(selectedReturn.reservation.startDate)} → {formatDate(selectedReturn.reservation.endDate)}
                  </p>
                  <p className="text-sm text-gray-600">
                    Returned: {formatDate(selectedReturn.returnDate)}
                  </p>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-500">Borrower Information</Label>
                  <p className="font-medium">{selectedReturn.user.name}</p>
                  <p className="text-sm text-gray-600">{selectedReturn.user.email}</p>
                  <p className="text-sm">Trust Score: <span className="font-medium">{selectedReturn.user.trustScore}</span></p>
                </div>

                {selectedReturn.damageImages && selectedReturn.damageImages.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Damage Images</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {selectedReturn.damageImages.map((image, index) => (
                        <Image
                          key={index}
                          src={image}
                          alt={`Damage ${index + 1}`}
                          width={200}
                          height={128}
                          className="w-full h-32 object-cover rounded border"
                        />
                      ))}
                    </div>
                  </div>
                )}

                {selectedReturn.status === 'PENDING' && (
                  <div className="flex gap-2 pt-4 border-t">
                    <Button
                      onClick={() => {
                        setShowAssessmentForm(true)
                      }}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Perform Assessment
                    </Button>
                    <Button
                      onClick={() => handleApprove(selectedReturn.id)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Approve
                    </Button>
                    <Button
                      onClick={() => {
                        const reason = prompt('Rejection reason:')
                        if (reason) {
                          handleReject(selectedReturn.id, reason)
                        }
                      }}
                      variant="outline"
                      className="text-red-600 border-red-300 hover:bg-red-50"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Reject
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>
      )}
    </motion.div>
  )
}