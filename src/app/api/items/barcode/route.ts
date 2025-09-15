import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// Validation schemas
const searchBarcodeSchema = z.object({
  barcode: z.string().min(1, 'Barcode is required'),
})

const updateBarcodeSchema = z.object({
  itemId: z.string().cuid('Invalid item ID'),
  barcode: z.string().min(1, 'Barcode is required'),
})

// GET: Search item by barcode
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const barcode = searchParams.get('barcode')

    if (!barcode) {
      return NextResponse.json({ error: 'Barcode parameter is required' }, { status: 400 })
    }

    const validation = searchBarcodeSchema.safeParse({ barcode })
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.issues }, { status: 400 })
    }

    // Find item by barcode
    const item = await prisma.item.findUnique({
      where: { barcode },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
        department: {
          select: {
            id: true,
            name: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        reservations: {
          where: {
            status: {
              in: ['PENDING', 'APPROVED', 'ACTIVE'],
            },
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
        },
      },
    })

    if (!item) {
      return NextResponse.json({ error: 'Item not found with this barcode' }, { status: 404 })
    }

    // Check if user has access to this item's organization
    if (session.user.role !== 'SUPER_ADMIN' && item.organizationId !== session.user.organizationId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    return NextResponse.json({
      success: true,
      item: {
        ...item,
        currentReservation: item.reservations[0] || null,
        reservations: undefined, // Remove reservations array from response
      },
    })

  } catch (error) {
    console.error('Barcode search error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST: Update item barcode
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validation = updateBarcodeSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.issues }, { status: 400 })
    }

    const { itemId, barcode } = validation.data

    // Check if barcode already exists
    const existingItem = await prisma.item.findUnique({
      where: { barcode },
    })

    if (existingItem && existingItem.id !== itemId) {
      return NextResponse.json({ error: 'Barcode already exists for another item' }, { status: 409 })
    }

    // Find the item to update
    const item = await prisma.item.findUnique({
      where: { id: itemId },
    })

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    // Check permissions
    if (session.user.role !== 'SUPER_ADMIN' && item.organizationId !== session.user.organizationId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    if (session.user.role === 'BORROWER') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Update the item with new barcode
    const updatedItem = await prisma.item.update({
      where: { id: itemId },
      data: { barcode },
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'UPDATE',
        entityType: 'Item',
        entityId: itemId,
        userId: session.user.id,
        organizationId: item.organizationId,
        changes: {
          field: 'barcode',
          oldValue: item.barcode,
          newValue: barcode,
        },
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      },
    })

    return NextResponse.json({
      success: true,
      item: updatedItem,
    })

  } catch (error) {
    console.error('Barcode update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE: Remove barcode from item
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const itemId = searchParams.get('itemId')

    if (!itemId) {
      return NextResponse.json({ error: 'Item ID is required' }, { status: 400 })
    }

    // Find the item
    const item = await prisma.item.findUnique({
      where: { id: itemId },
    })

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    // Check permissions
    if (session.user.role !== 'SUPER_ADMIN' && item.organizationId !== session.user.organizationId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    if (session.user.role === 'BORROWER') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Remove barcode
    const updatedItem = await prisma.item.update({
      where: { id: itemId },
      data: { barcode: null },
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'UPDATE',
        entityType: 'Item',
        entityId: itemId,
        userId: session.user.id,
        organizationId: item.organizationId,
        changes: {
          field: 'barcode',
          oldValue: item.barcode,
          newValue: null,
        },
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      },
    })

    return NextResponse.json({
      success: true,
      item: updatedItem,
    })

  } catch (error) {
    console.error('Barcode deletion error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
