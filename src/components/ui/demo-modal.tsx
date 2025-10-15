"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, User, Shield, Play } from "lucide-react"
import { AnimatedCard } from "./animated-card"
import { fadeInUp, scaleIn } from "@/lib/animations"

interface DemoModalProps {
  isOpen: boolean
  onClose: () => void
}

type DemoType = "user" | "admin" | null

export function DemoModal({ isOpen, onClose }: DemoModalProps) {
  const [selectedDemo, setSelectedDemo] = useState<DemoType>(null)

  // Replace these with your actual YouTube video IDs
  const VIDEO_IDS = {
    user: "qhrVp8lZ4Qk", // Replace with your user demo video ID
    admin: "iyBobfZ6kes" // Replace with your admin demo video ID
  }

  const handleClose = () => {
    setSelectedDemo(null)
    onClose()
  }

  const handleDemoSelect = (type: DemoType) => {
    setSelectedDemo(type)
  }

  const handleBack = () => {
    setSelectedDemo(null)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              variants={scaleIn}
              initial="initial"
              animate="animate"
              exit="exit"
              className="w-full max-w-4xl max-h-[90vh] overflow-auto"
            >
              <AnimatedCard className="relative" glass>
                {/* Close Button */}
                <button
                  onClick={handleClose}
                  className="absolute top-4 right-4 p-2 rounded-lg hover:bg-muted/50 transition-colors z-10"
                >
                  <X className="w-5 h-5" />
                </button>

                {/* Content */}
                <div className="p-6 md:p-8">
                  <AnimatePresence mode="wait">
                    {!selectedDemo ? (
                      // Menu Selection
                      <motion.div
                        key="menu"
                        variants={fadeInUp}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        className="space-y-8"
                      >
                        <div className="text-center space-y-4">
                          <h2 className="text-3xl md:text-4xl font-bold">
                            Watch Demo Video
                          </h2>
                          <p className="text-lg text-muted-foreground">
                            Choose which demo you&apos;d like to watch
                          </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* User Demo Card */}
                          <motion.div
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="cursor-pointer"
                            onClick={() => handleDemoSelect("user")}
                          >
                            <AnimatedCard className="p-6 hover:border-primary/50 transition-colors">
                              <div className="space-y-4">
                                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                                  <User className="w-8 h-8 text-primary" />
                                </div>
                                <div className="text-center space-y-2">
                                  <h3 className="text-xl font-semibold">User Demo</h3>
                                  <p className="text-sm text-muted-foreground">
                                    See how users can borrow items, manage reservations, and track their borrowing history
                                  </p>
                                </div>
                                <div className="flex items-center justify-center gap-2 text-primary">
                                  <Play className="w-4 h-4" />
                                  <span className="text-sm font-medium">Watch Video</span>
                                </div>
                              </div>
                            </AnimatedCard>
                          </motion.div>

                          {/* Admin Demo Card */}
                          <motion.div
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="cursor-pointer"
                            onClick={() => handleDemoSelect("admin")}
                          >
                            <AnimatedCard className="p-6 hover:border-primary/50 transition-colors">
                              <div className="space-y-4">
                                <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto">
                                  <Shield className="w-8 h-8 text-blue-500" />
                                </div>
                                <div className="text-center space-y-2">
                                  <h3 className="text-xl font-semibold">Admin Demo</h3>
                                  <p className="text-sm text-muted-foreground">
                                    Explore admin features including inventory management, analytics, and system administration
                                  </p>
                                </div>
                                <div className="flex items-center justify-center gap-2 text-blue-500">
                                  <Play className="w-4 h-4" />
                                  <span className="text-sm font-medium">Watch Video</span>
                                </div>
                              </div>
                            </AnimatedCard>
                          </motion.div>
                        </div>
                      </motion.div>
                    ) : (
                      // Video Player
                      <motion.div
                        key="video"
                        variants={fadeInUp}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        className="space-y-6"
                      >
                        <div className="flex items-center gap-4">
                          <button
                            onClick={handleBack}
                            className="p-2 rounded-lg hover:bg-muted/50 transition-colors"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                          </button>
                          <div className="flex items-center gap-3">
                            {selectedDemo === "user" ? (
                              <>
                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                  <User className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                  <h3 className="text-xl font-semibold">User Demo</h3>
                                  <p className="text-sm text-muted-foreground">Borrower Features</p>
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                                  <Shield className="w-5 h-5 text-blue-500" />
                                </div>
                                <div>
                                  <h3 className="text-xl font-semibold">Admin Demo</h3>
                                  <p className="text-sm text-muted-foreground">Management Features</p>
                                </div>
                              </>
                            )}
                          </div>
                        </div>

                        {/* YouTube Video Embed */}
                        <div className="relative w-full pb-[56.25%] bg-black rounded-lg overflow-hidden">
                          <iframe
                            className="absolute top-0 left-0 w-full h-full"
                            src={`https://www.youtube.com/embed/${VIDEO_IDS[selectedDemo]}?autoplay=1`}
                            title={`${selectedDemo} Demo Video`}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        </div>

                        {/* Video Description */}
                        <div className="space-y-4">
                          {selectedDemo === "user" ? (
                            <>
                              <h4 className="font-semibold">What you&apos;ll learn:</h4>
                              <ul className="space-y-2 text-sm text-muted-foreground">
                                <li className="flex items-start gap-2">
                                  <span className="text-primary mt-1">•</span>
                                  <span>How to browse and search for available items</span>
                                </li>
                                <li className="flex items-start gap-2">
                                  <span className="text-primary mt-1">•</span>
                                  <span>Making reservations and managing your bookings</span>
                                </li>
                                <li className="flex items-start gap-2">
                                  <span className="text-primary mt-1">•</span>
                                  <span>Tracking your borrowing history and returns</span>
                                </li>
                                <li className="flex items-start gap-2">
                                  <span className="text-primary mt-1">•</span>
                                  <span>Using QR codes for quick item pickup</span>
                                </li>
                              </ul>
                            </>
                          ) : (
                            <>
                              <h4 className="font-semibold">What you&apos;ll learn:</h4>
                              <ul className="space-y-2 text-sm text-muted-foreground">
                                <li className="flex items-start gap-2">
                                  <span className="text-blue-500 mt-1">•</span>
                                  <span>Managing inventory and adding new items</span>
                                </li>
                                <li className="flex items-start gap-2">
                                  <span className="text-blue-500 mt-1">•</span>
                                  <span>Approving and managing reservations</span>
                                </li>
                                <li className="flex items-start gap-2">
                                  <span className="text-blue-500 mt-1">•</span>
                                  <span>Viewing analytics and generating reports</span>
                                </li>
                                <li className="flex items-start gap-2">
                                  <span className="text-blue-500 mt-1">•</span>
                                  <span>User management and access control</span>
                                </li>
                              </ul>
                            </>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </AnimatedCard>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
