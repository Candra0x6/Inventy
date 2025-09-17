'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { 
  Star, 
  AlertTriangle, 
  CheckCircle
} from 'lucide-react'

interface AssessmentCriteria {
  id: string
  name: string
  description?: string
  weight: number
  options: {
    value: number
    label: string
    description?: string
    conditionImpact: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'DAMAGED'
  }[]
}

interface AssessmentTemplate {
  id: string
  name: string
  description?: string
  criteria: AssessmentCriteria[]
  conditionThresholds: {
    excellent: number
    good: number
    fair: number
    poor: number
  }
}

interface Return {
  id: string
  returnDate: string
  conditionOnReturn: string
  status: string
  damageReport?: string
  damageImages: string[]
  item: {
    id: string
    name: string
    condition: string
  }
  user: {
    name: string
    email: string
  }
}

interface ConditionAssessmentFormProps {
  returnId: string
  onAssessmentComplete: () => void
  onCancel: () => void
}

export default function ConditionAssessmentForm({
  returnId,
  onAssessmentComplete,
  onCancel
}: ConditionAssessmentFormProps) {
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [returnData, setReturnData] = useState<Return | null>(null)
  const [templates, setTemplates] = useState<AssessmentTemplate[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<AssessmentTemplate | null>(null)
  const [responses, setResponses] = useState<Record<string, { value: number; notes?: string }>>({})
  const [overallNotes, setOverallNotes] = useState('')
  const [additionalImages] = useState<string[]>([])
  const [staffRecommendation, setStaffRecommendation] = useState<string>('')
  const [penaltyRecommendation, setPenaltyRecommendation] = useState<{
    amount: number
    reason: string
  }>({ amount: 0, reason: '' })

  useEffect(() => {
    const fetchReturnData = async () => {
      try {
        const response = await fetch(`/api/returns/${returnId}`)
        if (response.ok) {
          const data = await response.json()
          setReturnData(data.return)
        }
      } catch (error) {
        console.error('Error fetching return data:', error)
      }
    }

    const fetchTemplates = async () => {
      try {
        const response = await fetch('/api/assessments/templates')
        if (response.ok) {
          const data = await response.json()
          setTemplates(data.templates)
          
          // Auto-select first template if available
          if (data.templates.length > 0) {
            setSelectedTemplate(data.templates[0])
            
            // Initialize responses for all criteria
            const initialResponses: Record<string, { value: number; notes?: string }> = {}
            data.templates[0].criteria.forEach((criteria: AssessmentCriteria) => {
              initialResponses[criteria.id] = { value: 3, notes: '' } // Default to middle value
            })
            setResponses(initialResponses)
          }
        }
      } catch (error) {
        console.error('Error fetching templates:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchReturnData()
    fetchTemplates()
  }, [returnId])

  const calculateOverallScore = () => {
    if (!selectedTemplate) return 0
    
    let totalWeightedScore = 0
    let totalWeight = 0
    
    selectedTemplate.criteria.forEach(criteria => {
      const response = responses[criteria.id]
      if (response) {
        totalWeightedScore += response.value * criteria.weight
        totalWeight += criteria.weight
      }
    })
    
    return totalWeight > 0 ? totalWeightedScore / totalWeight : 0
  }

  const determinedCondition = () => {
    if (!selectedTemplate) return 'UNKNOWN'
    
    const score = calculateOverallScore()
    const thresholds = selectedTemplate.conditionThresholds
    
    if (score >= thresholds.excellent) return 'EXCELLENT'
    if (score >= thresholds.good) return 'GOOD'
    if (score >= thresholds.fair) return 'FAIR'
    if (score >= thresholds.poor) return 'POOR'
    return 'DAMAGED'
  }

  const handleResponseChange = (criteriaId: string, value: number, notes?: string) => {
    setResponses(prev => ({
      ...prev,
      [criteriaId]: { value, notes }
    }))
  }

  const handleSubmit = async () => {
    if (!selectedTemplate || !returnData) return
    
    setSubmitting(true)
    
    try {
      const assessmentData = {
        returnId,
        templateId: selectedTemplate.id,
        responses: Object.entries(responses).map(([criteriaId, response]) => ({
          criteriaId,
          value: response.value,
          notes: response.notes
        })),
        overallNotes,
        additionalImages,
        staffRecommendation: staffRecommendation || undefined,
        penaltyRecommendation: penaltyRecommendation.amount > 0 ? penaltyRecommendation : undefined
      }
      
      const response = await fetch('/api/assessments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(assessmentData),
      })
      
      if (response.ok) {
        onAssessmentComplete()
      } else {
        const error = await response.json()
        alert(`Error submitting assessment: ${error.error}`)
      }
    } catch (error) {
      console.error('Error submitting assessment:', error)
      alert('Error submitting assessment')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (!returnData) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-600">Return data not found</p>
        <Button onClick={onCancel} className="mt-4">
          Back
        </Button>
      </div>
    )
  }

  const overallScore = calculateOverallScore()
  const condition = determinedCondition()

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Condition Assessment</h1>
        <div className="flex gap-2">
          <Button onClick={onCancel} variant="outline">
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={submitting || !selectedTemplate}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {submitting ? 'Submitting...' : 'Submit Assessment'}
          </Button>
        </div>
      </div>

      {/* Return Information */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Return Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label className="text-sm font-medium text-gray-500">Item</Label>
            <p className="text-lg">{returnData.item.name}</p>
          </div>
          <div>
            <Label className="text-sm font-medium text-gray-500">Original Condition</Label>
            <Badge variant="outline">{returnData.item.condition}</Badge>
          </div>
          <div>
            <Label className="text-sm font-medium text-gray-500">Returned By</Label>
            <p>{returnData.user.name}</p>
          </div>
        </div>
        
        {returnData.damageReport && (
          <div className="mt-4">
            <Label className="text-sm font-medium text-gray-500">Damage Report</Label>
            <p className="mt-1 text-sm text-gray-600">{returnData.damageReport}</p>
          </div>
        )}
      </Card>

      {/* Template Selection */}
      {templates.length > 1 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Assessment Template</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.map(template => (
              <div
                key={template.id}
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  selectedTemplate?.id === template.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setSelectedTemplate(template)}
              >
                <h4 className="font-medium">{template.name}</h4>
                {template.description && (
                  <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                )}
                <p className="text-xs text-gray-500 mt-2">
                  {template.criteria.length} criteria
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Assessment Form */}
      {selectedTemplate && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Assessment Criteria</h3>
          <div className="space-y-6">
            {selectedTemplate.criteria.map(criteria => (
              <div key={criteria.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-medium">{criteria.name}</h4>
                    {criteria.description && (
                      <p className="text-sm text-gray-600">{criteria.description}</p>
                    )}
                  </div>
                  <Badge variant="outline">Weight: {criteria.weight}</Badge>
                </div>
                
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {criteria.options.map(option => (
                      <button
                        key={option.value}
                        className={`px-3 py-2 rounded-md text-sm border transition-colors ${
                          responses[criteria.id]?.value === option.value
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => handleResponseChange(criteria.id, option.value, responses[criteria.id]?.notes)}
                      >
                        <div className="flex items-center gap-1">
                          <Star 
                            size={14} 
                            className={option.value >= 4 ? 'text-green-500' : option.value >= 3 ? 'text-yellow-500' : 'text-red-500'} 
                          />
                          {option.label}
                        </div>
                        {option.description && (
                          <div className="text-xs text-gray-500 mt-1">{option.description}</div>
                        )}
                      </button>
                    ))}
                  </div>
                  
                  <div>
                    <Label htmlFor={`notes-${criteria.id}`} className="text-sm">Notes (optional)</Label>
                    <Input
                      id={`notes-${criteria.id}`}
                      placeholder="Add any specific observations..."
                      value={responses[criteria.id]?.notes || ''}
                      onChange={(e) => handleResponseChange(criteria.id, responses[criteria.id]?.value || 3, e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Assessment Summary */}
      {selectedTemplate && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Assessment Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <Label className="text-sm font-medium text-gray-500">Overall Score</Label>
              <div className="text-2xl font-bold mt-1">{overallScore.toFixed(1)}/5.0</div>
            </div>
            <div className="text-center">
              <Label className="text-sm font-medium text-gray-500">Determined Condition</Label>
              <Badge 
                variant="outline" 
                className={`mt-1 text-lg px-3 py-1 ${
                  condition === 'EXCELLENT' ? 'text-green-700 border-green-500' :
                  condition === 'GOOD' ? 'text-blue-700 border-blue-500' :
                  condition === 'FAIR' ? 'text-yellow-700 border-yellow-500' :
                  condition === 'POOR' ? 'text-orange-700 border-orange-500' :
                  'text-red-700 border-red-500'
                }`}
              >
                {condition}
              </Badge>
            </div>
            <div className="text-center">
              <Label className="text-sm font-medium text-gray-500">Status</Label>
              <div className="flex items-center justify-center gap-2 mt-1">
                {condition === returnData.item.condition ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-orange-500" />
                )}
                <span className="text-sm">
                  {condition === returnData.item.condition ? 'No degradation' : 'Condition changed'}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="overall-notes">Overall Assessment Notes</Label>
              <textarea
                id="overall-notes"
                className="w-full mt-1 p-3 border border-gray-300 rounded-md"
                rows={3}
                placeholder="Add any overall observations, recommendations, or notes..."
                value={overallNotes}
                onChange={(e) => setOverallNotes(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="staff-recommendation">Staff Recommendation (Optional)</Label>
              <select
                id="staff-recommendation"
                className="w-full mt-1 p-2 border border-gray-300 rounded-md"
                value={staffRecommendation}
                onChange={(e) => setStaffRecommendation(e.target.value)}
              >
                <option value="">Use automatic determination</option>
                <option value="EXCELLENT">Excellent</option>
                <option value="GOOD">Good</option>
                <option value="FAIR">Fair</option>
                <option value="POOR">Poor</option>
                <option value="DAMAGED">Damaged</option>
              </select>
            </div>

            {condition !== returnData.item.condition && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <h4 className="font-medium text-orange-800 mb-2">Penalty Recommendation</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="penalty-amount">Penalty Amount (Trust Score Points)</Label>
                    <Input
                      id="penalty-amount"
                      type="number"
                      min="0"
                      max="100"
                      value={penaltyRecommendation.amount}
                      onChange={(e) => setPenaltyRecommendation(prev => ({
                        ...prev,
                        amount: parseInt(e.target.value) || 0
                      }))}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="penalty-reason">Penalty Reason</Label>
                    <Input
                      id="penalty-reason"
                      placeholder="Reason for penalty..."
                      value={penaltyRecommendation.reason}
                      onChange={(e) => setPenaltyRecommendation(prev => ({
                        ...prev,
                        reason: e.target.value
                      }))}
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  )
}