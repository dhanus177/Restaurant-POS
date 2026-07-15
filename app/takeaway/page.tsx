'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { hasEffectiveRole, resolveEffectiveRole } from '@/lib/roles'
import { Header } from '@/components/shared/header'
import { usePOSStore } from '@/lib/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { generateBillCode, printTakeawayDocket } from '@/lib/print'
import { Check, Search, ShoppingBag, ReceiptText, ScanBarcode } from 'lucide-react'

export default function TakeawayPage() {
  const router = useRouter()
  const { currentUser, orders, settings, updateOrderStatus } = usePOSStore()
  const [mounted, setMounted] = useState(false)
  const [query, setQuery] = useState('')
  const [scanCode, setScanCode] = useState('')
  const [selectedPendingBillId, setSelectedPendingBillId] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted && !currentUser) {
      router.push('/')
      return
    }

    if (mounted && currentUser && !hasEffectiveRole(currentUser.role, ['admin', 'super-admin', 'takeaway'], settings)) {
      router.push('/pos')
    }
  }, [currentUser, mounted, router, settings])

  useEffect(() => {
    if (!mounted || !currentUser) return
    if (settings.takeawayPageEnabled === false && resolveEffectiveRole(currentUser.role, settings) !== 'super-admin') {
      router.push('/pos')
    }
  }, [currentUser, mounted, router, settings.takeawayPageEnabled])

  const pendingTakeawayOrders = useMemo(
    () =>
      orders
        .filter((o) => o.paymentStatus === 'pending' && !o.tableId)
        .sort((a, b) => b.orderNumber - a.orderNumber),
    [orders]
  )

  const readyToCompleteTakeawayOrders = useMemo(
    () =>
      orders
        .filter(
          (o) =>
            !o.tableId &&
            o.paymentStatus === 'paid' &&
            o.status !== 'completed' &&
            o.status !== 'cancelled'
        )
        .sort((a, b) => b.orderNumber - a.orderNumber),
    [orders]
  )

  const filtered = useMemo(() => {
    const q = (scanCode || query).trim().toLowerCase()
    if (!q) return pendingTakeawayOrders

    return pendingTakeawayOrders.filter((o) => {
      const billCode = generateBillCode(o.orderNumber, o.createdAt).toLowerCase()
      return String(o.orderNumber).includes(q) || billCode.includes(q)
    })
  }, [query, scanCode, pendingTakeawayOrders])

  const handleScanLookup = (value: string) => {
    const normalized = value.trim()
    setScanCode(normalized)
  }

  const handleCompleteTakeaway = (orderId: string, orderNumber: number) => {
    if (!confirm(`Mark takeaway order #${orderNumber} as completed?`)) return
    updateOrderStatus(orderId, 'completed')
  }

  const handleSelectTakeawayBill = (orderId: string) => {
    const selectedOrder = pendingTakeawayOrders.find((order) => order.id === orderId)
    if (!selectedOrder) return

    setSelectedPendingBillId(orderId)
    printTakeawayDocket(selectedOrder, settings)
  }

  if (!mounted || !currentUser || !hasEffectiveRole(currentUser.role, ['admin', 'super-admin', 'takeaway'], settings)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  if (settings.takeawayPageEnabled === false && resolveEffectiveRole(currentUser.role, settings) !== 'super-admin') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-foreground">Takeaway page is locked</h2>
          <p className="mt-1 text-sm text-muted-foreground">Please contact your super admin to enable access.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh flex-col bg-gradient-to-b from-orange-50 via-background to-background dark:from-slate-950 dark:via-background dark:to-background">
      <Header title="Takeaway Counter" />

      <div className="mx-auto w-full max-w-6xl flex-1 overflow-y-auto p-3 sm:p-4 md:p-6">
        <div className="mb-4 rounded-2xl border border-orange-200 bg-orange-50/80 p-4 shadow-sm dark:border-orange-900/40 dark:bg-card/80">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-700 dark:text-orange-300">Takeaway</p>
              <h1 className="text-xl font-bold text-foreground sm:text-2xl">Manage and close takeaway bills quickly</h1>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="bg-orange-100 text-orange-900 hover:bg-orange-100 dark:bg-orange-500/15 dark:text-orange-200 dark:hover:bg-orange-500/20">Takeaway</Badge>
              <Badge variant="outline">{filtered.length} pending</Badge>
            </div>
          </div>
        </div>

        <div className="mb-4 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <Card className="border-orange-200 shadow-sm dark:border-orange-900/40">
            <CardHeader className="bg-orange-50/70 dark:bg-card/70">
              <CardTitle className="flex items-center gap-2">
                <ScanBarcode className="h-5 w-5 text-orange-700 dark:text-orange-300" />
                Scan or search takeaway bill
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
                placeholder="Search by order # or bill code"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-12"
              />
            </CardContent>
          </Card>

          <Card className="border-orange-200 shadow-sm dark:border-orange-900/40">
            <CardHeader className="bg-orange-50/70 dark:bg-card/70">
              <CardTitle className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-orange-700 dark:text-orange-300" />
                Takeaway status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-5">
              <div className="flex items-center justify-between rounded-lg bg-orange-50 p-3 dark:bg-muted/30">
                <span className="text-sm text-muted-foreground">Pending takeaway bills</span>
                <span className="text-2xl font-black text-foreground">{filtered.length}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-background p-3 border">
                <span className="text-sm text-muted-foreground">Ready to complete</span>
                <span className="text-2xl font-black text-foreground">{readyToCompleteTakeawayOrders.length}</span>
              </div>
              <div className="rounded-lg bg-background p-3 text-sm text-muted-foreground">
                Review takeaway pickup queue and hand over prepared orders.
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold">Pending Takeaway Bills</h2>
            <p className="text-sm text-muted-foreground">Track takeaway bills by order number or bill code.</p>
          </div>
          <Button variant="outline" className="w-full sm:w-auto" onClick={() => router.push('/pay')}>Go to Pay Counter</Button>
        </div>

        {filtered.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              No pending takeaway bills found.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((order) => {
              const billCode = generateBillCode(order.orderNumber, order.createdAt)
              return (
                <Card
                  key={order.id}
                  className={`cursor-pointer border-orange-200 shadow-sm transition hover:shadow-md dark:border-orange-900/40 ${selectedPendingBillId === order.id ? 'ring-2 ring-orange-500' : ''}`}
                  onClick={() => handleSelectTakeawayBill(order.id)}
                >
                  <CardHeader className="bg-orange-50/70 pb-2 dark:bg-card/70">
                    <CardTitle className="flex items-center justify-between text-lg">
                      <span>#{order.orderNumber}</span>
                      <Badge variant="secondary">Pending</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 p-5">
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-1"><ReceiptText className="h-3.5 w-3.5" /> Takeaway</span>
                      <span className="font-mono text-xs">{billCode}</span>
                    </div>
                    <div className="rounded-xl bg-orange-50 p-4 dark:bg-muted/30">
                      <p className="text-xs uppercase tracking-[0.2em] text-orange-700 dark:text-orange-300">Amount due</p>
                      <div className="mt-1 text-3xl font-black text-foreground">{settings.currencySymbol}{order.total.toFixed(2)}</div>
                    </div>
                    <div className="rounded-lg border bg-background px-3 py-2 text-sm text-muted-foreground">
                      Payment handled at pay counter.
                    </div>
                    <Button
                      className="h-10 w-full"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleSelectTakeawayBill(order.id)
                      }}
                    >
                      Select Bill & Print Docket
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        <div className="mt-8 space-y-3">
          <div>
            <h2 className="text-xl font-semibold">Paid Takeaway Orders (Complete)</h2>
            <p className="text-sm text-muted-foreground">Finalize takeaway orders after handover to customer.</p>
          </div>

          {readyToCompleteTakeawayOrders.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No paid takeaway orders waiting to complete.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {readyToCompleteTakeawayOrders.map((order) => (
                <Card key={`complete-${order.id}`} className="border-orange-200 shadow-sm dark:border-orange-900/40">
                  <CardHeader className="bg-orange-50/70 pb-2 dark:bg-card/70">
                    <CardTitle className="flex items-center justify-between text-lg">
                      <span>#{order.orderNumber}</span>
                      <Badge variant="outline" className="capitalize">{order.status}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 p-5">
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-1"><ReceiptText className="h-3.5 w-3.5" /> Takeaway</span>
                      <span className="font-mono text-xs">{generateBillCode(order.orderNumber, order.createdAt)}</span>
                    </div>
                    <div className="rounded-xl bg-orange-50 p-4 dark:bg-muted/30">
                      <p className="text-xs uppercase tracking-[0.2em] text-orange-700 dark:text-orange-300">Paid total</p>
                      <div className="mt-1 text-3xl font-black text-foreground">{settings.currencySymbol}{order.total.toFixed(2)}</div>
                    </div>
                    <Button
                      className="h-12 w-full gap-2"
                      size="lg"
                      onClick={() => handleCompleteTakeaway(order.id, order.orderNumber)}
                    >
                      <Check className="h-4 w-4" />
                      Complete Order
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
