'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { usePOSStore } from '@/lib/store'
import { Header } from '@/components/shared/header'
import { StockTable } from '@/components/inventory/stock-table'
import { StockForm } from '@/components/inventory/stock-form'
import { StockAdjustmentDialog } from '@/components/inventory/stock-adjustment'
import { LowStockAlert } from '@/components/inventory/low-stock-alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Plus, Package, AlertTriangle, TrendingDown } from 'lucide-react'
import { toast } from 'sonner'
import type { InventoryItem } from '@/lib/types'

export default function InventoryPage() {
  const router = useRouter()
  const { currentUser, inventory, stockAdjustments, getLowStockItems, deleteInventoryItem, settings } = usePOSStore()
  const [mounted, setMounted] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [showAdjustment, setShowAdjustment] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)
  const [adjustmentMode, setAdjustmentMode] = useState<'add' | 'remove' | 'waste' | 'transfer'>('add')

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted && !currentUser) {
      router.push('/')
    } else if (mounted && !['admin', 'super-admin'].includes(currentUser?.role ?? '')) {
      router.push('/pos')
    }
  }, [currentUser, mounted, router])

  const lowStockItems = getLowStockItems()
  const outOfStockItems = inventory.filter((item) => item.quantity <= 0)
  const totalDailyQty = inventory.reduce((sum, item) => sum + item.quantity, 0)
  const totalStorageQty = inventory.reduce((sum, item) => sum + (item.storageQuantity ?? 0), 0)
  const totalValue = inventory.reduce((sum, item) => sum + (item.quantity + (item.storageQuantity ?? 0)) * item.costPrice, 0)
  const recentAdjustments = [...stockAdjustments]
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, 6)

  const handleEdit = (item: InventoryItem) => {
    setSelectedItem(item)
    setShowForm(true)
  }

  const handleAdjust = (item: InventoryItem, mode: 'add' | 'remove' | 'waste' | 'transfer') => {
    setSelectedItem(item)
    setAdjustmentMode(mode)
    setShowAdjustment(true)
  }

  const handleDelete = (item: InventoryItem) => {
    setSelectedItem(item)
    setShowDeleteConfirm(true)
  }

  const confirmDelete = () => {
    if (selectedItem) {
      deleteInventoryItem(selectedItem.id)
      toast.success(`${selectedItem.name} deleted`)
      setSelectedItem(null)
      setShowDeleteConfirm(false)
    }
  }

  if (!mounted || !currentUser || !['admin', 'super-admin'].includes(currentUser.role)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <Header title="Inventory Management" />

      <div className="flex-1 overflow-auto p-3 sm:p-4 md:p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Total Items
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{inventory.length}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Daily Qty
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{totalDailyQty.toFixed(2)}</p>
              </CardContent>
            </Card>

            <Card className={lowStockItems.length > 0 ? 'border-warning/50' : ''}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <TrendingDown className="h-4 w-4" />
                  Storage Qty
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{totalStorageQty.toFixed(2)}</p>
              </CardContent>
            </Card>

            <Card className={outOfStockItems.length > 0 ? 'border-destructive/50' : ''}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-warning" />
                  Low Daily Stock
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className={`text-2xl font-bold ${lowStockItems.length > 0 ? 'text-warning' : ''}`}>
                  {lowStockItems.length}
                </p>
              </CardContent>
            </Card>

            <Card className={outOfStockItems.length > 0 ? 'border-destructive/50' : ''}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  Out of Stock (Daily)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className={`text-2xl font-bold ${outOfStockItems.length > 0 ? 'text-destructive' : ''}`}>
                  {outOfStockItems.length}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Stock Value (Daily + Storage): {settings.currencySymbol}{totalValue.toFixed(2)}
              </CardTitle>
            </CardHeader>
          </Card>

          {/* Low Stock Alert */}
          {lowStockItems.length > 0 && <LowStockAlert />}

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Recent Stock Movements</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {recentAdjustments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No stock movement recorded yet.</p>
              ) : (
                recentAdjustments.map((adjustment) => {
                  const itemName = inventory.find((i) => i.id === adjustment.inventoryItemId)?.name ?? 'Unknown item'
                  const movementLabel = adjustment.type === 'transfer'
                    ? `${adjustment.fromLocation ?? 'inventory'} → ${adjustment.toLocation ?? 'storage'}`
                    : `${adjustment.type} @ ${adjustment.location ?? 'inventory'}`

                  return (
                    <div key={adjustment.id} className="flex flex-col gap-2 rounded-md border p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-medium">{itemName}</p>
                        <p className="text-muted-foreground">{movementLabel} • {adjustment.reason}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{adjustment.quantity}</p>
                        <p className="text-xs text-muted-foreground">{new Date(adjustment.createdAt).toLocaleString()}</p>
                      </div>
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold">Inventory Items</h2>
            <Button onClick={() => {
              setSelectedItem(null)
              setShowForm(true)
            }} className="w-full gap-2 sm:w-auto">
              <Plus className="h-4 w-4" />
              Add Item
            </Button>
          </div>

          {/* Stock Table */}
          <StockTable
            onEdit={handleEdit}
            onAdjust={handleAdjust}
            onDelete={handleDelete}
          />
        </div>
      </div>

      {/* Modals */}
      <StockForm
        item={selectedItem}
        open={showForm}
        onClose={() => {
          setShowForm(false)
          setSelectedItem(null)
        }}
      />

      <StockAdjustmentDialog
        item={selectedItem}
        initialType={adjustmentMode}
        open={showAdjustment}
        onClose={() => {
          setShowAdjustment(false)
          setSelectedItem(null)
          setAdjustmentMode('add')
        }}
      />

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedItem?.name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
