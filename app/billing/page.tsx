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
    if (mounted && !currentUser) {
      router.push('/')
    }
  }, [currentUser, mounted, router])

  useEffect(() => {
    if (mounted && cart.length === 0) {
      router.push('/pos')
    }
  }, [cart.length, mounted, router])

  const { subtotal, tax, total } = getCartTotal()
  const perCustomer = useMemo(() => total / Math.max(currentCustomerCount, 1), [currentCustomerCount, total])
  const nextOrderNumber = getNextOrderNumber()
  const now = new Date().toISOString()
  const billCode = generateBillCode(nextOrderNumber, now)
  const barcodeSvg = generateBarcodeSVG(billCode)

  const handleSendToPayCounter = async () => {
    if (cart.length === 0) return

    setIsSubmitting(true)
    try {
      const tableLabel = selectedTable
        ? `${selectedTable.name} • ${currentCustomerCount} pax • ${currentOrderSource === 'diner-mobile' ? 'Diner Mobile' : 'Counter'}`
        : `Takeaway • ${currentCustomerCount} pax • ${currentOrderSource === 'diner-mobile' ? 'Diner Mobile' : 'Counter'}`

      const order = {
        id: `order-${Date.now()}`,
        orderNumber: nextOrderNumber,
        tableId: selectedTable?.id,
        tableName: tableLabel,
        items: [...cart],
        subtotal,
        tax,
        total,
        status: 'pending' as const,
        paymentMethod: undefined,
        paymentStatus: 'pending' as const,
        createdAt: now,
        updatedAt: now,
        createdBy: currentUser?.id || 'unknown',
      }

      addOrder(order)

      if (selectedTable) {
        updateTableStatus(selectedTable.id, 'occupied', order.id)
      }

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
    <div className="flex h-screen flex-col bg-background">
      <Header title="Billing Counter" />

      <div className="mx-auto w-full max-w-5xl flex-1 overflow-y-auto p-4 md:p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Bill Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Order #{nextOrderNumber}</Badge>
                <Badge variant="outline">{currentOrderSource === 'diner-mobile' ? 'Diner Mobile' : 'Counter'}</Badge>
              </div>

              <div className="text-sm text-muted-foreground">
                {selectedTable ? `Table: ${selectedTable.name}` : 'Takeaway'} • {currentCustomerCount} customer(s)
              </div>

              <Separator />

              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span>Subtotal</span><span>{settings.currencySymbol}{subtotal.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Tax ({settings.taxRate}%)</span><span>{settings.currencySymbol}{tax.toFixed(2)}</span></div>
                <div className="flex justify-between text-lg font-semibold"><span>Total</span><span>{settings.currencySymbol}{total.toFixed(2)}</span></div>
                {currentCustomerCount > 1 && (
                  <div className="flex justify-between text-primary">
                    <span>Split per customer</span>
                    <span>{settings.currencySymbol}{perCustomer.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Bill Barcode</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-lg border p-3 text-center">
                <p className="text-xs text-muted-foreground">Bill Code</p>
                <p className="font-mono text-base font-semibold">{billCode}</p>
                <div className="mt-3 overflow-x-auto" dangerouslySetInnerHTML={{ __html: barcodeSvg }} />
              </div>
              <p className="text-xs text-muted-foreground">
                Cash collector can search or scan this bill code at the pay counter.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => router.push('/pos')}>Back to POS</Button>
          <Button onClick={handleSendToPayCounter} disabled={isSubmitting || cart.length === 0}>
            {isSubmitting ? 'Sending...' : 'Send Bill to Pay Counter'}
          </Button>
        </div>
      </div>
    </div>
  )
}
