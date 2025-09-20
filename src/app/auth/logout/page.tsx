"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { AnimatedCard } from "@/components/ui/animated-card"
import { AnimatedButton } from "@/components/ui/animated-button"
import { fadeInUp, staggerContainer, scaleIn } from "@/lib/animations"

export default function LogoutPage() {

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
        <motion.div
          className="space-y-6 text-center"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          {/* Success Message */}
          <motion.div variants={fadeInUp} className="space-y-4">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-foreground">Successfully Logged Out</h2>
              <p className="text-muted-foreground">
                You have been successfully logged out of your account.
              </p>
            </div>
          </motion.div>

          {/* Action Button */}
          <motion.div variants={fadeInUp} className="pt-6 border-t border-border/50">
            <AnimatedButton
              asChild
              className="w-full"
              size="lg"
            >
              <Link href="/auth/login">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
                Back to Login
              </Link>
            </AnimatedButton>
          </motion.div>

          {/* Additional Links */}
          <motion.div variants={fadeInUp} className="pt-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Need to sign in again?{" "}
                <Link href="/auth/login" className="font-medium text-primary hover:text-primary/80 transition-colors">
                  Sign in
                </Link>
              </p>
            </div>
          </motion.div>
        </motion.div>
      </AnimatedCard>
    </motion.div>
  )
}