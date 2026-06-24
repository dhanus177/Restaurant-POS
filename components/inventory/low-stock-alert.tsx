'use client'

import { usePOSStore } from '@/lib/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, Package } from 'lucide-react'

export function LowStockAlert() {
  const { getLowStockItems } = usePOSStore()
  const lowStockItems = getLowStockItems()

  if (lowStockItems.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Package className="h-5 w-5 text-emerald-600" />
            Stock Status
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="py-8 text-center">
            <p className="text-sm text-muted-foreground">All items are sufficiently stocked ✓</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-amber-200/50 bg-amber-50/30 border-0 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            Low Stock Alert
          </CardTitle>
          <Badge variant="destructive" className="ml-2">
            {lowStockItems.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-0 divide-y divide-amber-200/50">
        {lowStockItems.slice(0, 5).map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between text-sm py-3 first:pt-0"
          >
            <div>
              <p className="font-medium text-foreground">{item.name}</p>
              <p className="text-xs text-muted-foreground">{item.sku}</p>
            </div>
            <span className={`font-semibold text-right min-w-[60px] ${item.quantity <= 0 ? 'text-red-600' : 'text-amber-600'}`}>
              {item.quantity} {item.unit}
              {item.quantity <= 0 && ' (OUT)'}
            </span>
          </div>
        ))}
        {lowStockItems.length > 5 && (
          <p className="text-xs text-muted-foreground text-center pt-3">
            +{lowStockItems.length - 5} more item{lowStockItems.length - 5 !== 1 ? 's' : ''}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
