// Alternative auth configuration with database sessions
// Use this for production to avoid large cookies entirely

import { NextAuthOptions } from "next-auth"
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import GoogleProvider from "next-auth/providers/google"
import CredentialsProvider from "next-auth/providers/credentials"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { z } from "zod"

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

export const authOptionsWithDatabaseSessions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  
  // Use database sessions instead of JWT to avoid cookie size issues
  session: {
    strategy: "database",
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60,   // 24 hours
  },

  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) return null

          const { email, password } = loginSchema.parse(credentials)

          const user = await prisma.user.findUnique({
            where: { email },
          })

          if (!user || !user.password) return null

          const isPasswordValid = await bcrypt.compare(password, user.password)
          if (!isPasswordValid) return null

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image || user.avatar,
            role: user.role,
          }
        } catch (error) {
          console.error("Auth error:", error)
          return null
        }
      },
    }),
  ],

  callbacks: {
    async session({ session, user }) {
      // With database sessions, user data comes from database
      if (session.user) {
        session.user.id = user.id
        session.user.role = user.role as "SUPER_ADMIN" | "MANAGER" | "STAFF" | "BORROWER"
      }
      return session
    },
  },

  pages: {
    signIn: "/auth/login",
    error: "/auth/error",
  },

  debug: process.env.NODE_ENV === "development",
}

// Use this comment block to switch between JWT and database sessions:
/*
TO USE DATABASE SESSIONS (RECOMMENDED FOR PRODUCTION):
1. Replace authOptions export with authOptionsWithDatabaseSessions
2. Ensure your Prisma schema has the required NextAuth tables
3. Run: npx prisma migrate dev
4. Database sessions store only a session ID in cookies (much smaller)
*/