import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'csv'
    const type = searchParams.get('type') || 'borrowing'
    const timeframe = searchParams.get('timeframe') || '30d'
    const exportType = searchParams.get('exportType') || 'summary' // summary, detailed, damage_reports
    
    // Calculate date range
    const endDate = new Date()
    const startDate = new Date()
    
    switch (timeframe) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7)
        break
      case '30d':
        startDate.setDate(endDate.getDate() - 30)
        break
      case '90d':
        startDate.setDate(endDate.getDate() - 90)
        break
      case '1y':
        startDate.setFullYear(endDate.getFullYear() - 1)
        break
      case 'all':
        startDate.setFullYear(endDate.getFullYear() - 5) // 5 years back as default
        break
      default:
        startDate.setDate(endDate.getDate() - 30)
    }

    let data: Record<string, unknown>[] = []
    let filename = ''

    if (type === 'borrowing') {
      if (exportType === 'summary') {
        // Summary borrowing data
        const reservations = await prisma.reservation.groupBy({
          by: ['status'],
          where: {
            createdAt: {
              gte: startDate,
              lte: endDate,
            }
          },
          _count: {
            id: true
          }
        })

        data = reservations.map(r => ({
          Status: r.status,
          Count: r._count.id,
          Percentage: '0.00' // Will be calculated below
        }))

        const total = data.reduce((sum, item) => sum + (item.Count as number), 0)
        data.forEach(item => {
          item.Percentage = total > 0 ? (((item.Count as number) / total) * 100).toFixed(2) : '0.00'
        })

        filename = `borrowing-summary-${timeframe}-${new Date().toISOString().split('T')[0]}`
      } else {
        // Detailed borrowing data
        const reservations = await prisma.reservation.findMany({
          where: {
            createdAt: {
              gte: startDate,
              lte: endDate,
            }
          },
          include: {
            user: {
              select: {
                name: true,
                email: true,
                trustScore: true
              }
            },
            item: {
              select: {
                name: true,
                category: true,
                serialNumber: true,
                condition: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        })

        data = reservations.map(r => ({
          'Reservation ID': r.id,
          'User Name': r.user.name || 'Unknown',
          'User Email': r.user.email,
          'User Trust Score': r.user.trustScore,
          'Item Name': r.item.name,
          'Item Category': r.item.category,
          'Item Serial': r.item.serialNumber || 'N/A',
          'Item Condition': r.item.condition,
          'Status': r.status,
          'Start Date': r.startDate.toISOString().split('T')[0],
          'End Date': r.endDate.toISOString().split('T')[0],
          'Actual Start': r.actualStartDate?.toISOString().split('T')[0] || 'N/A',
          'Actual End': r.actualEndDate?.toISOString().split('T')[0] || 'N/A',
          'Purpose': r.purpose || 'N/A',
          'Pickup Confirmed': r.pickupConfirmed ? 'Yes' : 'No',
          'Created At': r.createdAt.toISOString(),
          'Updated At': r.updatedAt.toISOString()
        }))

        filename = `borrowing-detailed-${timeframe}-${new Date().toISOString().split('T')[0]}`
      }
    } else {
      // Return analytics
      if (exportType === 'summary') {
        // Summary return data
        const returns = await prisma.return.groupBy({
          by: ['status'],
          where: {
            returnDate: {
              gte: startDate,
              lte: endDate,
            }
          },
          _count: {
            id: true
          }
        })

        data = returns.map(r => ({
          Status: r.status,
          Count: r._count.id,
          Percentage: '0.00' // Will be calculated below
        }))

        const total = data.reduce((sum, item) => sum + (item.Count as number), 0)
        data.forEach(item => {
          item.Percentage = total > 0 ? (((item.Count as number) / total) * 100).toFixed(2) : '0.00'
        })

        filename = `return-summary-${timeframe}-${new Date().toISOString().split('T')[0]}`
      } else if (exportType === 'damage_reports') {
        // Damage reports
        const damageReports = await prisma.damageReport.findMany({
          where: {
            createdAt: {
              gte: startDate,
              lte: endDate,
            }
          },
          include: {
            return: {
              include: {
                item: {
                  select: {
                    name: true,
                    category: true,
                    serialNumber: true
                  }
                },
                user: {
                  select: {
                    name: true,
                    email: true
                  }
                }
              }
            },
            reportedByUser: {
              select: {
                name: true,
                email: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        })

        data = damageReports.map(dr => ({
          'Report ID': dr.id,
          'Item Name': dr.return.item.name,
          'Item Category': dr.return.item.category,
          'Item Serial': dr.return.item.serialNumber || 'N/A',
          'User Name': dr.return.user.name || 'Unknown',
          'User Email': dr.return.user.email,
          'Reported By': dr.reportedByUser.name || 'Unknown',
          'Damage Type': dr.damageType,
          'Severity': dr.severity,
          'Description': dr.description,
          'Is Repairable': dr.isRepairable ? 'Yes' : 'No',
          'Affects Usability': dr.affectsUsability ? 'Yes' : 'No',
          'Estimated Repair Cost': dr.estimatedRepairCost || 0,
          'Actual Repair Cost': dr.repairCost || 0,
          'Penalty Amount': dr.penaltyAmount || 0,
          'Status': dr.status,
          'Incident Date': dr.incidentDate.toISOString().split('T')[0],
          'Resolution Date': dr.resolutionDate?.toISOString().split('T')[0] || 'N/A',
          'Created At': dr.createdAt.toISOString(),
          'Updated At': dr.updatedAt.toISOString()
        }))

        filename = `damage-reports-${timeframe}-${new Date().toISOString().split('T')[0]}`
      } else {
        // Detailed return data
        const returns = await prisma.return.findMany({
          where: {
            returnDate: {
              gte: startDate,
              lte: endDate,
            }
          },
          include: {
            user: {
              select: {
                name: true,
                email: true,
                trustScore: true
              }
            },
            item: {
              select: {
                name: true,
                category: true,
                serialNumber: true
              }
            },
            reservation: {
              select: {
                startDate: true,
                endDate: true,
                actualStartDate: true
              }
            }
          },
          orderBy: { returnDate: 'desc' }
        })

        data = returns.map(r => {
          const isOverdue = new Date(r.returnDate) > new Date(r.reservation.endDate)
          const borrowDuration = r.reservation.actualStartDate 
            ? Math.ceil((new Date(r.returnDate).getTime() - new Date(r.reservation.actualStartDate).getTime()) / (1000 * 60 * 60 * 24))
            : 0

          return {
            'Return ID': r.id,
            'User Name': r.user.name || 'Unknown',
            'User Email': r.user.email,
            'User Trust Score': r.user.trustScore,
            'Item Name': r.item.name,
            'Item Category': r.item.category,
            'Item Serial': r.item.serialNumber || 'N/A',
            'Condition on Return': r.conditionOnReturn,
            'Status': r.status,
            'Return Date': r.returnDate.toISOString().split('T')[0],
            'Expected Return': r.reservation.endDate.toISOString().split('T')[0],
            'Is Overdue': isOverdue ? 'Yes' : 'No',
            'Borrow Duration (Days)': borrowDuration,
            'Penalty Applied': r.penaltyApplied ? 'Yes' : 'No',
            'Penalty Amount': r.penaltyAmount || 0,
            'Penalty Reason': r.penaltyReason || 'N/A',
            'Damage Report': r.damageReport || 'N/A',
            'Created At': r.createdAt.toISOString(),
            'Updated At': r.updatedAt.toISOString()
          }
        })

        filename = `return-detailed-${timeframe}-${new Date().toISOString().split('T')[0]}`
      }
    }

    // Generate file content based on format
    if (format === 'csv') {
      if (data.length === 0) {
        return NextResponse.json({ error: 'No data available for export' }, { status: 404 })
      }

      const headers = Object.keys(data[0])
      const csvContent = [
        headers.join(','),
        ...data.map(row => 
          headers.map(header => {
            const value = row[header]
            // Escape commas and quotes in CSV
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
              return `"${value.replace(/"/g, '""')}"`
            }
            return value
          }).join(',')
        )
      ].join('\n')

      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${filename}.csv"`
        }
      })
    } else {
      // JSON format
      const jsonData = {
        metadata: {
          exportType,
          type,
          timeframe,
          generatedAt: new Date().toISOString(),
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          recordCount: data.length
        },
        data
      }

      return new NextResponse(JSON.stringify(jsonData, null, 2), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${filename}.json"`
        }
      })
    }
  } catch (error) {
    console.error('Error exporting analytics data:', error)
    return NextResponse.json(
      { error: 'Failed to export analytics data' },
      { status: 500 }
    )
  }
}