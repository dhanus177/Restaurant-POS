'use client'

import { usePOSStore } from '@/lib/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { formatTime } from '@/lib/print'

export function RecentOrders() {
  const { orders, settings } = usePOSStore()

  const recentOrders = [...orders]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10)

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>
      case 'preparing':
        return <Badge className="bg-warning text-warning-foreground">Preparing</Badge>
      case 'ready':
        return <Badge className="bg-info text-info-foreground">Ready</Badge>
      case 'completed':
        return <Badge className="bg-primary text-primary-foreground">Completed</Badge>
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>
      default:
        return null
    }
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold">Recent Orders</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[400px]">
          <div className="space-y-0 divide-y divide-border">
            {recentOrders.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                No orders yet
              </div>
            ) : (
              recentOrders.map((order, idx) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="flex-shrink-0">
                      <p className="font-semibold text-foreground">#{order.orderNumber}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatTime(order.createdAt)}
                      </p>
                    </div>
                    <div className="hidden sm:block flex-1">
                      <p className="text-sm font-medium text-foreground">{order.tableName || 'Takeaway'}</p>
                      <p className="text-xs text-muted-foreground">
                        {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <div className="flex justify-center min-w-[100px]">
                      {getStatusBadge(order.status)}
                    </div>
                    <span className="font-semibold text-foreground text-right min-w-[80px]">
                      {settings.currencySymbol}{order.total.toFixed(2)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
