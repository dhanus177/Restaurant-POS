'use client'

import { useMemo } from 'react'
import { usePOSStore } from '@/lib/store'
import { OrderCard } from './order-card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import type { OrderStatus } from '@/lib/types'

export function OrderQueue() {
  const { orders, updateOrderStatus } = usePOSStore()

  const activeOrders = useMemo(() => {
    return orders
      .filter((o) => ['pending', 'preparing', 'ready'].includes(o.status))
      .sort((a, b) => {
        // Priority orders first
        if (a.isPriority && !b.isPriority) return -1
        if (!a.isPriority && b.isPriority) return 1
        // Then by creation time (oldest first)
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      })
  }, [orders])

  const pendingOrders = activeOrders.filter((o) => o.status === 'pending')
  const preparingOrders = activeOrders.filter((o) => o.status === 'preparing')
  const readyOrders = activeOrders.filter((o) => o.status === 'ready')

  const handleUpdateStatus = (orderId: string, status: OrderStatus) => {
    updateOrderStatus(orderId, status)
  }

  const renderOrders = (orderList: typeof activeOrders) => {
    if (orderList.length === 0) {
      return (
        <div className="flex items-center justify-center h-48 text-muted-foreground">
          <p>No orders</p>
        </div>
      )
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {orderList.map((order) => (
          <OrderCard
            key={order.id}
            order={order}
            onUpdateStatus={handleUpdateStatus}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <Tabs defaultValue="all" className="flex-1 flex flex-col">
        <div className="border-b border-border px-3 py-2 sm:px-4">
          <TabsList className="w-full justify-start overflow-x-auto whitespace-nowrap">
            <TabsTrigger value="all" className="gap-2">
              All
              <Badge variant="secondary" className="ml-1">
                {activeOrders.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="pending" className="gap-2">
              New
              <Badge variant="secondary" className="ml-1">
                {pendingOrders.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="preparing" className="gap-2">
              Preparing
              <Badge variant="secondary" className="ml-1">
                {preparingOrders.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="ready" className="gap-2">
              Ready
              <Badge variant="secondary" className="ml-1">
                {readyOrders.length}
              </Badge>
            </TabsTrigger>
          </TabsList>
        </div>

        <ScrollArea className="flex-1 p-4">
          <TabsContent value="all" className="mt-0">
            {renderOrders(activeOrders)}
          </TabsContent>
          <TabsContent value="pending" className="mt-0">
            {renderOrders(pendingOrders)}
          </TabsContent>
          <TabsContent value="preparing" className="mt-0">
            {renderOrders(preparingOrders)}
          </TabsContent>
          <TabsContent value="ready" className="mt-0">
            {renderOrders(readyOrders)}
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  )
}
