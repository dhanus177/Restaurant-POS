'use client'

import { usePOSStore } from '@/lib/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DollarSign, ShoppingCart, TrendingUp, Users } from 'lucide-react'

export function StatsCards() {
  const { orders, getTodaySales, getTodayOrders, settings } = usePOSStore()

  const todaySales = getTodaySales()
  const todayOrders = getTodayOrders()
  const paidOrders = todayOrders.filter((o) => o.paymentStatus === 'paid')
  const avgTicket = paidOrders.length > 0 ? todaySales / paidOrders.length : 0

  // Calculate percentage changes (comparing to mock previous day)
  const previousDaySales = 850 // Mock data
  const salesChange = previousDaySales > 0 ? ((todaySales - previousDaySales) / previousDaySales) * 100 : 0

  const stats = [
    {
      title: "Today's Sales",
      value: `${settings.currencySymbol}${todaySales.toFixed(2)}`,
      change: salesChange,
      icon: DollarSign,
    },
    {
      title: 'Orders Today',
      value: todayOrders.length.toString(),
      subtitle: `${paidOrders.length} completed`,
      icon: ShoppingCart,
    },
    {
      title: 'Average Ticket',
      value: `${settings.currencySymbol}${avgTicket.toFixed(2)}`,
      icon: TrendingUp,
    },
    {
      title: 'Active Tables',
      value: '3',
      subtitle: 'of 10 tables',
      icon: Users,
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <Card key={stat.title} className="border-0 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {stat.title}
            </CardTitle>
            <stat.icon className="h-5 w-5 text-muted-foreground/60" />
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-2xl font-bold tracking-tight">{stat.value}</div>
            {stat.change !== undefined && (
              <p className={`text-xs font-medium ${stat.change >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                {stat.change >= 0 ? '↑' : '↓'} {Math.abs(stat.change).toFixed(1)}% vs yesterday
              </p>
            )}
            {stat.subtitle && (
              <p className="text-xs text-muted-foreground">{stat.subtitle}</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
