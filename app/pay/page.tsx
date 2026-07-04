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
import { ScanBarcode, Search, CreditCard, ReceiptText, ShoppingBag, Check, DollarSign } from 'lucide-react'
import { toast } from 'sonner'

export default function PayPage() {
  const router = useRouter()
  const {
    currentUser,
    orders,
    settings,
    cashDrawer,
    cashDrawerExpenses,
    cashDrawerReports,
    updateCashDrawer,
    addCashDrawerExpense,
    createCashDrawerReport,
    getCashDrawerBalance,
    updateOrderStatus,
    updateOrderPayment,
    updateTableStatus,
  } = usePOSStore()
  const [mounted, setMounted] = useState(false)
  const [query, setQuery] = useState('')
  const [scanCode, setScanCode] = useState('')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [openingBalanceInput, setOpeningBalanceInput] = useState('0')
  const [countedCashInput, setCountedCashInput] = useState('0')
  const [cashOutAmount, setCashOutAmount] = useState('')
  const [cashOutReason, setCashOutReason] = useState('')
  const [drawerNotes, setDrawerNotes] = useState('')
  const [closeoutNotes, setCloseoutNotes] = useState('')
  const [isSavingDrawer, setIsSavingDrawer] = useState(false)
  const [isSavingCashOut, setIsSavingCashOut] = useState(false)
  const [isClosingDrawer, setIsClosingDrawer] = useState(false)
  const canReverseBills = currentUser?.role === 'admin' || currentUser?.role === 'super-admin'
  const canManageDrawer = currentUser?.role === 'admin' || currentUser?.role === 'super-admin'
  const canRecordCashOut = ['admin', 'super-admin', 'pay-counter'].includes(currentUser?.role ?? '')

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    setOpeningBalanceInput(String(cashDrawer?.openingBalance ?? 0))
    setDrawerNotes(cashDrawer?.notes ?? '')
  }, [cashDrawer])

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

  const drawerBalance = getCashDrawerBalance()

  useEffect(() => {
    setCountedCashInput(drawerBalance.currentBalance.toFixed(2))
  }, [drawerBalance.currentBalance])

  const handleSaveCashDrawer = async () => {
    if (!canManageDrawer) {
      toast.error('Only admin and super-admin can change cash drawer balance')
      return
    }

    const openingBalance = Number(openingBalanceInput)
    if (!Number.isFinite(openingBalance) || openingBalance < 0) {
      toast.error('Opening balance must be a non-negative number')
      return
    }

    setIsSavingDrawer(true)
    try {
      updateCashDrawer({
        openingBalance,
        notes: drawerNotes.trim() || null,
        openedAt: new Date().toISOString(),
      })
      toast.success('Cash drawer balance saved')
    } finally {
      setIsSavingDrawer(false)
    }
  }

  const handleCashOut = async () => {
    if (!canRecordCashOut) {
      toast.error('You do not have access to record cash spending')
      return
    }

    const amount = Number(cashOutAmount)
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('Cash out amount must be greater than zero')
      return
    }

    if (!cashOutReason.trim()) {
      toast.error('Cash out reason is required')
      return
    }

    setIsSavingCashOut(true)
    try {
      const created = await addCashDrawerExpense({
        amount,
        reason: cashOutReason.trim(),
        createdBy: currentUser?.id || 'unknown',
      })

      if (!created) {
        throw new Error('Failed to save cash spending')
      }

      setCashOutAmount('')
      setCashOutReason('')
      toast.success('Cash out recorded')
    } catch (error: any) {
      console.error(error)
      toast.error(error.message || 'Failed to save cash spending')
    } finally {
      setIsSavingCashOut(false)
    }
  }

  const handleCloseCashDrawer = async () => {
    if (!canManageDrawer) {
      toast.error('Only admin and super-admin can close the cash drawer')
      return
    }

    const countedCash = Number(countedCashInput)
    if (!Number.isFinite(countedCash) || countedCash < 0) {
      toast.error('Counted cash must be a non-negative number')
      return
    }

    const expectedBalance = drawerBalance.currentBalance
    const variance = countedCash - expectedBalance

    setIsClosingDrawer(true)
    try {
      const report = await createCashDrawerReport({
        openingBalance: drawerBalance.openingBalance,
        expectedBalance,
        countedCash,
        variance,
        notes: closeoutNotes.trim() || drawerNotes.trim() || null,
        closedBy: currentUser?.id || 'unknown',
      })

      if (!report) {
        throw new Error('Failed to save cash drawer report')
      }

      toast.success(
        variance === 0
          ? 'Cash drawer closed with no variance'
          : `Cash drawer closed. Variance: ${settings.currencySymbol}${Math.abs(variance).toFixed(2)}`
      )
    } catch (error: any) {
      console.error(error)
      toast.error(error.message || 'Failed to close cash drawer')
    } finally {
      setIsClosingDrawer(false)
    }
  }

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

  const closeoutVariance = Number(countedCashInput || 0) - drawerBalance.currentBalance

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

          <Card className="border-emerald-200 shadow-sm dark:border-emerald-900/40">
            <CardHeader className="bg-emerald-50/70 dark:bg-card/70">
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-emerald-700 dark:text-emerald-300" />
                Cash Drawer Balance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg bg-emerald-50 p-3 dark:bg-muted/30">
                  <p className="text-xs uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">Opening balance</p>
                  <p className="mt-1 text-xl font-bold text-foreground">{settings.currencySymbol}{drawerBalance.openingBalance.toFixed(2)}</p>
                </div>
                <div className="rounded-lg bg-background p-3 border">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Current balance</p>
                  <p className="mt-1 text-xl font-bold text-foreground">{settings.currencySymbol}{drawerBalance.currentBalance.toFixed(2)}</p>
                </div>
              </div>
              <div className="grid gap-2 text-sm text-muted-foreground">
                <div className="flex items-center justify-between"><span>Cash sales</span><span className="font-medium text-foreground">{settings.currencySymbol}{drawerBalance.cashSales.toFixed(2)}</span></div>
                <div className="flex items-center justify-between"><span>Cash refunds</span><span className="font-medium text-foreground">- {settings.currencySymbol}{drawerBalance.cashRefunds.toFixed(2)}</span></div>
                <div className="flex items-center justify-between"><span>Cash out</span><span className="font-medium text-foreground">- {settings.currencySymbol}{cashDrawerExpenses.reduce((sum, item) => sum + item.amount, 0).toFixed(2)}</span></div>
                <div className="flex items-center justify-between"><span>Drawer opened</span><span className="font-medium text-foreground">{cashDrawer?.openedAt ? new Date(cashDrawer.openedAt).toLocaleString() : 'Not set'}</span></div>
              </div>

              {canManageDrawer ? (
                <div className="space-y-3 rounded-lg border bg-background p-4">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground" htmlFor="opening-balance">Opening balance</label>
                      <Input
                        id="opening-balance"
                        type="number"
                        min="0"
                        step="0.01"
                        value={openingBalanceInput}
                        onChange={(e) => setOpeningBalanceInput(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground" htmlFor="drawer-notes">Notes</label>
                      <Input
                        id="drawer-notes"
                        value={drawerNotes}
                        onChange={(e) => setDrawerNotes(e.target.value)}
                        placeholder="Optional note"
                      />
                    </div>
                  </div>
                  <Button className="w-full" onClick={() => void handleSaveCashDrawer()} disabled={isSavingDrawer}>
                    {isSavingDrawer ? 'Saving...' : 'Set / Reset Drawer Balance'}
                  </Button>
                </div>
              ) : (
                <p className="rounded-lg bg-background p-3 text-sm text-muted-foreground border">
                  Current drawer balance is visible to pay counter staff. Only admin and super-admin can reset the opening balance.
                </p>
              )}

              <div className="space-y-3 rounded-lg border bg-background p-4">
                <div className="text-sm font-semibold text-foreground">Cash Spending / Cash Out</div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground" htmlFor="cash-out-amount">Amount</label>
                    <Input
                      id="cash-out-amount"
                      type="number"
                      min="0"
                      step="0.01"
                      value={cashOutAmount}
                      onChange={(e) => setCashOutAmount(e.target.value)}
                      disabled={!canRecordCashOut}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground" htmlFor="cash-out-reason">Reason</label>
                    <Input
                      id="cash-out-reason"
                      value={cashOutReason}
                      onChange={(e) => setCashOutReason(e.target.value)}
                      placeholder="Petty cash, supplier advance..."
                      disabled={!canRecordCashOut}
                    />
                  </div>
                </div>
                <Button className="w-full" variant="outline" onClick={() => void handleCashOut()} disabled={isSavingCashOut || !canRecordCashOut}>
                  {isSavingCashOut ? 'Saving cash out...' : 'Record Cash Out'}
                </Button>

                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">Recent Cash Out Entries</p>
                  {cashDrawerExpenses.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No cash spending recorded.</p>
                  ) : (
                    <div className="space-y-2">
                      {cashDrawerExpenses.slice(0, 5).map((expense) => (
                        <div key={expense.id} className="rounded-lg border bg-background p-3 text-sm">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium text-foreground">{settings.currencySymbol}{expense.amount.toFixed(2)}</span>
                            <span className="text-muted-foreground">{new Date(expense.createdAt).toLocaleString()}</span>
                          </div>
                          <div className="mt-1 text-muted-foreground">{expense.reason}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3 rounded-lg border bg-background p-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground" htmlFor="counted-cash">Counted cash at close</label>
                  <Input
                    id="counted-cash"
                    type="number"
                    min="0"
                    step="0.01"
                    value={countedCashInput}
                    onChange={(e) => setCountedCashInput(e.target.value)}
                    disabled={!canManageDrawer}
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-3 text-sm">
                  <div className="rounded-lg bg-emerald-50 p-3 dark:bg-muted/30">
                    <p className="text-xs uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">Expected</p>
                    <p className="mt-1 font-bold text-foreground">{settings.currencySymbol}{drawerBalance.currentBalance.toFixed(2)}</p>
                  </div>
                  <div className="rounded-lg bg-background p-3 border">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Counted</p>
                    <p className="mt-1 font-bold text-foreground">{settings.currencySymbol}{(Number(countedCashInput) || 0).toFixed(2)}</p>
                  </div>
                  <div className={`rounded-lg p-3 border ${closeoutVariance === 0 ? 'bg-background' : closeoutVariance > 0 ? 'bg-emerald-50 dark:bg-emerald-500/10' : 'bg-red-50 dark:bg-red-500/10'}`}>
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Variance</p>
                    <p className={`mt-1 font-bold ${closeoutVariance === 0 ? 'text-foreground' : closeoutVariance > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                      {closeoutVariance >= 0 ? '+' : '-'}{settings.currencySymbol}{Math.abs(closeoutVariance).toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground" htmlFor="closeout-notes">Close-out notes</label>
                  <Input
                    id="closeout-notes"
                    value={closeoutNotes}
                    onChange={(e) => setCloseoutNotes(e.target.value)}
                    placeholder="Optional closing note"
                  />
                </div>

                <Button className="w-full" variant="secondary" onClick={() => void handleCloseCashDrawer()} disabled={isClosingDrawer || !canManageDrawer}>
                  {isClosingDrawer ? 'Closing drawer...' : 'Close Drawer & Save Report'}
                </Button>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-semibold text-foreground">Recent close-out reports</p>
                {cashDrawerReports.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No cash drawer reports recorded yet.</p>
                ) : (
                  <div className="space-y-2">
                    {cashDrawerReports.slice(0, 5).map((report) => (
                      <div key={report.id} className="rounded-lg border bg-background p-3 text-sm">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-foreground">{new Date(report.closedAt).toLocaleString()}</span>
                          <span className={`font-semibold ${report.variance === 0 ? 'text-foreground' : report.variance > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                            {report.variance >= 0 ? '+' : '-'}{settings.currencySymbol}{Math.abs(report.variance).toFixed(2)}
                          </span>
                        </div>
                        <div className="mt-1 text-muted-foreground">
                          Expected {settings.currencySymbol}{report.expectedBalance.toFixed(2)} · Counted {settings.currencySymbol}{report.countedCash.toFixed(2)}
                        </div>
                        {report.notes && <div className="mt-1 text-muted-foreground">Note: {report.notes}</div>}
                      </div>
                    ))}
                  </div>
                )}
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
