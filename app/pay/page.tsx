'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/shared/header'
import { usePOSStore } from '@/lib/store'
import { hasEffectiveRole } from '@/lib/roles'
import { apiFetch } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { PaymentModal } from '@/components/pos/payment-modal'
import { generateBillCode } from '@/lib/print'
import type { Order, Shift } from '@/lib/types'
import { ScanBarcode, Search, CreditCard, ReceiptText, ShoppingBag, Check, DollarSign, Wallet, HandCoins, BadgeDollarSign } from 'lucide-react'
import { toast } from 'sonner'

function groupChairSummary(order: Order) {
  const chairMap = new Map<number, { chairNumber: number; itemCount: number; itemTotal: number }>()

  for (const item of order.items) {
    const chairNumber = item.chairNumber ?? 0
    const current = chairMap.get(chairNumber) ?? { chairNumber, itemCount: 0, itemTotal: 0 }
    const lineTotal = (item.price + item.modifiers.reduce((sum, modifier) => sum + modifier.price, 0)) * item.quantity
    current.itemCount += item.quantity
    current.itemTotal += lineTotal
    chairMap.set(chairNumber, current)
  }

  return [...chairMap.values()].sort((a, b) => a.chairNumber - b.chairNumber)
}

const LKR_DENOMINATIONS = [5000, 1000, 500, 100, 50, 20, 10, 5, 2, 1] as const

const initialDenominationState = LKR_DENOMINATIONS.reduce<Record<string, string>>((acc, value) => {
  acc[String(value)] = ''
  return acc
}, {})

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
    getCashDrawerBalance,
    updateOrderStatus,
    updateOrderPayment,
    updateTableStatus,
    loadFromDB,
  } = usePOSStore()
  const [mounted, setMounted] = useState(false)
  const [query, setQuery] = useState('')
  const [scanCode, setScanCode] = useState('')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [openingBalanceInput, setOpeningBalanceInput] = useState('0')
  const [openingDenominationCounts, setOpeningDenominationCounts] = useState<Record<string, string>>(initialDenominationState)
  const [countedCashInput, setCountedCashInput] = useState('0')
  const [cashOutAmount, setCashOutAmount] = useState('')
  const [cashOutReason, setCashOutReason] = useState('')
  const [drawerNotes, setDrawerNotes] = useState('')
  const [closeoutNotes, setCloseoutNotes] = useState('')
  const [currentShift, setCurrentShift] = useState<Shift | null>(null)
  const [denominationCounts, setDenominationCounts] = useState<Record<string, string>>(initialDenominationState)
  const [showDrawerBalanceWindow, setShowDrawerBalanceWindow] = useState(false)
  const [showCashSpendWindow, setShowCashSpendWindow] = useState(false)
  const [showDenominationCloseoutWindow, setShowDenominationCloseoutWindow] = useState(false)
  const [isSavingDrawer, setIsSavingDrawer] = useState(false)
  const [isSavingCashOut, setIsSavingCashOut] = useState(false)
  const [isClosingDrawer, setIsClosingDrawer] = useState(false)
  const canReverseBills = hasEffectiveRole(currentUser?.role ?? '', ['admin', 'super-admin'], settings)
  const canManageDrawer = hasEffectiveRole(currentUser?.role ?? '', ['admin', 'super-admin', 'pay-counter'], settings)
  const canRecordCashOut = hasEffectiveRole(currentUser?.role ?? '', ['admin', 'super-admin', 'pay-counter'], settings)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    setOpeningBalanceInput(String(cashDrawer?.openingBalance ?? 0))
    setDrawerNotes(cashDrawer?.notes ?? '')
  }, [cashDrawer])

  useEffect(() => {
    if (!mounted || !currentUser) return
    void loadCurrentShift()
  }, [mounted, currentUser])

  useEffect(() => {
    if (mounted && !currentUser) {
      router.push('/')
      return
    }

    if (mounted && currentUser && !hasEffectiveRole(currentUser.role, ['admin', 'super-admin', 'pay-counter'], settings)) {
      router.push('/pos')
    }
  }, [currentUser, mounted, router, settings])

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

  const denominationTotal = useMemo(() => {
    return LKR_DENOMINATIONS.reduce((sum, denomination) => {
      const count = Number(denominationCounts[String(denomination)] || 0)
      return sum + (Number.isFinite(count) ? count : 0) * denomination
    }, 0)
  }, [denominationCounts])

  const openingDenominationTotal = useMemo(() => {
    return LKR_DENOMINATIONS.reduce((sum, denomination) => {
      const count = Number(openingDenominationCounts[String(denomination)] || 0)
      return sum + (Number.isFinite(count) ? count : 0) * denomination
    }, 0)
  }, [openingDenominationCounts])

  useEffect(() => {
    if (denominationTotal > 0) {
      setCountedCashInput(denominationTotal.toFixed(2))
      return
    }

    setCountedCashInput(drawerBalance.currentBalance.toFixed(2))
  }, [drawerBalance.currentBalance, denominationTotal])

  useEffect(() => {
    if (openingDenominationTotal > 0) {
      setOpeningBalanceInput(openingDenominationTotal.toFixed(2))
      return
    }

    setOpeningBalanceInput(String(cashDrawer?.openingBalance ?? 0))
  }, [cashDrawer?.openingBalance, openingDenominationTotal])

  const loadCurrentShift = async () => {
    try {
      const res = await apiFetch('/api/shifts/current')
      if (!res.ok) return
      const shift = (await res.json()) as Shift | null
      setCurrentShift(shift)
    } catch (error) {
      console.error('Failed to load current shift', error)
    }
  }

  const handleSaveCashDrawer = async () => {
    if (!canManageDrawer) {
      toast.error('Only admin, super-admin, and pay-counter can change cash drawer balance')
      return
    }

    const openingBalance = Number(openingBalanceInput)
    if (!Number.isFinite(openingBalance) || openingBalance < 0) {
      toast.error('Opening balance must be a non-negative number')
      return
    }

    setIsSavingDrawer(true)
    try {
      const nextOpeningBalance = openingDenominationTotal > 0 ? openingDenominationTotal : openingBalance
      updateCashDrawer({
        openingBalance: nextOpeningBalance,
        notes: drawerNotes.trim() || null,
        openedAt: new Date().toISOString(),
      })

      if (!currentShift) {
        const shiftRes = await apiFetch('/api/shifts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            openingFloat: nextOpeningBalance,
            notes: drawerNotes.trim() || null,
          }),
        })

        if (shiftRes.ok) {
          const openedShift = (await shiftRes.json()) as Shift
          setCurrentShift(openedShift)
          setOpeningDenominationCounts(initialDenominationState)
          setShowDrawerBalanceWindow(false)
          toast.success('Cash drawer balance saved and cash counter shift opened')
          return
        }
      }

      setOpeningDenominationCounts(initialDenominationState)
      setShowDrawerBalanceWindow(false)
      toast.success(currentShift ? 'Cash drawer balance saved' : 'Cash drawer balance saved and shift opened')
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
      setShowCashSpendWindow(false)
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
      toast.error('Only admin, super-admin, and pay-counter can close the cash drawer')
      return
    }

    const countedCash = Number(countedCashInput)
    if (!Number.isFinite(countedCash) || countedCash < 0) {
      toast.error('Counted cash must be a non-negative number')
      return
    }

    const expectedBalance = drawerBalance.currentBalance
    const variance = countedCash - expectedBalance

    if (!currentShift) {
      toast.error('No open shift found. Open a shift before closing the drawer.')
      return
    }

    setIsClosingDrawer(true)
    try {
      const closeRes = await apiFetch(`/api/shifts/${currentShift.id}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expectedCash: expectedBalance,
          countedCash,
          variance,
          denominations: Object.fromEntries(
            LKR_DENOMINATIONS.map((denomination) => [
              String(denomination),
              Number(denominationCounts[String(denomination)] || 0),
            ])
          ),
          notes: closeoutNotes.trim() || drawerNotes.trim() || null,
        }),
      })

      if (!closeRes.ok) {
        throw new Error('Failed to close shift and save close-out report')
      }

      setCurrentShift(null)
      setDenominationCounts(initialDenominationState)
      setShowDenominationCloseoutWindow(false)
      await loadFromDB()

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

  const handleCompleteTakeawayOrder = (order: Order) => {
    if (!confirm(`Mark takeaway order #${order.orderNumber} as completed?`)) return
    updateOrderStatus(order.id, 'completed')
  }

  const closeoutVariance = Number(countedCashInput || 0) - drawerBalance.currentBalance

  if (!mounted || !currentUser || !hasEffectiveRole(currentUser.role, ['admin', 'super-admin', 'pay-counter'], settings)) {
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
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => router.push('/billing')}>
              Go to Billing
            </Button>
          </div>
        </div>

        {filtered.length === 0 ? (
          <Card className="mb-4">
            <CardContent className="py-10 text-center text-muted-foreground">
              No pending bills found.
            </CardContent>
          </Card>
        ) : (
          <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((order) => {
              const billCode = generateBillCode(order.orderNumber, order.createdAt)
              const chairSummary = groupChairSummary(order)
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
                    <div className="flex flex-wrap gap-2">
                      {chairSummary.map((chair) => (
                        <Badge key={`${order.id}-chair-${chair.chairNumber}`} variant="outline" className="gap-1">
                          {chair.chairNumber > 0 ? `Chair ${chair.chairNumber}` : 'Unassigned'}
                          <span className="text-[10px] opacity-70">{chair.itemCount} item{chair.itemCount === 1 ? '' : 's'}</span>
                        </Badge>
                      ))}
                    </div>
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
                  <Button
                    className="w-full gap-2 border-emerald-200 bg-emerald-600 text-white hover:bg-emerald-700 dark:border-emerald-800 dark:bg-emerald-500 dark:hover:bg-emerald-600"
                    variant="secondary"
                    onClick={() => setShowDrawerBalanceWindow(true)}
                  >
                    <Wallet className="h-4 w-4" />
                    {currentShift ? 'Balance Counter' : 'Open Cash Counter Shift'}
                  </Button>
                </div>
              ) : (
                <p className="rounded-lg bg-background p-3 text-sm text-muted-foreground border">
                  Current drawer balance is visible to pay counter staff. Only admin and super-admin can reset the opening balance.
                </p>
              )}

              <div className="space-y-3 rounded-lg border bg-background p-4">
                <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
                  <p className="font-semibold text-foreground">Shift Status</p>
                  {currentShift ? (
                    <>
                      <p className="mt-1">Current shift: <span className="font-medium text-foreground">{currentShift.id.slice(0, 8)}…</span></p>
                      <p>Opened at: <span className="font-medium text-foreground">{new Date(currentShift.openedAt).toLocaleString()}</span></p>
                    </>
                  ) : (
                      <p className="mt-1">No open shift. Use <span className="font-medium text-foreground">Open Cash Counter Shift</span> to start the first counter shift for the day.</p>
                  )}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Button
                    className="w-full gap-2 border-amber-200 bg-amber-500 text-white hover:bg-amber-600 dark:border-amber-800 dark:bg-amber-500 dark:hover:bg-amber-600"
                    variant="outline"
                    onClick={() => setShowCashSpendWindow(true)}
                    disabled={!canRecordCashOut}
                  >
                    <HandCoins className="h-4 w-4" />
                    Cash Spend
                  </Button>
                  <Button
                    className="w-full gap-2 border-sky-200 bg-sky-600 text-white hover:bg-sky-700 dark:border-sky-800 dark:bg-sky-500 dark:hover:bg-sky-600"
                    variant="secondary"
                    onClick={() => setShowDenominationCloseoutWindow(true)}
                    disabled={!canManageDrawer}
                  >
                    <BadgeDollarSign className="h-4 w-4" />
                    Denomination Close-out
                  </Button>
                </div>

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

        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-3">Recent Paid Bills</h3>
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
                      <div className="text-xs text-muted-foreground">
                        Collected By: {order.paymentCollectedBy || 'Not recorded'}
                      </div>
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
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      <Dialog open={showDrawerBalanceWindow} onOpenChange={setShowDrawerBalanceWindow}>
        <DialogContent className="w-[95vw] max-w-2xl">
          <DialogHeader>
            <DialogTitle>Cash Drawer Balance Window</DialogTitle>
            <DialogDescription>Set or reset the drawer opening balance and notes in a separate window.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
              <p className="font-semibold text-foreground">Current drawer snapshot</p>
              <p className="mt-1">Opening balance: {settings.currencySymbol}{drawerBalance.openingBalance.toFixed(2)}</p>
              <p>Current balance: {settings.currencySymbol}{drawerBalance.currentBalance.toFixed(2)}</p>
              <p>Shift: {currentShift ? currentShift.id.slice(0, 8) : 'Not opened yet'}</p>
            </div>

            <div className="space-y-3 rounded-md border p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-foreground">Counter opening denominations</p>
                <Badge variant="secondary">{settings.currencySymbol}{openingDenominationTotal.toFixed(2)}</Badge>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {LKR_DENOMINATIONS.map((denomination) => (
                  <div key={denomination} className="grid grid-cols-[1fr_1fr] items-center gap-2">
                    <label className="text-xs text-muted-foreground" htmlFor={`opening-denom-${denomination}`}>
                      {settings.currencySymbol}{denomination}
                    </label>
                    <Input
                      id={`opening-denom-${denomination}`}
                      type="number"
                      min="0"
                      step="1"
                      value={openingDenominationCounts[String(denomination)]}
                      onChange={(e) =>
                        setOpeningDenominationCounts((current) => ({
                          ...current,
                          [String(denomination)]: e.target.value,
                        }))
                      }
                    />
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Count the notes/coins available when opening the cash counter. This becomes the opening float for the first shift.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="opening-balance-dialog">Opening balance</label>
                <Input
                  id="opening-balance-dialog"
                  type="number"
                  min="0"
                  step="0.01"
                  value={openingBalanceInput}
                  onChange={(e) => {
                    setOpeningDenominationCounts(initialDenominationState)
                    setOpeningBalanceInput(e.target.value)
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  Manual total is used only when no denominations are counted.
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="drawer-notes-dialog">Notes</label>
                <Input
                  id="drawer-notes-dialog"
                  value={drawerNotes}
                  onChange={(e) => setDrawerNotes(e.target.value)}
                  placeholder="Optional note"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDrawerBalanceWindow(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleSaveCashDrawer()} disabled={isSavingDrawer || !canManageDrawer}>
                {isSavingDrawer ? 'Saving...' : currentShift ? 'Save Counter Balance' : 'Open Cash Counter Shift'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showCashSpendWindow} onOpenChange={setShowCashSpendWindow}>
        <DialogContent className="w-[95vw] max-w-xl">
          <DialogHeader>
            <DialogTitle>Cash Spend Window</DialogTitle>
            <DialogDescription>Record petty cash, supplier advance, or any other cash out transaction.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="cash-out-amount-dialog">Amount</label>
                <Input
                  id="cash-out-amount-dialog"
                  type="number"
                  min="0"
                  step="0.01"
                  value={cashOutAmount}
                  onChange={(e) => setCashOutAmount(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="cash-out-reason-dialog">Reason</label>
                <Input
                  id="cash-out-reason-dialog"
                  value={cashOutReason}
                  onChange={(e) => setCashOutReason(e.target.value)}
                  placeholder="Petty cash, supplier advance..."
                />
              </div>
            </div>

            <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
              Recent entries are still visible on the main pay screen for quick reference.
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCashSpendWindow(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleCashOut()} disabled={isSavingCashOut || !canRecordCashOut}>
              {isSavingCashOut ? 'Saving...' : 'Record Cash Out'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDenominationCloseoutWindow} onOpenChange={setShowDenominationCloseoutWindow}>
        <DialogContent className="w-[95vw] max-w-3xl">
          <DialogHeader>
            <DialogTitle>Denomination Close-out Window</DialogTitle>
            <DialogDescription>When the shift ends, the counter person can balance the cash and count denominations before closing the shift report.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-3 rounded-md border p-3">
              <p className="text-sm font-semibold text-foreground">Closing denominations</p>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {LKR_DENOMINATIONS.map((denomination) => (
                  <div key={denomination} className="grid grid-cols-[1fr_1fr] items-center gap-2">
                    <label className="text-xs text-muted-foreground" htmlFor={`dialog-denom-${denomination}`}>
                      {settings.currencySymbol}{denomination}
                    </label>
                    <Input
                      id={`dialog-denom-${denomination}`}
                      type="number"
                      min="0"
                      step="1"
                      value={denominationCounts[String(denomination)]}
                      onChange={(e) =>
                        setDenominationCounts((current) => ({
                          ...current,
                          [String(denomination)]: e.target.value,
                        }))
                      }
                    />
                  </div>
                ))}
              </div>
              <p className="text-sm text-muted-foreground">
                Denomination total: <span className="font-semibold text-foreground">{settings.currencySymbol}{denominationTotal.toFixed(2)}</span>
              </p>
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
              <label className="text-sm font-medium text-foreground" htmlFor="closeout-notes-dialog">Close-out notes</label>
              <Input
                id="closeout-notes-dialog"
                value={closeoutNotes}
                onChange={(e) => setCloseoutNotes(e.target.value)}
                placeholder="Optional closing note"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDenominationCloseoutWindow(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleCloseCashDrawer()} disabled={isClosingDrawer || !canManageDrawer}>
              {isClosingDrawer ? 'Closing drawer...' : 'Close Shift & Save Report'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PaymentModal
        open={Boolean(selectedOrder)}
        onClose={() => setSelectedOrder(null)}
        onComplete={() => setSelectedOrder(null)}
        order={selectedOrder}
      />
    </div>
  )
}
