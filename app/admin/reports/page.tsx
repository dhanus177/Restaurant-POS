'use client'

import { useMemo, useState } from 'react'
import { usePOSStore } from '@/lib/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
import { DollarSign, ShoppingCart, TrendingUp, CreditCard, Banknote, Download, FileSpreadsheet, FileText } from 'lucide-react'

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

  const rangeLabel = dateRange === 'today' ? 'today' : dateRange === '7days' ? 'last-7-days' : 'last-30-days'

  const escapeCsv = (value: unknown) => {
    const text = String(value ?? '')
    if (text.includes(',') || text.includes('"') || text.includes('\n')) {
      return `"${text.replace(/"/g, '""')}"`
    }
    return text
  }

  const downloadFile = (content: string, mimeType: string, filename: string) => {
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = filename
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
  }

  const sanitizeHtml = (value: unknown) =>
    String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')

  const handleExportCsv = () => {
    const generatedAt = new Date().toISOString()
    const orderRows = filteredOrders
      .map((order) => {
        const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0)
        const itemSummary = order.items
          .map((item) => `${item.quantity}x ${item.name}`)
          .join(' | ')

        return [
          order.orderNumber,
          order.paymentStatus,
          order.paymentMethod || 'pending',
          order.tableName || 'Takeaway',
          order.status,
          itemCount,
          order.subtotal.toFixed(2),
          order.tax.toFixed(2),
          order.total.toFixed(2),
          new Date(order.createdAt).toISOString(),
          itemSummary,
        ]
          .map(escapeCsv)
          .join(',')
      })

    const csvLines = [
      'Report Summary',
      `Generated At,${escapeCsv(generatedAt)}`,
      `Range,${escapeCsv(rangeLabel)}`,
      `Total Sales,${totals.totalSales.toFixed(2)}`,
      `Orders (Paid),${totals.orderCount}`,
      `Average Ticket,${totals.avgTicket.toFixed(2)}`,
      `Tax Collected,${totals.totalTax.toFixed(2)}`,
      `Cash Sales,${totals.cashSales.toFixed(2)}`,
      `Card Sales,${totals.cardSales.toFixed(2)}`,
      '',
      'Orders',
      [
        'Order #',
        'Payment Status',
        'Payment Method',
        'Table',
        'Order Status',
        'Items Count',
        'Subtotal',
        'Tax',
        'Total',
        'Created At',
        'Items',
      ].join(','),
      ...orderRows,
    ]

    downloadFile(csvLines.join('\n'), 'text/csv;charset=utf-8', `reports-${rangeLabel}-${new Date().toISOString().slice(0, 10)}.csv`)
  }

  const handleExportExcel = () => {
    const generatedAt = new Date().toISOString()

    const summaryRows = [
      ['Generated At', generatedAt],
      ['Range', rangeLabel],
      ['Total Sales', totals.totalSales.toFixed(2)],
      ['Orders (Paid)', String(totals.orderCount)],
      ['Average Ticket', totals.avgTicket.toFixed(2)],
      ['Tax Collected', totals.totalTax.toFixed(2)],
      ['Cash Sales', totals.cashSales.toFixed(2)],
      ['Card Sales', totals.cardSales.toFixed(2)],
    ]
      .map(([label, value]) => `<tr><td><b>${sanitizeHtml(label)}</b></td><td>${sanitizeHtml(value)}</td></tr>`)
      .join('')

    const orderRows = filteredOrders
      .map((order) => {
        const items = order.items.map((item) => `${item.quantity}x ${item.name}`).join(' | ')
        return `<tr>
          <td>${sanitizeHtml(order.orderNumber)}</td>
          <td>${sanitizeHtml(order.paymentStatus)}</td>
          <td>${sanitizeHtml(order.paymentMethod || 'pending')}</td>
          <td>${sanitizeHtml(order.tableName || 'Takeaway')}</td>
          <td>${sanitizeHtml(order.status)}</td>
          <td>${sanitizeHtml(order.items.reduce((sum, item) => sum + item.quantity, 0))}</td>
          <td>${sanitizeHtml(order.subtotal.toFixed(2))}</td>
          <td>${sanitizeHtml(order.tax.toFixed(2))}</td>
          <td>${sanitizeHtml(order.total.toFixed(2))}</td>
          <td>${sanitizeHtml(new Date(order.createdAt).toISOString())}</td>
          <td>${sanitizeHtml(items)}</td>
        </tr>`
      })
      .join('')

    const excelHtml = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      table { border-collapse: collapse; width: 100%; }
      th, td { border: 1px solid #cfcfcf; padding: 6px; font-size: 12px; }
      th { background: #f3f3f3; text-align: left; }
      h2 { margin: 16px 0 8px; }
    </style>
  </head>
  <body>
    <h2>Report Summary</h2>
    <table>${summaryRows}</table>
    <h2>Orders</h2>
    <table>
      <thead>
        <tr>
          <th>Order #</th><th>Payment Status</th><th>Payment Method</th><th>Table</th><th>Order Status</th>
          <th>Items Count</th><th>Subtotal</th><th>Tax</th><th>Total</th><th>Created At</th><th>Items</th>
        </tr>
      </thead>
      <tbody>${orderRows}</tbody>
    </table>
  </body>
</html>`

    downloadFile(excelHtml, 'application/vnd.ms-excel;charset=utf-8', `reports-${rangeLabel}-${new Date().toISOString().slice(0, 10)}.xls`)
  }

  const handleExportPdf = () => {
    const generatedAt = new Date().toISOString()

    const rawLines = [
      'Restaurant POS Report',
      `Generated: ${generatedAt}`,
      `Range: ${rangeLabel}`,
      `Total Sales: ${settings.currencySymbol}${totals.totalSales.toFixed(2)}`,
      `Orders: ${totals.orderCount}`,
      `Average Ticket: ${settings.currencySymbol}${totals.avgTicket.toFixed(2)}`,
      '',
      'Order # | Method | Table | Status | Items | Total',
      ...filteredOrders.map(
        (order) =>
          `${order.orderNumber} | ${order.paymentMethod || 'pending'} | ${order.tableName || 'Takeaway'} | ${order.paymentStatus} | ${order.items.reduce((sum, item) => sum + item.quantity, 0)} | ${settings.currencySymbol}${order.total.toFixed(2)}`
      ),
    ]

    const wrapLine = (line: string, max = 95) => {
      const out: string[] = []
      let remaining = line
      while (remaining.length > max) {
        out.push(remaining.slice(0, max))
        remaining = remaining.slice(max)
      }
      out.push(remaining)
      return out
    }

    const lines = rawLines.flatMap((line) => wrapLine(line))
    const escapePdf = (text: string) => text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
    const contentStream = `BT\n/F1 10 Tf\n40 800 Td\n${lines
      .map((line, index) => `${index === 0 ? '' : 'T* '}(${escapePdf(line)}) Tj`)
      .join('\n')}\nET`

    const objects: string[] = []
    objects.push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n')
    objects.push('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n')
    objects.push('3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n')
    objects.push(`4 0 obj\n<< /Length ${contentStream.length} >>\nstream\n${contentStream}\nendstream\nendobj\n`)
    objects.push('5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n')

    let pdf = '%PDF-1.4\n'
    const offsets = [0]
    objects.forEach((obj) => {
      offsets.push(pdf.length)
      pdf += obj
    })

    const xrefStart = pdf.length
    pdf += `xref\n0 ${objects.length + 1}\n`
    pdf += '0000000000 65535 f \n'
    for (let i = 1; i <= objects.length; i++) {
      pdf += `${offsets[i].toString().padStart(10, '0')} 00000 n \n`
    }
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`

    const pdfBlob = new Blob([new TextEncoder().encode(pdf)], { type: 'application/pdf' })
    const url = URL.createObjectURL(pdfBlob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `reports-${rangeLabel}-${new Date().toISOString().slice(0, 10)}.pdf`
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6 p-3 sm:p-6">
      <div className="flex flex-col gap-3 sm:gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reports & Analytics</h1>
          <p className="text-muted-foreground">View sales reports and analytics</p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="7days">Last 7 Days</SelectItem>
              <SelectItem value="30days">Last 30 Days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" className="w-full gap-2 sm:w-auto" onClick={handleExportCsv}>
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
          <Button variant="outline" className="w-full gap-2 sm:w-auto" onClick={() => void handleExportExcel()}>
            <FileSpreadsheet className="h-4 w-4" />
            Export Excel
          </Button>
          <Button variant="outline" className="w-full gap-2 sm:w-auto" onClick={() => void handleExportPdf()}>
            <FileText className="h-4 w-4" />
            Export PDF
          </Button>
        </div>
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
        <TabsList className="w-full justify-start overflow-x-auto whitespace-nowrap">
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
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
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
