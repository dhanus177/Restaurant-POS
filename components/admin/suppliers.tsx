'use client'

import { useEffect, useMemo, useState } from 'react'
import { apiFetch } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import {
  ArrowLeftRight,
  Building2,
  Edit2,
  List,
  Mail,
  PackagePlus,
  Phone,
  Plus,
  Printer,
  Receipt,
  Trash2,
  UserRound,
  Wallet,
} from 'lucide-react'
import { toast } from 'sonner'
import { printSupplierStatement } from '@/lib/print'
import { usePOSStore } from '@/lib/store'
import type { InventoryItem, Supplier, SupplierLedgerEntry, SupplierLedgerEntryType } from '@/lib/types'

const emptyForm = {
  name: '',
  contact: '',
  email: '',
  phone: '',
}

const emptyLedgerForm = {
  type: 'purchase' as SupplierLedgerEntryType,
  reference: '',
  inventoryItemId: '',
  quantity: '',
  amount: '',
  notes: '',
}

type LedgerDateRange = 'all' | '7days' | '30days' | '90days'

function getAutoReference(type: SupplierLedgerEntryType, existingEntries: SupplierLedgerEntry[]) {
  const prefixMap: Record<SupplierLedgerEntryType, string> = {
    purchase: 'PUR',
    grn: 'GRN',
    payment: 'PAY',
    return: 'RET',
  }

  const now = new Date()
  const y = now.getFullYear().toString().slice(-2)
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  const sequence = existingEntries.filter((entry) => entry.type === type).length + 1
  return `${prefixMap[type]}-${y}${m}${d}-${String(sequence).padStart(3, '0')}`
}

export function SuppliersManager() {
  const { settings } = usePOSStore()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [viewingSupplier, setViewingSupplier] = useState<Supplier | null>(null)
  const [linkedItems, setLinkedItems] = useState<InventoryItem[]>([])
  const [linkedItemsLoading, setLinkedItemsLoading] = useState(false)
  const [ledgerSupplier, setLedgerSupplier] = useState<Supplier | null>(null)
  const [ledgerEntries, setLedgerEntries] = useState<SupplierLedgerEntry[]>([])
  const [ledgerLoading, setLedgerLoading] = useState(false)
  const [ledgerFilter, setLedgerFilter] = useState<'all' | SupplierLedgerEntryType>('all')
  const [ledgerDateRange, setLedgerDateRange] = useState<LedgerDateRange>('all')
  const [ledgerForm, setLedgerForm] = useState(emptyLedgerForm)
  const [ledgerSaving, setLedgerSaving] = useState(false)
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

  const payableSummary = useMemo(() => {
    return filteredSuppliers.reduce(
      (acc, supplier) => {
        acc.totalPayable += supplier.balanceDue ?? 0
        acc.aging0to30 += supplier.aging0to30 ?? 0
        acc.aging31to60 += supplier.aging31to60 ?? 0
        acc.aging61to90 += supplier.aging61to90 ?? 0
        acc.aging90plus += supplier.aging90plus ?? 0
        acc.overdue += supplier.overdueAmount ?? 0
        return acc
      },
      {
        totalPayable: 0,
        aging0to30: 0,
        aging31to60: 0,
        aging61to90: 0,
        aging90plus: 0,
        overdue: 0,
      }
    )
  }, [filteredSuppliers])

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

  async function openLedger(supplier: Supplier) {
    try {
      setLedgerSupplier(supplier)
      setLedgerEntries([])
      setLedgerLoading(true)
      setLedgerFilter('all')
      setLedgerDateRange('all')

      const [ledgerRes, inventoryRes] = await Promise.all([
        apiFetch(`/api/suppliers/${supplier.id}/ledger`),
        apiFetch('/api/inventory'),
      ])

      if (!ledgerRes.ok) throw new Error('Failed to load supplier ledger')
      if (!inventoryRes.ok) throw new Error('Failed to load inventory items')

      const ledgerData = await ledgerRes.json()
      const inventoryData = await inventoryRes.json()

  const nextLedgerEntries = Array.isArray(ledgerData) ? ledgerData : []
  setLedgerEntries(nextLedgerEntries)
  setLedgerForm({ ...emptyLedgerForm, reference: getAutoReference('purchase', nextLedgerEntries) })
      setLinkedItems(Array.isArray(inventoryData) ? (inventoryData as InventoryItem[]).filter((item) => item.supplierId === supplier.id) : [])
    } catch (error) {
      console.error('Failed to load supplier ledger:', error)
      toast.error('Failed to load supplier ledger')
      setLedgerSupplier(null)
    } finally {
      setLedgerLoading(false)
    }
  }

  async function handleSaveLedgerEntry(e: React.FormEvent) {
    e.preventDefault()

    if (!ledgerSupplier) return

    const amount = Number(ledgerForm.amount)
    const quantity = ledgerForm.quantity.trim() ? Number(ledgerForm.quantity) : null

    if (!Number.isFinite(amount) || amount < 0) {
      toast.error('Amount must be a non-negative number')
      return
    }

    if (quantity !== null && (!Number.isFinite(quantity) || quantity < 0)) {
      toast.error('Quantity must be a non-negative number')
      return
    }

    setLedgerSaving(true)
    try {
      const res = await apiFetch(`/api/suppliers/${ledgerSupplier.id}/ledger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: ledgerForm.type,
          reference: ledgerForm.reference,
          inventoryItemId: ledgerForm.inventoryItemId || null,
          quantity,
          amount,
          notes: ledgerForm.notes,
        }),
      })

      if (!res.ok) throw new Error('Failed to save supplier entry')

      const created = (await res.json()) as SupplierLedgerEntry
      setLedgerEntries((current) => {
        const next = [created, ...current]
        setLedgerForm((form) => ({
          ...emptyLedgerForm,
          type: form.type,
          reference: getAutoReference(form.type, next),
        }))
        return next
      })
      toast.success('Supplier ledger updated')
      await loadData()
    } catch (error: any) {
      console.error('Failed to save supplier ledger entry:', error)
      toast.error(error.message || 'Failed to save supplier ledger entry')
    } finally {
      setLedgerSaving(false)
    }
  }

  const visibleLedgerEntries = useMemo(() => {
    const now = new Date()
    const cutoff =
      ledgerDateRange === 'all'
        ? null
        : new Date(now.getTime() - (ledgerDateRange === '7days' ? 7 : ledgerDateRange === '30days' ? 30 : 90) * 24 * 60 * 60 * 1000)

    return ledgerEntries.filter((entry) => {
      const matchesType = ledgerFilter === 'all' || entry.type === ledgerFilter
      const matchesDate = !cutoff || new Date(entry.createdAt) >= cutoff
      return matchesType && matchesDate
    })
  }, [ledgerEntries, ledgerFilter, ledgerDateRange])

  const ledgerSummary = useMemo(() => {
    const purchases = ledgerEntries
      .filter((entry) => entry.type === 'purchase' || entry.type === 'grn')
      .reduce((sum, entry) => sum + entry.amount, 0)
    const returnsAndPayments = ledgerEntries
      .filter((entry) => entry.type === 'payment' || entry.type === 'return')
      .reduce((sum, entry) => sum + entry.amount, 0)

    return {
      purchases,
      returnsAndPayments,
      balance: purchases - returnsAndPayments,
    }
  }, [ledgerEntries])

  const ledgerTypeLabel: Record<SupplierLedgerEntryType, string> = {
    purchase: 'Purchase',
    payment: 'Payment',
    grn: 'GRN',
    return: 'Return',
  }

  const agingSummary = useMemo(() => {
    const purchaseEntries = [...ledgerEntries]
      .filter((entry) => entry.type === 'purchase' || entry.type === 'grn')
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .map((entry) => ({ ...entry, remaining: entry.amount }))

    let creditsToApply = ledgerEntries
      .filter((entry) => entry.type === 'payment' || entry.type === 'return')
      .reduce((sum, entry) => sum + entry.amount, 0)

    for (const entry of purchaseEntries) {
      if (creditsToApply <= 0) break
      const applied = Math.min(entry.remaining, creditsToApply)
      entry.remaining -= applied
      creditsToApply -= applied
    }

    const buckets = [
      { label: '0-30 days', min: 0, max: 30, amount: 0 },
      { label: '31-60 days', min: 31, max: 60, amount: 0 },
      { label: '61-90 days', min: 61, max: 90, amount: 0 },
      { label: '90+ days', min: 91, max: Number.POSITIVE_INFINITY, amount: 0 },
    ]

    const now = Date.now()
    for (const entry of purchaseEntries) {
      if (entry.remaining <= 0) continue
      const ageDays = Math.floor((now - new Date(entry.createdAt).getTime()) / (24 * 60 * 60 * 1000))
      const bucket = buckets.find((item) => ageDays >= item.min && ageDays <= item.max)
      if (bucket) bucket.amount += entry.remaining
    }

    return buckets.map(({ label, amount }) => ({ label, amount }))
  }, [ledgerEntries])

  function handleLedgerTypeChange(type: SupplierLedgerEntryType) {
    setLedgerForm((current) => ({
      ...current,
      type,
      reference: getAutoReference(type, ledgerEntries),
    }))
  }

  function handlePrintStatement() {
    if (!ledgerSupplier) return
    printSupplierStatement(ledgerSupplier, visibleLedgerEntries, settings, ledgerSummary, agingSummary)
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

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Total payable</p>
            <p className="mt-2 text-lg font-bold text-foreground">{settings.currencySymbol}{payableSummary.totalPayable.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">0-30 days</p>
            <p className="mt-2 text-lg font-bold text-foreground">{settings.currencySymbol}{payableSummary.aging0to30.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">31-60 days</p>
            <p className="mt-2 text-lg font-bold text-foreground">{settings.currencySymbol}{payableSummary.aging31to60.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">61-90 days</p>
            <p className="mt-2 text-lg font-bold text-amber-600 dark:text-amber-400">{settings.currencySymbol}{payableSummary.aging61to90.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">90+ days</p>
            <p className="mt-2 text-lg font-bold text-red-600 dark:text-red-400">{settings.currencySymbol}{payableSummary.aging90plus.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Overdue (61+)</p>
            <p className="mt-2 text-lg font-bold text-red-600 dark:text-red-400">{settings.currencySymbol}{payableSummary.overdue.toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>

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
                    <TableHead>Balance</TableHead>
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
                        <div className="space-y-0.5 text-xs text-muted-foreground">
                          <div>Purchases: <span className="font-medium text-foreground">{(supplier.totalPurchases ?? 0).toFixed(2)}</span></div>
                          <div>Payments: <span className="font-medium text-foreground">{(supplier.totalPayments ?? 0).toFixed(2)}</span></div>
                          <div>Due: <span className="font-medium text-foreground">{(supplier.balanceDue ?? 0).toFixed(2)}</span></div>
                          <div className="pt-1">Aging: 0-30 {(supplier.aging0to30 ?? 0).toFixed(2)} · 31-60 {(supplier.aging31to60 ?? 0).toFixed(2)} · 61-90 {(supplier.aging61to90 ?? 0).toFixed(2)} · 90+ {(supplier.aging90plus ?? 0).toFixed(2)}</div>
                        </div>
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
                          <Button variant="outline" size="sm" onClick={() => void openLedger(supplier)} className="gap-1">
                            <Receipt className="h-4 w-4" />
                            Ledger
                          </Button>
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

      <Dialog open={Boolean(ledgerSupplier)} onOpenChange={(open) => !open && setLedgerSupplier(null)}>
        <DialogContent className="h-[92vh] w-[98vw] max-w-[98vw] sm:max-w-[98vw] 2xl:max-w-[1500px] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{ledgerSupplier?.name ?? 'Supplier'} — Purchases, GRN, Returns & Payments</DialogTitle>
            <DialogDescription>
              Record supplier transactions and review the running balance.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 2xl:grid-cols-[380px_minmax(620px,1fr)]">
            <Card className="min-w-0">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Add Supplier Entry</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div className="rounded-lg border bg-background p-3">
                    <div className="text-muted-foreground">Purchases</div>
                    <div className="font-semibold text-foreground">{ledgerSummary.purchases.toFixed(2)}</div>
                  </div>
                  <div className="rounded-lg border bg-background p-3">
                    <div className="text-muted-foreground">Paid/Returned</div>
                    <div className="font-semibold text-foreground">{ledgerSummary.returnsAndPayments.toFixed(2)}</div>
                  </div>
                  <div className="rounded-lg border bg-background p-3">
                    <div className="text-muted-foreground">Balance</div>
                    <div className="font-semibold text-foreground">{ledgerSummary.balance.toFixed(2)}</div>
                  </div>
                </div>

                <form onSubmit={handleSaveLedgerEntry} className="space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="ledger-type">Entry Type</Label>
                    <select
                      id="ledger-type"
                      className="h-10 rounded-md border bg-background px-3 text-sm"
                      value={ledgerForm.type}
                      onChange={(e) => handleLedgerTypeChange(e.target.value as SupplierLedgerEntryType)}
                    >
                      <option value="purchase">Purchase</option>
                      <option value="grn">GRN</option>
                      <option value="return">Return</option>
                      <option value="payment">Payment</option>
                    </select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="ledger-reference">Reference</Label>
                    <Input
                      id="ledger-reference"
                      value={ledgerForm.reference}
                      onChange={(e) => setLedgerForm((current) => ({ ...current, reference: e.target.value }))}
                      placeholder="Invoice, voucher, GRN no..."
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="ledger-item">Inventory Item</Label>
                    <select
                      id="ledger-item"
                      className="h-10 rounded-md border bg-background px-3 text-sm"
                      value={ledgerForm.inventoryItemId}
                      onChange={(e) => setLedgerForm((current) => ({ ...current, inventoryItemId: e.target.value }))}
                    >
                      <option value="">No linked item</option>
                      {linkedItems.map((item) => (
                        <option key={item.id} value={item.id}>{item.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor="ledger-quantity">Quantity</Label>
                      <Input
                        id="ledger-quantity"
                        type="number"
                        min="0"
                        step="0.01"
                        value={ledgerForm.quantity}
                        onChange={(e) => setLedgerForm((current) => ({ ...current, quantity: e.target.value }))}
                        placeholder="Optional"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="ledger-amount">Amount</Label>
                      <Input
                        id="ledger-amount"
                        type="number"
                        min="0"
                        step="0.01"
                        value={ledgerForm.amount}
                        onChange={(e) => setLedgerForm((current) => ({ ...current, amount: e.target.value }))}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="ledger-notes">Notes</Label>
                    <Textarea
                      id="ledger-notes"
                      rows={3}
                      value={ledgerForm.notes}
                      onChange={(e) => setLedgerForm((current) => ({ ...current, notes: e.target.value }))}
                      placeholder="Optional notes"
                    />
                  </div>

                  <Button type="submit" className="w-full gap-2" disabled={ledgerSaving}>
                    {ledgerForm.type === 'purchase' && <PackagePlus className="h-4 w-4" />}
                    {ledgerForm.type === 'grn' && <Receipt className="h-4 w-4" />}
                    {ledgerForm.type === 'return' && <ArrowLeftRight className="h-4 w-4" />}
                    {ledgerForm.type === 'payment' && <Wallet className="h-4 w-4" />}
                    {ledgerSaving ? 'Saving...' : `Add ${ledgerTypeLabel[ledgerForm.type]}`}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card className="min-w-0">
              <CardHeader className="pb-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <CardTitle className="text-lg">Supplier Ledger</CardTitle>
                  <div className="flex w-full flex-wrap gap-2 sm:w-auto">
                    <Button variant="outline" size="sm" className="gap-2" onClick={handlePrintStatement}>
                      <Printer className="h-4 w-4" />
                      Print Statement
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-4 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-start">
                  <div className="flex flex-wrap gap-2">
                    {(['all', 'purchase', 'grn', 'return', 'payment'] as const).map((filter) => (
                      <Button
                        key={filter}
                        variant={ledgerFilter === filter ? 'default' : 'outline'}
                        size="sm"
                        className="min-w-[92px]"
                        onClick={() => setLedgerFilter(filter)}
                      >
                        {filter === 'all' ? 'All' : filter === 'grn' ? 'GRN' : filter[0].toUpperCase() + filter.slice(1)}
                      </Button>
                    ))}
                  </div>
                  <select
                    className="h-9 w-full rounded-md border bg-background px-3 text-sm lg:w-[170px]"
                    value={ledgerDateRange}
                    onChange={(e) => setLedgerDateRange(e.target.value as LedgerDateRange)}
                  >
                    <option value="all">All dates</option>
                    <option value="7days">Last 7 days</option>
                    <option value="30days">Last 30 days</option>
                    <option value="90days">Last 90 days</option>
                  </select>
                </div>

                <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-4 text-sm">
                  {agingSummary.map((bucket) => (
                    <div key={bucket.label} className="rounded-lg border bg-background p-3">
                      <div className="text-muted-foreground text-xs uppercase tracking-[0.15em]">{bucket.label}</div>
                      <div className="font-semibold text-foreground">{settings.currencySymbol}{bucket.amount.toFixed(2)}</div>
                    </div>
                  ))}
                </div>

                {ledgerLoading ? (
                  <div className="py-10 text-center text-muted-foreground">Loading ledger...</div>
                ) : visibleLedgerEntries.length === 0 ? (
                  <div className="py-10 text-center text-muted-foreground">No ledger entries found.</div>
                ) : (
                  <div className="max-h-[520px] overflow-auto rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Reference</TableHead>
                          <TableHead>Qty</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Notes</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {visibleLedgerEntries.map((entry) => (
                          <TableRow key={entry.id}>
                            <TableCell className="whitespace-nowrap">{new Date(entry.createdAt).toLocaleString()}</TableCell>
                            <TableCell>
                              <Badge variant={entry.type === 'payment' ? 'secondary' : entry.type === 'return' ? 'outline' : 'default'}>
                                {ledgerTypeLabel[entry.type]}
                              </Badge>
                            </TableCell>
                            <TableCell>{entry.reference || '—'}</TableCell>
                            <TableCell>{entry.quantity ?? '—'}</TableCell>
                            <TableCell>{entry.amount.toFixed(2)}</TableCell>
                            <TableCell className="max-w-[260px] truncate text-muted-foreground">{entry.notes || '—'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}