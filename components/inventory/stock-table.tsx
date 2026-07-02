'use client'

import { useState } from 'react'
import { usePOSStore } from '@/lib/store'
import { getInventoryCategories } from '@/lib/inventory-categories'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, Plus, Minus, Pencil, Trash2, Search, AlertTriangle } from 'lucide-react'
import type { InventoryItem } from '@/lib/types'

interface StockTableProps {
  onEdit: (item: InventoryItem) => void
  onAdjust: (item: InventoryItem, mode: 'add' | 'remove' | 'waste' | 'transfer') => void
  onDelete: (item: InventoryItem) => void
}

export function StockTable({ onEdit, onAdjust, onDelete }: StockTableProps) {
  const { inventory, settings } = usePOSStore()
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')

  const categories = getInventoryCategories(inventory)

  const filteredInventory = inventory.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.sku.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  const getStockLevel = (item: InventoryItem) => {
    const percentage = (item.quantity / (item.minQuantity * 3)) * 100
    return Math.min(100, percentage)
  }

  const getStockStatus = (item: InventoryItem) => {
    if (item.quantity <= 0) return 'out'
    if (item.quantity <= item.minQuantity) return 'low'
    return 'ok'
  }

  const getStockColor = (status: string) => {
    switch (status) {
      case 'out':
        return 'bg-destructive'
      case 'low':
        return 'bg-warning'
      default:
        return 'bg-primary'
    }
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={categoryFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setCategoryFilter('all')}
          >
            All
          </Button>
          {categories.map((category) => (
            <Button
              key={category}
              variant={categoryFilter === category ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCategoryFilter(category)}
            >
              {category}
            </Button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border overflow-x-auto">
        <Table className="min-w-[920px]">
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Stock Level</TableHead>
              <TableHead className="text-right">Daily</TableHead>
              <TableHead className="text-right">Storage</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Cost</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredInventory.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  No items found
                </TableCell>
              </TableRow>
            ) : (
              filteredInventory.map((item) => {
                const status = getStockStatus(item)
                const storageQty = item.storageQuantity ?? 0
                const totalQty = item.quantity + storageQty
                return (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {status !== 'ok' && (
                          <AlertTriangle
                            className={`h-4 w-4 ${
                              status === 'out' ? 'text-destructive' : 'text-warning'
                            }`}
                          />
                        )}
                        <span className="font-medium">{item.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      {item.sku}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{item.category}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 w-32">
                        <Progress
                          value={getStockLevel(item)}
                          className="h-2"
                          indicatorClassName={getStockColor(status)}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={status !== 'ok' ? 'text-destructive font-medium' : ''}>
                        {item.quantity} {item.unit}
                      </span>
                      <span className="text-xs text-muted-foreground block">
                        Min: {item.minQuantity}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {storageQty} {item.unit}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {totalQty} {item.unit}
                    </TableCell>
                    <TableCell className="text-right">
                      {settings.currencySymbol}
                      {item.costPrice.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onAdjust(item, 'add')} className="gap-2">
                            <Plus className="h-4 w-4" />
                            Add Stock
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onAdjust(item, 'remove')} className="gap-2">
                            <Minus className="h-4 w-4" />
                            Remove Stock
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onAdjust(item, 'waste')} className="gap-2">
                            <Trash2 className="h-4 w-4" />
                            Record Waste
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onEdit(item)} className="gap-2">
                            <Pencil className="h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => onDelete(item)}
                            className="gap-2 text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
