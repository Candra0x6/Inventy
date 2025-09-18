"use client"

import { SessionProvider } from "next-auth/react"
import { AuthProvider } from "@/lib/auth/auth-context"
import { ThemeProvider } from "@/components/theme/theme-provider"
import { AnimatedNavbar, defaultNavItems } from "./navigation/animated-navbar"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange={false}
      >
        <AnimatedNavbar items={defaultNavItems}/>
        <AuthProvider>
          {children}
        </AuthProvider>
      </ThemeProvider>
    </SessionProvider>
  )
}
