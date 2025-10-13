import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { uploadLoanLetter } from '@/lib/supabase/file-upload'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const reservationId = formData.get('reservationId') as string

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    if (!reservationId) {
      return NextResponse.json(
        { error: 'Reservation ID is required' },
        { status: 400 }
      )
    }

    // Verify the reservation exists and belongs to the user or user has admin rights
    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      select: {
        id: true,
        userId: true,
        user: {
          select: {
            id: true,
            role: true
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

    // Check if user owns the reservation or is admin/manager
    const isOwner = reservation.userId === session.user.id
    const isAdmin = session.user.role === 'SUPER_ADMIN' || session.user.role === 'MANAGER'

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { error: 'You do not have permission to upload files for this reservation' },
        { status: 403 }
      )
    }

    // Upload file to Supabase
    const uploadResult = await uploadLoanLetter(file, reservationId)

    if (!uploadResult.success) {
      return NextResponse.json(
        { error: uploadResult.error || 'Upload failed' },
        { status: 400 }
      )
    }

    // Update reservation with file information
    const updatedReservation = await prisma.reservation.update({
      where: { id: reservationId },
      data: {
        loanLetterUrl: uploadResult.url,
        loanLetterFileName: uploadResult.fileName,
        loanLetterUploadedAt: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      url: uploadResult.url,
      fileName: uploadResult.fileName,
      reservation: updatedReservation
    })
  } catch (error) {
    console.error('Error uploading loan letter:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
