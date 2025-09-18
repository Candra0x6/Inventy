'use client'

import { motion } from 'framer-motion'
import { staggerContainer, fadeInUp } from '@/lib/animations'
import { 
  ItemsGridSkeleton, 
  SearchFiltersSkeleton, 
  DashboardCardSkeleton,
  TableSkeleton,
  FormSkeleton
} from '@/components/ui/skeleton'
import { AnimatedCard } from '@/components/ui/animated-card'

export default function LoadingStatesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-8">
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="max-w-7xl mx-auto space-y-12"
      >
        {/* Header */}
        <motion.div variants={fadeInUp} className="text-center space-y-4">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
            Loading States Demo
          </h1>
          <p className="text-muted-foreground text-lg">
            Skeleton components with staggered animations for better UX
          </p>
        </motion.div>

        {/* Search Filters Loading */}
        <motion.section variants={fadeInUp} className="space-y-4">
          <h2 className="text-2xl font-semibold text-foreground">Search & Filters Loading</h2>
          <SearchFiltersSkeleton />
        </motion.section>

        {/* Items Grid Loading */}
        <motion.section variants={fadeInUp} className="space-y-4">
          <h2 className="text-2xl font-semibold text-foreground">Items Grid Loading</h2>
          <ItemsGridSkeleton />
        </motion.section>

        {/* Dashboard Cards Loading */}
        <motion.section variants={fadeInUp} className="space-y-4">
          <h2 className="text-2xl font-semibold text-foreground">Dashboard Cards Loading</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, index) => (
              <DashboardCardSkeleton key={index} />
            ))}
          </div>
        </motion.section>

        {/* Table Loading */}
        <motion.section variants={fadeInUp} className="space-y-4">
          <h2 className="text-2xl font-semibold text-foreground">Table Loading</h2>
          <TableSkeleton rows={8} />
        </motion.section>

        {/* Form Loading */}
        <motion.section variants={fadeInUp} className="space-y-4">
          <h2 className="text-2xl font-semibold text-foreground">Form Loading</h2>
          <div className="max-w-2xl">
            <FormSkeleton />
          </div>
        </motion.section>

        {/* Implementation Note */}
        <motion.div variants={fadeInUp}>
          <AnimatedCard className="p-8 bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20">
            <h3 className="text-xl font-semibold text-foreground mb-4">Implementation Notes</h3>
            <div className="space-y-3 text-muted-foreground">
              <p>• All skeleton components use Framer Motion for smooth entrance animations</p>
              <p>• Staggered animations create a natural loading flow</p>
              <p>• Consistent styling with the design system (XL rounded corners, glassmorphism)</p>
              <p>• Responsive design that adapts to different screen sizes</p>
              <p>• Pulse animation provides visual feedback during loading</p>
            </div>
          </AnimatedCard>
        </motion.div>
      </motion.div>
    </div>
  )
}