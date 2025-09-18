'use client'

import { motion, HTMLMotionProps } from 'framer-motion'
import { forwardRef } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { cardHover } from '@/lib/animations'

interface AnimatedCardProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  children?: React.ReactNode
  hover?: boolean
  glass?: boolean
  variant?: 'default' | 'ghost' | 'outline'
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

const AnimatedCard = forwardRef<HTMLDivElement, AnimatedCardProps>(
  ({ 
    children, 
    className, 
    hover = true, 
    glass = false,
    variant = 'default',
    size = 'md',
    ...props 
  }, ref) => {
    const baseClasses = "rounded-xl border transition-all duration-300"
    
    const variantClasses = {
      default: "bg-card text-card-foreground card-shadow",
      ghost: "bg-transparent border-transparent",
      outline: "bg-transparent border-border hover:bg-muted/50"
    }
    
    const sizeClasses = {
      sm: "p-4",
      md: "p-6",
      lg: "p-8",
      xl: "p-10"
    }
    
    const glassClasses = glass ? "glass" : ""
    
    return (
      <motion.div
        ref={ref}
        className={cn(
          baseClasses,
          variantClasses[variant],
          sizeClasses[size],
          glassClasses,
          hover && "card-shadow-hover cursor-pointer",
          className
        )}
        {...(hover && cardHover)}
        {...props}
      >
        {children}
      </motion.div>
    )
  }
)

AnimatedCard.displayName = 'AnimatedCard'

// Feature Card Component
interface FeatureCardProps {
  icon: React.ReactNode
  title: string
  description: string
  className?: string
  onClick?: () => void
}

export function FeatureCard({ icon, title, description, className, onClick }: FeatureCardProps) {
  return (
    <AnimatedCard 
      className={cn("group relative overflow-hidden", className)}
      onClick={onClick}
      whileHover={{ y: -8 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <div className="relative z-10">
        <div className="mb-4 text-primary group-hover:scale-110 transition-transform duration-300">
          {icon}
        </div>
        <h3 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors duration-300">
          {title}
        </h3>
        <p className="text-muted-foreground text-sm leading-relaxed">
          {description}
        </p>
      </div>
    </AnimatedCard>
  )
}

// Stats Card Component
interface StatsCardProps {
  value: string | number
  label: string
  change?: number
  icon?: React.ReactNode
  trend?: 'up' | 'down' | 'neutral'
  className?: string
}

export function StatsCard({ value, label, change, icon, trend = 'neutral', className }: StatsCardProps) {
  const trendColors = {
    up: 'text-green-500',
    down: 'text-red-500',
    neutral: 'text-muted-foreground'
  }
  
  return (
    <AnimatedCard className={cn("relative overflow-hidden", className)}>
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-2xl font-bold tracking-tight">{value}</p>
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
        {icon && (
          <div className="text-muted-foreground/60">
            {icon}
          </div>
        )}
      </div>
      
      {change !== undefined && (
        <div className={cn("mt-4 text-sm font-medium", trendColors[trend])}>
          {change > 0 ? '+' : ''}{change}%
          <span className="text-muted-foreground ml-1">from last month</span>
        </div>
      )}
      
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/20 to-transparent" />
    </AnimatedCard>
  )
}

// Product Card Component
interface ProductCardProps {
  image: string
  title: string
  description?: string
  price?: string
  badge?: string
  className?: string
  onClick?: () => void
}

export function ProductCard({ 
  image, 
  title, 
  description, 
  price, 
  badge, 
  className, 
  onClick 
}: ProductCardProps) {
  return (
    <AnimatedCard 
      className={cn("group overflow-hidden p-0", className)}
      onClick={onClick}
    >
      <div className="relative overflow-hidden">
        <Image 
          src={image} 
          alt={title}
          width={400}
          height={200}
          className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {badge && (
          <div className="absolute top-3 left-3 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full font-medium">
            {badge}
          </div>
        )}
      </div>
      
      <div className="p-6">
        <h3 className="font-semibold text-lg mb-2 group-hover:text-primary transition-colors duration-300">
          {title}
        </h3>
        {description && (
          <p className="text-muted-foreground text-sm mb-3 line-clamp-2">
            {description}
          </p>
        )}
        {price && (
          <p className="text-xl font-bold text-primary">
            {price}
          </p>
        )}
      </div>
    </AnimatedCard>
  )
}

// Profile Card Component
interface ProfileCardProps {
  avatar: string
  name: string
  role?: string
  email?: string
  stats?: Array<{ label: string; value: string | number }>
  className?: string
  onClick?: () => void
}

export function ProfileCard({ 
  avatar, 
  name, 
  role, 
  email, 
  stats, 
  className, 
  onClick 
}: ProfileCardProps) {
  return (
    <AnimatedCard 
      className={cn("text-center", className)}
      onClick={onClick}
    >
      <motion.div
        className="relative mx-auto w-20 h-20 mb-4"
        whileHover={{ scale: 1.1 }}
        transition={{ duration: 0.2 }}
      >
        <Image 
          src={avatar} 
          alt={name}
          width={80}
          height={80}
          className="w-full h-full rounded-full object-cover ring-4 ring-primary/10"
        />
        <div className="absolute bottom-0 right-0 w-6 h-6 bg-green-500 rounded-full border-2 border-background" />
      </motion.div>
      
      <h3 className="font-semibold text-lg mb-1">{name}</h3>
      {role && <p className="text-primary text-sm mb-1">{role}</p>}
      {email && <p className="text-muted-foreground text-sm mb-4">{email}</p>}
      
      {stats && (
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
          {stats.map((stat, index) => (
            <div key={index} className="text-center">
              <p className="text-lg font-semibold">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      )}
    </AnimatedCard>
  )
}

export { AnimatedCard }