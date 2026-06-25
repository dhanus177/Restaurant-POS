'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { usePOSStore } from '@/lib/store'
import type { InventoryItem } from '@/lib/types'

interface StockFormProps {
  item: InventoryItem | null
  open: boolean
  onClose: () => void
}

const categories = ['Meat', 'Seafood', 'Vegetables', 'Dairy', 'Bakery', 'Beverages', 'Supplies']
const units = ['kg', 'g', 'L', 'ml', 'pcs', 'packs', 'boxes', 'cans', 'bottles', 'heads']

export function StockForm({ item, open, onClose }: StockFormProps) {
  const { suppliers, addInventoryItem, updateInventoryItem } = usePOSStore()
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    quantity: 0,
    storageQuantity: 0,
    unit: 'pcs',
    minQuantity: 5,
    costPrice: 0,
    category: 'Supplies',
    supplierId: '',
  })

  useEffect(() => {
    if (item) {
      setFormData({
        name: item.name,
        sku: item.sku,
        quantity: item.quantity,
        storageQuantity: item.storageQuantity ?? 0,
        unit: item.unit,
        minQuantity: item.minQuantity,
        costPrice: item.costPrice,
        category: item.category,
        supplierId: item.supplierId || '',
      })
    } else {
      setFormData({
        name: '',
        sku: '',
        quantity: 0,
        storageQuantity: 0,
        unit: 'pcs',
        minQuantity: 5,
        costPrice: 0,
        category: 'Supplies',
        supplierId: '',
      })
    }
  }, [item])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (item) {
      updateInventoryItem(item.id, formData)
    } else {
      addInventoryItem({
        id: `inv-${Date.now()}`,
        ...formData,
        lastRestocked: new Date().toISOString(),
      })
    }

    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{item ? 'Edit Item' : 'Add New Item'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Item Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="sku">SKU</Label>
                <Input
                  id="sku"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  placeholder="e.g., MEAT-001"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="quantity">Daily Qty</Label>
                <Input
                  id="quantity"
                  type="number"
                  step="0.01"
                  value={formData.quantity}
                  onChange={(e) =>
                    setFormData({ ...formData, quantity: parseFloat(e.target.value) || 0 })
                  }
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="storageQuantity">Storage Qty</Label>
                <Input
                  id="storageQuantity"
                  type="number"
                  step="0.01"
                  value={formData.storageQuantity}
                  onChange={(e) =>
                    setFormData({ ...formData, storageQuantity: parseFloat(e.target.value) || 0 })
                  }
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="unit">Unit</Label>
                <Select
                  value={formData.unit}
                  onValueChange={(value) => setFormData({ ...formData, unit: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {units.map((unit) => (
                      <SelectItem key={unit} value={unit}>
                        {unit}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="minQuantity">Min Qty</Label>
                <Input
                  id="minQuantity"
                  type="number"
                  value={formData.minQuantity}
                  onChange={(e) =>
                    setFormData({ ...formData, minQuantity: parseInt(e.target.value) || 0 })
                  }
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="costPrice">Cost Price</Label>
                <Input
                  id="costPrice"
                  type="number"
                  step="0.01"
                  value={formData.costPrice}
                  onChange={(e) =>
                    setFormData({ ...formData, costPrice: parseFloat(e.target.value) || 0 })
                  }
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="supplier">Supplier</Label>
                <Select
                  value={formData.supplierId}
                  onValueChange={(value) => setFormData({ ...formData, supplierId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">{item ? 'Update' : 'Add Item'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
