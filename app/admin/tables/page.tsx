'use client'

import { useState } from 'react'
import { usePOSStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { Plus, Pencil, Trash2, Users } from 'lucide-react'
import { toast } from 'sonner'
import type { Table } from '@/lib/types'

export default function TablesManagementPage() {
  const { tables, addTable, updateTable, deleteTable, updateTableStatus } = usePOSStore()
  const [showForm, setShowForm] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards')
  const [selectedTable, setSelectedTable] = useState<Table | null>(null)
  const [formData, setFormData] = useState({
    number: 1,
    name: '',
    seats: 2,
  })

  const handleEdit = (table: Table) => {
    setSelectedTable(table)
    setFormData({
      number: table.number,
      name: table.name,
      seats: table.seats,
    })
    setShowForm(true)
  }

  const handleAdd = () => {
    const maxNumber = Math.max(...tables.map((t) => t.number), 0)
    setSelectedTable(null)
    setFormData({
      number: maxNumber + 1,
      name: `Table ${maxNumber + 1}`,
      seats: 2,
    })
    setShowForm(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedTable) {
      updateTable(selectedTable.id, formData)
      toast.success('Table updated')
    } else {
      addTable({
        id: `table-${Date.now()}`,
        ...formData,
        status: 'available',
      })
      toast.success('Table added')
    }
    setShowForm(false)
  }

  const handleDelete = (table: Table) => {
    setSelectedTable(table)
    setShowDeleteConfirm(true)
  }

  const confirmDelete = () => {
    if (selectedTable) {
      deleteTable(selectedTable.id)
      toast.success('Table deleted')
      setSelectedTable(null)
      setShowDeleteConfirm(false)
    }
  }

  const handleClearTable = (table: Table) => {
    updateTableStatus(table.id, 'available', undefined)
    toast.success(`${table.name} is now available`)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'border-primary bg-primary/10'
      case 'occupied':
        return 'border-warning bg-warning/10'
      case 'reserved':
        return 'border-muted bg-muted/10'
      default:
        return ''
    }
  }

  return (
    <div className="space-y-6 p-3 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Table Management</h1>
          <p className="text-muted-foreground">Manage your restaurant tables</p>
        </div>
        <Button onClick={handleAdd} className="w-full gap-2 sm:w-auto">
          <Plus className="h-4 w-4" />
          Add Table
        </Button>
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button variant={viewMode === 'cards' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('cards')}>Cards</Button>
        <Button variant={viewMode === 'table' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('table')}>Table</Button>
      </div>

      {viewMode === 'cards' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {tables.map((table) => (
            <Card key={table.id} className={`${getStatusColor(table.status)} transition-colors`}>
              <CardContent className="p-4 text-center">
                <h3 className="text-lg font-bold text-foreground">{table.name}</h3>
                <div className="flex items-center justify-center gap-1 text-muted-foreground my-2">
                  <Users className="h-4 w-4" />
                  <span>{table.seats} seats</span>
                </div>
                <Badge
                  variant={table.status === 'available' ? 'default' : 'secondary'}
                  className="mb-3"
                >
                  {table.status}
                </Badge>
                <div className="flex justify-center gap-1">
                  {table.status === 'occupied' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleClearTable(table)}
                    >
                      Clear
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(table)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 text-destructive"
                    onClick={() => handleDelete(table)}
                    disabled={table.status === 'occupied'}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="min-w-[680px] w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="p-3 text-left">Table</th>
                <th className="p-3 text-left">Seats</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tables.map((table) => (
                <tr key={table.id} className="border-t">
                  <td className="p-3 font-medium">{table.name}</td>
                  <td className="p-3">{table.seats}</td>
                  <td className="p-3"><Badge variant={table.status === 'available' ? 'default' : 'secondary'}>{table.status}</Badge></td>
                  <td className="p-3">
                    <div className="flex justify-end gap-1">
                      {table.status === 'occupied' && <Button variant="outline" size="sm" onClick={() => handleClearTable(table)}>Clear</Button>}
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(table)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-10 w-10 text-destructive" onClick={() => handleDelete(table)} disabled={table.status === 'occupied'}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="w-[95vw] max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedTable ? 'Edit Table' : 'Add Table'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="number">Table Number</Label>
                <Input
                  id="number"
                  type="number"
                  min="1"
                  value={formData.number}
                  onChange={(e) => setFormData({ ...formData, number: parseInt(e.target.value) || 1 })}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="seats">Seats</Label>
                <Input
                  id="seats"
                  type="number"
                  min="1"
                  value={formData.seats}
                  onChange={(e) => setFormData({ ...formData, seats: parseInt(e.target.value) || 1 })}
                  required
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="name">Display Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Table 1, Bar 1, Patio A"
                required
              />
            </div>
            <div className="sticky bottom-0 flex flex-col-reverse gap-2 border-t bg-background pt-4 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button type="submit" className="w-full sm:w-auto">{selectedTable ? 'Update' : 'Add'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Table</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedTable?.name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="h-10 bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
