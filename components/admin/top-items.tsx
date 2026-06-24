'use client'

import { useMemo } from 'react'
import { usePOSStore } from '@/lib/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'

export function TopItems() {
  const { orders, menuItems, settings } = usePOSStore()

  const topItems = useMemo(() => {
    const itemCounts: Record<string, { name: string; count: number; revenue: number }> = {}

    orders.forEach((order) => {
      order.items.forEach((item) => {
        if (!itemCounts[item.menuItemId]) {
          itemCounts[item.menuItemId] = { name: item.name, count: 0, revenue: 0 }
        }
        itemCounts[item.menuItemId].count += item.quantity
        itemCounts[item.menuItemId].revenue +=
          (item.price + item.modifiers.reduce((sum, m) => sum + m.price, 0)) * item.quantity
      })
    })

    return Object.values(itemCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
  }, [orders])

  const maxCount = topItems.length > 0 ? topItems[0].count : 1

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-medium">Top Selling Items</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {topItems.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No sales data yet
          </p>
        ) : (
          topItems.map((item, index) => (
            <div key={item.name} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-muted-foreground w-6">
                    {index + 1}
                  </span>
                  <span className="font-medium">{item.name}</span>
                </div>
                <div className="text-right">
                  <p className="font-medium">{item.count} sold</p>
                  <p className="text-xs text-muted-foreground">
                    {settings.currencySymbol}{item.revenue.toFixed(2)}
                  </p>
                </div>
              </div>
              <Progress value={(item.count / maxCount) * 100} className="h-2" />
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
