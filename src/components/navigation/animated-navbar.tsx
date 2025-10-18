'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { ThemeToggle } from '@/components/theme/theme-toggle'
import { fadeInUp, staggerContainer } from '@/lib/animations'
import { Menu, X, Home, Users, BoxIcon } from 'lucide-react'
import Image from 'next/image'
import { useTheme } from 'next-themes'
import { LanguageSwitcher } from './language-switcher'
import { useI18n } from '@/lib/i18n-helpers'

interface NavItem {
  href: string
  label: string
  icon?: React.ReactNode
}

interface AnimatedNavbarProps {
  items: NavItem[]
  logo?: React.ReactNode
  className?: string
}

export function AnimatedNavbar({ items, logo, className }: AnimatedNavbarProps) {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()
  const { theme } = useTheme()

  // Hide navbar on dashboard pages
  if (pathname?.startsWith('/dashboard')) {
    return null
  }

  return (
    <div className="flex w-full items-center justify-center mb-20">
    <motion.nav
      className={cn(
        "fixed mt-5 top-0 z-50 px-2 w-full border-b border-border/40 bg-background/80 backdrop-blur max-w-5xl self-center supports-[backdrop-filter]:bg-background/60 rounded-full  ",
        className
      )}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
    >
      <div className="container mx-auto px-4 ">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <motion.div
            className="flex items-center space-x-2"
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.2 }}
          >
            {logo || (
              theme === 'light' ?
              <Image
                src="/fosti-black.png"
                alt="Inventy Logo"
                width={80}
                height={80}
              />  :
              <Image
                src="/fosti.png"
                alt="Inventy Logo"
                width={80}
                height={80}
              />  
              
            )}
          </motion.div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {items.map((item, index) => (
              <motion.div
                key={item.href}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Link
                  href={item.href}
                  className="flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors duration-200"
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              </motion.div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-2">
            <LanguageSwitcher />
            <ThemeToggle />
            
            {/* Mobile menu button */}
            <motion.button
              className="md:hidden p-2 rounded-lg hover:bg-muted transition-colors"
              onClick={() => setIsOpen(!isOpen)}
              whileTap={{ scale: 0.95 }}
            >
              <AnimatePresence mode="wait">
                {isOpen ? (
                  <motion.div
                    key="close"
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <X className="w-5 h-5" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="menu"
                    initial={{ rotate: 90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: -90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Menu className="w-5 h-5" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              className="md:hidden border-t border-border"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
            >
              <motion.div
                className="py-4 space-y-2"
                variants={staggerContainer}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                {items.map((item) => (
                  <motion.div key={item.href} variants={fadeInUp}>
                    <Link
                      href={item.href}
                      className="flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors duration-200"
                      onClick={() => setIsOpen(false)}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </Link>
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.nav>
    </div>
  )
}

// Sidebar Navigation
interface SidebarProps {
  items: NavItem[]
  isOpen: boolean
  onToggle: () => void
  className?: string
}

export function AnimatedSidebar({ items, isOpen, onToggle, className }: SidebarProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onToggle}
          />

          {/* Sidebar */}
          <motion.div
            className={cn(
              "fixed left-0 top-0 z-50 h-full w-64 bg-card border-r border-border lg:static lg:translate-x-0",
              className
            )}
            initial={{ x: -256 }}
            animate={{ x: 0 }}
            exit={{ x: -256 }}
            transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <div className="flex h-16 items-center justify-between px-4 border-b border-border">
              <div className="text-lg font-semibold">Navigation</div>
              <motion.button
                className="lg:hidden p-2 rounded-lg hover:bg-muted"
                onClick={onToggle}
                whileTap={{ scale: 0.95 }}
              >
                <X className="w-5 h-5" />
              </motion.button>
            </div>

            <motion.div
              className="p-4 space-y-2"
              variants={staggerContainer}
              initial="initial"
              animate="animate"
            >
              {items.map((item, index) => (
                <motion.div
                  key={item.href}
                  variants={fadeInUp}
                  custom={index}
                >
                  <Link
                    href={item.href}
                    className="flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-200 group"
                  >
                    <motion.div
                      className="group-hover:scale-110 transition-transform duration-200"
                    >
                      {item.icon}
                    </motion.div>
                    <span>{item.label}</span>
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// Bottom Navigation (Mobile)
interface BottomNavProps {
  items: NavItem[]
  activeIndex: number
  onItemClick: (index: number) => void
  className?: string
}

export function BottomNavigation({ items, activeIndex, onItemClick, className }: BottomNavProps) {
  return (
    <motion.div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border",
        "grid grid-cols-5 lg:hidden",
        className
      )}
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
    >
      {items.map((item, index) => (
        <motion.button
          key={item.href}
          className={cn(
            "flex flex-col items-center justify-center py-3 px-2 text-xs font-medium transition-colors duration-200",
            activeIndex === index
              ? "text-primary"
              : "text-muted-foreground hover:text-foreground"
          )}
          onClick={() => onItemClick(index)}
          whileTap={{ scale: 0.95 }}
        >
          <motion.div
            className="mb-1"
            animate={{
              scale: activeIndex === index ? 1.1 : 1,
              y: activeIndex === index ? -2 : 0,
            }}
            transition={{ duration: 0.2 }}
          >
            {item.icon}
          </motion.div>
          <span className="truncate">{item.label}</span>
          
          {activeIndex === index && (
            <motion.div
              className="absolute top-0 left-1/2 w-8 h-1 bg-primary rounded-b-full"
              layoutId="bottom-nav-indicator"
              style={{ x: '-50%' }}
              transition={{
                type: "spring",
                stiffness: 500,
                damping: 30
              }}
            />
          )}
        </motion.button>
      ))}
    </motion.div>
  )
}

// Default navigation items with translations
// Usage: const navItems = getDefaultNavItems(useI18n())
export function getDefaultNavItems(i18n: ReturnType<typeof useI18n>): NavItem[] {
  return [
    { href: '/', label: 'Home', icon: <Home className="w-4 h-4" /> },
    { href: '/items', label: i18n.nav.items, icon: <BoxIcon className="w-4 h-4" /> },
    { href: '/dashboard', label: i18n.nav.dashboard, icon: <Users className="w-4 h-4" /> },
  ]
}

// Deprecated: Use getDefaultNavItems() instead for i18n support
export const defaultNavItems: NavItem[] = [
  { href: '/', label: 'Home', icon: <Home className="w-4 h-4" /> },
  { href: '/items', label: 'Items', icon: <BoxIcon className="w-4 h-4" /> },
  { href: '/dashboard', label: 'Dashboard', icon: <Users className="w-4 h-4" /> },
]