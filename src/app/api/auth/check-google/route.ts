import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()
    
    if (!email) {
      return NextResponse.json({ hasGoogleAccount: false })
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        accounts: {
          where: {
            provider: 'google'
          }
        }
      }
    })

    const hasGoogleAccount = user && user.accounts.length > 0

    return NextResponse.json({ 
      hasGoogleAccount: !!hasGoogleAccount,
      userExists: !!user
    })
  } catch (error) {
    console.error("Error checking Google account:", error)
    return NextResponse.json({ hasGoogleAccount: false })
  }
}
