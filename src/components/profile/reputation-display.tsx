'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  TrendingUp, 
  TrendingDown, 
  Star, 
  Award, 
  AlertTriangle,
  CheckCircle,
  History,
  Info,
  BarChart3
} from 'lucide-react'
import { Progress } from '../ui/progress'

interface ReputationHistory {
  id: string
  change: number
  reason: string
  previousScore: number
  newScore: number
  createdAt: string
}

interface ReputationDisplayProps {
  userId: string
  currentTrustScore: number
  showHistory?: boolean
  compact?: boolean
}

export default function ReputationDisplay({ 
  userId, 
  currentTrustScore, 
  showHistory = false, 
  compact = false 
}: ReputationDisplayProps) {
  const [reputationHistory, setReputationHistory] = useState<ReputationHistory[]>([])
  const [loading, setLoading] = useState(false)
  const [showFullHistory, setShowFullHistory] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getTrustScoreLevel = (score: number) => {
    if (score >= 95) return { level: 'Excellent', color: 'text-green-600', bgColor: 'bg-green-50', borderColor: 'border-green-200' }
    if (score >= 85) return { level: 'Very Good', color: 'text-blue-600', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' }
    if (score >= 75) return { level: 'Good', color: 'text-emerald-600', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-200' }
    if (score >= 60) return { level: 'Fair', color: 'text-yellow-600', bgColor: 'bg-yellow-50', borderColor: 'border-yellow-200' }
    if (score >= 40) return { level: 'Poor', color: 'text-orange-600', bgColor: 'bg-orange-50', borderColor: 'border-orange-200' }
    return { level: 'Critical', color: 'text-red-600', bgColor: 'bg-red-50', borderColor: 'border-red-200' }
  }

  const getTrustScoreIcon = (score: number) => {
    if (score >= 95) return <Award className="h-5 w-5 text-green-600" />
    if (score >= 85) return <Star className="h-5 w-5 text-blue-600" />
    if (score >= 75) return <CheckCircle className="h-5 w-5 text-emerald-600" />
    if (score >= 60) return <Info className="h-5 w-5 text-yellow-600" />
    return <AlertTriangle className="h-5 w-5 text-red-600" />
  }

  const fetchReputationHistory = async () => {
    if (!showHistory) return
    
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/user/reputation-history?userId=${userId}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch reputation history')
      }
      
      const data = await response.json()
      setReputationHistory(data.history || [])
    } catch (error) {
      console.error('Error fetching reputation history:', error)
      setError('Failed to load reputation history')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (showHistory) {
      fetchReputationHistory()
    }
  }, [showHistory, userId])

  const trustLevel = getTrustScoreLevel(currentTrustScore)
  const recentChanges = reputationHistory.slice(0, 5)
  const totalPositiveChanges = reputationHistory.filter(h => h.change > 0).length
  const totalNegativeChanges = reputationHistory.filter(h => h.change < 0).length
  const avgChange = reputationHistory.length > 0 
    ? reputationHistory.reduce((sum, h) => sum + h.change, 0) / reputationHistory.length 
    : 0

  if (compact) {
    return (
      <div className={`flex items-center space-x-3 p-3 rounded-lg border ${trustLevel.borderColor} ${trustLevel.bgColor}`}>
        {getTrustScoreIcon(currentTrustScore)}
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <span className={`font-semibold ${trustLevel.color}`}>
              {currentTrustScore.toFixed(1)}
            </span>
            <Badge variant="outline" className={`text-xs ${trustLevel.color}`}>
              {trustLevel.level}
            </Badge>
          </div>
          <Progress value={Math.min(currentTrustScore, 100)} className="h-2 mt-1" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Main Trust Score Card */}
      <Card className={`border ${trustLevel.borderColor}`}>
        <CardHeader className={`${trustLevel.bgColor} rounded-t-lg`}>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {getTrustScoreIcon(currentTrustScore)}
              <span>Trust Score</span>
            </div>
            <div className="text-right">
              <div className={`text-2xl font-bold ${trustLevel.color}`}>
                {currentTrustScore.toFixed(1)}
              </div>
              <Badge variant="outline" className={trustLevel.color}>
                {trustLevel.level}
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Score Progress</span>
                <span>{Math.min(currentTrustScore, 100).toFixed(1)}/100</span>
              </div>
              <Progress value={Math.min(currentTrustScore, 100)} className="h-3" />
            </div>
            
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="space-y-1">
                <div className="text-2xl font-semibold text-green-600">
                  {totalPositiveChanges}
                </div>
                <div className="text-xs text-gray-600">Positive Actions</div>
              </div>
              <div className="space-y-1">
                <div className="text-2xl font-semibold text-red-600">
                  {totalNegativeChanges}
                </div>
                <div className="text-xs text-gray-600">Penalties</div>
              </div>
              <div className="space-y-1">
                <div className={`text-2xl font-semibold ${avgChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {avgChange >= 0 ? '+' : ''}{avgChange.toFixed(1)}
                </div>
                <div className="text-xs text-gray-600">Avg Change</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reputation Guidelines */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Info className="h-5 w-5" />
            <span>Trust Score Guidelines</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center">
              <span>Excellent (95-100)</span>
              <Badge variant="outline" className="text-green-600">Priority Access</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span>Very Good (85-94)</span>
              <Badge variant="outline" className="text-blue-600">Extended Periods</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span>Good (75-84)</span>
              <Badge variant="outline" className="text-emerald-600">Standard Access</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span>Fair (60-74)</span>
              <Badge variant="outline" className="text-yellow-600">Limited Access</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span>Poor (40-59)</span>
              <Badge variant="outline" className="text-orange-600">Restricted</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span>Critical (&lt;40)</span>
              <Badge variant="outline" className="text-red-600">Account Review</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reputation History */}
      {showHistory && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <History className="h-5 w-5" />
                <span>Reputation History</span>
              </CardTitle>
              {reputationHistory.length > 5 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFullHistory(!showFullHistory)}
                >
                  {showFullHistory ? 'Show Less' : 'Show All'}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                <p className="text-sm text-gray-600 mt-2">Loading history...</p>
              </div>
            ) : error ? (
              <div className="text-center py-4 text-red-600">
                <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
                <p className="text-sm">{error}</p>
              </div>
            ) : reputationHistory.length === 0 ? (
              <div className="text-center py-4 text-gray-600">
                <BarChart3 className="h-8 w-8 mx-auto mb-2" />
                <p className="text-sm">No reputation history found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {(showFullHistory ? reputationHistory : recentChanges).map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-gray-50"
                  >
                    <div className="flex items-center space-x-3">
                      {entry.change > 0 ? (
                        <TrendingUp className="h-4 w-4 text-green-600" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-600" />
                      )}
                      <div>
                        <div className="font-medium text-sm">{entry.reason}</div>
                        <div className="text-xs text-gray-600">
                          {new Date(entry.createdAt).toLocaleDateString()} at{' '}
                          {new Date(entry.createdAt).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-semibold ${entry.change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {entry.change > 0 ? '+' : ''}{entry.change.toFixed(1)}
                      </div>
                      <div className="text-xs text-gray-600">
                        {entry.previousScore.toFixed(1)} → {entry.newScore.toFixed(1)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}