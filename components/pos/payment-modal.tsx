'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { usePOSStore } from '@/lib/store'
import { Banknote, CreditCard, CheckCircle2, Printer } from 'lucide-react'
import { toast } from 'sonner'
import type { Order, PaymentMethod } from '@/lib/types'
import { printKitchenDocket, printReceipt, printTakeawayDocket } from '@/lib/print'

interface PaymentModalProps {
  open: boolean
  onClose: () => void
  onComplete: () => void
  order?: Order | null
}

const quickCashAmounts = [5, 10, 20, 50, 100]

function groupChairSummary(order: Order | undefined) {
  if (!order) return []

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

export function PaymentModal({ open, onClose, onComplete, order }: PaymentModalProps) {
  const {
    cart,
    selectedTable,
    currentUser,
    settings,
    getCartTotal,
    getNextOrderNumber,
    addOrder,
    updateOrderPayment,
    updateTableStatus,
    clearCart,
  } = usePOSStore()

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')
  const [cashReceived, setCashReceived] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null)

  const cartTotals = getCartTotal()
  const subtotal = order?.subtotal ?? cartTotals.subtotal
  const tax = order?.tax ?? cartTotals.tax
  const total = order?.total ?? cartTotals.total
  const cashAmount = parseFloat(cashReceived) || 0
  const change = cashAmount - total
  const chairSummary = groupChairSummary(order)
  const isCashierTakeawayFlow = Boolean(order && !order.tableId)

  const handlePayment = async () => {
    if (paymentMethod === 'cash' && cashAmount < total) {
      toast.error('Insufficient cash received')
      return
    }

    setIsProcessing(true)

    // Simulate payment processing
    await new Promise((resolve) => setTimeout(resolve, 1000))

    if (order) {
      updateOrderPayment(order.id, paymentMethod, 'paid', currentUser?.name || 'Unknown')
      const paidOrder: Order = {
        ...order,
        paymentMethod,
        paymentStatus: 'paid',
        paymentCollectedBy: currentUser?.name || 'Unknown',
      }

      setCompletedOrder(paidOrder)
      setIsComplete(true)
      setIsProcessing(false)
      if (!order.tableId) {
        // Cashier takeaway flow: print kitchen docket + takeaway docket immediately.
        printKitchenDocket(paidOrder, settings)
        printTakeawayDocket(paidOrder, settings)
      }
      toast.success(`Bill #${order.orderNumber} paid successfully!`)
      return
    }

    const orderNumber = getNextOrderNumber()
    const newOrder: Order = {
      id: `order-${Date.now()}`,
      orderNumber,
      tableId: selectedTable?.id,
      tableName: selectedTable?.name,
      items: [...cart],
      subtotal,
      tax,
      total,
      status: 'pending',
      paymentMethod,
      paymentStatus: 'paid',
      paymentCollectedBy: currentUser?.name || 'Unknown',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: currentUser?.id || 'unknown',
    }

    addOrder(newOrder)

    if (selectedTable) {
      updateTableStatus(selectedTable.id, 'occupied', newOrder.id)
    }

    setCompletedOrder(newOrder)
    setIsComplete(true)
    setIsProcessing(false)

    if (!newOrder.tableId) {
      // Cashier takeaway flow: print kitchen docket + takeaway docket immediately.
      printKitchenDocket(newOrder, settings)
      printTakeawayDocket(newOrder, settings)
    } else {
      // Dine-in counter flow keeps bill printing.
      printReceipt(newOrder, settings)
    }

    toast.success(`Order #${orderNumber} placed successfully!`)
  }

  const handlePrintReceipt = () => {
    if (completedOrder) {
      printReceipt(completedOrder, settings)
    }
  }

  const handleClose = () => {
    if (isComplete && !order) {
      clearCart()
      onComplete()
    }
    if (isComplete && order) {
      onComplete()
    }
    setPaymentMethod('cash')
    setCashReceived('')
    setIsProcessing(false)
    setIsComplete(false)
    setCompletedOrder(null)
    onClose()
  }

  const handleNewOrder = () => {
    if (!order) {
      clearCart()
    }
    handleClose()
    onComplete()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isComplete ? 'Payment Complete' : 'Process Payment'}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {isComplete
              ? 'Payment completed. You can print the final bill or return to continue operations.'
              : 'Choose payment method and complete cashier payment for this order.'}
          </DialogDescription>
        </DialogHeader>

        {isComplete ? (
          <div className="py-8 text-center">
            <div className="flex justify-center mb-4">
              <CheckCircle2 className="h-16 w-16 text-primary" />
            </div>
            <h3 className="text-2xl font-bold mb-2">
              Order #{completedOrder?.orderNumber}
            </h3>
            <p className="text-muted-foreground mb-6">
              Payment received successfully
            </p>

            {paymentMethod === 'cash' && change > 0 && (
              <div className="bg-primary/10 rounded-lg p-4 mb-6">
                <p className="text-sm text-muted-foreground">Change Due</p>
                <p className="text-3xl font-bold text-primary">
                  {settings.currencySymbol}{change.toFixed(2)}
                </p>
              </div>
            )}

            <div className="flex flex-col gap-3">
              {!isCashierTakeawayFlow && (
                <Button variant="outline" onClick={handlePrintReceipt} className="gap-2">
                  <Printer className="h-4 w-4" />
                  Print Final Bill
                </Button>
              )}
              <Button onClick={handleNewOrder} className="gap-2">
                {order ? 'Back to Cashier' : 'Start New Order'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="py-4">
            {/* Order Summary */}
            <div className="bg-secondary/50 rounded-lg p-4 mb-6">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{settings.currencySymbol}{subtotal.toFixed(2)}</span>
              </div>
              {tax > 0 && (
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Service Charge ({settings.taxRate}%)</span>
                  <span>{settings.currencySymbol}{tax.toFixed(2)}</span>
                </div>
              )}
              <Separator className="my-2" />
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span className="text-primary">{settings.currencySymbol}{total.toFixed(2)}</span>
              </div>
            </div>

            {chairSummary.length > 0 && (
              <div className="mb-6 rounded-lg border bg-background p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Chair split</p>
                    <p className="text-sm font-semibold text-foreground">Items grouped by chair</p>
                  </div>
                  <Badge variant="secondary">{chairSummary.length} group{chairSummary.length === 1 ? '' : 's'}</Badge>
                </div>
                <div className="space-y-2">
                  {chairSummary.map((chair) => (
                    <div key={`${order?.id ?? 'order'}-chair-${chair.chairNumber}`} className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2 text-sm">
                      <span className="font-medium text-foreground">
                        {chair.chairNumber > 0 ? `Chair ${chair.chairNumber}` : 'Unassigned'}
                      </span>
                      <span className="text-muted-foreground">
                        {chair.itemCount} item{chair.itemCount === 1 ? '' : 's'} • {settings.currencySymbol}{chair.lineTotal.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Payment Method Tabs */}
            <Tabs value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="cash" className="gap-2">
                  <Banknote className="h-4 w-4" />
                  Cash
                </TabsTrigger>
                <TabsTrigger value="card" className="gap-2">
                  <CreditCard className="h-4 w-4" />
                  Card
                </TabsTrigger>
              </TabsList>

              <TabsContent value="cash" className="mt-4 space-y-4">
                <div>
                  <Label>Cash Received</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={cashReceived}
                    onChange={(e) => setCashReceived(e.target.value)}
                    placeholder="0.00"
                    className="text-2xl h-14 mt-2"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  {quickCashAmounts.map((amount) => (
                    <Button
                      key={amount}
                      variant="outline"
                      size="lg"
                      onClick={() => setCashReceived(amount.toString())}
                    >
                      {settings.currencySymbol}{amount}
                    </Button>
                  ))}
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => setCashReceived(Math.ceil(total).toString())}
                  >
                    Exact
                  </Button>
                </div>

                {cashAmount >= total && (
                  <div className="bg-primary/10 rounded-lg p-3 text-center">
                    <p className="text-sm text-muted-foreground">Change</p>
                    <p className="text-xl font-bold text-primary">
                      {settings.currencySymbol}{change.toFixed(2)}
                    </p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="card" className="mt-4">
                <div className="bg-secondary/50 rounded-lg p-6 text-center">
                  <CreditCard className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    Ready to accept card payment
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Tap, insert, or swipe card
                  </p>
                </div>
              </TabsContent>
            </Tabs>

            {/* Action Buttons */}
            <div className="flex gap-3 mt-6">
              <Button variant="outline" onClick={handleClose} className="flex-1">
                Cancel
              </Button>
              <Button
                onClick={handlePayment}
                disabled={isProcessing || (paymentMethod === 'cash' && cashAmount < total)}
                className="flex-1"
              >
                {isProcessing ? 'Processing...' : `Pay ${settings.currencySymbol}${total.toFixed(2)}`}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
