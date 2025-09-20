"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { z } from "zod"
import { motion } from "framer-motion"
import { AnimatedCard } from "@/components/ui/animated-card"
import { AnimatedButton } from "@/components/ui/animated-button"
import { fadeInUp, staggerContainer, scaleIn } from "@/lib/animations"

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

type RegisterFormData = z.infer<typeof registerSchema>

export default function RegisterPage() {
  const [formData, setFormData] = useState<RegisterFormData>({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  })
  const [errors, setErrors] = useState<Partial<RegisterFormData>>({})
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrors({})

    try {
      const validatedData = registerSchema.parse(formData)
      
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(validatedData),
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.details) {
          // Handle validation errors from server
          const fieldErrors: Partial<RegisterFormData> = {}
          data.details.forEach((error: { path: string[]; message: string }) => {
            if (error.path[0]) {
              fieldErrors[error.path[0] as keyof RegisterFormData] = error.message
            }
          })
          setErrors(fieldErrors)
        } else {
          setErrors({ email: data.error || "Registration failed" })
        }
      } else {
        setSuccess(true)
        setTimeout(() => {
          router.push("/auth/login")
        }, 2000)
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Partial<RegisterFormData> = {}
        error.issues.forEach((issue) => {
          if (issue.path[0]) {
            fieldErrors[issue.path[0] as keyof RegisterFormData] = issue.message
          }
        })
        setErrors(fieldErrors)
      }
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <motion.div
        initial="initial"
        animate="animate"
        exit="exit"
        variants={fadeInUp}
        className="min-h-screen w-full flex items-center justify-center bg-background p-4"
      >
        <AnimatedCard
          className="w-full max-w-md"
          size="lg"
          glass
          initial="initial"
          animate="animate"
          exit="exit"
          variants={scaleIn}
        >
          <div className="text-center space-y-4">
            <div className="text-green-600 text-6xl">✓</div>
            <h3 className="text-lg font-medium text-foreground">
              Account Created Successfully!
            </h3>
            <p className="text-muted-foreground">
              Redirecting you to login page...
            </p>
          </div>
        </AnimatedCard>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={fadeInUp}
      className="min-h-screen w-full flex items-center justify-center bg-background p-4"
    >
      <AnimatedCard
        className="w-full max-w-md"
        size="lg"
        glass
        initial="initial"
        animate="animate"
        exit="exit"
        variants={scaleIn}
      >
        <motion.form
          onSubmit={handleSubmit}
          className="space-y-6"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
        {/* Account Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold border-b border-border/50 pb-2">
            Account Information
          </h3>

          <motion.div variants={fadeInUp}>
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium text-foreground flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Full Name *
              </label>
              <input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors ${errors.name ? 'border-red-500' : 'border-border'}`}
                placeholder="Enter your full name"
                required
              />
              {errors.name && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {errors.name}
                </p>
              )}
            </div>
          </motion.div>

          <motion.div variants={fadeInUp}>
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-foreground flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                </svg>
                Email address *
              </label>
              <input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors ${errors.email ? 'border-red-500' : 'border-border'}`}
                placeholder="Enter your email"
                required
              />
              {errors.email && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {errors.email}
                </p>
              )}
            </div>
          </motion.div>
        </div>

        {/* Security */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold border-b border-border/50 pb-2">
            Security
          </h3>

          <motion.div variants={fadeInUp}>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-foreground flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Password *
              </label>
              <input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors ${errors.password ? 'border-red-500' : 'border-border'}`}
                placeholder="Enter your password"
                required
              />
              {errors.password && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {errors.password}
                </p>
              )}
            </div>
          </motion.div>

          <motion.div variants={fadeInUp}>
            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="text-sm font-medium text-foreground flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Confirm Password *
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors ${errors.confirmPassword ? 'border-red-500' : 'border-border'}`}
                placeholder="Confirm your password"
                required
              />
              {errors.confirmPassword && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {errors.confirmPassword}
                </p>
              )}
            </div>
          </motion.div>
        </div>

        {/* Form Actions */}
        <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-border/50">
          <AnimatedButton
            type="submit"
            disabled={loading}
            className="flex-1 w-full sm:flex-initial"
            size="lg"
          >
            {loading ? "Creating account..." : "Create account"}
          </AnimatedButton>
        </div>

        {/* Account Links */}
        <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-border/50">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/auth/login" className="font-medium text-primary hover:text-primary/80 transition-colors">
                Sign in
              </Link>
            </p>
          </div>
        </div>
        </motion.form>
      </AnimatedCard>
    </motion.div>
  )
}
