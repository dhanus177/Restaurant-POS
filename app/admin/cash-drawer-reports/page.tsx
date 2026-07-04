'use client'

import { useEffect, useMemo, useState } from 'react'
import { apiFetch } from '@/lib/api'
import { usePOSStore } from '@/lib/store'
import { Header } from '@/components/shared/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AlertCircle, CheckCircle2, DollarSign, Download, FileSpreadsheet, FileText, ListFilter, ReceiptText } from 'lucide-react'
import { toast } from 'sonner'
import type { CashDrawerReport } from '@/lib/types'

type DateRange = 'all' | '7days' | '30days'

export default function CashDrawerReportsPage() {
  const { currentUser, users, settings, loadFromDB } = usePOSStore()
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [reports, setReports] = useState<CashDrawerReport[]>([])
  const [dateRange, setDateRange] = useState<DateRange>('30days')
  const [search, setSearch] = useState('')

  useEffect(() => {
    setMounted(true)
    void loadFromDB()
  }, [loadFromDB])

  useEffect(() => {
    if (!mounted || !currentUser) return
    void loadReports()
  }, [mounted, currentUser])

  async function loadReports() {
    try {
      setLoading(true)
      const res = await apiFetch('/api/cash-drawer/reports')
      if (!res.ok) throw new Error(`Failed to fetch reports: ${res.status}`)
      const data = await res.json()
      setReports(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Failed to load cash drawer reports:', error)
      toast.error('Failed to load cash drawer reports')
    } finally {
      setLoading(false)
    }
  }

  const filteredReports = useMemo(() => {
    const query = search.trim().toLowerCase()
    const now = new Date()
    const startDate =
      dateRange === 'all'
        ? null
        : new Date(now.getTime() - (dateRange === '7days' ? 7 : 30) * 24 * 60 * 60 * 1000)

    return reports.filter((report) => {
      const matchesDate = !startDate || new Date(report.closedAt) >= startDate
      const closedByName = users.find((user) => user.id === report.closedBy)?.name ?? report.closedBy
      const haystack = `${report.notes ?? ''} ${closedByName} ${report.openingBalance} ${report.expectedBalance} ${report.countedCash} ${report.variance}`.toLowerCase()
      const matchesQuery = !query || haystack.includes(query)
      return matchesDate && matchesQuery
    })
  }, [dateRange, reports, search, users])

  const stats = useMemo(() => {
    const totalReports = filteredReports.length
    const totalVariance = filteredReports.reduce((sum, report) => sum + report.variance, 0)
    const overages = filteredReports.filter((report) => report.variance > 0).length
    const shortages = filteredReports.filter((report) => report.variance < 0).length
    const latest = filteredReports[0] ?? null

    return { totalReports, totalVariance, overages, shortages, latest }
  }, [filteredReports])

  const escapeCsv = (value: unknown) => {
    const text = String(value ?? '')
    if (text.includes(',') || text.includes('"') || text.includes('\n')) {
      return `"${text.replace(/"/g, '""')}"`
    }
    return text
  }

  const sanitizeHtml = (value: unknown) =>
    String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')

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

  const getClosedByName = (closedBy: string) => users.find((user) => user.id === closedBy)?.name ?? closedBy

  const handleExportCsv = () => {
    const generatedAt = new Date().toISOString()
    const rows = filteredReports.map((report) => [
      new Date(report.closedAt).toISOString(),
      getClosedByName(report.closedBy),
      report.openingBalance.toFixed(2),
      report.expectedBalance.toFixed(2),
      report.countedCash.toFixed(2),
      report.variance.toFixed(2),
      report.notes || '',
    ])

    const lines = [
      'Cash Drawer Report Summary',
      `Generated At,${escapeCsv(generatedAt)}`,
      `Reports Count,${escapeCsv(filteredReports.length)}`,
      `Total Variance,${escapeCsv(stats.totalVariance.toFixed(2))}`,
      '',
      'Reports',
      ['Closed At', 'Closed By', 'Opening Balance', 'Expected Balance', 'Counted Cash', 'Variance', 'Notes'].join(','),
      ...rows.map((row) => row.map(escapeCsv).join(',')),
    ]

    downloadFile(lines.join('\n'), 'text/csv;charset=utf-8', `cash-drawer-reports-${new Date().toISOString().slice(0, 10)}.csv`)
  }

  const handleExportExcel = () => {
    const generatedAt = new Date().toISOString()
    const summaryRows = [
      ['Generated At', generatedAt],
      ['Reports Count', String(filteredReports.length)],
      ['Total Variance', stats.totalVariance.toFixed(2)],
      ['Overages', String(stats.overages)],
      ['Shortages', String(stats.shortages)],
    ]
      .map(([label, value]) => `<tr><td><b>${sanitizeHtml(label)}</b></td><td>${sanitizeHtml(value)}</td></tr>`)
      .join('')

    const reportRows = filteredReports
      .map((report) => `<tr>
        <td>${sanitizeHtml(new Date(report.closedAt).toISOString())}</td>
        <td>${sanitizeHtml(getClosedByName(report.closedBy))}</td>
        <td>${sanitizeHtml(report.openingBalance.toFixed(2))}</td>
        <td>${sanitizeHtml(report.expectedBalance.toFixed(2))}</td>
        <td>${sanitizeHtml(report.countedCash.toFixed(2))}</td>
        <td>${sanitizeHtml(report.variance.toFixed(2))}</td>
        <td>${sanitizeHtml(report.notes || '')}</td>
      </tr>`)
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
    <h2>Cash Drawer Report Summary</h2>
    <table>${summaryRows}</table>
    <h2>Reports</h2>
    <table>
      <thead>
        <tr>
          <th>Closed At</th><th>Closed By</th><th>Opening Balance</th><th>Expected Balance</th><th>Counted Cash</th><th>Variance</th><th>Notes</th>
        </tr>
      </thead>
      <tbody>${reportRows}</tbody>
    </table>
  </body>
</html>`

    downloadFile(excelHtml, 'application/vnd.ms-excel;charset=utf-8', `cash-drawer-reports-${new Date().toISOString().slice(0, 10)}.xls`)
  }

  const handleExportPdf = () => {
    const generatedAt = new Date().toISOString()
    const rawLines = [
      'Cash Drawer Reports',
      `Generated: ${generatedAt}`,
      `Reports: ${filteredReports.length}`,
      `Total Variance: ${settings.currencySymbol}${stats.totalVariance.toFixed(2)}`,
      '',
      'Closed At | Closed By | Opening | Expected | Counted | Variance',
      ...filteredReports.map(
        (report) =>
          `${new Date(report.closedAt).toLocaleString()} | ${getClosedByName(report.closedBy)} | ${settings.currencySymbol}${report.openingBalance.toFixed(2)} | ${settings.currencySymbol}${report.expectedBalance.toFixed(2)} | ${settings.currencySymbol}${report.countedCash.toFixed(2)} | ${settings.currencySymbol}${report.variance.toFixed(2)}`
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
    const escapePdf = (text: string) => text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\)')
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
    anchor.download = `cash-drawer-reports-${new Date().toISOString().slice(0, 10)}.pdf`
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
  }

  if (!mounted || !currentUser || !['admin', 'super-admin'].includes(currentUser.role)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <Header title="Admin Cash Drawer Reports" />

      <div className="mx-auto w-full max-w-7xl flex-1 overflow-y-auto p-3 sm:p-4 md:p-6">
        <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 shadow-sm dark:border-emerald-900/40 dark:bg-card/80">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">Cash drawer</p>
              <h1 className="text-xl font-bold text-foreground sm:text-2xl">Close-out reports and variance tracking</h1>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="bg-emerald-100 text-emerald-900 hover:bg-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-200 dark:hover:bg-emerald-500/20">
                Reports
              </Badge>
              <Badge variant="outline">{filteredReports.length} visible</Badge>
            </div>
          </div>
        </div>

        <div className="mb-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <ReceiptText className="h-4 w-4" />
                Total Reports
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.totalReports}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Total Variance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold ${stats.totalVariance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                {stats.totalVariance >= 0 ? '+' : '-'}{settings.currencySymbol}{Math.abs(stats.totalVariance).toFixed(2)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Overages / Shortages
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <p className="text-sm text-foreground">Overages: <span className="font-semibold text-emerald-600 dark:text-emerald-400">{stats.overages}</span></p>
              <p className="text-sm text-foreground">Shortages: <span className="font-semibold text-red-600 dark:text-red-400">{stats.shortages}</span></p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Latest Close-out
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats.latest ? (
                <div className="space-y-1 text-sm">
                  <p className="font-semibold text-foreground">{new Date(stats.latest.closedAt).toLocaleString()}</p>
                  <p className="text-muted-foreground">Variance: {stats.latest.variance >= 0 ? '+' : '-'}{settings.currencySymbol}{Math.abs(stats.latest.variance).toFixed(2)}</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No reports yet</p>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="mb-4">
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <ListFilter className="h-5 w-5" />
                Filters & Exports
              </CardTitle>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button variant="outline" className="gap-2" onClick={handleExportCsv}>
                  <Download className="h-4 w-4" />
                  CSV
                </Button>
                <Button variant="outline" className="gap-2" onClick={handleExportExcel}>
                  <FileSpreadsheet className="h-4 w-4" />
                  Excel
                </Button>
                <Button variant="outline" className="gap-2" onClick={handleExportPdf}>
                  <FileText className="h-4 w-4" />
                  PDF
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-[1fr_220px_140px]">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by notes, staff, or amounts"
            />
            <Select value={dateRange} onValueChange={(value) => setDateRange(value as DateRange)}>
              <SelectTrigger>
                <SelectValue placeholder="Date range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All time</SelectItem>
                <SelectItem value="7days">Last 7 days</SelectItem>
                <SelectItem value="30days">Last 30 days</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => { setSearch(''); setDateRange('30days') }}>
              Reset
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Close-out Reports</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-12 text-center text-muted-foreground">Loading reports...</div>
            ) : filteredReports.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">No cash drawer reports found.</div>
            ) : (
              <div className="overflow-x-auto">
                <Table className="min-w-[980px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Closed At</TableHead>
                      <TableHead>Closed By</TableHead>
                      <TableHead>Opening</TableHead>
                      <TableHead>Expected</TableHead>
                      <TableHead>Counted</TableHead>
                      <TableHead>Variance</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredReports.map((report) => {
                      const closedByName = users.find((user) => user.id === report.closedBy)?.name ?? report.closedBy
                      return (
                        <TableRow key={report.id}>
                          <TableCell className="whitespace-nowrap">{new Date(report.closedAt).toLocaleString()}</TableCell>
                          <TableCell>{closedByName}</TableCell>
                          <TableCell>{settings.currencySymbol}{report.openingBalance.toFixed(2)}</TableCell>
                          <TableCell>{settings.currencySymbol}{report.expectedBalance.toFixed(2)}</TableCell>
                          <TableCell>{settings.currencySymbol}{report.countedCash.toFixed(2)}</TableCell>
                          <TableCell>
                            <Badge variant={report.variance === 0 ? 'outline' : report.variance > 0 ? 'secondary' : 'destructive'}>
                              {report.variance >= 0 ? '+' : '-'}{settings.currencySymbol}{Math.abs(report.variance).toFixed(2)}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-[280px] truncate text-muted-foreground">{report.notes || '—'}</TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}