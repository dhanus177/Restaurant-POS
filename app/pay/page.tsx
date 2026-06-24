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

export default function PayPage() {
  const router = useRouter()
  const { currentUser, orders, settings } = usePOSStore()
  const [mounted, setMounted] = useState(false)
  const [query, setQuery] = useState('')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted && !currentUser) {
      router.push('/')
    }
  }, [currentUser, mounted, router])

  const unpaidOrders = useMemo(
    () => orders.filter((o) => o.paymentStatus === 'pending').sort((a, b) => b.orderNumber - a.orderNumber),
    [orders]
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return unpaidOrders

    return unpaidOrders.filter((o) => {
      const billCode = generateBillCode(o.orderNumber, o.createdAt).toLowerCase()
      return (
        String(o.orderNumber).includes(q) ||
        (o.tableName || '').toLowerCase().includes(q) ||
        billCode.includes(q)
      )
    })
  }, [query, unpaidOrders])

  if (!mounted || !currentUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      <Header title="Cash Collection Counter" />

      <div className="mx-auto w-full max-w-6xl flex-1 overflow-y-auto p-4 md:p-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold">Pending Bills</h2>
            <p className="text-sm text-muted-foreground">Collect payment by bill number, table, or bill code.</p>
          </div>
          <Button variant="outline" onClick={() => router.push('/billing')}>Go to Billing</Button>
        </div>

        <Input
          placeholder="Search bill: order #, table, or BILL-YYMMDD-0000"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="mb-4"
        />

        {filtered.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              No pending bills found.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((order) => {
              const billCode = generateBillCode(order.orderNumber, order.createdAt)
              return (
                <Card key={order.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center justify-between text-lg">
                      <span>#{order.orderNumber}</span>
                      <Badge variant="secondary">Pending</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-sm text-muted-foreground">{order.tableName || 'Takeaway'}</div>
                    <div className="rounded border bg-secondary/40 p-2 font-mono text-xs">{billCode}</div>
                    <div className="text-xl font-semibold">{settings.currencySymbol}{order.total.toFixed(2)}</div>
                    <Button className="w-full" onClick={() => setSelectedOrder(order)}>
                      Collect Payment
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
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
