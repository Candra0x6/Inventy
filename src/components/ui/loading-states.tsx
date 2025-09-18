'use client'

import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'

interface LoadingStateProps {
  message?: string
  variant?: 'card' | 'page' | 'inline'
  className?: string
}

export function LoadingState({ message = 'Loading...', variant = 'card', className = '' }: LoadingStateProps) {
  const variants = {
    card: 'p-8 text-center bg-gradient-to-br from-background to-muted/20 rounded-lg border border-border/40',
    page: 'min-h-[400px] flex items-center justify-center',
    inline: 'py-4 text-center'
  }

  return (
    <motion.div 
      className={`${variants[variant]} ${className}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div
        className="flex flex-col items-center space-y-3"
        animate={{ y: [0, -5, 0] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
      >
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground">{message}</p>
      </motion.div>
    </motion.div>
  )
}

interface SkeletonProps {
  className?: string
  variant?: 'text' | 'card' | 'avatar' | 'button'
}

export function Skeleton({ className = '', variant = 'text' }: SkeletonProps) {
  const variants = {
    text: 'h-4 bg-muted/50 rounded',
    card: 'h-32 bg-muted/50 rounded-lg',
    avatar: 'h-10 w-10 bg-muted/50 rounded-full',
    button: 'h-9 w-20 bg-muted/50 rounded-md'
  }

  return (
    <div className={`animate-pulse ${variants[variant]} ${className}`} />
  )
}

interface EmptyStateProps {
  title: string
  description?: string
  action?: React.ReactNode
  icon?: React.ReactNode
  className?: string
}

export function EmptyState({ title, description, action, icon, className = '' }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`text-center py-12 ${className}`}
    >
      {icon && (
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-4"
        >
          {icon}
        </motion.div>
      )}
      <h3 className="text-lg font-medium mb-2">{title}</h3>
      {description && (
        <p className="text-muted-foreground mb-6 max-w-md mx-auto">{description}</p>
      )}
      {action && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          {action}
        </motion.div>
      )}
    </motion.div>
  )
}

interface ErrorStateProps {
  title?: string
  message: string
  action?: React.ReactNode
  className?: string
}

export function ErrorState({ title = 'Something went wrong', message, action, className = '' }: ErrorStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`text-center py-12 ${className}`}
    >
      <div className="mx-auto w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
        <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      </div>
      <h3 className="text-lg font-medium mb-2">{title}</h3>
      <p className="text-muted-foreground mb-6">{message}</p>
      {action}
    </motion.div>
  )
}