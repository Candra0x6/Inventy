'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Sun, Moon, Monitor } from 'lucide-react'

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false)
  const { theme, setTheme, resolvedTheme } = useTheme()

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="w-9 h-9 rounded-xl bg-muted animate-pulse" />
    )
  }

  const themes = [
    { value: 'light', icon: Sun, label: 'Light' },
    { value: 'dark', icon: Moon, label: 'Dark' },
    { value: 'system', icon: Monitor, label: 'System' },
  ]

  return (
    <div className="flex items-center space-x-1 p-1 bg-muted rounded-xl h-fit">
      {themes.map(({ value, icon: Icon, label }) => (
        <motion.button
          key={value}
          onClick={() => setTheme(value)}
          className={`
            relative p-2 rounded-lg transition-colors duration-200
            ${theme === value 
              ? 'text-primary-foreground' 
              : 'text-muted-foreground hover:text-foreground'
            }
          `}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          initial={false}
          title={label}
        >
          {theme === value && (
            <motion.div
              className="absolute inset-0 bg-primary rounded-lg"
              layoutId="theme-indicator"
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 30
              }}
            />
          )}
          <Icon className="w-4 h-4 relative z-10" />
        </motion.button>
      ))}
    </div>
  )
}