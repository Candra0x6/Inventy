'use client'

import { motion } from 'framer-motion'
import { 
  Github,
  Linkedin,
  Twitter,
  Instagram,
  Mail,
  Phone,
  MapPin,
  ExternalLink,
  Heart
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { fadeInUp } from '@/lib/animations'
import { useTheme } from 'next-themes'

const socialLinks = [
  {
    name: 'GitHub',
    href: 'https://github.com/FOSTI-UMS',
    icon: Github
  },
  {
    name: 'LinkedIn', 
    href: 'https://linkedin.com/company/fosti_ums',
    icon: Linkedin
  },
  {
    name: 'Instagram',
    href: 'https://instagram.com/fosti_ums',
    icon: Instagram
  }
]


const contactInfo = [
  {
    icon: Mail,
    text: 'contact@fosti.club',
    href: 'mailto:contact@fosti.club'
  },
  {
    icon: Phone,
    text: '+62 812 3456 7890',
    href: 'tel:+6281234567890'
  },
  {
    icon: MapPin,
    text: 'Jakarta, Indonesia',
    href: 'https://maps.google.com/?q=Jakarta,Indonesia'
  }
]

export function Footer() {
    const { theme } = useTheme()
  return (
    <footer className="bg-background border-t border-border">
      <div className="container mx-auto max-w-6xl px-4">
      

        {/* Bottom Footer */}
        <motion.div
          className="py-8 border-t border-border"
          variants={fadeInUp}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true }}
        >
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
               {/* Company Info */}
            <motion.div
              className="lg:col-span-2 space-y-6"
              variants={fadeInUp}
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
            >
              <div className="flex items-center space-x-3">
               { theme === 'dark' ?
                            <Image
                              src="/fosti.png"
                              alt="Inventy Logo"
                              width={80}
                              height={80}
                            />  
                            : <Image
                              src="/fosti-black.png"
                              alt="Inventy Logo"
                              width={80}
                              height={80}
                            />  }
                <div>
                  <h3 className="text-lg font-bold">Inventy</h3>
                  <p className="text-sm text-muted-foreground">by FOSTI</p>
                </div>
              </div>
             

            </motion.div>

            
           
              {/* Social Links */}
              <div className="flex space-x-4">
                {socialLinks.map((social) => {
                  const Icon = social.icon
                  return (
                    <Link
                      key={social.name}
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-all duration-300 group"
                    >
                      <Icon className="w-5 h-5" />
                      <span className="sr-only">{social.name}</span>
                    </Link>
                  )
                })}
              </div>        
          </div>
        </motion.div>
      </div>
    </footer>
  )
}
