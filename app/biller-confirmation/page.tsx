'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/shared/header'
import { usePOSStore } from '@/lib/store'
import { hasEffectiveRole, resolveEffectiveRole } from '@/lib/roles'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { generateBillCode } from '@/lib/print'
import type { Order } from '@/lib/types'
import { CheckCircle2, ReceiptText, Users } from 'lucide-react'
import { toast } from 'sonner'

const WAITER_PENDING_BILLER_REVIEW = 'WAITER_PENDING_BILLER_REVIEW'
const BILLER_CONFIRMED = 'BILLER_CONFIRMED'

function normalizeQueueFlag(value?: string | null): string {
  return (value ?? '').trim().toUpperCase()
}

function isWaiterPendingForBiller(order: Order): boolean {
  const normalized = normalizeQueueFlag(order.paymentCollectedBy)
  return (
    order.paymentStatus === 'pending' &&
    (normalized === WAITER_PENDING_BILLER_REVIEW || normalized.startsWith('WAITER_PENDING_BILLER'))
  )
}

function groupChairSummary(order: Order) {
  const chairMap = new Map<number, { chairNumber: number; itemCount: number; lineTotal: number }>()

  for (const item of order.items) {
    const chairNumber = item.chairNumber ?? 0
    const current = chairMap.get(chairNumber) ?? { chairNumber, itemCount: 0, lineTotal: 0 }
    current.itemCount += item.quantity
    current.lineTotal += (item.price + item.modifiers.reduce((sum, modifier) => sum + modifier.price, 0)) * item.quantity
    chairMap.set(chairNumber, current)
  }

  return [...chairMap.values()].sort((a, b) => a.chairNumber - b.chairNumber)
}

function normalizeTableNameForChair(tableName: string | undefined, chairNumber: number) {
  if (!tableName) return `Chair ${chairNumber}`
  const base = tableName.replace(/\s*•\s*Chairs?.*$/i, '').replace(/\s*•\s*Chair\s+\d+$/i, '').trim()
  return `${base || 'Table'} • Chair ${chairNumber}`
}

function buildChairSplitOrders(order: Order, nextOrderNumber: number, taxRate: number): Order[] {
  const itemsByChair = new Map<number, Order['items']>()

  order.items.forEach((item) => {
    const chairNumber = typeof item.chairNumber === 'number' && item.chairNumber > 0 ? item.chairNumber : 0
    const current = itemsByChair.get(chairNumber) ?? []
    current.push(item)
    itemsByChair.set(chairNumber, current)
  })

  const now = new Date().toISOString()
  const chairs = Array.from(itemsByChair.keys()).sort((a, b) => a - b)

  return chairs.map((chairNumber, index) => {
    const chairItems = itemsByChair.get(chairNumber) ?? []
    const subtotal = chairItems.reduce((sum, item) => {
      const lineTotal = item.price + item.modifiers.reduce((modifierSum, modifier) => modifierSum + modifier.price, 0)
      return sum + lineTotal * item.quantity
    }, 0)
    const tax = chairItems.reduce((sum, item) => {
      if (!item.serviceChargeApplicable) return sum
      const lineTotal = item.price + item.modifiers.reduce((modifierSum, modifier) => modifierSum + modifier.price, 0)
      return sum + lineTotal * item.quantity
    }, 0) * (taxRate / 100)

    return {
      id: `${order.id}-split-${chairNumber}-${Date.now()}-${index}`,
      orderNumber: nextOrderNumber + index,
      tableId: order.tableId,
      tableName: chairNumber > 0 ? normalizeTableNameForChair(order.tableName, chairNumber) : (order.tableName ?? 'Unassigned'),
      customerId: order.customerId,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      items: chairItems,
      subtotal,
      tax,
      total: subtotal + tax,
      status: 'pending',
      paymentMethod: undefined,
      paymentStatus: 'pending',
      paymentCollectedBy: WAITER_PENDING_BILLER_REVIEW,
      createdAt: order.createdAt,
      updatedAt: now,
      createdBy: order.createdBy,
      isPriority: order.isPriority,
    }
  })
}

export default function BillerConfirmationPage() {
  const router = useRouter()
  const { currentUser, orders, settings, updateOrder, addOrder, getNextOrderNumber } = usePOSStore()
  const [mounted, setMounted] = useState(false)
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)

  const pendingOrders = useMemo(
    () =>
      orders
        .filter((order) => isWaiterPendingForBiller(order))
        .sort((a, b) => b.orderNumber - a.orderNumber),
    [orders]
  )

  const groupedPendingOrders = useMemo(
    () => pendingOrders.filter((order) => groupChairSummary(order).filter((chair) => chair.chairNumber > 0).length > 1),
    [pendingOrders]
  )

  const chairWisePendingOrders = useMemo(
    () => pendingOrders.filter((order) => groupChairSummary(order).filter((chair) => chair.chairNumber > 0).length <= 1),
    [pendingOrders]
  )

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted && !currentUser) {
      router.push('/')
      return
    }

    if (mounted && currentUser && !hasEffectiveRole(currentUser.role, ['admin', 'super-admin', 'biller'], settings)) {
      const effectiveRole = resolveEffectiveRole(currentUser.role, settings)
      if (effectiveRole === 'cashier') {
        router.push('/pay')
        return
      }
      router.push('/pos')
    }
  }, [currentUser, mounted, router, settings])

  const handleConfirm = (order: Order) => {
    updateOrder(order.id, {
      paymentCollectedBy: BILLER_CONFIRMED,
      updatedAt: new Date().toISOString(),
    })
    setSelectedOrderId(order.id)
    toast.success(`Order #${order.orderNumber} confirmed for billing counter`)
    router.push(`/billing?orderId=${order.id}`)
  }

  const handleSplitGroupedBill = (order: Order) => {
    const chairSummary = groupChairSummary(order).filter((chair) => chair.chairNumber > 0)
    if (chairSummary.length <= 1) {
      toast.info('This bill is already a single-chair bill')
      return
    }

    const nextOrderNumber = getNextOrderNumber()
    const splitOrders = buildChairSplitOrders(order, nextOrderNumber, settings.taxRate)
    splitOrders.forEach((splitOrder) => addOrder(splitOrder))

    updateOrder(order.id, {
      status: 'cancelled',
      paymentCollectedBy: 'SPLIT_ARCHIVED',
      updatedAt: new Date().toISOString(),
    })

    toast.success(`Grouped bill split into ${splitOrders.length} chair bills`) 
  }

  if (!mounted || !currentUser || !hasEffectiveRole(currentUser.role, ['admin', 'super-admin', 'biller'], settings)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh flex-col bg-gradient-to-b from-sky-50 via-background to-background dark:from-slate-950 dark:via-background dark:to-background">
      <Header title="Biller Confirmation" />

      <div className="mx-auto w-full max-w-6xl flex-1 overflow-y-auto p-3 sm:p-4 md:p-6">
        <div className="mb-4 rounded-2xl border border-sky-200 bg-sky-50/80 p-4 shadow-sm dark:border-sky-900/40 dark:bg-card/80">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700 dark:text-sky-300">Biller queue</p>
              <h1 className="text-xl font-bold text-foreground sm:text-2xl">Confirm waiter bills before sending to cashier</h1>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="bg-sky-100 text-sky-900 hover:bg-sky-100 dark:bg-sky-500/15 dark:text-sky-200">Biller</Badge>
              <Badge variant="outline">{pendingOrders.length} pending</Badge>
            </div>
          </div>
        </div>

        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold">Waiter Bills</h2>
            <p className="text-sm text-muted-foreground">Review and confirm each bill before opening it in the Billing Counter.</p>
          </div>
          <Button variant="outline" className="gap-2 self-start sm:self-auto" onClick={() => router.push('/billing')}>
            <ReceiptText className="h-4 w-4" />
            Go to Billing
          </Button>
        </div>

        {pendingOrders.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              No waiter bills waiting for confirmation.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {groupedPendingOrders.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-foreground">Grouped waiter bills</h3>
                  <Badge variant="outline">{groupedPendingOrders.length}</Badge>
                </div>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {groupedPendingOrders.map((order) => {
                    const chairSummary = groupChairSummary(order)
                    const billCode = generateBillCode(order.orderNumber, order.createdAt)
                    return (
                      <Card
                        key={order.id}
                        className={`border-sky-200 shadow-sm dark:border-sky-900/40 ${selectedOrderId === order.id ? 'ring-2 ring-sky-500' : ''}`}
                      >
                        <CardHeader className="bg-sky-50/70 pb-2 dark:bg-card/70">
                          <CardTitle className="flex items-center justify-between text-lg">
                            <span>#{order.orderNumber}</span>
                            <Badge variant="secondary">Grouped</Badge>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 p-5">
                          <div className="flex items-center justify-between text-sm text-muted-foreground">
                            <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {order.tableName || 'Takeaway'}</span>
                            <span className="font-mono text-xs">{billCode}</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {chairSummary.map((chair) => (
                              <Badge key={`${order.id}-chair-${chair.chairNumber}`} variant="outline" className="gap-1">
                                {chair.chairNumber > 0 ? `Chair ${chair.chairNumber}` : 'Unassigned'}
                                <span className="text-[10px] opacity-70">{chair.itemCount} item{chair.itemCount === 1 ? '' : 's'}</span>
                              </Badge>
                            ))}
                          </div>
                          <div className="rounded-xl bg-sky-50 p-4 dark:bg-muted/30">
                            <p className="text-xs uppercase tracking-[0.2em] text-sky-700 dark:text-sky-300">Amount due</p>
                            <div className="mt-1 text-3xl font-black text-foreground">{settings.currencySymbol}{order.total.toFixed(2)}</div>
                          </div>
                          <div className="rounded-lg border bg-background px-3 py-2 text-sm text-muted-foreground">
                            Grouped waiter bill. You can split by chair or confirm as grouped.
                          </div>
                          <Separator />
                          <Button
                            variant="secondary"
                            className="h-10 w-full"
                            onClick={() => handleSplitGroupedBill(order)}
                          >
                            Split Group Bill by Chair
                          </Button>
                          <Button className="h-12 w-full gap-2" size="lg" onClick={() => handleConfirm(order)}>
                            <CheckCircle2 className="h-4 w-4" />
                            Confirm & Send to Billing Counter
                          </Button>
                          <Button variant="outline" className="h-10 w-full gap-2" onClick={() => router.push(`/billing?orderId=${order.id}`)}>
                            <ReceiptText className="h-4 w-4" />
                            Open Billing Counter
                          </Button>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </div>
            )}

            {chairWisePendingOrders.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-foreground">Chair-wise waiter bills</h3>
                  <Badge variant="outline">{chairWisePendingOrders.length}</Badge>
                </div>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {chairWisePendingOrders.map((order) => {
              const chairSummary = groupChairSummary(order)
              const billCode = generateBillCode(order.orderNumber, order.createdAt)
              return (
                <Card
                  key={order.id}
                  className={`border-sky-200 shadow-sm dark:border-sky-900/40 ${selectedOrderId === order.id ? 'ring-2 ring-sky-500' : ''}`}
                >
                  <CardHeader className="bg-sky-50/70 pb-2 dark:bg-card/70">
                    <CardTitle className="flex items-center justify-between text-lg">
                      <span>#{order.orderNumber}</span>
                      <Badge variant="secondary">Waiting</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 p-5">
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {order.tableName || 'Takeaway'}</span>
                      <span className="font-mono text-xs">{billCode}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {chairSummary.map((chair) => (
                        <Badge key={`${order.id}-chair-${chair.chairNumber}`} variant="outline" className="gap-1">
                          {chair.chairNumber > 0 ? `Chair ${chair.chairNumber}` : 'Unassigned'}
                          <span className="text-[10px] opacity-70">{chair.itemCount} item{chair.itemCount === 1 ? '' : 's'}</span>
                        </Badge>
                      ))}
                    </div>
                    <div className="rounded-xl bg-sky-50 p-4 dark:bg-muted/30">
                      <p className="text-xs uppercase tracking-[0.2em] text-sky-700 dark:text-sky-300">Amount due</p>
                      <div className="mt-1 text-3xl font-black text-foreground">{settings.currencySymbol}{order.total.toFixed(2)}</div>
                    </div>
                    <div className="rounded-lg border bg-background p-3">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Waiter order details</p>
                      <div className="max-h-44 space-y-2 overflow-y-auto pr-1">
                        {order.items.map((item) => {
                          const lineTotal = (item.price + item.modifiers.reduce((sum, modifier) => sum + modifier.price, 0)) * item.quantity
                          return (
                            <div key={`${order.id}-${item.id}`} className="rounded-md border bg-muted/20 px-2.5 py-2">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-medium text-foreground">{item.quantity}x {item.name}</p>
                                  <div className="mt-1 flex flex-wrap gap-x-2 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                                    <span>{typeof item.chairNumber === 'number' && item.chairNumber > 0 ? `Chair ${item.chairNumber}` : 'Unassigned'}</span>
                                  </div>
                                  {item.modifiers.length > 0 && (
                                    <p className="mt-1 text-xs text-muted-foreground">+ {item.modifiers.map((modifier) => modifier.name).join(', ')}</p>
                                  )}
                                  {item.notes && <p className="mt-1 text-xs italic text-sky-700 dark:text-sky-300">Note: {item.notes}</p>}
                                </div>
                                <span className="whitespace-nowrap text-xs font-semibold text-foreground">{settings.currencySymbol}{lineTotal.toFixed(2)}</span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                    <div className="rounded-lg border bg-background px-3 py-2 text-sm text-muted-foreground">
                      Waiter has sent this bill for confirmation. Review and forward it to the cashier counter.
                    </div>
                    <Separator />
                    <Button className="h-12 w-full gap-2" size="lg" onClick={() => handleConfirm(order)}>
                      <CheckCircle2 className="h-4 w-4" />
                      Confirm & Send to Billing Counter
                    </Button>
                    <Button variant="outline" className="h-10 w-full gap-2" onClick={() => router.push(`/billing?orderId=${order.id}`)}>
                      <ReceiptText className="h-4 w-4" />
                      Open Billing Counter
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
