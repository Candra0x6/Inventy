'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Filter } from 'lucide-react'
import { AnimatedButton } from '@/components/ui/animated-button'

interface FilterOption {
  value: string
  label: string
  count?: number
}

interface ResponsiveFilterProps {
  options: FilterOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function ResponsiveFilter({ options, value, onChange, placeholder = 'Filter', className = '' }: ResponsiveFilterProps) {
  const [isOpen, setIsOpen] = useState(false)
  
  const selectedOption = options.find(option => option.value === value)

  return (
    <div className={`relative ${className}`}>
      {/* Mobile Dropdown */}
      <div className="md:hidden">
        <AnimatedButton
          variant="outline"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full justify-between"
        >
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4" />
            <span>{selectedOption?.label || placeholder}</span>
          </div>
          <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </AnimatedButton>
        
        <AnimatePresence>
          {isOpen && (
            <>
              <div 
                className="fixed inset-0 bg-black/20 z-40" 
                onClick={() => setIsOpen(false)}
              />
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-full left-0 right-0 mt-2 bg-background border border-border rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto"
              >
                {options.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      onChange(option.value)
                      setIsOpen(false)
                    }}
                    className={`w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors flex items-center justify-between ${
                      value === option.value ? 'bg-primary/10 text-primary' : ''
                    }`}
                  >
                    <span>{option.label}</span>
                    {option.count !== undefined && (
                      <span className="text-sm text-muted-foreground">({option.count})</span>
                    )}
                  </button>
                ))}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      {/* Desktop Select */}
      <div className="hidden md:block">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="border border-border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label} {option.count !== undefined && `(${option.count})`}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}

interface CollapsibleSectionProps {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
  icon?: React.ReactNode
  className?: string
}

export function CollapsibleSection({ title, children, defaultOpen = true, icon, className = '' }: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className={`border border-border rounded-lg overflow-hidden ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors flex items-center justify-between text-left"
      >
        <div className="flex items-center space-x-2">
          {icon}
          <span className="font-medium">{title}</span>
        </div>
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-4 bg-background">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}