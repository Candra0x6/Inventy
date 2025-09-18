'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  Mail, 
  Lock, 
  User, 
  Eye, 
  EyeOff,
  Save,
  Plus,
  Settings
} from 'lucide-react'
import { 
  AnimatedModal, 
  AnimatedInput, 
  AnimatedTextarea, 
  AnimatedSelect, 
  ConfirmationModal 
} from '@/components/ui/animated-modal'
import { AnimatedButton, IconButton, ToggleButton } from '@/components/ui/animated-button'
import { AnimatedCard, FeatureCard, StatsCard } from '@/components/ui/animated-card'
import { AnimatedNavbar, defaultNavItems } from '@/components/navigation/animated-navbar'
import { fadeInUp, staggerContainer } from '@/lib/animations'

export default function ComponentsDemo() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [selectValue, setSelectValue] = useState('')
  const [toggleValue, setToggleValue] = useState(false)

  const selectOptions = [
    { value: 'option1', label: 'Option 1' },
    { value: 'option2', label: 'Option 2' },
    { value: 'option3', label: 'Option 3' },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <AnimatedNavbar items={defaultNavItems} />
      
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="space-y-12"
        >
          {/* Header */}
          <motion.div variants={fadeInUp} className="text-center space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
              UI Components Demo
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Experience our modern, animated UI components with dark/light mode support and responsive design.
            </p>
          </motion.div>

          {/* Cards Section */}
          <motion.section variants={fadeInUp} className="space-y-6">
            <h2 className="text-2xl font-bold">Cards & Display</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatsCard
                value="2,847"
                label="Total Users"
                change={12}
                trend="up"
                icon={<User className="w-5 h-5" />}
              />
              <StatsCard
                value="98.5%"
                label="Uptime"
                change={0.3}
                trend="up"
              />
              <StatsCard
                value="$45,239"
                label="Revenue"
                change={-2.1}
                trend="down"
              />
              <StatsCard
                value="156"
                label="New Orders"
                change={8.2}
                trend="up"
              />
            </div>
          </motion.section>

          {/* Feature Cards */}
          <motion.section variants={fadeInUp} className="space-y-6">
            <h2 className="text-2xl font-bold">Feature Cards</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <FeatureCard
                icon={<Settings className="w-8 h-8" />}
                title="Easy Configuration"
                description="Set up your application in minutes with our intuitive configuration system."
              />
              <FeatureCard
                icon={<Lock className="w-8 h-8" />}
                title="Secure by Default"
                description="Enterprise-grade security features built-in from the ground up."
              />
              <FeatureCard
                icon={<Eye className="w-8 h-8" />}
                title="Real-time Monitoring"
                description="Keep track of everything that matters with live dashboards and alerts."
              />
            </div>
          </motion.section>

          {/* Buttons Section */}
          <motion.section variants={fadeInUp} className="space-y-6">
            <h2 className="text-2xl font-bold">Buttons & Actions</h2>
            <AnimatedCard>
              <div className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Button Variants</h3>
                  <div className="flex flex-wrap gap-3">
                    <AnimatedButton>Default</AnimatedButton>
                    <AnimatedButton variant="destructive">Destructive</AnimatedButton>
                    <AnimatedButton variant="outline">Outline</AnimatedButton>
                    <AnimatedButton variant="secondary">Secondary</AnimatedButton>
                    <AnimatedButton variant="ghost">Ghost</AnimatedButton>
                    <AnimatedButton variant="gradient">Gradient</AnimatedButton>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Button Sizes</h3>
                  <div className="flex flex-wrap items-center gap-3">
                    <AnimatedButton size="sm">Small</AnimatedButton>
                    <AnimatedButton size="default">Default</AnimatedButton>
                    <AnimatedButton size="lg">Large</AnimatedButton>
                    <IconButton icon={<Plus className="w-4 h-4" />} />
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Interactive Elements</h3>
                  <div className="flex flex-wrap items-center gap-3">
                    <AnimatedButton loading>Loading...</AnimatedButton>
                    <ToggleButton
                      pressed={toggleValue}
                      onPressedChange={setToggleValue}
                    >
                      {toggleValue ? 'Enabled' : 'Disabled'}
                    </ToggleButton>
                  </div>
                </div>
              </div>
            </AnimatedCard>
          </motion.section>

          {/* Forms Section */}
          <motion.section variants={fadeInUp} className="space-y-6">
            <h2 className="text-2xl font-bold">Forms & Inputs</h2>
            <AnimatedCard>
              <div className="space-y-6">
                <AnimatedInput
                  label="Email Address"
                  type="email"
                  placeholder="Enter your email"
                  icon={<Mail className="w-4 h-4" />}
                />
                
                <div className="relative">
                  <AnimatedInput
                    label="Password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    icon={<Lock className="w-4 h-4" />}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-8 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                <AnimatedSelect
                  label="Select Option"
                  options={selectOptions}
                  value={selectValue}
                  onChange={setSelectValue}
                  placeholder="Choose an option"
                />

                <AnimatedTextarea
                  label="Message"
                  placeholder="Write your message here..."
                  rows={4}
                />

                <div className="flex justify-end">
                  <AnimatedButton>
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </AnimatedButton>
                </div>
              </div>
            </AnimatedCard>
          </motion.section>

          {/* Modal Demo Section */}
          <motion.section variants={fadeInUp} className="space-y-6">
            <h2 className="text-2xl font-bold">Modals & Dialogs</h2>
            <AnimatedCard>
              <div className="space-y-4">
                <p className="text-muted-foreground">
                  Test our animated modal system with smooth transitions and responsive design.
                </p>
                <div className="flex gap-3">
                  <AnimatedButton onClick={() => setIsModalOpen(true)}>
                    Open Modal
                  </AnimatedButton>
                  <AnimatedButton variant="destructive" onClick={() => setIsConfirmOpen(true)}>
                    Delete Item
                  </AnimatedButton>
                </div>
              </div>
            </AnimatedCard>
          </motion.section>
        </motion.div>
      </div>

      {/* Modals */}
      <AnimatedModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Example Modal"
        description="This is a demonstration of our animated modal component."
      >
        <div className="space-y-4">
          <p className="text-muted-foreground">
            This modal demonstrates smooth animations, backdrop blur, and responsive design.
            It includes proper focus management and keyboard navigation.
          </p>
          <AnimatedInput placeholder="Try typing here..." />
          <div className="flex justify-end gap-3">
            <AnimatedButton variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </AnimatedButton>
            <AnimatedButton onClick={() => setIsModalOpen(false)}>
              Confirm
            </AnimatedButton>
          </div>
        </div>
      </AnimatedModal>

      <ConfirmationModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={() => {
          // Handle deletion
          console.log('Item deleted')
        }}
        title="Delete Item"
        description="Are you sure you want to delete this item? This action cannot be undone."
        type="danger"
        confirmText="Delete"
        cancelText="Cancel"
      />
    </div>
  )
}