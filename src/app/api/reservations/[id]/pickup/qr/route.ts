import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import QRCode from 'qrcode'
import crypto from 'crypto'

interface Params {
  id: string
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<Params> }
) {
  try {
    const session = await getServerSession(authOptions)
    const { id } = await context.params
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Find the reservation
    const reservation = await prisma.reservation.findUnique({
      where: { id },
      include: {
        item: {
          select: {
            id: true,
            name: true,
            location: true,
            qrCode: true,
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      }
    })

    if (!reservation) {
      return NextResponse.json(
        { error: 'Reservation not found' },
        { status: 404 }
      )
    }

    // Check permissions
    const userRole = session.user.role
    const isOwner = reservation.userId === session.user.id
    const canGenerate = isOwner || ['SUPER_ADMIN', 'MANAGER', 'STAFF'].includes(userRole)

    if (!canGenerate) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Check if reservation is approved and ready for pickup
    if (reservation.status !== 'APPROVED') {
      return NextResponse.json(
        { 
          error: `Cannot generate pickup QR code for reservation with status: ${reservation.status}` 
        },
        { status: 400 }
      )
    }

    // Check if already picked up
    if (reservation.pickupConfirmed) {
      return NextResponse.json(
        { 
          error: 'Item has already been picked up',
          pickupConfirmedAt: reservation.pickupConfirmedAt
        },
        { status: 400 }
      )
    }

    // Generate secure pickup token
    const pickupToken = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now

    // Create pickup QR data
    const qrData = {
      type: 'pickup_confirmation',
      reservationId: id,
      token: pickupToken,
      expiresAt: expiresAt.toISOString(),
      itemName: reservation.item.name,
      borrower: reservation.user.name || reservation.user.email,
      location: reservation.item.location
    }

    // Generate QR code as data URL
    const qrCodeDataUrl = await QRCode.toDataURL(JSON.stringify(qrData), {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      quality: 0.92,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      width: 256
    })

    // Store the pickup token in audit log for verification
    await prisma.auditLog.create({
      data: {
        action: 'GENERATE_PICKUP_QR',
        entityType: 'Reservation',
        entityId: id,
        userId: session.user.id,
        changes: {
          token: pickupToken,
          expiresAt: expiresAt.toISOString(),
          generatedBy: session.user.email,
          generatedAt: new Date().toISOString()
        }
      }
    })

    return NextResponse.json({
      qrCode: qrCodeDataUrl,
      token: pickupToken,
      expiresAt: expiresAt.toISOString(),
      reservation: {
        id: reservation.id,
        itemName: reservation.item.name,
        borrower: reservation.user.name || reservation.user.email,
        location: reservation.item.location,
        startDate: reservation.startDate,
        endDate: reservation.endDate
      }
    })

  } catch (error) {
    console.error('Error generating pickup QR code:', error)
    return NextResponse.json(
      { error: 'Failed to generate pickup QR code' },
      { status: 500 }
    )
  }
}