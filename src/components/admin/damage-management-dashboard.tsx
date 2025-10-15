'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { 
  AlertTriangle, 
  Eye, 
  CheckCircle, 
  XCircle,
  Search,
  Download
} from 'lucide-react'

interface DamageReport {
  id: string
  damageType: 'PHYSICAL' | 'FUNCTIONAL' | 'COSMETIC' | 'MISSING_PARTS' | 'OTHER'
  severity: 'MINOR' | 'MODERATE' | 'MAJOR' | 'TOTAL_LOSS'
  description: string
  damageImages: string[]
  estimatedRepairCost?: number
  repairCost?: number
  isRepairable?: boolean
  affectsUsability: boolean
  status: 'REPORTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'RESOLVED'
  incidentDate: string
  createdAt: string
  adminNotes?: string
  penaltyAmount?: number
  resolutionNotes?: string
  return: {
    id: string
    returnDate: string
    item: {
      id: string
      name: string
      category: string
      value?: number
      images: string[]
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
  reportedByUser: {
    id: string
    name: string
    email: string
    role: string
  }
  approvedByUser?: {
    id: string
    name: string
    role: string
  }
}

interface DamageManagementDashboardProps {
  onClose?: () => void
}

const damageTypeLabels = {
  PHYSICAL: 'Physical',
  FUNCTIONAL: 'Functional',
  COSMETIC: 'Cosmetic',
  MISSING_PARTS: 'Missing Parts',
  OTHER: 'Other'
}

const severityConfig = {
  MINOR: { label: 'Minor', color: 'bg-yellow-100 text-yellow-800' },
  MODERATE: { label: 'Moderate', color: 'bg-orange-100 text-orange-800' },
  MAJOR: { label: 'Major', color: 'bg-red-100 text-red-800' },
  TOTAL_LOSS: { label: 'Total Loss', color: 'bg-gray-100 text-gray-800' }
}

const statusConfig = {
  REPORTED: { label: 'Reported', color: 'bg-blue-100 text-blue-800' },
  UNDER_REVIEW: { label: 'Under Review', color: 'bg-yellow-100 text-yellow-800' },
  APPROVED: { label: 'Approved', color: 'bg-green-100 text-green-800' },
  REJECTED: { label: 'Rejected', color: 'bg-red-100 text-red-800' },
  RESOLVED: { label: 'Resolved', color: 'bg-gray-100 text-gray-800' }
}

export default function DamageManagementDashboard({ onClose }: DamageManagementDashboardProps) {
  const [reports, setReports] = useState<DamageReport[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedReport, setSelectedReport] = useState<DamageReport | null>(null)
  const [filters, setFilters] = useState({
    status: '',
    severity: '',
    damageType: '',
    search: ''
  })
  const [actionLoading, setActionLoading] = useState(false)
  const [reviewForm, setReviewForm] = useState({
    status: '' as DamageReport['status'],
    adminNotes: '',
    repairCost: '',
    penaltyAmount: '',
    resolutionNotes: ''
  })

  useEffect(() => {
    fetchDamageReports()
  }, [filters]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchDamageReports = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      
      if (filters.status) params.append('status', filters.status)
      if (filters.severity) params.append('severity', filters.severity)
      if (filters.damageType) params.append('damageType', filters.damageType)
      if (filters.search) params.append('search', filters.search)

      const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/returns/damage?${params}`)
      if (!response.ok) throw new Error('Failed to fetch damage reports')

      const data = await response.json()
      setReports(data.reports || [])
    } catch (error) {
      console.error('Error fetching damage reports:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleReportAction = async (reportId: string, action: 'approve' | 'reject' | 'resolve') => {
    try {
      setActionLoading(true)
      
      const updateData: Record<string, unknown> = {
        status: action === 'approve' ? 'APPROVED' : action === 'reject' ? 'REJECTED' : 'RESOLVED',
        adminNotes: reviewForm.adminNotes,
      }

      if (reviewForm.repairCost) {
        updateData.repairCost = parseFloat(reviewForm.repairCost)
      }

      if (reviewForm.penaltyAmount && action === 'approve') {
        updateData.penaltyAmount = parseFloat(reviewForm.penaltyAmount)
      }

      if (reviewForm.resolutionNotes && action === 'resolve') {
        updateData.resolutionNotes = reviewForm.resolutionNotes
        updateData.resolutionDate = new Date().toISOString()
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/returns/damage/${reportId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      })

      if (!response.ok) throw new Error('Failed to update damage report')

      // Refresh reports and close detail view
      await fetchDamageReports()
      setSelectedReport(null)
      setReviewForm({
        status: '' as DamageReport['status'],
        adminNotes: '',
        repairCost: '',
        penaltyAmount: '',
        resolutionNotes: ''
      })

    } catch (error) {
      console.error('Error updating damage report:', error)
    } finally {
      setActionLoading(false)
    }
  }

  const exportReports = async () => {
    try {
      const params = new URLSearchParams()
      if (filters.status) params.append('status', filters.status)
      if (filters.severity) params.append('severity', filters.severity)
      if (filters.damageType) params.append('damageType', filters.damageType)

      const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/returns/damage/export?${params}`)
      if (!response.ok) throw new Error('Failed to export reports')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `damage-reports-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Error exporting reports:', error)
    }
  }

  if (selectedReport) {
    return (
      <Card className="max-w-6xl mx-auto p-6">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <h2 className="text-xl font-semibold">Damage Report Details</h2>
              <p className="text-gray-600">
                Report ID: {selectedReport.id}
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => setSelectedReport(null)}
            >
              Back to List
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Report Information */}
            <div className="space-y-4">
              <Card className="p-4">
                <h3 className="font-medium mb-3">Report Information</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Type:</span>
                    <span>{damageTypeLabels[selectedReport.damageType]}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Severity:</span>
                    <Badge className={severityConfig[selectedReport.severity].color}>
                      {severityConfig[selectedReport.severity].label}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <Badge className={statusConfig[selectedReport.status].color}>
                      {statusConfig[selectedReport.status].label}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Affects Usability:</span>
                    <span>{selectedReport.affectsUsability ? 'Yes' : 'No'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Repairable:</span>
                    <span>{selectedReport.isRepairable ? 'Yes' : selectedReport.isRepairable === false ? 'No' : 'Unknown'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Estimated Cost:</span>
                    <span>${selectedReport.estimatedRepairCost?.toFixed(2) || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Incident Date:</span>
                    <span>{new Date(selectedReport.incidentDate).toLocaleDateString()}</span>
                  </div>
                </div>
              </Card>

              {/* Item Information */}
              <Card className="p-4">
                <h3 className="font-medium mb-3">Item Information</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Name:</span>
                    <span>{selectedReport.return.item.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Category:</span>
                    <span>{selectedReport.return.item.category}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Value:</span>
                    <span>${selectedReport.return.item.value?.toFixed(2) || 'N/A'}</span>
                  </div>
                </div>
              </Card>

              {/* User Information */}
              <Card className="p-4">
                <h3 className="font-medium mb-3">User Information</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Name:</span>
                    <span>{selectedReport.return.user.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Email:</span>
                    <span>{selectedReport.return.user.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Trust Score:</span>
                    <span>{selectedReport.return.user.trustScore.toFixed(1)}</span>
                  </div>
                </div>
              </Card>
            </div>

            {/* Description and Images */}
            <div className="space-y-4">
              <Card className="p-4">
                <h3 className="font-medium mb-3">Damage Description</h3>
                <p className="text-sm text-gray-700">{selectedReport.description}</p>
              </Card>

              {/* Damage Images */}
              {selectedReport.damageImages.length > 0 && (
                <Card className="p-4">
                  <h3 className="font-medium mb-3">Damage Evidence</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedReport.damageImages.map((image, index) => (
                      <div key={index} className="relative aspect-video">
                        <Image
                          src={image}
                          alt={`Damage evidence ${index + 1}`}
                          fill
                          className="object-cover rounded border"
                        />
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Admin Actions */}
              {['REPORTED', 'UNDER_REVIEW'].includes(selectedReport.status) && (
                <Card className="p-4">
                  <h3 className="font-medium mb-3">Admin Review</h3>
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="adminNotes">Admin Notes</Label>
                      <textarea
                        id="adminNotes"
                        value={reviewForm.adminNotes}
                        onChange={(e) => setReviewForm(prev => ({ ...prev, adminNotes: e.target.value }))}
                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
                        rows={3}
                        placeholder="Add notes about this damage report..."
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="repairCost">Actual Repair Cost</Label>
                        <Input
                          id="repairCost"
                          type="number"
                          min="0"
                          step="0.01"
                          value={reviewForm.repairCost}
                          onChange={(e) => setReviewForm(prev => ({ ...prev, repairCost: e.target.value }))}
                          placeholder="0.00"
                        />
                      </div>

                      <div>
                        <Label htmlFor="penaltyAmount">Penalty Amount</Label>
                        <Input
                          id="penaltyAmount"
                          type="number"
                          min="0"
                          step="0.1"
                          value={reviewForm.penaltyAmount}
                          onChange={(e) => setReviewForm(prev => ({ ...prev, penaltyAmount: e.target.value }))}
                          placeholder="Trust score deduction"
                        />
                      </div>
                    </div>

                    <div className="flex space-x-2">
                      <Button
                        onClick={() => handleReportAction(selectedReport.id, 'approve')}
                        disabled={actionLoading}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Approve
                      </Button>
                      <Button
                        onClick={() => handleReportAction(selectedReport.id, 'reject')}
                        disabled={actionLoading}
                        variant="outline"
                        className="border-red-300 text-red-600 hover:bg-red-50"
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Reject
                      </Button>
                    </div>
                  </div>
                </Card>
              )}

              {/* Resolution Actions */}
              {selectedReport.status === 'APPROVED' && (
                <Card className="p-4">
                  <h3 className="font-medium mb-3">Mark as Resolved</h3>
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="resolutionNotes">Resolution Notes</Label>
                      <textarea
                        id="resolutionNotes"
                        value={reviewForm.resolutionNotes}
                        onChange={(e) => setReviewForm(prev => ({ ...prev, resolutionNotes: e.target.value }))}
                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
                        rows={2}
                        placeholder="Describe how the damage was resolved..."
                      />
                    </div>
                    <Button
                      onClick={() => handleReportAction(selectedReport.id, 'resolve')}
                      disabled={actionLoading}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Mark as Resolved
                    </Button>
                  </div>
                </Card>
              )}
            </div>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card className="max-w-7xl mx-auto p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-4">
          <div>
            <h2 className="text-xl font-semibold">Damage Management Dashboard</h2>
            <p className="text-gray-600">Review and manage damage reports</p>
          </div>
          <div className="flex space-x-2">
            <Button
              onClick={exportReports}
              variant="outline"
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            {onClose && (
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            )}
          </div>
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="statusFilter">Status</Label>
              <select
                id="statusFilter"
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">All Statuses</option>
                <option value="REPORTED">Reported</option>
                <option value="UNDER_REVIEW">Under Review</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
                <option value="RESOLVED">Resolved</option>
              </select>
            </div>

            <div>
              <Label htmlFor="severityFilter">Severity</Label>
              <select
                id="severityFilter"
                value={filters.severity}
                onChange={(e) => setFilters(prev => ({ ...prev, severity: e.target.value }))}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">All Severities</option>
                <option value="MINOR">Minor</option>
                <option value="MODERATE">Moderate</option>
                <option value="MAJOR">Major</option>
                <option value="TOTAL_LOSS">Total Loss</option>
              </select>
            </div>

            <div>
              <Label htmlFor="typeFilter">Damage Type</Label>
              <select
                id="typeFilter"
                value={filters.damageType}
                onChange={(e) => setFilters(prev => ({ ...prev, damageType: e.target.value }))}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">All Types</option>
                <option value="PHYSICAL">Physical</option>
                <option value="FUNCTIONAL">Functional</option>
                <option value="COSMETIC">Cosmetic</option>
                <option value="MISSING_PARTS">Missing Parts</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div>
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  placeholder="Search reports..."
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Reports Table */}
        <Card className="p-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
              <p>No damage reports found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Item</th>
                    <th className="text-left p-2">User</th>
                    <th className="text-left p-2">Type</th>
                    <th className="text-left p-2">Severity</th>
                    <th className="text-left p-2">Status</th>
                    <th className="text-left p-2">Date</th>
                    <th className="text-left p-2">Cost</th>
                    <th className="text-left p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((report) => (
                    <tr key={report.id} className="border-b hover:bg-gray-50">
                      <td className="p-2">
                        <div>
                          <div className="font-medium">{report.return.item.name}</div>
                          <div className="text-gray-500 text-xs">{report.return.item.category}</div>
                        </div>
                      </td>
                      <td className="p-2">
                        <div>
                          <div className="font-medium">{report.return.user.name}</div>
                          <div className="text-gray-500 text-xs">Trust: {report.return.user.trustScore.toFixed(1)}</div>
                        </div>
                      </td>
                      <td className="p-2">
                        <span className="text-xs">{damageTypeLabels[report.damageType]}</span>
                      </td>
                      <td className="p-2">
                        <Badge className={`text-xs ${severityConfig[report.severity].color}`}>
                          {severityConfig[report.severity].label}
                        </Badge>
                      </td>
                      <td className="p-2">
                        <Badge className={`text-xs ${statusConfig[report.status].color}`}>
                          {statusConfig[report.status].label}
                        </Badge>
                      </td>
                      <td className="p-2">
                        <div className="text-xs">
                          {new Date(report.incidentDate).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="p-2">
                        <div className="text-xs">
                          ${report.estimatedRepairCost?.toFixed(2) || 'N/A'}
                        </div>
                      </td>
                      <td className="p-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedReport(report)}
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </Card>
  )
}