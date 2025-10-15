      import NextAuth, { NextAuthOptions } from "next-auth"
  import { PrismaAdapter } from "@next-auth/prisma-adapter"
  import GoogleProvider from "next-auth/providers/google"
  import CredentialsProvider from "next-auth/providers/credentials"
  import { prisma } from "@/lib/prisma"
  import bcrypt from "bcryptjs"
  import { z } from "zod"
  import { validateAuthEnvironment } from "@/lib/env-validation"

  // Validate environment variables
  validateAuthEnvironment()

  const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
  })

  export const authOptions: NextAuthOptions = {
    adapter: PrismaAdapter(prisma),
    secret: process.env.NEXTAUTH_SECRET,
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

            if (!user || !user.password) {
              return null
            }

            const isPasswordValid = await bcrypt.compare(password, user.password)
            
            if (!isPasswordValid) {
              return null
            }

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
    session: {
      strategy: "jwt",
      maxAge: 30 * 24 * 60 * 60, // 30 days
    },
    cookies: {
      sessionToken: {
        name: "next-auth.session-token",
        options: {
          httpOnly: true, // Changed to true for security and proper deletion
          sameSite: "lax",
          path: "/",
          secure: process.env.NODE_ENV === "production",
          domain: undefined,
        },
      },
    },
    callbacks: {
      async jwt({ token, user }) {
        if (user) {
          token.role = user.role
        }
        return token
      },
      async session({ session, token }) {
        if (token && session.user) {
          session.user.id = token.sub!
          session.user.role = token.role as "SUPER_ADMIN" | "MANAGER" | "STAFF" | "BORROWER"
        }
        return session
      },
      async signIn({ user, account }) {
        // For OAuth providers, handle account linking
        if (account?.provider === "google") {
          try {
            const existingUser = await prisma.user.findUnique({
              where: { email: user.email! },
              include: {
                accounts: true,
              },
            })

            if (existingUser) {
              // Check if this OAuth provider is already linked
              const existingAccount = existingUser.accounts.find(
                acc => acc.provider === account.provider
              )

              if (!existingAccount) {
                // Link the OAuth account to the existing user
                await prisma.account.create({
                  data: {
                    userId: existingUser.id,
                    type: account.type,
                    provider: account.provider,
                    providerAccountId: account.providerAccountId,
                    refresh_token: account.refresh_token,
                    access_token: account.access_token,
                    expires_at: account.expires_at,
                    token_type: account.token_type,
                    scope: account.scope,
                    id_token: account.id_token,
                    session_state: account.session_state,
                  },
                })

                // Update user with OAuth info if missing
                await prisma.user.update({
                  where: { id: existingUser.id },
                  data: {
                    name: existingUser.name || user.name,
                    image: existingUser.image || user.image,
                    emailVerified: existingUser.emailVerified || new Date(),
                  },
                })
              }
              return true
            } else {
              // Create new OAuth user without organization (will be assigned later)
              await prisma.user.create({
                data: {
                  email: user.email!,
                  name: user.name,
                  image: user.image,
                  emailVerified: new Date(),
                },
              })
              return true
            }
          } catch (error) {
            console.error("OAuth sign in error:", error)
            return false
          }
        }
        return true
      },
    },
    events: {
      async signOut(message) {
        // Clean up any additional cookies on sign out
        console.log("User signed out", message)
        
        // For credentials-based auth, ensure database session cleanup if any exists
        if (message?.token?.sub) {
          try {
            // Delete any database sessions for this user
            await prisma.session.deleteMany({
              where: {
                userId: message.token.sub
              }
            })
          } catch (error) {
            console.error("Database session cleanup error:", error)
          }
        }
      },
    },
    pages: {
      signIn: "/auth/login",
      error: "/auth/error",
    },
    debug: process.env.NODE_ENV === "development",
  }

  const handler = NextAuth(authOptions)

  export { handler as GET, handler as POST }
