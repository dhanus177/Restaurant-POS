'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Header } from '@/components/shared/header'
import { usePOSStore } from '@/lib/store'
import { hasEffectiveRole, resolveEffectiveRole } from '@/lib/roles'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { generateBarcodeSVG, generateBillCode } from '@/lib/print'
import { printKitchenDocket, printReceipt } from '@/lib/print'
import { ReceiptText, ScanBarcode, Users, Printer } from 'lucide-react'
import type { Order } from '@/lib/types'

const WAITER_BILL_CONFIRMED = 'BILLER_CONFIRMED'
const BILLING_READY_FOR_CASHIER = 'BILLING_READY_FOR_CASHIER'

function normalizeQueueFlag(value?: string | null): string {
  return (value ?? '').trim().toUpperCase()
}

function isBillerConfirmed(order: Order): boolean {
  const normalized = normalizeQueueFlag(order.paymentCollectedBy)
  return normalized === WAITER_BILL_CONFIRMED || normalized.startsWith('BILLER_CONFIRMED')
}

function BillingPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const {
    currentUser,
    cart,
    customers,
    tables,
    orders,
    users,
    selectedTable,
    selectedCustomer,
    settings,
    currentCustomerCount,
    getNextOrderNumber,
    addOrder,
    updateOrder,
    updateTableStatus,
    clearCart,
  } = usePOSStore()

  const [mounted, setMounted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [discountType, setDiscountType] = useState<'amount' | 'percent'>('amount')
  const [discountInput, setDiscountInput] = useState('0')
  const waiterOrderId = searchParams.get('orderId')
  const currentBillerName = currentUser?.name?.trim() || 'Biller'

  const confirmedWaiterOrder = useMemo(
    () => orders.find((order) => order.id === waiterOrderId && order.paymentStatus === 'pending' && isBillerConfirmed(order)) ?? null,
    [orders, waiterOrderId]
  )

  const billingItems = confirmedWaiterOrder?.items ?? cart
  const billingTable = confirmedWaiterOrder
    ? tables.find((table) => table.id === confirmedWaiterOrder.tableId) ?? null
    : selectedTable
  const billingCustomer = confirmedWaiterOrder
    ? customers.find((customer) => customer.id === confirmedWaiterOrder.customerId) ?? null
    : selectedCustomer
  const billingCustomerCount = useMemo(() => {
    if (!confirmedWaiterOrder) return currentCustomerCount
    const chairs = new Set(
      confirmedWaiterOrder.items
        .map((item) => item.chairNumber)
        .filter((chair): chair is number => typeof chair === 'number' && chair > 0)
    )
    return Math.max(1, chairs.size)
  }, [confirmedWaiterOrder, currentCustomerCount])
  const orderCreatorName = useMemo(() => {
    const createdBy = confirmedWaiterOrder?.createdBy
    if (!createdBy) return currentBillerName
    return users.find((user) => user.id === createdBy)?.name ?? createdBy
  }, [confirmedWaiterOrder?.createdBy, currentBillerName, users])
  const orderLabel = useMemo(() => {
    if (confirmedWaiterOrder) {
      return confirmedWaiterOrder.tableName || `${billingTable?.name ?? 'Table'} - ${orderCreatorName}`
    }

    if (billingTable) {
      return `${billingTable.name} - ${currentBillerName}`
    }

    return `Takeaway - ${currentBillerName}`
  }, [billingTable, confirmedWaiterOrder, currentBillerName, orderCreatorName])

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted && !currentUser) router.push('/')
  }, [currentUser, mounted, router])

  useEffect(() => {
    if (mounted && currentUser && !hasEffectiveRole(currentUser.role, ['admin', 'super-admin', 'biller'], settings)) {
      const effectiveRole = resolveEffectiveRole(currentUser.role, settings)
      if (effectiveRole === 'cashier') {
        router.push('/pay')
        return
      }
      router.push('/pos')
    }
  }, [currentUser, mounted, router, settings])

  useEffect(() => {
    if (!mounted) return
    if (confirmedWaiterOrder) return
    if (cart.length === 0) router.push('/pos')
  }, [cart.length, confirmedWaiterOrder, mounted, router])

  useEffect(() => {
    if (!mounted || !waiterOrderId) return
    if (!confirmedWaiterOrder) {
      router.push('/biller-confirmation')
    }
  }, [confirmedWaiterOrder, mounted, router, waiterOrderId])

  const subtotal = useMemo(
    () =>
      billingItems.reduce((sum, item) => {
        const modifiersTotal = item.modifiers.reduce((modifierSum, modifier) => modifierSum + modifier.price, 0) * item.quantity
        return sum + item.price * item.quantity + modifiersTotal
      }, 0),
    [billingItems]
  )
  const serviceChargeEligibleSubtotal = useMemo(
    () => billingItems.reduce((sum, item) => {
      if (!item.serviceChargeApplicable) return sum
      const modifiersTotal = item.modifiers.reduce((modifierSum, modifier) => modifierSum + modifier.price, 0) * item.quantity
      return sum + item.price * item.quantity + modifiersTotal
    }, 0),
    [billingItems]
  )
  const discountRaw = Number(discountInput) || 0
  const discountAmount = useMemo(() => {
    if (discountRaw <= 0) return 0
    if (discountType === 'percent') {
      return Math.min(subtotal, (subtotal * discountRaw) / 100)
    }
    return Math.min(subtotal, discountRaw)
  }, [discountRaw, discountType, subtotal])
  const discountedSubtotal = Math.max(0, subtotal - discountAmount)
  const discountedEligibleSubtotal = subtotal > 0
    ? Math.max(0, serviceChargeEligibleSubtotal - (discountAmount * (serviceChargeEligibleSubtotal / subtotal)))
    : 0
  const tax = billingTable ? discountedEligibleSubtotal * (settings.taxRate / 100) : 0
  const total = discountedSubtotal + tax
  const perCustomer = useMemo(() => total / Math.max(billingCustomerCount, 1), [billingCustomerCount, total])
  const isWaiterLiveOrder = useMemo(
    () => confirmedWaiterOrder ? true : billingItems.some((item) => typeof item.chairNumber === 'number' && item.chairNumber > 0),
    [billingItems, confirmedWaiterOrder]
  )
  const nextOrderNumber = confirmedWaiterOrder?.orderNumber ?? getNextOrderNumber()
  const now = confirmedWaiterOrder?.createdAt ?? new Date().toISOString()
  const billCode = generateBillCode(nextOrderNumber, now)
  const barcodeSvg = generateBarcodeSVG(billCode)

  const getRuntimePrintSettings = () => {
    const desktopBridgeAvailable = typeof window !== 'undefined' && Boolean(window.desktopApp?.printHtml)
    if (settings.forceDesktopPrintOnly !== false && !desktopBridgeAvailable) {
      toast.warning('Desktop print bridge unavailable. Using browser print dialog for this bill.')
      return { ...settings, forceDesktopPrintOnly: false }
    }
    return settings
  }

  const buildPendingBill = (): Order => {
    if (confirmedWaiterOrder) {
      return {
        ...confirmedWaiterOrder,
        customerId: billingCustomer?.id ?? confirmedWaiterOrder.customerId,
        customerName: billingCustomer?.name ?? confirmedWaiterOrder.customerName,
        customerPhone: billingCustomer?.phone ?? confirmedWaiterOrder.customerPhone,
        subtotal: discountedSubtotal,
        tax,
        total,
        status: 'pending',
        paymentMethod: undefined,
        paymentStatus: 'pending',
        paymentCollectedBy: BILLING_READY_FOR_CASHIER,
        updatedAt: new Date().toISOString(),
      }
    }

    const tableLabel = orderLabel

    return {
      id: `order-${Date.now()}`,
      orderNumber: nextOrderNumber,
      tableId: billingTable?.id,
      tableName: tableLabel,
      customerId: billingCustomer?.id,
      customerName: billingCustomer?.name,
      customerPhone: billingCustomer?.phone,
      items: [...billingItems],
      subtotal: discountedSubtotal,
      tax,
      total,
      status: 'pending',
      paymentMethod: undefined,
      paymentStatus: 'pending',
      paymentCollectedBy: BILLING_READY_FOR_CASHIER,
      createdAt: now,
      updatedAt: now,
      createdBy: currentUser?.id || 'unknown',
    }
  }

  const handlePrintBillingSlip = () => {
    if (billingItems.length === 0) return

    const bill = buildPendingBill()
    const runtimePrintSettings = getRuntimePrintSettings()
    printReceipt(bill, runtimePrintSettings)
    toast.success(`${confirmedWaiterOrder ? 'Biller bill' : 'Billing slip'} printed: ${generateBillCode(bill.orderNumber, bill.createdAt)}`)
  }

  const handleSendToPayCounter = async () => {
    if (billingItems.length === 0) return

    setIsSubmitting(true)
    try {
      const order = buildPendingBill()

      if (confirmedWaiterOrder) {
        updateOrder(order.id, {
          customerId: order.customerId,
          customerName: order.customerName,
          customerPhone: order.customerPhone,
          subtotal: order.subtotal,
          tax: order.tax,
          total: order.total,
          status: order.status,
          paymentMethod: order.paymentMethod,
          paymentStatus: order.paymentStatus,
          paymentCollectedBy: order.paymentCollectedBy,
          updatedAt: order.updatedAt,
        })
      } else {
        addOrder(order)
      }

      if (billingTable) {
        updateTableStatus(billingTable.id, 'occupied', order.id)
      }

      // Kitchen docket prints immediately for dine-in, but takeaway waits until cashier accepts payment.
      const runtimePrintSettings = getRuntimePrintSettings()

      if (!confirmedWaiterOrder && billingTable) {
        printKitchenDocket(order, runtimePrintSettings)
      }

      // Print billing slip with barcode for cashier scanning
      printReceipt(order, runtimePrintSettings)

      if (!confirmedWaiterOrder) {
        clearCart()
      }

      toast.success(`${confirmedWaiterOrder ? 'Confirmed bill' : 'Bill'} ${billCode} sent to cashier queue • Printed for handoff`)
      router.push('/pos')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!mounted || !currentUser || !hasEffectiveRole(currentUser.role, ['admin', 'super-admin', 'biller'], settings)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh flex-col overflow-x-hidden bg-gradient-to-b from-amber-50 via-background to-background dark:from-slate-950 dark:via-background dark:to-background">
      <Header title="Biller Confirmation" />

      <div className="mx-auto w-full max-w-5xl flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6 xl:p-7">
        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 shadow-sm dark:border-amber-900/40 dark:bg-card/80">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700 dark:text-amber-300">Biller counter</p>
              <h1 className="text-[clamp(1.125rem,2.5vw,2rem)] font-bold leading-tight text-foreground">Confirm the waiter bill, print it, and send it to cashier</h1>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="bg-amber-100 text-amber-900 hover:bg-amber-100 dark:bg-amber-500/15 dark:text-amber-200 dark:hover:bg-amber-500/20">
                {confirmedWaiterOrder ? 'Waiter bill' : 'Counter bill'}
              </Badge>
              <Badge variant="outline">{currentCustomerCount} pax</Badge>
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
          <Card className="min-w-0 border-amber-200 shadow-sm dark:border-amber-900/40">
            <CardHeader className="bg-amber-50/70 dark:bg-card/70">
              <CardTitle className="flex items-center gap-2">
                <ReceiptText className="h-5 w-5 text-amber-700 dark:text-amber-300" />
                Bill Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-6">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Order #{nextOrderNumber}</Badge>
                  <Badge variant="outline">{confirmedWaiterOrder ? 'Biller review' : 'Counter bill'}</Badge>
              </div>

              <div className="rounded-xl bg-amber-50 p-4 dark:bg-muted/30">
                <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-2"><Users className="h-4 w-4" /> Seating</span>
                  <span className="text-right">{orderLabel}</span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-3 text-sm text-muted-foreground">
                  <span>Customer count</span>
                  <span className="text-right">{billingCustomerCount} pax</span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-3 text-sm text-muted-foreground">
                  <span>Customer</span>
                  <span className="max-w-[55%] break-words text-right">{billingCustomer?.name ?? confirmedWaiterOrder?.customerName ?? 'Walk-in'}</span>
                </div>
                {(billingCustomer?.phone ?? confirmedWaiterOrder?.customerPhone) && (
                  <div className="mt-2 flex items-center justify-between gap-3 text-sm text-muted-foreground">
                    <span>Phone</span>
                    <span className="text-right">{billingCustomer?.phone ?? confirmedWaiterOrder?.customerPhone}</span>
                  </div>
                )}
                <div className="mt-2 flex items-center justify-between gap-3 text-sm text-muted-foreground">
                  <span>Order source</span>
                  <span className="text-right">{isWaiterLiveOrder ? 'Waiter (Live)' : 'Counter'}</span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-3 text-sm text-muted-foreground">
                  <span>Created by</span>
                  <span className="text-right">{isWaiterLiveOrder ? orderCreatorName : currentBillerName}</span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-3 text-sm text-muted-foreground">
                  <span>Collected by</span>
                  <span className="text-right">Cashier queue</span>
                </div>
                <Separator className="my-3" />
                <div className="flex items-end justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Grand total</span>
                  <span className="text-[clamp(1.75rem,4vw,2.5rem)] font-black tracking-tight text-foreground">
                    {settings.currencySymbol}{total.toFixed(2)}
                  </span>
                </div>
                {billingCustomerCount > 1 && (
                  <div className="mt-3 flex items-center justify-between rounded-lg bg-background/90 px-3 py-2 text-sm text-amber-800 dark:bg-muted/40 dark:text-amber-200">
                    <span>Split / customer</span>
                    <span className="font-semibold">{settings.currencySymbol}{perCustomer.toFixed(2)}</span>
                  </div>
                )}
              </div>

              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Bill details</div>
              <Separator />

              <div className="space-y-3">
                <div className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Full order details</div>
                <div className="space-y-3">
                  {billingItems.map((item) => {
                    const lineTotal = (item.price + item.modifiers.reduce((sum, modifier) => sum + modifier.price, 0)) * item.quantity
                    return (
                      <div key={item.id} className="rounded-lg border bg-background p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-foreground">{item.name}</p>
                            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                              <span>Qty {item.quantity}</span>
                              {typeof item.chairNumber === 'number' && <span>Chair {item.chairNumber}</span>}
                            </div>
                            {item.modifiers.length > 0 && (
                              <p className="mt-1 text-xs text-muted-foreground">+ {item.modifiers.map((modifier) => modifier.name).join(', ')}</p>
                            )}
                            {item.notes && <p className="mt-1 text-xs italic text-amber-700 dark:text-amber-300">Note: {item.notes}</p>}
                          </div>
                          <span className="whitespace-nowrap text-sm font-semibold text-foreground">{settings.currencySymbol}{lineTotal.toFixed(2)}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="space-y-3 text-sm">
                <div className="rounded-lg border p-3 space-y-3">
                  <div className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Discount</div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={discountType === 'amount' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setDiscountType('amount')}
                    >
                      Amount
                    </Button>
                    <Button
                      type="button"
                      variant={discountType === 'percent' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setDiscountType('percent')}
                    >
                      %
                    </Button>
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={discountInput}
                    onChange={(e) => setDiscountInput(e.target.value)}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    placeholder={discountType === 'percent' ? '0-100' : '0.00'}
                  />
                </div>

                <div className="flex justify-between"><span>Subtotal</span><span>{settings.currencySymbol}{subtotal.toFixed(2)}</span></div>
                <div className="flex justify-between text-emerald-600"><span>Discount</span><span>- {settings.currencySymbol}{discountAmount.toFixed(2)}</span></div>
                {tax > 0 && <div className="flex justify-between"><span>Service Charge ({settings.taxRate}%)</span><span>{settings.currencySymbol}{tax.toFixed(2)}</span></div>}
                <div className="flex justify-between font-semibold text-foreground"><span>Final total</span><span>{settings.currencySymbol}{total.toFixed(2)}</span></div>
              </div>
            </CardContent>
          </Card>

          <Card className="min-w-0 border-amber-200 shadow-sm dark:border-amber-900/40">
            <CardHeader className="bg-amber-50/70 dark:bg-card/70">
              <CardTitle className="flex items-center gap-2">
                <ScanBarcode className="h-5 w-5 text-amber-700 dark:text-amber-300" />
                Bill Barcode
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-6">
              <div className="rounded-2xl border-2 border-dashed border-amber-200 bg-background p-4 text-center shadow-inner dark:bg-card">
                <p className="text-xs text-muted-foreground">Bill Code</p>
                <p className="break-all font-mono text-base font-semibold tracking-[0.2em] sm:text-lg">{billCode}</p>
                <div className="mt-4 overflow-x-auto rounded-lg bg-background p-2 dark:bg-card" dangerouslySetInnerHTML={{ __html: barcodeSvg }} />
              </div>
              <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
                {isWaiterLiveOrder
                  ? 'Waiter items are confirmed here by the biller. Print the bill, then send it to cashier.'
                  : 'Cashier can search or scan this bill code at the cashier counter.'}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <Button variant="outline" size="lg" className="w-full xl:w-auto" onClick={() => router.push('/biller-confirmation')}>Back to Biller Queue</Button>
          <div className="flex flex-col gap-3 lg:flex-row xl:justify-end">
            <Button variant="secondary" size="lg" className="w-full gap-2 lg:w-auto" onClick={handlePrintBillingSlip} disabled={billingItems.length === 0 || isSubmitting}>
              <Printer className="h-4 w-4" />
              {confirmedWaiterOrder ? 'Print Bill for Cashier' : 'Print Billing Slip'}
            </Button>
            <Button size="lg" className="w-full lg:min-w-64 xl:min-w-72" onClick={handleSendToPayCounter} disabled={isSubmitting || billingItems.length === 0}>
              {isSubmitting ? 'Sending...' : confirmedWaiterOrder ? 'Confirm & Send to Cashier' : 'Send Bill to Cashier'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function BillingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      }
    >
      <BillingPageContent />
    </Suspense>
  )
}
