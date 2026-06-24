'use client'

import { useMemo, useState } from 'react'
import { usePOSStore } from '@/lib/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import { DollarSign, ShoppingCart, TrendingUp, CreditCard, Banknote } from 'lucide-react'

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))']

export default function ReportsPage() {
  const { orders, categories, settings } = usePOSStore()
  const [dateRange, setDateRange] = useState('7days')

  // Filter orders by date range
  const filteredOrders = useMemo(() => {
    const now = new Date()
    const days = dateRange === '7days' ? 7 : dateRange === '30days' ? 30 : 1
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)

    return orders.filter((o) => new Date(o.createdAt) >= startDate)
  }, [orders, dateRange])

  // Calculate totals
  const totals = useMemo(() => {
    const paidOrders = filteredOrders.filter((o) => o.paymentStatus === 'paid')
    const totalSales = paidOrders.reduce((sum, o) => sum + o.total, 0)
    const totalTax = paidOrders.reduce((sum, o) => sum + o.tax, 0)
    const cashSales = paidOrders
      .filter((o) => o.paymentMethod === 'cash')
      .reduce((sum, o) => sum + o.total, 0)
    const cardSales = paidOrders
      .filter((o) => o.paymentMethod === 'card')
      .reduce((sum, o) => sum + o.total, 0)
    const avgTicket = paidOrders.length > 0 ? totalSales / paidOrders.length : 0

    return {
      totalSales,
      totalTax,
      cashSales,
      cardSales,
      orderCount: paidOrders.length,
      avgTicket,
    }
  }, [filteredOrders])

  // Sales by category
  const salesByCategory = useMemo(() => {
    const categoryTotals: Record<string, number> = {}

    filteredOrders.forEach((order) => {
      order.items.forEach((item) => {
        // Find the menu item's category
        const categoryId = categories.find((c) =>
          usePOSStore.getState().menuItems.find(
            (m) => m.id === item.menuItemId && m.categoryId === c.id
          )
        )?.id
        const categoryName = categories.find((c) => c.id === categoryId)?.name || 'Other'
        const itemTotal = (item.price + item.modifiers.reduce((s, m) => s + m.price, 0)) * item.quantity
        categoryTotals[categoryName] = (categoryTotals[categoryName] || 0) + itemTotal
      })
    })

    return Object.entries(categoryTotals).map(([name, value]) => ({ name, value }))
  }, [filteredOrders, categories])

  // Payment method breakdown
  const paymentBreakdown = useMemo(() => {
    return [
      { name: 'Cash', value: totals.cashSales },
      { name: 'Card', value: totals.cardSales },
    ].filter((p) => p.value > 0)
  }, [totals])

  // Daily sales for bar chart
  const dailySales = useMemo(() => {
    const days = dateRange === '7days' ? 7 : dateRange === '30days' ? 30 : 1
    const data = []

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      date.setHours(0, 0, 0, 0)

      const nextDate = new Date(date)
      nextDate.setDate(nextDate.getDate() + 1)

      const dayOrders = filteredOrders.filter((o) => {
        const orderDate = new Date(o.createdAt)
        return orderDate >= date && orderDate < nextDate && o.paymentStatus === 'paid'
      })

      data.push({
        date: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        sales: dayOrders.reduce((sum, o) => sum + o.total, 0),
        orders: dayOrders.length,
      })
    }

    return data
  }, [filteredOrders, dateRange])

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reports & Analytics</h1>
          <p className="text-muted-foreground">View sales reports and analytics</p>
        </div>
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="7days">Last 7 Days</SelectItem>
            <SelectItem value="30days">Last 30 Days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Total Sales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{settings.currencySymbol}{totals.totalSales.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totals.orderCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Avg Ticket
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{settings.currencySymbol}{totals.avgTicket.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Tax Collected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{settings.currencySymbol}{totals.totalTax.toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="sales">
        <TabsList>
          <TabsTrigger value="sales">Sales Trend</TabsTrigger>
          <TabsTrigger value="categories">By Category</TabsTrigger>
          <TabsTrigger value="payments">Payment Methods</TabsTrigger>
        </TabsList>

        <TabsContent value="sales">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Daily Sales</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailySales}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    />
                    <YAxis
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                      tickFormatter={(value) => `${settings.currencySymbol}${value}`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number) => [`${settings.currencySymbol}${value.toFixed(2)}`, 'Sales']}
                    />
                    <Bar dataKey="sales" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Sales by Category</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={salesByCategory}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={120}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    >
                      {salesByCategory.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => [`${settings.currencySymbol}${value.toFixed(2)}`, 'Sales']}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Payment Method Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-4 bg-secondary/50 rounded-lg">
                    <Banknote className="h-10 w-10 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">Cash</p>
                      <p className="text-2xl font-bold">{settings.currencySymbol}{totals.cashSales.toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 p-4 bg-secondary/50 rounded-lg">
                    <CreditCard className="h-10 w-10 text-chart-2" />
                    <div>
                      <p className="text-sm text-muted-foreground">Card</p>
                      <p className="text-2xl font-bold">{settings.currencySymbol}{totals.cardSales.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={paymentBreakdown}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={80}
                        dataKey="value"
                      >
                        {paymentBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => [`${settings.currencySymbol}${value.toFixed(2)}`]} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
