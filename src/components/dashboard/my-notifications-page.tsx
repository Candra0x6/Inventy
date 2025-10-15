'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { AnimatedButton } from '@/components/ui/animated-button'
import { AnimatedCard } from '@/components/ui/animated-card'
import { CardContent } from '@/components/ui/card'
import { useAuth } from '@/lib/auth/auth-context'
import { LoadingState, EmptyState } from '@/components/ui/loading-states'
import { fadeInUp, staggerContainer } from '@/lib/animations'
import {
  Bell,
  AlertTriangle,
  XCircle,
  CheckCircle
} from 'lucide-react'

interface Notification {
  id: string
  type: 'warning' | 'info' | 'success' | 'error'
  title: string
  message: string
  isRead: boolean
  createdAt: string
  actionUrl?: string
}

export default function MyNotificationsPage() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      fetchNotifications()
    }
  }, [user])

  const fetchNotifications = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/user/notifications?limit=50`)
      if (response.ok) {
        const data = await response.json()
        setNotifications(data.notifications || [])
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-orange-500" />
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      default:
        return <Bell className="h-5 w-5 text-blue-500" />
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        <LoadingState
          variant="page"
          message="Loading your notifications..."
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
                      My Notifications
                    </h1>
                    <p className="text-muted-foreground mt-2">
                      Stay updated with your borrowing activities and important announcements
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
                <div className="space-y-4">
                  {notifications.length === 0 ? (
                    <EmptyState
                      icon={<Bell className="h-16 w-16 mx-auto text-muted-foreground/50" />}
                      title="No notifications"
                      description="You're all caught up! We'll notify you about important updates here."
                    />
                  ) : (
                    notifications.map((notification) => (
                      <AnimatedCard key={notification.id} className={`bg-gradient-to-br from-background to-muted/30 backdrop-blur-sm border border-border/50 shadow-lg ${notification.isRead ? 'opacity-60' : ''}`}>
                        <CardContent className="p-4">
                          <div className="flex items-start space-x-3">
                            {getNotificationIcon(notification.type)}
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <h4 className="font-medium">{notification.title}</h4>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(notification.createdAt).toLocaleString()}
                                </span>
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
                              {notification.actionUrl && (
                                <AnimatedButton
                                  variant="outline"
                                  size="sm"
                                  className="mt-3"
                                  onClick={() => window.location.href = notification.actionUrl!}
                                >
                                  Take Action
                                </AnimatedButton>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </AnimatedCard>
                    ))
                  )}
                </div>
              </div>
            </AnimatedCard>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}