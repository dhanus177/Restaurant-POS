'use client'

import { useEffect, useMemo, useState } from 'react'
import { apiFetch } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Building2, Edit2, List, Mail, Phone, Plus, Trash2, UserRound } from 'lucide-react'
import { toast } from 'sonner'
import type { InventoryItem, Supplier } from '@/lib/types'

const emptyForm = {
  name: '',
  contact: '',
  email: '',
  phone: '',
}

export function SuppliersManager() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [viewingSupplier, setViewingSupplier] = useState<Supplier | null>(null)
  const [linkedItems, setLinkedItems] = useState<InventoryItem[]>([])
  const [linkedItemsLoading, setLinkedItemsLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [formData, setFormData] = useState(emptyForm)

  useEffect(() => {
    void loadData()
  }, [])

  async function loadData() {
    try {
      setLoading(true)
      const res = await apiFetch('/api/suppliers')
      if (!res.ok) throw new Error(`Failed to fetch suppliers: ${res.status}`)
      const data = await res.json()
      setSuppliers(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Failed to load suppliers:', error)
      toast.error('Failed to load suppliers')
    } finally {
      setLoading(false)
    }
  }

  const filteredSuppliers = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return suppliers

    return suppliers.filter((supplier) => {
      const haystack = `${supplier.name} ${supplier.contact} ${supplier.phone} ${supplier.email}`.toLowerCase()
      return haystack.includes(query)
    })
  }, [suppliers, search])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!formData.name.trim()) {
      toast.error('Supplier name is required')
      return
    }

    if (!formData.contact.trim()) {
      toast.error('Contact person is required')
      return
    }

    if (!formData.phone.trim()) {
      toast.error('Phone is required')
      return
    }

    if (!formData.email.trim()) {
      toast.error('Email is required')
      return
    }

    try {
      const payload: Supplier = {
        id: editingId || crypto.randomUUID(),
        name: formData.name.trim(),
        contact: formData.contact.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
      }

      const res = await apiFetch(editingId ? `/api/suppliers/${editingId}` : '/api/suppliers', {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        throw new Error(editingId ? 'Failed to update supplier' : 'Failed to create supplier')
      }

      toast.success(editingId ? 'Supplier updated' : 'Supplier created')
      handleCloseDialog()
      await loadData()
    } catch (error: any) {
      console.error('Supplier submit error:', error)
      toast.error(error.message || 'Operation failed')
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this supplier?')) return

    try {
      const res = await apiFetch(`/api/suppliers/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        let errorMsg = 'Failed to delete supplier'
        try {
          const data = await res.json()
          errorMsg = data?.error || errorMsg
        } catch {
          // no-op
        }
        throw new Error(errorMsg)
      }
      toast.success('Supplier deleted')
      await loadData()
    } catch (error: any) {
      console.error('Delete supplier failed:', error)
      toast.error(error.message || 'Failed to delete supplier')
    }
  }

  function handleEdit(supplier: Supplier) {
    setEditingId(supplier.id)
    setFormData({
      name: supplier.name,
      contact: supplier.contact,
      email: supplier.email,
      phone: supplier.phone,
    })
    setDialogOpen(true)
  }

  function handleCloseDialog() {
    setDialogOpen(false)
    setEditingId(null)
    setFormData(emptyForm)
  }

  async function handleViewItems(supplier: Supplier) {
    try {
      setViewingSupplier(supplier)
      setLinkedItems([])
      setLinkedItemsLoading(true)

      const res = await apiFetch('/api/inventory')
      if (!res.ok) throw new Error('Failed to load inventory items')
      const data = await res.json()
      const inventoryItems = Array.isArray(data) ? (data as InventoryItem[]) : []
      setLinkedItems(inventoryItems.filter((item) => item.supplierId === supplier.id))
    } catch (error) {
      console.error('Failed to load linked inventory items:', error)
      toast.error('Failed to load linked inventory items')
      setViewingSupplier(null)
    } finally {
      setLinkedItemsLoading(false)
    }
  }

  return (
    <div className="space-y-6 p-3 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Suppliers</h2>
          <p className="mt-1 text-sm text-muted-foreground">Manage supplier contacts for purchasing and stock replenishment.</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingId(null)} className="w-full gap-2 sm:w-auto">
              <Plus className="h-5 w-5" />
              Add Supplier
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[95vw] max-w-md">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Edit Supplier' : 'Add Supplier'}</DialogTitle>
              <DialogDescription>
                Keep supplier details up to date so inventory purchases are faster.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-5 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Supplier Name <span className="text-red-500">*</span></Label>
                <Input
                  id="name"
                  placeholder="e.g., Fresh Foods Co"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact">Contact Person <span className="text-red-500">*</span></Label>
                <Input
                  id="contact"
                  placeholder="e.g., Riya Menon"
                  value={formData.contact}
                  onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone <span className="text-red-500">*</span></Label>
                  <Input
                    id="phone"
                    placeholder="555-0112"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email <span className="text-red-500">*</span></Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="supplier@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t bg-background pt-5">
                <Button type="button" variant="outline" onClick={handleCloseDialog}>
                  Cancel
                </Button>
                <Button type="submit">{editingId ? 'Update' : 'Create'} Supplier</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search suppliers by name, contact, phone, or email"
        className="max-w-xl"
      />

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Supplier List ({filteredSuppliers.length})</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {loading ? (
            <div className="py-12 text-center text-muted-foreground">
              <div className="mb-2 inline-block h-6 w-6 animate-spin rounded-full border-b-2 border-primary"></div>
              <p>Loading suppliers...</p>
            </div>
          ) : filteredSuppliers.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Building2 className="mx-auto mb-3 h-10 w-10 opacity-50" />
              <p>No matching suppliers found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-[980px]">
                <TableHeader>
                  <TableRow className="border-b bg-muted/30 hover:bg-muted/30">
                    <TableHead>Supplier</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Used By</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSuppliers.map((supplier) => (
                    <TableRow key={supplier.id}>
                      <TableCell>
                        <div className="font-medium text-foreground">{supplier.name}</div>
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                          <UserRound className="h-3.5 w-3.5" />
                          {supplier.contact}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {supplier.inventoryItemCount ?? 0} item{(supplier.inventoryItemCount ?? 0) === 1 ? '' : 's'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="gap-1">
                          <Phone className="h-3 w-3" />
                          {supplier.phone}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                          <Mail className="h-3.5 w-3.5" />
                          {supplier.email}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewItems(supplier)}
                            className="gap-1"
                            disabled={(supplier.inventoryItemCount ?? 0) === 0}
                            title={
                              (supplier.inventoryItemCount ?? 0) === 0
                                ? 'No linked inventory items'
                                : 'View linked inventory items'
                            }
                          >
                            <List className="h-4 w-4" />
                            View Items
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleEdit(supplier)} className="gap-1">
                            <Edit2 className="h-4 w-4" />
                            Edit
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(supplier.id)}
                            className="gap-1"
                            disabled={(supplier.inventoryItemCount ?? 0) > 0}
                            title={
                              (supplier.inventoryItemCount ?? 0) > 0
                                ? 'This supplier is linked to inventory items and cannot be deleted'
                                : undefined
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={Boolean(viewingSupplier)} onOpenChange={(open) => !open && setViewingSupplier(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{viewingSupplier?.name ?? 'Supplier'} — Linked Inventory</DialogTitle>
            <DialogDescription>
              Inventory items currently assigned to this supplier.
            </DialogDescription>
          </DialogHeader>

          {linkedItemsLoading ? (
            <p className="py-6 text-sm text-muted-foreground">Loading inventory items...</p>
          ) : linkedItems.length === 0 ? (
            <p className="py-6 text-sm text-muted-foreground">No linked inventory items found.</p>
          ) : (
            <div className="max-h-[420px] overflow-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Unit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {linkedItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium text-foreground">{item.name}</TableCell>
                      <TableCell className="text-muted-foreground">{item.sku}</TableCell>
                      <TableCell className="text-muted-foreground">{item.category}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>{item.unit}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}