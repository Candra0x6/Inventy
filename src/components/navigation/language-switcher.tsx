'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'

const locales = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'id', name: 'Indonesia', flag: '🇮🇩' },
]

export function LanguageSwitcher() {
  const router = useRouter()
  const [currentLocale, setCurrentLocale] = React.useState('en')
  const [isOpen, setIsOpen] = React.useState(false)

  React.useEffect(() => {
    // Get current locale from localStorage or browser
    const savedLocale = localStorage.getItem('locale') || 'en'
    setCurrentLocale(savedLocale)
  }, [])

  const switchLocale = (locale: string) => {
    // Save to localStorage
    localStorage.setItem('locale', locale)
    setCurrentLocale(locale)
    
    // Set cookie for server-side
    document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=31536000`
    
    setIsOpen(false)
    
    // Refresh the page to apply new locale
    router.refresh()
  }

  return (
    <div className="relative">
      <Button 
        variant="outline" 
        size="icon" 
        className="w-10 h-10"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Globe className="h-[1.2rem] w-[1.2rem]" />
        <span className="sr-only">Switch language</span>
      </Button>
      
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-background border border-border z-50">
          <div className="py-1" role="menu">
            {locales.map((locale) => (
              <button
                key={locale.code}
                onClick={() => switchLocale(locale.code)}
                className="w-full text-left px-4 py-2 text-sm hover:bg-accent hover:text-accent-foreground flex items-center"
                role="menuitem"
              >
                <span className="mr-2">{locale.flag}</span>
                {locale.name}
                {currentLocale === locale.code && (
                  <span className="ml-auto text-primary">✓</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
