'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/shared/header'
import { usePOSStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { generateBarcodeSVG, generateBillCode } from '@/lib/print'
import { printReceipt } from '@/lib/print'
import { ReceiptText, ScanBarcode, Users, Printer } from 'lucide-react'
import type { Order } from '@/lib/types'

export default function BillingPage() {
  const router = useRouter()
  const {
    currentUser,
    cart,
    selectedTable,
    selectedCustomer,
    settings,
    currentCustomerCount,
    getCartTotal,
    getNextOrderNumber,
    addOrder,
    updateTableStatus,
    clearCart,
  } = usePOSStore()

  const [mounted, setMounted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [discountType, setDiscountType] = useState<'amount' | 'percent'>('amount')
  const [discountInput, setDiscountInput] = useState('0')

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted && !currentUser) router.push('/')
  }, [currentUser, mounted, router])

  useEffect(() => {
    if (mounted && cart.length === 0) router.push('/pos')
  }, [cart.length, mounted, router])

  const { subtotal } = getCartTotal()
  const serviceChargeEligibleSubtotal = useMemo(
    () => cart.reduce((sum, item) => {
      if (!item.serviceChargeApplicable) return sum
      const modifiersTotal = item.modifiers.reduce((modifierSum, modifier) => modifierSum + modifier.price, 0) * item.quantity
      return sum + item.price * item.quantity + modifiersTotal
    }, 0),
    [cart]
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
  const tax = selectedTable ? discountedEligibleSubtotal * (settings.taxRate / 100) : 0
  const total = discountedSubtotal + tax
  const perCustomer = useMemo(() => total / Math.max(currentCustomerCount, 1), [currentCustomerCount, total])
  const nextOrderNumber = getNextOrderNumber()
  const now = new Date().toISOString()
  const billCode = generateBillCode(nextOrderNumber, now)
  const barcodeSvg = generateBarcodeSVG(billCode)

  const buildPendingBill = (): Order => {
    const tableLabel = selectedTable
      ? `${selectedTable.name} • ${currentCustomerCount} pax • Counter`
      : `Takeaway • ${currentCustomerCount} pax • Counter`

    return {
      id: `order-${Date.now()}`,
      orderNumber: nextOrderNumber,
      tableId: selectedTable?.id,
      tableName: tableLabel,
      customerId: selectedCustomer?.id,
      customerName: selectedCustomer?.name,
      customerPhone: selectedCustomer?.phone,
      items: [...cart],
      subtotal: discountedSubtotal,
      tax,
      total,
      status: 'pending',
      paymentMethod: undefined,
      paymentStatus: 'pending',
      createdAt: now,
      updatedAt: now,
      createdBy: currentUser?.id || 'unknown',
    }
  }

  const handlePrintBillingSlip = () => {
    if (cart.length === 0) return
    const bill = buildPendingBill()
    printReceipt(bill, settings)
    toast.success(`Billing slip printed: ${generateBillCode(bill.orderNumber, bill.createdAt)}`)
  }

  const handleSendToPayCounter = async () => {
    if (cart.length === 0) return

    setIsSubmitting(true)
    try {
      const order = buildPendingBill()

      addOrder(order)

      if (selectedTable) {
        updateTableStatus(selectedTable.id, 'occupied', order.id)
      }

      // Print billing slip with barcode for pay counter scanning
      printReceipt(order, settings)

      clearCart()
      toast.success(`Bill ${billCode} sent to pay counter`)
      router.push('/pay')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!mounted || !currentUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh flex-col overflow-x-hidden bg-gradient-to-b from-amber-50 via-background to-background dark:from-slate-950 dark:via-background dark:to-background">
      <Header title="Billing Counter" />

      <div className="mx-auto w-full max-w-5xl flex-1 overflow-y-auto p-3 sm:p-4 md:p-6">
        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 shadow-sm dark:border-amber-900/40 dark:bg-card/80">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700 dark:text-amber-300">Bill counter</p>
              <h1 className="text-xl font-bold text-foreground sm:text-2xl">Create, barcode, and hand over the bill</h1>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="bg-amber-100 text-amber-900 hover:bg-amber-100 dark:bg-amber-500/15 dark:text-amber-200 dark:hover:bg-amber-500/20">Billing</Badge>
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
                <Badge variant="outline">Counter</Badge>
              </div>

              <div className="rounded-xl bg-amber-50 p-4 dark:bg-muted/30">
                <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-2"><Users className="h-4 w-4" /> Seating</span>
                  <span className="text-right">{selectedTable ? selectedTable.name : 'Takeaway'}</span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-3 text-sm text-muted-foreground">
                  <span>Customer count</span>
                  <span className="text-right">{currentCustomerCount} pax</span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-3 text-sm text-muted-foreground">
                  <span>Customer</span>
                  <span className="max-w-[55%] break-words text-right">{selectedCustomer?.name ?? 'Walk-in'}</span>
                </div>
                {selectedCustomer?.phone && (
                  <div className="mt-2 flex items-center justify-between gap-3 text-sm text-muted-foreground">
                    <span>Phone</span>
                    <span className="text-right">{selectedCustomer.phone}</span>
                  </div>
                )}
                <div className="mt-2 flex items-center justify-between gap-3 text-sm text-muted-foreground">
                  <span>Order source</span>
                  <span className="text-right">Counter</span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-3 text-sm text-muted-foreground">
                  <span>Collected by</span>
                  <span className="text-right">Pending at pay counter</span>
                </div>
                <Separator className="my-3" />
                <div className="flex items-end justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Grand total</span>
                  <span className="text-3xl font-black tracking-tight text-foreground sm:text-4xl">
                    {settings.currencySymbol}{total.toFixed(2)}
                  </span>
                </div>
                {currentCustomerCount > 1 && (
                  <div className="mt-3 flex items-center justify-between rounded-lg bg-background/90 px-3 py-2 text-sm text-amber-800 dark:bg-muted/40 dark:text-amber-200">
                    <span>Split / customer</span>
                    <span className="font-semibold">{settings.currencySymbol}{perCustomer.toFixed(2)}</span>
                  </div>
                )}
              </div>

              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Bill details</div>
              <Separator />

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
                Cash collector can search or scan this bill code at the pay counter.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <Button variant="outline" size="lg" className="w-full xl:w-auto" onClick={() => router.push('/pos')}>Back to POS</Button>
          <div className="flex flex-col gap-3 lg:flex-row xl:justify-end">
            <Button variant="secondary" size="lg" className="w-full gap-2 lg:w-auto" onClick={handlePrintBillingSlip} disabled={cart.length === 0 || isSubmitting}>
              <Printer className="h-4 w-4" />
              Print Billing Slip
            </Button>
            <Button size="lg" className="w-full lg:min-w-64 xl:min-w-72" onClick={handleSendToPayCounter} disabled={isSubmitting || cart.length === 0}>
              {isSubmitting ? 'Sending...' : 'Send Bill to Pay Counter'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
