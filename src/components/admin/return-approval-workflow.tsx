'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  Eye,
  FileText,
  User,
  Calendar
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

interface ReturnApprovalWorkflowProps {
  onClose: () => void
}

export default function ReturnApprovalWorkflow({ onClose }: ReturnApprovalWorkflowProps) {
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
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Return Approval Workflow</h1>
        <Button onClick={onClose} variant="outline">
          Close
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        {['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'DAMAGED'].map((status) => (
          <button
            key={status}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              filter === status
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
            onClick={() => setFilter(status as typeof filter)}
          >
            {status}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-32 bg-gray-200 rounded-lg"></div>
            </div>
          ))}
        </div>
      ) : returns.length === 0 ? (
        <Card className="p-8 text-center">
          <div className="text-gray-500">
            <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg">No returns found</p>
            <p className="text-sm">
              {filter === 'ALL' ? 'No returns in the system' : `No ${filter.toLowerCase()} returns`}
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {returns.map((returnItem) => (
            <Card key={returnItem.id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold">{returnItem.item.name}</h3>
                    <Badge className={getStatusColor(returnItem.status)}>
                      {returnItem.status}
                    </Badge>
                    {returnItem.penaltyApplied && (
                      <Badge variant="outline" className="text-red-600 border-red-500">
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
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedReturn(returnItem)}
                    className="whitespace-nowrap"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View Details
                  </Button>
                  
                  {returnItem.status === 'PENDING' && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedReturn(returnItem)
                          setShowAssessmentForm(true)
                        }}
                        className="bg-blue-600 hover:bg-blue-700 whitespace-nowrap"
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        Assess Condition
                      </Button>
                      
                      <Button
                        size="sm"
                        onClick={() => {
                          // Open damage report form in a new tab/window or modal
                          window.open(`/returns/${returnItem.id}/damage-report`, '_blank')
                        }}
                        variant="outline"
                        className="text-orange-600 border-orange-300 hover:bg-orange-50 whitespace-nowrap"
                      >
                        <AlertTriangle className="w-4 h-4 mr-2" />
                        Report Damage
                      </Button>
                      
                      <Button
                        size="sm"
                        onClick={() => handleApprove(returnItem.id)}
                        className="bg-green-600 hover:bg-green-700 whitespace-nowrap"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Quick Approve
                      </Button>
                      
                      <Button
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
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
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
    </div>
  )
}