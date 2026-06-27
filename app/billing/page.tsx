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
    settings,
    currentCustomerCount,
    currentOrderSource,
    getCartTotal,
    getNextOrderNumber,
    addOrder,
    updateTableStatus,
    clearCart,
  } = usePOSStore()

  const [mounted, setMounted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted && !currentUser) router.push('/')
  }, [currentUser, mounted, router])

  useEffect(() => {
    if (mounted && cart.length === 0) router.push('/pos')
  }, [cart.length, mounted, router])

  const { subtotal, tax, total } = getCartTotal()
  const perCustomer = useMemo(() => total / Math.max(currentCustomerCount, 1), [currentCustomerCount, total])
  const nextOrderNumber = getNextOrderNumber()
  const now = new Date().toISOString()
  const billCode = generateBillCode(nextOrderNumber, now)
  const barcodeSvg = generateBarcodeSVG(billCode)

  const buildPendingBill = (): Order => {
    const tableLabel = selectedTable
      ? `${selectedTable.name} • ${currentCustomerCount} pax • ${currentOrderSource === 'diner-mobile' ? 'Diner Mobile' : 'Counter'}`
      : `Takeaway • ${currentCustomerCount} pax • ${currentOrderSource === 'diner-mobile' ? 'Diner Mobile' : 'Counter'}`

    return {
      id: `order-${Date.now()}`,
      orderNumber: nextOrderNumber,
      tableId: selectedTable?.id,
      tableName: tableLabel,
      items: [...cart],
      subtotal,
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
    <div className="flex h-screen flex-col bg-gradient-to-b from-amber-50 via-background to-background dark:from-slate-950 dark:via-background dark:to-background">
      <Header title="Billing Counter" />

      <div className="mx-auto w-full max-w-5xl flex-1 overflow-y-auto p-4 md:p-6">
        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 shadow-sm dark:border-amber-900/40 dark:bg-card/80">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700 dark:text-amber-300">Bill counter</p>
              <h1 className="text-2xl font-bold text-foreground">Create, barcode, and hand over the bill</h1>
            </div>
            <div className="flex gap-2">
              <Badge variant="secondary" className="bg-amber-100 text-amber-900 hover:bg-amber-100 dark:bg-amber-500/15 dark:text-amber-200 dark:hover:bg-amber-500/20">Billing</Badge>
              <Badge variant="outline">{currentCustomerCount} pax</Badge>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
          <Card className="border-amber-200 shadow-sm dark:border-amber-900/40">
            <CardHeader className="bg-amber-50/70 dark:bg-card/70">
              <CardTitle className="flex items-center gap-2">
                <ReceiptText className="h-5 w-5 text-amber-700 dark:text-amber-300" />
                Bill Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-6">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Order #{nextOrderNumber}</Badge>
                <Badge variant="outline">{currentOrderSource === 'diner-mobile' ? 'Diner Mobile' : 'Counter'}</Badge>
              </div>

              <div className="rounded-xl bg-amber-50 p-4 dark:bg-muted/30">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span className="flex items-center gap-2"><Users className="h-4 w-4" /> Seating</span>
                  <span>{selectedTable ? selectedTable.name : 'Takeaway'}</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-sm text-muted-foreground">
                  <span>Customer count</span>
                  <span>{currentCustomerCount} pax</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-sm text-muted-foreground">
                  <span>Order source</span>
                  <span>{currentOrderSource === 'diner-mobile' ? 'Diner Mobile' : 'Counter'}</span>
                </div>
                <Separator className="my-3" />
                <div className="flex items-end justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Grand total</span>
                  <span className="text-4xl font-black tracking-tight text-foreground">
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
                <div className="flex justify-between"><span>Subtotal</span><span>{settings.currencySymbol}{subtotal.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Tax ({settings.taxRate}%)</span><span>{settings.currencySymbol}{tax.toFixed(2)}</span></div>
                <div className="flex justify-between font-semibold text-foreground"><span>Final total</span><span>{settings.currencySymbol}{total.toFixed(2)}</span></div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-amber-200 shadow-sm dark:border-amber-900/40">
            <CardHeader className="bg-amber-50/70 dark:bg-card/70">
              <CardTitle className="flex items-center gap-2">
                <ScanBarcode className="h-5 w-5 text-amber-700 dark:text-amber-300" />
                Bill Barcode
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-6">
              <div className="rounded-2xl border-2 border-dashed border-amber-200 bg-background p-4 text-center shadow-inner dark:bg-card">
                <p className="text-xs text-muted-foreground">Bill Code</p>
                <p className="font-mono text-lg font-semibold tracking-widest">{billCode}</p>
                <div className="mt-4 overflow-x-auto rounded-lg bg-background p-2 dark:bg-card" dangerouslySetInnerHTML={{ __html: barcodeSvg }} />
              </div>
              <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
                Cash collector can search or scan this bill code at the pay counter.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-between">
          <Button variant="outline" size="lg" onClick={() => router.push('/pos')}>Back to POS</Button>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button variant="secondary" size="lg" className="gap-2" onClick={handlePrintBillingSlip} disabled={cart.length === 0 || isSubmitting}>
              <Printer className="h-4 w-4" />
              Print Billing Slip
            </Button>
            <Button size="lg" className="min-w-64" onClick={handleSendToPayCounter} disabled={isSubmitting || cart.length === 0}>
              {isSubmitting ? 'Sending...' : 'Send Bill to Pay Counter'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
