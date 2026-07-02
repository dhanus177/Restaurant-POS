'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/shared/header'
import { usePOSStore } from '@/lib/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { PaymentModal } from '@/components/pos/payment-modal'
import { generateBillCode } from '@/lib/print'
import type { Order } from '@/lib/types'
import { ScanBarcode, Search, CreditCard, ReceiptText, ShoppingBag, Check } from 'lucide-react'
import { toast } from 'sonner'

export default function PayPage() {
  const router = useRouter()
  const { currentUser, orders, settings, updateOrderStatus, updateOrderPayment, updateTableStatus } = usePOSStore()
  const [mounted, setMounted] = useState(false)
  const [query, setQuery] = useState('')
  const [scanCode, setScanCode] = useState('')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const canReverseBills = currentUser?.role === 'admin' || currentUser?.role === 'super-admin'

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted && !currentUser) {
      router.push('/')
      return
    }

    if (mounted && currentUser && !['admin', 'super-admin', 'pay-counter'].includes(currentUser.role)) {
      router.push('/pos')
    }
  }, [currentUser, mounted, router])

  const unpaidOrders = useMemo(
    () => orders.filter((o) => o.paymentStatus === 'pending').sort((a, b) => b.orderNumber - a.orderNumber),
    [orders]
  )

  const paidOrders = useMemo(
    () => orders.filter((o) => o.paymentStatus === 'paid').sort((a, b) => b.orderNumber - a.orderNumber).slice(0, 12),
    [orders]
  )

  const filtered = useMemo(() => {
    const q = (scanCode || query).trim().toLowerCase()
    if (!q) return unpaidOrders

    return unpaidOrders.filter((o) => {
      const billCode = generateBillCode(o.orderNumber, o.createdAt).toLowerCase()
      return (
        String(o.orderNumber).includes(q) ||
        (o.tableName || '').toLowerCase().includes(q) ||
        billCode.includes(q)
      )
    })
  }, [query, scanCode, unpaidOrders])

  const handleScanLookup = (value: string) => {
    const normalized = value.trim()
    setScanCode(normalized)
    const match = unpaidOrders.find((o) => generateBillCode(o.orderNumber, o.createdAt).toLowerCase() === normalized.toLowerCase())
    if (match) {
      setSelectedOrder(match)
    }
  }

  const handleVoid = (order: Order) => {
    if (!canReverseBills) {
      toast.error('Only admin and super-admin can void bills')
      return
    }
    if (!confirm(`Void order #${order.orderNumber}?`)) return
    updateOrderStatus(order.id, 'cancelled')
    if (order.tableId) {
      updateTableStatus(order.tableId, 'available', undefined)
    }
  }

  const handleRefund = (order: Order) => {
    if (!canReverseBills) {
      toast.error('Only admin and super-admin can refund bills')
      return
    }
    if (!confirm(`Refund order #${order.orderNumber}?`)) return
    updateOrderPayment(order.id, order.paymentMethod ?? 'cash', 'refunded')
    updateOrderStatus(order.id, 'cancelled')
    if (order.tableId) {
      updateTableStatus(order.tableId, 'available', undefined)
    }
  }

  const handleCompleteTakeawayOrder = (order: Order) => {
    if (!confirm(`Mark takeaway order #${order.orderNumber} as completed?`)) return
    updateOrderStatus(order.id, 'completed')
  }

  if (!mounted || !currentUser || !['admin', 'super-admin', 'pay-counter'].includes(currentUser.role)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh flex-col bg-gradient-to-b from-emerald-50 via-background to-background dark:from-slate-950 dark:via-background dark:to-background">
      <Header title="Cash Collection Counter" />

      <div className="mx-auto w-full max-w-6xl flex-1 overflow-y-auto p-3 sm:p-4 md:p-6">
        <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 shadow-sm dark:border-emerald-900/40 dark:bg-card/80">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">Pay counter</p>
              <h1 className="text-xl font-bold text-foreground sm:text-2xl">Search a bill and collect payment</h1>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="bg-emerald-100 text-emerald-900 hover:bg-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-200 dark:hover:bg-emerald-500/20">Pay</Badge>
              <Badge variant="outline">{filtered.length} pending</Badge>
            </div>
          </div>
        </div>

        <div className="mb-4 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <Card className="border-emerald-200 shadow-sm dark:border-emerald-900/40">
            <CardHeader className="bg-emerald-50/70 dark:bg-card/70">
              <CardTitle className="flex items-center gap-2">
                <ScanBarcode className="h-5 w-5 text-emerald-700 dark:text-emerald-300" />
                Scan or search bill
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-5">
              <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                <Input
                  placeholder="Scan barcode / type BILL-YYMMDD-0000"
                  value={scanCode}
                  onChange={(e) => handleScanLookup(e.target.value)}
                  className="h-12 font-mono"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                />
                <Button variant="secondary" size="lg" onClick={() => handleScanLookup(scanCode)} className="gap-2">
                  <Search className="h-4 w-4" />
                  Lookup
                </Button>
              </div>
              <Input
                placeholder="Search by order #, table name, or bill code"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-12"
              />
            </CardContent>
          </Card>

          <Card className="border-emerald-200 shadow-sm dark:border-emerald-900/40">
            <CardHeader className="bg-emerald-50/70 dark:bg-card/70">
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-emerald-700 dark:text-emerald-300" />
                Pay counter status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-5">
              <div className="flex items-center justify-between rounded-lg bg-emerald-50 p-3 dark:bg-muted/30">
                <span className="text-sm text-muted-foreground">Pending bills</span>
                <span className="text-2xl font-black text-foreground">{filtered.length}</span>
              </div>
              <div className="rounded-lg bg-background p-3 text-sm text-muted-foreground">
                Use the scanner input for quick bill lookup, or search manually when needed.
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold">Pending Bills</h2>
            <p className="text-sm text-muted-foreground">Collect payment by bill number, table, or bill code.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={() => router.push('/takeaway')} className="w-full gap-2 sm:w-auto">
              <ShoppingBag className="h-4 w-4" />
              Takeaway Counter
            </Button>
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => router.push('/billing')}>Go to Billing</Button>
          </div>
        </div>

        {filtered.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              No pending bills found.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((order) => {
              const billCode = generateBillCode(order.orderNumber, order.createdAt)
              return (
                <Card key={order.id} className="border-emerald-200 shadow-sm dark:border-emerald-900/40">
                  <CardHeader className="bg-emerald-50/70 pb-2 dark:bg-card/70">
                    <CardTitle className="flex items-center justify-between text-lg">
                      <span>#{order.orderNumber}</span>
                      <Badge variant="secondary">Pending</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 p-5">
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>{order.tableName || 'Takeaway'}</span>
                      <span className="font-mono text-xs">{billCode}</span>
                    </div>
                    {order.customerName && (
                      <div className="text-sm text-muted-foreground">
                        Customer: {order.customerName}{order.customerPhone ? ` • ${order.customerPhone}` : ''}
                      </div>
                    )}
                    <div className="rounded-xl bg-emerald-50 p-4 dark:bg-muted/30">
                      <p className="text-xs uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">Amount due</p>
                      <div className="mt-1 text-3xl font-black text-foreground">{settings.currencySymbol}{order.total.toFixed(2)}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Button className="h-12 w-full" size="lg" onClick={() => setSelectedOrder(order)}>
                        Collect
                      </Button>
                      {canReverseBills ? (
                        <Button className="h-12 w-full" variant="destructive" size="lg" onClick={() => handleVoid(order)}>
                          Void
                        </Button>
                      ) : (
                        <Button className="h-12 w-full" variant="destructive" size="lg" disabled title="Only admin and super-admin can void bills">
                          Void
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-3">Recent Paid Bills (Refund)</h3>
          {paidOrders.length === 0 ? (
            <Card>
              <CardContent className="py-6 text-sm text-muted-foreground">No paid bills yet.</CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {paidOrders.map((order) => (
                <Card key={`paid-${order.id}`}>
                  <CardContent className="p-4 flex items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold">#{order.orderNumber}</div>
                      <div className="text-sm text-muted-foreground">{order.tableName || 'Takeaway'} • {settings.currencySymbol}{order.total.toFixed(2)}</div>
                      {order.customerName && (
                        <div className="text-xs text-muted-foreground">Customer: {order.customerName}</div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {!order.tableId && order.status !== 'completed' && order.status !== 'cancelled' && (
                        <Button
                          variant="secondary"
                          className="gap-2"
                          onClick={() => handleCompleteTakeawayOrder(order)}
                        >
                          <Check className="h-4 w-4" />
                          Complete Order
                        </Button>
                      )}
                      {canReverseBills ? (
                        <Button variant="destructive" onClick={() => handleRefund(order)}>Refund</Button>
                      ) : (
                        <Button variant="destructive" disabled title="Only admin and super-admin can refund bills">Refund</Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      <PaymentModal
        open={Boolean(selectedOrder)}
        onClose={() => setSelectedOrder(null)}
        onComplete={() => setSelectedOrder(null)}
        order={selectedOrder}
      />
    </div>
  )
}
