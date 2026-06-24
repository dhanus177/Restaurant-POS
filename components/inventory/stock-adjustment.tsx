'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { usePOSStore } from '@/lib/store'
import { Plus, Minus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type { InventoryItem, StockAdjustment } from '@/lib/types'

interface StockAdjustmentDialogProps {
  item: InventoryItem | null
  open: boolean
  onClose: () => void
}

export function StockAdjustmentDialog({ item, open, onClose }: StockAdjustmentDialogProps) {
  const { currentUser, adjustStock } = usePOSStore()
  const [adjustmentType, setAdjustmentType] = useState<'add' | 'remove' | 'waste'>('add')
  const [quantity, setQuantity] = useState('')
  const [reason, setReason] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!item || !quantity) return

    const adjustment: StockAdjustment = {
      id: `adj-${Date.now()}`,
      inventoryItemId: item.id,
      type: adjustmentType,
      quantity: parseFloat(quantity),
      reason: reason || `${adjustmentType === 'add' ? 'Stock received' : adjustmentType === 'waste' ? 'Waste/spoilage' : 'Stock removed'}`,
      createdAt: new Date().toISOString(),
      createdBy: currentUser?.id || 'unknown',
    }

    adjustStock(adjustment)
    toast.success(
      `${adjustmentType === 'add' ? 'Added' : 'Removed'} ${quantity} ${item.unit} of ${item.name}`
    )

    setQuantity('')
    setReason('')
    onClose()
  }

  if (!item) return null

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Adjust Stock: {item.name}</DialogTitle>
        </DialogHeader>

        <div className="py-2">
          <div className="bg-secondary/50 rounded-lg p-4 mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Current Stock</span>
              <span className="font-medium">
                {item.quantity} {item.unit}
              </span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span className="text-muted-foreground">Minimum Level</span>
              <span className="font-medium">
                {item.minQuantity} {item.unit}
              </span>
            </div>
          </div>

          <Tabs value={adjustmentType} onValueChange={(v) => setAdjustmentType(v as typeof adjustmentType)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="add" className="gap-2">
                <Plus className="h-4 w-4" />
                Add
              </TabsTrigger>
              <TabsTrigger value="remove" className="gap-2">
                <Minus className="h-4 w-4" />
                Remove
              </TabsTrigger>
              <TabsTrigger value="waste" className="gap-2">
                <Trash2 className="h-4 w-4" />
                Waste
              </TabsTrigger>
            </TabsList>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="quantity">
                  Quantity to {adjustmentType === 'add' ? 'Add' : 'Remove'} ({item.unit})
                </Label>
                <Input
                  id="quantity"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="0"
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="reason">Reason (Optional)</Label>
                <Textarea
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={
                    adjustmentType === 'add'
                      ? 'e.g., Delivery from supplier'
                      : adjustmentType === 'waste'
                      ? 'e.g., Expired, damaged'
                      : 'e.g., Used for special event'
                  }
                  rows={2}
                />
              </div>

              {quantity && (
                <div className="bg-primary/10 rounded-lg p-3">
                  <p className="text-sm text-muted-foreground">New Stock Level</p>
                  <p className="text-lg font-bold text-primary">
                    {adjustmentType === 'add'
                      ? item.quantity + parseFloat(quantity || '0')
                      : Math.max(0, item.quantity - parseFloat(quantity || '0'))}{' '}
                    {item.unit}
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit" disabled={!quantity || parseFloat(quantity) <= 0}>
                  {adjustmentType === 'add' ? 'Add Stock' : 'Remove Stock'}
                </Button>
              </div>
            </form>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  )
}
