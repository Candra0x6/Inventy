import ReservationManagementTable from '@/components/admin/reservation-management-table'
import ReservationStatsOverview from '@/components/admin/reservation-stats-overview'
import React from 'react'

function ReservationsPage() {
  return (
    <div>   <ReservationStatsOverview />
                        <ReservationManagementTable /></div>
  )
}

export default ReservationsPage