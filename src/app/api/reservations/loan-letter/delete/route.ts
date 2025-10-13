import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { deleteLoanLetter } from '@/lib/supabase/file-upload'

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { reservationId } = await request.json()

    if (!reservationId) {
      return NextResponse.json(
        { error: 'Reservation ID is required' },
        { status: 400 }
      )
    }

    // Get the reservation with file information
    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      select: {
        id: true,
        userId: true,
        loanLetterUrl: true,
        loanLetterFileName: true,
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

    if (!reservation.loanLetterUrl) {
      return NextResponse.json(
        { error: 'No loan letter file found for this reservation' },
        { status: 404 }
      )
    }

    // Check if user owns the reservation or is admin/manager
    const isOwner = reservation.userId === session.user.id
    const isAdmin = session.user.role === 'SUPER_ADMIN' || session.user.role === 'MANAGER'

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { error: 'You do not have permission to delete files for this reservation' },
        { status: 403 }
      )
    }

    // Extract file path from URL for deletion
    const url = new URL(reservation.loanLetterUrl)
    const filePath = url.pathname.split('/').slice(-2).join('/') // Get last two parts (folder/filename)

    // Delete file from Supabase Storage
    const deleteResult = await deleteLoanLetter(filePath)

    if (!deleteResult.success) {
      console.error('Failed to delete file from storage:', deleteResult.error)
      // Continue with database update even if storage deletion fails
    }

    // Update reservation to remove file information
    const updatedReservation = await prisma.reservation.update({
      where: { id: reservationId },
      data: {
        loanLetterUrl: null,
        loanLetterFileName: null,
        loanLetterUploadedAt: null
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Loan letter deleted successfully',
      reservation: updatedReservation
    })
  } catch (error) {
    console.error('Error deleting loan letter:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
