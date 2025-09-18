'use client'

import { motion, HTMLMotionProps } from 'framer-motion'
import { forwardRef } from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cn } from '@/lib/utils'
import { buttonHover } from '@/lib/animations'
import { Loader2 } from 'lucide-react'

interface AnimatedButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  children?: React.ReactNode
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link' | 'gradient'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  loading?: boolean
  fullWidth?: boolean
  asChild?: boolean
}

const AnimatedButton = forwardRef<HTMLButtonElement, AnimatedButtonProps>(
  ({ 
    children, 
    className, 
    variant = 'default', 
    size = 'default',
    loading = false,
    fullWidth = false,
    asChild = false,
    disabled,
    onClick,
    ...props 
  }, ref) => {
    const baseClasses = "inline-flex items-center justify-center rounded-xl font-medium transition-all duration-200 focus-ring disabled:pointer-events-none disabled:opacity-50"
    
    const variantClasses = {
      default: "bg-primary text-primary-foreground shadow-lg hover:bg-primary/90",
      destructive: "bg-destructive text-destructive-foreground shadow-lg hover:bg-destructive/90",
      outline: "border border-border bg-transparent hover:bg-muted hover:text-muted-foreground",
      secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
      ghost: "hover:bg-muted hover:text-muted-foreground",
      link: "text-primary underline-offset-4 hover:underline",
      gradient: "bg-gradient-to-r from-primary to-blue-600 text-primary-foreground shadow-lg hover:from-primary/90 hover:to-blue-600/90"
    }
    
    const sizeClasses = {
      default: "h-11 px-6 py-2",
      sm: "h-9 px-4 text-sm",
      lg: "h-12 px-8",
      icon: "h-11 w-11"
    }
    
    const widthClasses = fullWidth ? "w-full" : ""
    
    const combinedClassName = cn(
      baseClasses,
      variantClasses[variant],
      sizeClasses[size],
      widthClasses,
      className
    )
    
    if (asChild) {
      return (
        <Slot
          ref={ref}
          className={combinedClassName}
          onClick={onClick}
          {...(disabled && { 'aria-disabled': true })}
        >
          {children}
        </Slot>
      )
    }
    
    return (
      <motion.button
        ref={ref}
        className={combinedClassName}
        disabled={disabled || loading}
        onClick={onClick}
        {...(!disabled && !loading && buttonHover)}
        {...props}
      >
        {loading && (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        )}
        {children}
      </motion.button>
    )
  }
)

AnimatedButton.displayName = 'AnimatedButton'

// Floating Action Button
interface FloatingActionButtonProps {
  icon: React.ReactNode
  onClick?: () => void
  className?: string
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
}

export function FloatingActionButton({ 
  icon, 
  onClick, 
  className,
  position = 'bottom-right'
}: FloatingActionButtonProps) {
  const positionClasses = {
    'bottom-right': 'fixed bottom-6 right-6',
    'bottom-left': 'fixed bottom-6 left-6',
    'top-right': 'fixed top-6 right-6',
    'top-left': 'fixed top-6 left-6'
  }
  
  return (
    <motion.button
      className={cn(
        "z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg",
        "flex items-center justify-center",
        positionClasses[position],
        className
      )}
      onClick={onClick}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{
        type: "spring",
        stiffness: 260,
        damping: 20
      }}
    >
      {icon}
    </motion.button>
  )
}

// Icon Button with ripple effect
interface IconButtonProps {
  icon: React.ReactNode
  onClick?: () => void
  className?: string
  variant?: 'default' | 'ghost' | 'outline'
  size?: 'sm' | 'md' | 'lg'
}

export function IconButton({ 
  icon, 
  onClick, 
  className,
  variant = 'default',
  size = 'md'
}: IconButtonProps) {
  const variantClasses = {
    default: "bg-primary text-primary-foreground hover:bg-primary/90",
    ghost: "hover:bg-muted",
    outline: "border border-border hover:bg-muted"
  }
  
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-12 h-12"
  }
  
  return (
    <motion.button
      className={cn(
        "rounded-xl flex items-center justify-center transition-colors duration-200 focus-ring",
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      onClick={onClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      {icon}
    </motion.button>
  )
}

// Toggle Button
interface ToggleButtonProps {
  pressed: boolean
  onPressedChange: (pressed: boolean) => void
  children: React.ReactNode
  className?: string
}

export function ToggleButton({ 
  pressed, 
  onPressedChange, 
  children, 
  className 
}: ToggleButtonProps) {
  return (
    <motion.button
      className={cn(
        "px-4 py-2 rounded-xl border border-border transition-colors duration-200 focus-ring",
        pressed 
          ? "bg-primary text-primary-foreground border-primary" 
          : "bg-background hover:bg-muted",
        className
      )}
      onClick={() => onPressedChange(!pressed)}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {children}
    </motion.button>
  )
}

// Button Group
interface ButtonGroupProps {
  children: React.ReactNode
  className?: string
  orientation?: 'horizontal' | 'vertical'
}

export function ButtonGroup({ 
  children, 
  className,
  orientation = 'horizontal'
}: ButtonGroupProps) {
  return (
    <div 
      className={cn(
        "flex",
        orientation === 'horizontal' ? "flex-row" : "flex-col",
        "[&>*:not(:first-child)]:ml-px [&>*:first-child]:rounded-r-none [&>*:last-child]:rounded-l-none [&>*:not(:first-child):not(:last-child)]:rounded-none",
        orientation === 'vertical' && "[&>*:not(:first-child)]:ml-0 [&>*:not(:first-child)]:mt-px [&>*:first-child]:rounded-b-none [&>*:last-child]:rounded-t-none",
        className
      )}
    >
      {children}
    </div>
  )
}

export { AnimatedButton }