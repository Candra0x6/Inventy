  'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  Package, 
  Zap, 
  Shield, 
  BarChart3, 
  Users, 
  Scan,
  ArrowRight,
  Bell
} from 'lucide-react'
import { AnimatedCard, FeatureCard } from '@/components/ui/animated-card'
import { AnimatedButton, FloatingActionButton } from '@/components/ui/animated-button'
import { DemoModal } from '@/components/ui/demo-modal'
import { Footer } from '@/components/navigation/footer'
import { LanguageSwitcher } from '@/components/navigation/language-switcher'
import { 
  fadeInUp, 
  staggerContainer, 
  pageTransition
} from '@/lib/animations'
import { useTranslations } from 'next-intl'

const features = [
  {
    icon: <Package className="w-8 h-8" />,
    title: "feature_smart_inventory_title",
    description: "feature_smart_inventory_description"
  },
  {
    icon: <Scan className="w-8 h-8" />,
    title: "feature_qr_barcode_title",
    description: "feature_qr_barcode_description"
  },
  {
    icon: <Shield className="w-8 h-8" />,
    title: "feature_secure_access_title",
    description: "feature_secure_access_description"
  },
  {
    icon: <BarChart3 className="w-8 h-8" />,
    title: "feature_realtime_analytics_title",
    description: "feature_realtime_analytics_description"
  },
  {
    icon: <Users className="w-8 h-8" />,
    title: "feature_team_collaboration_title",
    description: "feature_team_collaboration_description"
  },
  {
    icon: <Zap className="w-8 h-8" />,
    title: "feature_lightning_fast_title",
    description: "feature_lightning_fast_description"
  }
]



export default function Home() {
  const t = useTranslations();
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false)
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 max-w-5xl mx-auto">
    
      
      {/* Demo Modal */}
      <DemoModal 
        isOpen={isDemoModalOpen} 
        onClose={() => setIsDemoModalOpen(false)} 
      />
      
      {/* Navigation */}
      
      <motion.main
        variants={pageTransition}
        initial="initial"
        animate="animate"
        exit="exit"
      >
        {/* Hero Section */}
        <section className="relative py-20 px-4 overflow-hidden">
          <div className="container mx-auto max-w-6xl">
            <motion.div
              className="text-center space-y-8"
              variants={staggerContainer}
              initial="initial"
              animate="animate"
            >
              <motion.div variants={fadeInUp} className="space-y-4">
                <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold bg-gradient-to-r from-primary via-blue-600 to-purple-600 bg-clip-text text-transparent">
                  {t('hero_title_smart')}
                  <br />
                  {t('hero_title_management')}
                </h1>
              </motion.div>
              <motion.div
                variants={fadeInUp}
                className="flex flex-col sm:flex-row gap-4 justify-center"
              >
                <AnimatedButton onClick={() => {window.location.href = '/auth/login'}} size="lg" className="text-lg px-8 py-4">
                  {t('cta_get_started')}
                  <ArrowRight className="ml-2 w-5 h-5" />
                </AnimatedButton>
                <AnimatedButton 
                  variant="outline" 
                  size="lg" 
                  className="text-lg px-8 py-4"
                  onClick={() => setIsDemoModalOpen(true)}
                >
                  {t('cta_watch_demo')}
                </AnimatedButton>
            
              </motion.div>

           
            </motion.div>

            {/* Floating Animation Elements */}
            <motion.div
              className="absolute top-20 left-10 w-16 h-16 bg-primary/10 rounded-full blur-xl"
              animate={{
                y: [-10, 10, -10],
              }}
              transition={{
                duration: 6,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
            <motion.div
              className="absolute bottom-20 right-10 w-24 h-24 bg-blue-500/10 rounded-full blur-xl"
              animate={{
                y: [-10, 10, -10],
              }}
              transition={{
                duration: 6,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 2,
              }}
            />
          </div>
        </section>

    
        {/* Features Section */}
        <section className="py-20 px-4">
          <div className="container mx-auto max-w-6xl">
            <motion.div
              className="text-center space-y-4 mb-16"
              variants={fadeInUp}
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
            >
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold">
                {t('features_title')}
                <span className="bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                  {" "}{t('features_title_modern')}
                </span>
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                {t('features_description')}
              </p>
            </motion.div>

            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
              variants={staggerContainer}
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
            >
              {features.map((feature) => (
                <motion.div key={feature.title} variants={fadeInUp}>
                  <FeatureCard
                    icon={feature.icon}
                    title={t(feature.title)}
                    description={t(feature.description)}
                  />
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

    
        {/* CTA Section */}
        <section className="py-20 px-4">
          <div className="container mx-auto max-w-4xl">
            <motion.div
              variants={fadeInUp}
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
            >
              <AnimatedCard 
                className="text-center p-12 bg-gradient-to-br from-primary/5 to-blue-600/5 border-primary/20"
                glass
              >
                <div className="space-y-6">
                  <h2 className="text-3xl md:text-4xl font-bold">
                    {t('cta_section_title')}
                  </h2>
                  <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                    {t('cta_section_description')}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <AnimatedButton onClick={() => {window.location.href = '/auth/login'}} size="lg" className="text-lg px-8">
                      {t('cta_section_button')}
                      <ArrowRight className="ml-2 w-5 h-5" />
                    </AnimatedButton>
              
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t('cta_section_note')}
                  </p>
                </div>
              </AnimatedCard>
            </motion.div>
          </div>
        </section>
      </motion.main>

      {/* Footer */}
      <Footer />

      {/* Floating Action Button */}
      <FloatingActionButton
        icon={<Bell className="w-6 h-6" />}
        position="bottom-right"
      />
    </div>
  )
}
