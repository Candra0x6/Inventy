'use client'

import { motion } from 'framer-motion'
import { fadeInUp } from '@/lib/animations'

export default function GlobalLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center">
      <motion.div
        variants={fadeInUp}
        initial="hidden"
        animate="visible"
        className="text-center space-y-6"
      >
        {/* Animated logo/icon */}
        <motion.div
          className="w-16 h-16 mx-auto bg-gradient-to-r from-primary to-accent rounded-2xl shadow-soft-shadow"
          animate={{
            scale: [1, 1.1, 1],
            rotate: [0, 5, -5, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        
        {/* Loading text */}
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-foreground">Loading Inventy</h2>
          <p className="text-muted-foreground">Preparing your inventory management experience...</p>
        </div>
        
        {/* Loading bar */}
        <div className="w-64 h-2 bg-muted/30 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        </div>
      </motion.div>
    </div>
  )
}