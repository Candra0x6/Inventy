"use client"
import { ReactNode, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Users, Calendar, Package, CheckCircle, Clock, AlertTriangle, BarChart3, Menu, X, ChevronRight, Home, Bell, Search, LogOut, HomeIcon } from 'lucide-react';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { usePathname, useRouter } from 'next/navigation';
import { fadeInUp, staggerContainer } from '@/lib/animations';
import { signOut, useSession } from 'next-auth/react';
import { DropdownMenu } from '@/components/navigation/dropdown-menu';
import { customSignOut } from '@/lib/auth/custom-signout';

const adminNavTabs = [
    { path: '/dashboard', label: 'Main', icon: <HomeIcon className="w-4 h-4" /> },

  { path: '/dashboard/items', label: 'Items', icon: <Package className="w-4 h-4" /> },
  { path: '/dashboard/returns', label: 'Returns', icon: <CheckCircle className="w-4 h-4" /> },
  { path: '/dashboard/late-tracking', label: 'Late Tracking', icon: <Clock className="w-4 h-4" /> },
  { path: '/dashboard/analytics', label: 'Analytics', icon: <BarChart3 className="w-4 h-4" /> },
];

const borrowerNavTabs = [
  { path: '/dashboard', label: 'Overview', icon: <Home className="w-4 h-4" /> },
  { path: '/dashboard/my-items', label: 'My Items', icon: <Package className="w-4 h-4" /> },
  { path: '/dashboard/my-analytics', label: 'Analytics', icon: <BarChart3 className="w-4 h-4" /> },
  { path: '/dashboard/my-notifications', label: 'Notifications', icon: <Bell className="w-4 h-4" /> },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const { data: session, status } = useSession()
  
  const router = useRouter()
  const pathname = usePathname()
  console.log('Current pathname:', pathname);
  useEffect(() => {
    if (status === 'loading') return // Still loading

    if (!session) {
      router.push('/auth/login')
      return
    }

    
  }, [session, status, router])


  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return null // Will redirect in useEffect
  }

  const isAdmin = session.user?.role === 'SUPER_ADMIN' || session.user?.role === 'MANAGER' || session.user?.role === 'STAFF'
  const isBorrower = session.user?.role === 'BORROWER'

  if (!isAdmin && !isBorrower) {
    return null // Invalid role
  }

  const navTabs = isAdmin ? adminNavTabs : borrowerNavTabs
  const activeTab = navTabs.find(tab => tab.path === pathname)?.path || '';
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 max-w-5xl mx-auto">
      {/* Top Navbar */}
      <motion.nav
        className="fixed mt-5 top-0 z-50 px-2 w-full border-b border-border/40 bg-background/80 backdrop-blur max-w-5xl self-center supports-[backdrop-filter]:bg-background/60 rounded-full  "
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
      >
        <div className="container mx-auto px-4 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo Section */}
            <Link href="/" className="flex items-center space-x-3 cursor-pointer">
              <div className="p-2 bg-gradient-to-br from-primary/20 to-primary/10 rounded-xl border border-primary/20">
                <Shield className="h-5 w-5 text-primary" />
              </div>

            </Link>

            {/* Desktop Navigation Menu */}
            <div className="hidden lg:flex items-center space-x-1">
              {navTabs.map(tab => (
                <Link
                  key={tab.path}
                  href={tab.path}
                  className={cn(
                    'flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 relative',
                    pathname === tab.path
                      ? 'text-primary bg-primary/10 border border-primary/20'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  )}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                  
                
                </Link>
              ))}
            </div>

            {/* User Info and Theme Toggle */}
            <div className="flex items-center space-x-3">
             
               <DropdownMenu
               isDropdown={false}
               className='cursor-pointer'
                  trigger={ <div className="hidden md:flex items-center space-x-2 px-3 py-2 bg-card/50 backdrop-blur-sm border border-border/40 rounded-lg">
                <div className="w-6 h-6 bg-gradient-to-br from-primary/20 to-primary/10 rounded-lg flex items-center justify-center">
                  <Users className="w-3 h-3 text-primary" />
                </div>
               {isAdmin ? <div className="text-xs">
                  <p className="font-medium">Super Admin</p>
                  <p className="text-muted-foreground">Admin</p>
                </div> : <div className="text-xs">
                  <p className="font-medium">User</p>
                  <p className="text-muted-foreground">Borrower</p>
                </div>}
                 
              </div>}
                  items={[
                    { 
                      label: 'Log Out',
                      onClick: () => { 
                        signOut({ callbackUrl: '/auth/login' })
                        customSignOut({ callbackUrl: '/auth/login' })
                       },
                      href: '/auth/logout',
                      icon: <LogOut className="h-4 w-4" />,
                      description: 'Sign out of your account'
                    },
                   
                  ]}
                />
              {/* Mobile menu button */}
              <motion.button
                className="lg:hidden p-2 rounded-lg hover:bg-muted transition-colors"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                whileTap={{ scale: 0.95 }}
              >
                <AnimatePresence mode="wait">
                  {isMobileMenuOpen ? (
                    <motion.div
                      key="close"
                      initial={{ rotate: -90, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      exit={{ rotate: 90, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <X className="w-5 h-5" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="menu"
                      initial={{ rotate: 90, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      exit={{ rotate: -90, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Menu className="w-5 h-5" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
            </div>
          </div>
          {/* Mobile Navigation Menu */}
          <AnimatePresence>
            {isMobileMenuOpen && (
              <motion.div
                className="lg:hidden border-t border-border/40 bg-card/50 backdrop-blur-sm"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
              >
                <motion.div
                  className="py-4 px-4 space-y-2"
                  variants={staggerContainer}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                >
                  {navTabs.map((item) => (
                    <motion.button
                      key={item.path}
                      variants={fadeInUp}
                      onClick={() => {

                        setIsMobileMenuOpen(false)
                      }}
                      className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab
                          ? 'text-primary bg-primary/10 border border-primary/20'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                        }`}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </motion.button>
                  ))}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.nav>

      {/* Main Content Area */}
      <div className="pt-16">
        <div className="container mx-auto px-4 lg:px-8 py-6">
          {/* Enhanced Content Header */}
         {isAdmin && <motion.div
            className="mb-8"
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
          >
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              className="space-y-4"
            >
         

              {/* Header Content */}
              <div className="flex w-full justify-between">

              <motion.div variants={fadeInUp} className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6">
                <div className="space-y-2">
                  <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                    {
                      pathname === '/dashboard/reservations' ? 'Reservation Management' :
                        pathname === '/dashboard/returns' ? 'Return Approval System' :
                          pathname === '/dashboard/late-tracking' ? 'Late Return Tracking' :
                            pathname === '/dashboard/damage-management' ? 'Damage Management Dashboard' :
                              pathname === '/dashboard/analytics' ? 'Analytics Dashboard' :
                                pathname === '/dashboard/items' ? 'Item Management' :
                                  'Super Admin Dashboard'
                    }
                  </h1>
                  <p className="text-muted-foreground text-lg leading-relaxed">
                    {
                      pathname === '/dashboard/reservations' ? 'Review and manage all reservation requests' :
                        pathname === '/dashboard/returns' ? 'Process return requests and approvals' :
                          pathname === '/dashboard/late-tracking' ? 'Monitor overdue items and send notifications' :
                            pathname === '/dashboard/damage-management' ? 'Handle damage reports and assessments' :
                              pathname === '/dashboard/analytics' ? 'Comprehensive insights into patterns' :
                                pathname === '/dashboard/items' ? 'Add, edit, and manage inventory items' :
                                  'Manage reservations, track returns, and monitor system analytics'
                    }
                  </p>
                </div>
              </motion.div>
                              <ThemeToggle  />

              </div>
            </motion.div>
            
          </motion.div>}
          {children}
        </div>
      </div>
    </div>
  );
}