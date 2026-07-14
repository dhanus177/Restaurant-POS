'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/shared/header'
import { MenuGrid } from '@/components/pos/menu-grid'
import { OrderModifiers } from '@/components/pos/order-modifiers'
import { usePOSStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { ChevronRight, Send, Trash2, Table2, Users } from 'lucide-react'
import { printReceipt } from '@/lib/print'
import type { MenuItem, Order, SelectedModifier, Table as RestaurantTable } from '@/lib/types'

export default function WaiterPage() {
  const router = useRouter()
  const {
    currentUser,
    tables,
    selectedTable,
    setSelectedTable,
    cart,
    addToCart,
    clearCart,
    getCartTotal,
    settings,
    getNextOrderNumber,
    addOrder,
    updateTableStatus,
  } = usePOSStore()

  const [mounted, setMounted] = useState(false)
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null)
  const [showModifiers, setShowModifiers] = useState(false)
  const [selectedChair, setSelectedChair] = useState(1)
  const [isSending, setIsSending] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted || !currentUser) return
    if (!['waiter', 'admin', 'super-admin'].includes(currentUser.role)) {
      router.push('/pos')
    }
  }, [currentUser, mounted, router])

  useEffect(() => {
    if (selectedTable) {
      setSelectedChair((prev) => Math.min(Math.max(prev, 1), Math.max(selectedTable.seats, 1)))
    } else {
      setSelectedChair(1)
    }
  }, [selectedTable])

  const openTables = useMemo(
    () => [...tables].filter((table) => table.status !== 'reserved').sort((a, b) => a.number - b.number),
    [tables]
  )

  const chairCount = selectedTable?.seats ?? 0
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0)
  const { subtotal, tax, total } = getCartTotal()

  const selectTable = (table: RestaurantTable) => {
    setSelectedTable(table)
    setSelectedChair(1)
  }

  const ensureReady = () => {
    if (!selectedTable) {
      toast.error('Please select a table first')
      return false
    }

    if (selectedChair < 1 || selectedChair > selectedTable.seats) {
      toast.error('Please select a valid chair')
      return false
    }

    return true
  }

  const handleSelectItem = (item: MenuItem) => {
    if (!ensureReady()) return

    if (item.modifierGroups && item.modifierGroups.length > 0) {
      setSelectedItem(item)
      setShowModifiers(true)
      return
    }

    addToCart({
      id: `cart-${Date.now()}`,
      menuItemId: item.id,
      name: item.name,
      quantity: 1,
      price: item.price,
      modifiers: [],
      serviceChargeApplicable: item.applyServiceCharge,
      chairNumber: selectedChair,
    })
  }

  const handleConfirmModifiers = (item: MenuItem, modifiers: SelectedModifier[], quantity: number) => {
    if (!ensureReady()) return

    addToCart({
      id: `cart-${Date.now()}`,
      menuItemId: item.id,
      name: item.name,
      quantity,
      price: item.price,
      modifiers,
      serviceChargeApplicable: item.applyServiceCharge,
      chairNumber: selectedChair,
    })

    setSelectedItem(null)
    setShowModifiers(false)
  }

  const buildPendingOrder = (): Order => {
    const now = new Date().toISOString()
    const orderNumber = getNextOrderNumber()

    return {
      id: `waiter-order-${Date.now()}`,
      orderNumber,
      tableId: selectedTable?.id,
      tableName: selectedTable?.name ?? 'Table',
      items: cart.map((item) => ({
        ...item,
        chairNumber: item.chairNumber ?? selectedChair,
      })),
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

  const handleSendToBiller = async () => {
    if (!ensureReady()) return
    if (cart.length === 0) {
      toast.error('Add at least one item before sending the order')
      return
    }

    setIsSending(true)
    try {
      const order = buildPendingOrder()
      addOrder(order)

      if (selectedTable) {
        updateTableStatus(selectedTable.id, 'occupied', order.id)
      }

      clearCart({ keepTable: true, keepCustomerCount: true })
      toast.success(`Order ${order.orderNumber} sent to biller`)
      router.push('/pay')
    } finally {
      setIsSending(false)
    }
  }

  const handleClearDraft = () => {
    if (!selectedTable) return

    toast.success(`Draft cleared for chair ${selectedChair}`)
    clearCart({ keepTable: true, keepCustomerCount: true })
  }

  const handleQuickPrint = () => {
    if (cart.length === 0) {
      toast.error('Nothing to print yet')
      return
    }

    const draft = buildPendingOrder()
    printReceipt(draft, settings)
  }

  if (!mounted || !currentUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh flex-col bg-gradient-to-b from-sky-50 via-background to-background dark:from-slate-950 dark:via-background dark:to-background">
      <Header title="Waiter POS" />

      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-4 overflow-hidden p-3 sm:p-4 lg:p-6">
        <div className="rounded-2xl border border-sky-200 bg-sky-50/70 p-4 shadow-sm dark:border-sky-900/40 dark:bg-card/80">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700 dark:text-sky-300">Waiter service</p>
              <h1 className="text-xl font-bold text-foreground sm:text-2xl">Choose a table, pick a chair, and send each chair&apos;s order separately</h1>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="bg-sky-100 text-sky-900 hover:bg-sky-100 dark:bg-sky-500/15 dark:text-sky-200">
                {currentUser.role}
              </Badge>
              <Badge variant="outline">{cartCount} items</Badge>
              {selectedTable && <Badge variant="outline">Table {selectedTable.name}</Badge>}
              {selectedTable && <Badge variant="outline">Chair {selectedChair}</Badge>}
            </div>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_380px]">
          <div className="space-y-4 min-w-0">
            <Card className="border-sky-200 shadow-sm dark:border-sky-900/40">
              <CardHeader className="bg-sky-50/70 dark:bg-card/70">
                <CardTitle className="flex items-center gap-2">
                  <Table2 className="h-5 w-5 text-sky-700 dark:text-sky-300" />
                  Table selection
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-4 sm:p-6">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                  {openTables.map((table) => (
                    <Button
                      key={table.id}
                      type="button"
                      variant={selectedTable?.id === table.id ? 'default' : 'outline'}
                      className={cn(
                        'h-20 flex-col items-start justify-between p-3 text-left',
                        selectedTable?.id === table.id && 'bg-sky-600 text-white hover:bg-sky-600'
                      )}
                      onClick={() => selectTable(table)}
                    >
                      <div className="flex w-full items-center justify-between gap-2">
                        <span className="font-semibold">{table.name}</span>
                        <ChevronRight className="h-4 w-4 opacity-70" />
                      </div>
                      <div className="flex w-full items-center justify-between text-xs opacity-80">
                        <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {table.seats}</span>
                        <span className="capitalize">{table.status}</span>
                      </div>
                    </Button>
                  ))}
                </div>
                {selectedTable && (
                  <div className="rounded-xl border bg-background p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{selectedTable.name}</p>
                        <p className="text-xs text-muted-foreground">Select a chair before adding items.</p>
                      </div>
                      <Badge variant="secondary">{chairCount} chairs</Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {Array.from({ length: chairCount }, (_, index) => index + 1).map((chair) => (
                        <Button
                          key={chair}
                          type="button"
                          size="sm"
                          variant={selectedChair === chair ? 'default' : 'outline'}
                          className={cn(selectedChair === chair && 'bg-sky-600 text-white hover:bg-sky-600')}
                          onClick={() => setSelectedChair(chair)}
                        >
                          Chair {chair}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="min-h-[28rem] border-sky-200 shadow-sm dark:border-sky-900/40">
              <CardHeader className="bg-sky-50/70 dark:bg-card/70">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-sky-700 dark:text-sky-300" />
                  Menu for {selectedTable ? selectedTable.name : 'selected table'}
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[32rem] p-0">
                <MenuGrid onSelectItem={handleSelectItem} />
              </CardContent>
            </Card>
          </div>

          <Card className="h-fit border-sky-200 shadow-sm dark:border-sky-900/40">
            <CardHeader className="bg-sky-50/70 dark:bg-card/70">
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5 text-sky-700 dark:text-sky-300" />
                Biller handoff
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-4 sm:p-6">
              <div className="rounded-xl bg-sky-50 p-4 dark:bg-muted/30">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Table</span>
                  <span className="font-medium text-foreground">{selectedTable?.name ?? 'Not selected'}</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-sm text-muted-foreground">
                  <span>Chair</span>
                  <span className="font-medium text-foreground">{selectedTable ? `Chair ${selectedChair}` : '-'}</span>
                </div>
                <Separator className="my-3" />
                <div className="flex items-end justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Total</span>
                  <span className="text-3xl font-black tracking-tight text-foreground">{settings.currencySymbol}{total.toFixed(2)}</span>
                </div>
                {tax > 0 && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Service charge: {settings.currencySymbol}{tax.toFixed(2)}
                  </p>
                )}
              </div>

              <Separator />

              <ScrollArea className="max-h-[26rem] pr-3">
                {cart.length === 0 ? (
                  <div className="flex min-h-32 items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
                    No items added yet
                  </div>
                ) : (
                  <div className="space-y-3">
                    {cart.map((item) => (
                      <div key={item.id} className="rounded-xl border bg-background p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-foreground truncate">{item.name}</p>
                            <div className="mt-1 flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                              <span>Chair {item.chairNumber ?? selectedChair}</span>
                              <span>Qty {item.quantity}</span>
                            </div>
                            {item.modifiers.length > 0 && (
                              <p className="mt-1 text-xs text-muted-foreground">+ {item.modifiers.map((modifier) => modifier.name).join(', ')}</p>
                            )}
                            {item.notes && <p className="mt-1 text-xs italic text-sky-700 dark:text-sky-300">Note: {item.notes}</p>}
                          </div>
                          <p className="whitespace-nowrap font-semibold text-foreground">
                            {settings.currencySymbol}{((item.price + item.modifiers.reduce((sum, modifier) => sum + modifier.price, 0)) * item.quantity).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>

              <div className="grid grid-cols-2 gap-2">
                <Button type="button" variant="outline" onClick={handleQuickPrint} disabled={cart.length === 0}>
                  Print Draft
                </Button>
                <Button type="button" variant="outline" onClick={handleClearDraft} disabled={cart.length === 0 || !selectedTable}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Clear Draft
                </Button>
              </div>

              <Button size="lg" className="w-full h-14 text-base font-semibold" onClick={handleSendToBiller} disabled={isSending || cart.length === 0 || !selectedTable}>
                {isSending ? 'Sending...' : 'Send to Biller'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <OrderModifiers
        item={selectedItem}
        open={showModifiers}
        onClose={() => {
          setShowModifiers(false)
          setSelectedItem(null)
        }}
        onConfirm={handleConfirmModifiers}
      />
    </div>
  )
}