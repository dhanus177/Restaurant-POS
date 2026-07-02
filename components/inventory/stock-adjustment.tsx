'use client'

import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { usePOSStore } from '@/lib/store'
import { ArrowLeftRight, Plus, Minus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type { InventoryItem, StockAdjustment } from '@/lib/types'

interface StockAdjustmentDialogProps {
  item: InventoryItem | null
  initialType?: 'add' | 'remove' | 'waste' | 'transfer'
  open: boolean
  onClose: () => void
}

export function StockAdjustmentDialog({ item, initialType = 'add', open, onClose }: StockAdjustmentDialogProps) {
  const { currentUser, adjustStock } = usePOSStore()
  const [adjustmentType, setAdjustmentType] = useState<'add' | 'remove' | 'waste' | 'transfer'>('add')
  const [location, setLocation] = useState<'inventory' | 'storage'>('inventory')
  const [transferDirection, setTransferDirection] = useState<'inventory-to-storage' | 'storage-to-inventory'>('storage-to-inventory')
  const [quantity, setQuantity] = useState('')
  const [reason, setReason] = useState('')

  useEffect(() => {
    if (!open) return

    setAdjustmentType(initialType)
    setLocation('inventory')
    setTransferDirection('storage-to-inventory')
    setQuantity('')
    setReason('')
  }, [initialType, open, item?.id])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!item || !quantity) return

    const parsedQty = parseFloat(quantity)
    if (!Number.isFinite(parsedQty) || parsedQty <= 0) return
    const fromLocation = transferDirection === 'inventory-to-storage' ? 'inventory' : 'storage'
    const toLocation = transferDirection === 'inventory-to-storage' ? 'storage' : 'inventory'

    const availableAtLocation = location === 'inventory' ? item.quantity : item.storageQuantity ?? 0
    const isSubtractiveAdjustment = adjustmentType === 'remove' || adjustmentType === 'waste'

    if (isSubtractiveAdjustment && parsedQty > availableAtLocation) {
      toast.error(`Only ${availableAtLocation} ${item.unit} available in ${location}`)
      return
    }

    const adjustment: StockAdjustment = {
      id: `adj-${Date.now()}`,
      inventoryItemId: item.id,
      type: adjustmentType,
      location: adjustmentType === 'transfer' ? undefined : location,
      fromLocation: adjustmentType === 'transfer' ? fromLocation : undefined,
      toLocation: adjustmentType === 'transfer' ? toLocation : undefined,
      quantity: parsedQty,
      reason:
        reason ||
        (adjustmentType === 'transfer'
          ? `Transfer ${parsedQty} ${item.unit} from ${fromLocation} to ${toLocation}`
          : `${adjustmentType === 'add' ? 'Stock received' : adjustmentType === 'waste' ? 'Waste/spoilage' : 'Stock removed'} in ${location}`),
      createdAt: new Date().toISOString(),
      createdBy: currentUser?.id || 'unknown',
    }

    adjustStock(adjustment)
    toast.success(
      adjustmentType === 'transfer'
        ? `Transferred ${quantity} ${item.unit} (${fromLocation} → ${toLocation})`
        : adjustmentType === 'add'
          ? `Added ${quantity} ${item.unit} to ${location}`
          : adjustmentType === 'waste'
            ? `Recorded ${quantity} ${item.unit} as waste from ${location}`
            : `Removed ${quantity} ${item.unit} from ${location}`
    )

    setQuantity('')
    setReason('')
    onClose()
  }

  if (!item) return null

  const storageQty = item.storageQuantity ?? 0
  const parsedQty = parseFloat(quantity || '0')
  const isTransfer = adjustmentType === 'transfer'
  const isSubtractiveAdjustment = adjustmentType === 'remove' || adjustmentType === 'waste'
  const fromLocation = transferDirection === 'inventory-to-storage' ? 'inventory' : 'storage'
  const canTransfer = isTransfer
    ? fromLocation === 'inventory'
      ? parsedQty <= item.quantity
      : parsedQty <= storageQty
    : true
  const availableAtLocation = location === 'inventory' ? item.quantity : storageQty
  const canRemove = isSubtractiveAdjustment ? parsedQty <= availableAtLocation : true

  const nextInventory = (() => {
    if (!quantity) return item.quantity
    if (isTransfer) {
      return transferDirection === 'storage-to-inventory'
        ? item.quantity + Math.min(storageQty, parsedQty)
        : Math.max(0, item.quantity - Math.min(item.quantity, parsedQty))
    }
    if (location !== 'inventory') return item.quantity
    return adjustmentType === 'add' ? item.quantity + parsedQty : Math.max(0, item.quantity - parsedQty)
  })()

  const nextStorage = (() => {
    if (!quantity) return storageQty
    if (isTransfer) {
      return transferDirection === 'storage-to-inventory'
        ? Math.max(0, storageQty - Math.min(storageQty, parsedQty))
        : storageQty + Math.min(item.quantity, parsedQty)
    }
    if (location !== 'storage') return storageQty
    return adjustmentType === 'add' ? storageQty + parsedQty : Math.max(0, storageQty - parsedQty)
  })()

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Adjust Stock: {item.name}</DialogTitle>
          <DialogDescription>
            Add, remove, waste, or transfer stock for this inventory item while previewing the resulting quantities.
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          <div className="bg-secondary/50 rounded-lg p-4 mb-4">
            <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Daily Stock</span>
              <span className="font-medium">
                {item.quantity} {item.unit}
              </span>
            </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-muted-foreground">Storage Stock</span>
                <span className="font-medium">
                  {storageQty} {item.unit}
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
            <TabsList className="grid w-full grid-cols-4">
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
              <TabsTrigger value="transfer" className="gap-2">
                <ArrowLeftRight className="h-4 w-4" />
                Transfer
              </TabsTrigger>
            </TabsList>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              {adjustmentType !== 'transfer' ? (
                <div className="grid gap-2">
                  <Label>Movement Location</Label>
                  <Select value={location} onValueChange={(value) => setLocation(value as 'inventory' | 'storage')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="inventory">Daily Inventory</SelectItem>
                      <SelectItem value="storage">External Storage</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="grid gap-2">
                  <Label>Transfer Direction</Label>
                  <Select
                    value={transferDirection}
                    onValueChange={(value) => setTransferDirection(value as 'inventory-to-storage' | 'storage-to-inventory')}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="storage-to-inventory">Storage → Inventory</SelectItem>
                      <SelectItem value="inventory-to-storage">Inventory → Storage</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid gap-2">
                <Label htmlFor="quantity">
                  Quantity to {adjustmentType === 'add' ? 'Add' : adjustmentType === 'transfer' ? 'Transfer' : 'Remove'} ({item.unit})
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
                    adjustmentType === 'transfer'
                      ? 'e.g., Refill for dinner shift'
                      : adjustmentType === 'add'
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
                  <p className="text-sm text-muted-foreground">Projected Stock Levels</p>
                  <div className="mt-1 text-sm space-y-1">
                    <p>Daily Inventory: <span className="font-semibold">{nextInventory} {item.unit}</span></p>
                    <p>External Storage: <span className="font-semibold">{nextStorage} {item.unit}</span></p>
                  </div>
                </div>
              )}

              {isTransfer && quantity && !canTransfer && (
                <p className="text-sm text-destructive">
                  Not enough stock in {fromLocation} for this transfer.
                </p>
              )}

              {!isTransfer && isSubtractiveAdjustment && quantity && !canRemove && (
                <p className="text-sm text-destructive">
                  Not enough stock in {location}. Available: {availableAtLocation} {item.unit}.
                </p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit" disabled={!quantity || parseFloat(quantity) <= 0 || (isTransfer && !canTransfer) || (!isTransfer && !canRemove)}>
                  {adjustmentType === 'add'
                    ? `Add to ${location}`
                    : adjustmentType === 'transfer'
                    ? 'Transfer Stock'
                    : adjustmentType === 'waste'
                      ? `Record waste from ${location}`
                      : `Remove from ${location}`}
                </Button>
              </div>
            </form>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  )
}
