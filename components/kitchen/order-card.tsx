'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { usePOSStore } from '@/lib/store'
import { Clock, AlertTriangle, Printer, Check, ChefHat, Star } from 'lucide-react'
import { cn } from '@/lib/utils'
import { printKitchenDocket } from '@/lib/print'
import type { Order } from '@/lib/types'

interface OrderCardProps {
  order: Order
  onUpdateStatus: (orderId: string, status: Order['status']) => void
}

export function OrderCard({ order, onUpdateStatus }: OrderCardProps) {
  const { settings } = usePOSStore()

  const elapsedMinutes = useMemo(() => {
    const created = new Date(order.createdAt).getTime()
    const now = Date.now()
    return Math.floor((now - created) / 60000)
  }, [order.createdAt])

  const getTimeColor = () => {
    if (elapsedMinutes < 5) return 'text-primary'
    if (elapsedMinutes < 10) return 'text-warning'
    return 'text-destructive'
  }

  const getBorderColor = () => {
    if (order.status === 'ready') return 'border-primary border-2'
    if (elapsedMinutes < 5) return 'border-primary/50'
    if (elapsedMinutes < 10) return 'border-warning'
    return 'border-destructive'
  }

  const getStatusBadge = () => {
    switch (order.status) {
      case 'pending':
        return <Badge variant="secondary">New</Badge>
      case 'preparing':
        return <Badge className="bg-warning text-warning-foreground">Preparing</Badge>
      case 'ready':
        return <Badge className="bg-primary text-primary-foreground">Ready</Badge>
      default:
        return null
    }
  }

  const getNextStatus = (): Order['status'] | null => {
    switch (order.status) {
      case 'pending':
        return 'preparing'
      case 'preparing':
        return 'ready'
      case 'ready':
        return 'completed'
      default:
        return null
    }
  }

  const getNextAction = () => {
    switch (order.status) {
      case 'pending':
        return { label: 'Start', icon: ChefHat }
      case 'preparing':
        return { label: 'Ready', icon: Check }
      case 'ready':
        return { label: 'Complete', icon: Check }
      default:
        return null
    }
  }

  const handlePrint = () => {
    printKitchenDocket(order, settings)
  }

  const nextAction = getNextAction()
  const nextStatus = getNextStatus()

  return (
    <Card className={cn('transition-all', getBorderColor())}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl font-bold text-foreground">#{order.orderNumber}</span>
            {order.isPriority && (
              <Star className="h-5 w-5 fill-warning text-warning" />
            )}
          </div>
          {getStatusBadge()}
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
          <div className="flex items-center gap-1">
            <span className="font-medium text-foreground">
              {order.tableName || 'Takeaway'}
            </span>
          </div>
          <div className={cn('flex items-center gap-1', getTimeColor())}>
            {elapsedMinutes >= 10 && <AlertTriangle className="h-4 w-4" />}
            <Clock className="h-4 w-4" />
            <span className="font-medium">{elapsedMinutes} min</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Order Items */}
        <div className="space-y-3 mb-4">
          {order.items.map((item) => (
            <div key={item.id} className="border-l-2 border-muted pl-3">
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-foreground">{item.quantity}x</span>
                <span className="font-medium text-foreground">{item.name}</span>
                <Badge
                  variant="outline"
                  className="ml-1 h-5 rounded px-1.5 text-[10px] font-semibold uppercase tracking-wide"
                >
                  {(item.prepStation ?? 'kitchen').replace('-', ' ')}
                </Badge>
              </div>
              {item.modifiers.length > 0 && (
                <p className="text-sm text-muted-foreground mt-0.5">
                  + {item.modifiers.map((m) => m.name).join(', ')}
                </p>
              )}
              {item.notes && (
                <p className="text-sm text-destructive font-medium mt-1 bg-destructive/10 px-2 py-1 rounded">
                  {item.notes}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-shrink-0"
            onClick={handlePrint}
          >
            <Printer className="h-4 w-4" />
          </Button>
          {nextAction && nextStatus && (
            <Button
              size="sm"
              className={cn(
                'flex-1 gap-2',
                order.status === 'preparing' && 'bg-primary hover:bg-primary/90'
              )}
              onClick={() => onUpdateStatus(order.id, nextStatus)}
            >
              <nextAction.icon className="h-4 w-4" />
              {nextAction.label}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
