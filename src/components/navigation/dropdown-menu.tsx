'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Menu, X } from 'lucide-react'
import { AnimatedButton } from '@/components/ui/animated-button'

interface DropdownItem {
  label: string
  href: string
  icon?: React.ReactNode
  description?: string
  onClick?: () => void
}

interface DropdownMenuProps {
  trigger: React.ReactNode
  items: DropdownItem[]
  className?: string
  isDropdown?: boolean
}

export function DropdownMenu({ trigger, items, className = '', isDropdown = true }: DropdownMenuProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        {trigger}
      {isDropdown && <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-10" 
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="absolute top-full left-0 mt-2 w-64 bg-background border border-border rounded-lg shadow-lg z-20"
            >
              <div className="p-2">
                {items.map((item, index) => (
                  <motion.a
                    key={index}
                    href={item.href}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-start space-x-3 p-3 rounded-md hover:bg-muted/50 transition-colors group"
                    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
                    onClick={() => {  setIsOpen(false); item.onClick && item.onClick(); }}
                  >
                    {item.icon && (
                      <div className="text-muted-foreground group-hover:text-foreground transition-colors">
                        {item.icon}
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="font-medium text-sm">{item.label}</div>
                      {item.description && (
                        <div className="text-xs text-muted-foreground mt-1">{item.description}</div>
                      )}
                    </div>
                  </motion.a>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

interface MobileMenuProps {
  isOpen: boolean
  onToggle: () => void
  children: React.ReactNode
}

export function MobileMenu({ isOpen, onToggle, children }: MobileMenuProps) {
  return (
    <>
      <AnimatedButton
        variant="ghost"
        size="sm"
        onClick={onToggle}
        className="md:hidden"
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </AnimatedButton>

      <AnimatePresence>
        {isOpen && (
          <>
            <div 
              className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden" 
              onClick={onToggle}
            />
            <motion.div
              initial={{ opacity: 0, x: '100%' }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: '100%' }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              className="fixed top-0 right-0 bottom-0 w-80 bg-background border-l border-border z-50 md:hidden overflow-y-auto"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold">Navigation</h2>
                  <AnimatedButton variant="ghost" size="sm" onClick={onToggle}>
                    <X className="h-5 w-5" />
                  </AnimatedButton>
                </div>
                {children}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}