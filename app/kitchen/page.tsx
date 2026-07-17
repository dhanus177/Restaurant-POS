'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { resolveEffectiveRole } from '@/lib/roles'
import { usePOSStore } from '@/lib/store'
import { Header } from '@/components/shared/header'
import { OrderQueue } from '@/components/kitchen/order-queue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { matchesKitchenScanInput } from '@/lib/print'
import { toast } from 'sonner'
import { Volume2, VolumeX, RefreshCw, ScanBarcode, CheckCircle2 } from 'lucide-react'

export default function KitchenPage() {
  const router = useRouter()
  const { currentUser, orders, settings, updateOrderStatus } = usePOSStore()
  const [mounted, setMounted] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [lastOrderCount, setLastOrderCount] = useState(0)
  const [refreshKey, setRefreshKey] = useState(0)
  const [kitchenScanInput, setKitchenScanInput] = useState('')

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted && !currentUser) {
      router.push('/')
    }
  }, [currentUser, mounted, router])

  useEffect(() => {
    if (!mounted || !currentUser) return
    if (settings.kitchenPageEnabled === false && resolveEffectiveRole(currentUser.role, settings) !== 'super-admin') {
      router.push('/pos')
    }
  }, [currentUser, mounted, router, settings.kitchenPageEnabled])

  // Count pending orders
  const pendingCount = orders.filter((o) => o.status === 'pending').length

  // Play sound when new order arrives
  useEffect(() => {
    if (mounted && soundEnabled && pendingCount > lastOrderCount) {
      // Play notification sound
      const audio = new Audio('/notification.mp3')
      audio.volume = 0.5
      audio.play().catch(() => {
        // Audio play failed (user hasn't interacted with page yet)
      })
    }
    setLastOrderCount(pendingCount)
  }, [pendingCount, soundEnabled, lastOrderCount, mounted])

  // Auto-refresh timer (simulating real-time updates)
  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshKey((k) => k + 1)
    }, 30000) // Refresh every 30 seconds

    return () => clearInterval(interval)
  }, [])

  const handleManualRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1)
  }, [])

  const handleKitchenScanConfirm = useCallback(() => {
    const scanValue = kitchenScanInput.trim()
    if (!scanValue) {
      toast.error('Scan or enter a kitchen barcode/order number first')
      return
    }

    const targetOrder = orders.find((order) => {
      if (order.status === 'cancelled') return false
      return matchesKitchenScanInput(order.orderNumber, order.createdAt, scanValue)
    })

    if (!targetOrder) {
      toast.error('No matching kitchen order found for this scan')
      return
    }

    if (targetOrder.status === 'completed') {
      toast.info(`Order #${targetOrder.orderNumber} is already completed`)
      setKitchenScanInput('')
      return
    }

    updateOrderStatus(targetOrder.id, 'completed')
    toast.success(`Kitchen order #${targetOrder.orderNumber} marked completed`)
    setKitchenScanInput('')
  }, [kitchenScanInput, orders, updateOrderStatus])

  if (!mounted || !currentUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  if (settings.kitchenPageEnabled === false && resolveEffectiveRole(currentUser.role, settings) !== 'super-admin') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-foreground">Kitchen page is locked</h2>
          <p className="mt-1 text-sm text-muted-foreground">Please contact your super admin to enable access.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background" key={refreshKey}>
      <Header title="Kitchen Display" />

      {/* Status Bar */}
      <div className="flex flex-col gap-3 border-b border-border bg-card px-3 py-2 sm:px-4">
        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
          <Badge
            variant={pendingCount > 0 ? 'default' : 'secondary'}
            className="px-3 py-1 text-sm data-[state=active]:bg-primary"
          >
            {pendingCount} New Orders
          </Badge>
          {pendingCount > 3 && (
            <Badge variant="destructive" className="text-sm font-semibold tracking-wide">
              High Volume
            </Badge>
          )}
          <div className="ml-auto flex w-full items-center gap-2 sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={handleManualRefresh}
              className="h-10 flex-1 gap-2 sm:h-9 sm:flex-none"
            >
              <RefreshCw className="h-4 w-4" />
              <span className="sm:inline">Refresh</span>
            </Button>
            <Button
              variant={soundEnabled ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="h-10 flex-1 gap-2 sm:h-9 sm:flex-none"
            >
              {soundEnabled ? (
                <>
                  <Volume2 className="h-4 w-4" />
                  <span>Sound On</span>
                </>
              ) : (
                <>
                  <VolumeX className="h-4 w-4" />
                  <span>Sound Off</span>
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-[1fr_auto] lg:grid-cols-[minmax(320px,1fr)_auto]">
          <div className="relative">
            <ScanBarcode className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={kitchenScanInput}
              onChange={(event) => setKitchenScanInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  handleKitchenScanConfirm()
                }
              }}
              placeholder="Scan KOT barcode / enter order number"
              className="h-10 pl-9 text-sm"
            />
          </div>
          <Button className="h-10 gap-2" onClick={handleKitchenScanConfirm}>
            <CheckCircle2 className="h-4 w-4" />
            Confirm & Complete
          </Button>
        </div>
      </div>

      {/* Order Queue */}
      <div className="flex-1 overflow-hidden">
        <OrderQueue />
      </div>
    </div>
  )
}
