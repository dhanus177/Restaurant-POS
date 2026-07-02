'use client'

import { StatsCards } from '@/components/admin/stats-cards'
import { SalesChart } from '@/components/admin/sales-chart'
import { RecentOrders } from '@/components/admin/recent-orders'
import { TopItems } from '@/components/admin/top-items'
import { LowStockAlert } from '@/components/inventory/low-stock-alert'

export default function AdminDashboard() {
  return (
    <div className="flex flex-col h-full bg-background">
      <div className="border-b border-border bg-card px-4 py-4 sm:px-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Overview of your restaurant performance</p>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="space-y-6 p-4 sm:p-6">
          <StatsCards />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <SalesChart />
            <TopItems />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <RecentOrders />
            </div>
            <LowStockAlert />
          </div>
        </div>
      </div>
    </div>
  )
}
