'use client'

import { motion } from 'framer-motion'
import { 
  Package, 
  Zap, 
  Shield, 
  BarChart3, 
  Users, 
  Scan,
  ArrowRight,
  CheckCircle,
  Star,
  TrendingUp,
  Bell
} from 'lucide-react'
import { AnimatedCard, FeatureCard, StatsCard } from '@/components/ui/animated-card'
import { AnimatedButton, FloatingActionButton } from '@/components/ui/animated-button'
import { AnimatedNavbar, defaultNavItems } from '@/components/navigation/animated-navbar'
import { 
  fadeInUp, 
  staggerContainer, 
  pageTransition
} from '@/lib/animations'

const features = [
  {
    icon: <Package className="w-8 h-8" />,
    title: "Smart Inventory",
    description: "AI-powered inventory management with automated tracking and intelligent forecasting for optimal stock levels."
  },
  {
    icon: <Scan className="w-8 h-8" />,
    title: "QR & Barcode",
    description: "Advanced scanning technology for instant item identification and seamless inventory operations."
  },
  {
    icon: <Shield className="w-8 h-8" />,
    title: "Secure Access",
    description: "Enterprise-grade security with role-based access control and comprehensive audit trails."
  },
  {
    icon: <BarChart3 className="w-8 h-8" />,
    title: "Real-time Analytics",
    description: "Powerful insights and reports that help you make data-driven decisions for your inventory."
  },
  {
    icon: <Users className="w-8 h-8" />,
    title: "Team Collaboration",
    description: "Streamlined workflows for teams with notifications, assignments, and real-time updates."
  },
  {
    icon: <Zap className="w-8 h-8" />,
    title: "Lightning Fast",
    description: "Optimized performance ensures your operations run smoothly, even with large inventories."
  }
]

const stats = [
  { value: "10,000+", label: "Items Managed", change: 23, trend: "up" as const },
  { value: "99.9%", label: "Uptime", change: 0.1, trend: "up" as const },
  { value: "500+", label: "Organizations", change: 15, trend: "up" as const },
  { value: "4.9/5", label: "User Rating", change: 2, trend: "up" as const }
]

const testimonials = [
  {
    avatar: "/api/placeholder/80/80",
    name: "Sarah Johnson",
    role: "Operations Manager",
    content: "Inventy transformed our inventory management. The real-time tracking and analytics have improved our efficiency by 40%."
  },
  {
    avatar: "/api/placeholder/80/80", 
    name: "Michael Chen",
    role: "IT Director",
    content: "The integration was seamless and the team adopted it quickly. Best inventory solution we've implemented."
  },
  {
    avatar: "/api/placeholder/80/80",
    name: "Emily Rodriguez", 
    role: "Warehouse Supervisor",
    content: "The barcode scanning feature alone saved us hours every day. Highly recommend for any growing business."
  }
]

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 max-w-5xl mx-auto">
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
                  Smart Inventory
                  <br />
                  Management
                </h1>
                <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                  Transform your inventory operations with AI-powered insights, real-time tracking, and seamless team collaboration.
                </p>
              </motion.div>

              <motion.div 
                variants={fadeInUp}
                className="flex flex-col sm:flex-row gap-4 justify-center"
              >
                <AnimatedButton size="lg" className="text-lg px-8 py-4">
                  Get Started Free
                  <ArrowRight className="ml-2 w-5 h-5" />
                </AnimatedButton>
                <AnimatedButton variant="outline" size="lg" className="text-lg px-8 py-4">
                  Watch Demo
                </AnimatedButton>
              </motion.div>

              <motion.div 
                variants={fadeInUp}
                className="flex items-center justify-center space-x-8 text-sm text-muted-foreground"
              >
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>No Credit Card Required</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>14-Day Free Trial</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Setup in Minutes</span>
                </div>
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

        {/* Stats Section */}
        <section className="py-16 px-4 bg-muted/30">
          <div className="container mx-auto max-w-6xl">
            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
              variants={staggerContainer}
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
            >
              {stats.map((stat) => (
                <motion.div key={stat.label} variants={fadeInUp}>
                  <StatsCard
                    value={stat.value}
                    label={stat.label}
                    change={stat.change}
                    trend={stat.trend}
                    icon={<TrendingUp className="w-6 h-6" />}
                  />
                </motion.div>
              ))}
            </motion.div>
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
                Powerful Features for
                <span className="bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                  {" "}Modern Teams
                </span>
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Everything you need to manage your inventory efficiently and scale your operations.
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
                    title={feature.title}
                    description={feature.description}
                  />
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section className="py-20 px-4 bg-muted/30">
          <div className="container mx-auto max-w-6xl">
            <motion.div
              className="text-center space-y-4 mb-16"
              variants={fadeInUp}
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
            >
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold">
                Loved by Teams
                <span className="bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                  {" "}Worldwide
                </span>
              </h2>
              <div className="flex items-center justify-center space-x-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-6 h-6 fill-yellow-400 text-yellow-400" />
                ))}
                <span className="ml-2 text-muted-foreground">4.9/5 from 500+ reviews</span>
              </div>
            </motion.div>

            <motion.div
              className="grid grid-cols-1 md:grid-cols-3 gap-8"
              variants={staggerContainer}
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
            >
              {testimonials.map((testimonial) => (
                <motion.div key={testimonial.name} variants={fadeInUp}>
                  <AnimatedCard className="h-full">
                    <div className="space-y-4">
                      <div className="flex items-center space-x-1">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        ))}
                      </div>
                      <p className="text-muted-foreground italic">
                        &ldquo;{testimonial.content}&rdquo;
                      </p>
                      <div className="flex items-center space-x-3 pt-4 border-t border-border">
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                          <Users className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold">{testimonial.name}</p>
                          <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                        </div>
                      </div>
                    </div>
                  </AnimatedCard>
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
                    Ready to Transform Your Inventory?
                  </h2>
                  <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                    Join thousands of teams who trust Inventy to manage their inventory operations efficiently.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <AnimatedButton size="lg" className="text-lg px-8">
                      Start Free Trial
                      <ArrowRight className="ml-2 w-5 h-5" />
                    </AnimatedButton>
                    <AnimatedButton variant="outline" size="lg" className="text-lg px-8">
                      Schedule Demo
                    </AnimatedButton>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    No credit card required • Setup in under 5 minutes
                  </p>
                </div>
              </AnimatedCard>
            </motion.div>
          </div>
        </section>
      </motion.main>

      {/* Floating Action Button */}
      <FloatingActionButton
        icon={<Bell className="w-6 h-6" />}
        position="bottom-right"
      />
    </div>
  )
}
