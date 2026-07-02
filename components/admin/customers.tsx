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
import { Edit2, History, Mail, Phone, Plus, Trash2, UserRound } from 'lucide-react'
import { toast } from 'sonner'
import type { Customer } from '@/lib/types'

const emptyForm = {
  name: '',
  phone: '',
  email: '',
  notes: '',
  loyaltyPoints: '0',
}

export function CustomersManager() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [historyCustomer, setHistoryCustomer] = useState<Customer | null>(null)
  const [search, setSearch] = useState('')
  const [formData, setFormData] = useState(emptyForm)

  useEffect(() => {
    void loadData()
  }, [])

  async function loadData() {
    try {
      setLoading(true)
      const res = await apiFetch('/api/customers')
      if (!res.ok) throw new Error(`Failed to fetch customers: ${res.status}`)
      const data = await res.json()
      setCustomers(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Failed to load customers:', error)
      toast.error('Failed to load customers')
    } finally {
      setLoading(false)
    }
  }

  const filteredCustomers = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return customers

    return customers.filter((customer) => {
      const haystack = `${customer.name} ${customer.phone ?? ''} ${customer.email ?? ''} ${customer.notes ?? ''}`.toLowerCase()
      return haystack.includes(query)
    })
  }, [customers, search])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!formData.name.trim()) {
      toast.error('Customer name is required')
      return
    }

    try {
      const payload = {
        name: formData.name.trim(),
        phone: formData.phone.trim() || null,
        email: formData.email.trim() || null,
        notes: formData.notes.trim() || null,
        loyaltyPoints: Math.max(0, Math.floor(Number(formData.loyaltyPoints) || 0)),
      }

      const res = await apiFetch(editingId ? `/api/customers/${editingId}` : '/api/customers', {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        let errorMsg = editingId ? 'Failed to update customer' : 'Failed to create customer'
        try {
          const error = await res.json()
          errorMsg = error.error || errorMsg
        } catch {
          // no-op
        }
        throw new Error(errorMsg)
      }

      toast.success(editingId ? 'Customer updated' : 'Customer created')
      handleCloseDialog()
      await loadData()
    } catch (error: any) {
      console.error('Customer submit error:', error)
      toast.error(error.message || 'Operation failed')
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this customer?')) return

    try {
      const res = await apiFetch(`/api/customers/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      toast.success('Customer deleted')
      await loadData()
    } catch (error) {
      console.error('Delete customer failed:', error)
      toast.error('Failed to delete customer')
    }
  }

  function handleEdit(customer: Customer) {
    setEditingId(customer.id)
    setFormData({
      name: customer.name,
      phone: customer.phone || '',
      email: customer.email || '',
      notes: customer.notes || '',
      loyaltyPoints: String(customer.loyaltyPoints ?? 0),
    })
    setDialogOpen(true)
  }

  function handleCloseDialog() {
    setDialogOpen(false)
    setEditingId(null)
    setFormData(emptyForm)
  }

  return (
    <div className="space-y-6 p-3 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Customers</h2>
          <p className="mt-1 text-sm text-muted-foreground">Save customer profiles for faster billing and repeat orders.</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingId(null)} className="w-full gap-2 sm:w-auto">
              <Plus className="h-5 w-5" />
              Add Customer
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[95vw] max-w-md">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Edit Customer' : 'Add Customer'}</DialogTitle>
              <DialogDescription>
                Capture contact details and notes so staff can attach this customer to future orders.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-5 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Customer Name <span className="text-red-500">*</span></Label>
                <Input
                  id="name"
                  placeholder="e.g., Priya Sharma"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    placeholder="555-0104"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="loyaltyPoints">Loyalty Points</Label>
                <Input
                  id="loyaltyPoints"
                  type="number"
                  min={0}
                  step={1}
                  value={formData.loyaltyPoints}
                  onChange={(e) => setFormData({ ...formData, loyaltyPoints: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Preferences, dietary notes, loyalty details..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2 border-t bg-background pt-5">
                <Button type="button" variant="outline" onClick={handleCloseDialog}>
                  Cancel
                </Button>
                <Button type="submit">{editingId ? 'Update' : 'Create'} Customer</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search customers by name, phone, email, or notes"
        className="max-w-xl"
      />

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Customer List ({filteredCustomers.length})</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {loading ? (
            <div className="py-12 text-center text-muted-foreground">
              <div className="mb-2 inline-block h-6 w-6 animate-spin rounded-full border-b-2 border-primary"></div>
              <p>Loading customers...</p>
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <UserRound className="mx-auto mb-3 h-10 w-10 opacity-50" />
              <p>No matching customers found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-[980px]">
                <TableHeader>
                  <TableRow className="border-b bg-muted/30 hover:bg-muted/30">
                    <TableHead>Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Loyalty</TableHead>
                    <TableHead>Order Stats</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell>
                        <div className="font-medium text-foreground">{customer.name}</div>
                      </TableCell>
                      <TableCell>
                        {customer.phone ? (
                          <Badge variant="outline" className="gap-1">
                            <Phone className="h-3 w-3" />
                            {customer.phone}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {customer.email ? (
                          <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                            <Mail className="h-3.5 w-3.5" />
                            {customer.email}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-primary/10 text-primary hover:bg-primary/10">
                          {customer.loyaltyPoints ?? 0} pts
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-0.5 text-xs text-muted-foreground">
                          <div>Orders: <span className="font-medium text-foreground">{customer.orderCount ?? 0}</span></div>
                          <div>Spent: <span className="font-medium text-foreground">${(customer.lifetimeSpent ?? 0).toFixed(2)}</span></div>
                          <div>
                            Last: <span className="font-medium text-foreground">
                              {customer.lastOrderAt ? new Date(customer.lastOrderAt).toLocaleDateString() : '—'}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[260px] truncate text-sm text-muted-foreground">
                        {customer.notes || '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => setHistoryCustomer(customer)} className="gap-1">
                            <History className="h-4 w-4" />
                            History
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleEdit(customer)} className="gap-1">
                            <Edit2 className="h-4 w-4" />
                            Edit
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => handleDelete(customer.id)} className="gap-1">
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

      <Dialog open={Boolean(historyCustomer)} onOpenChange={(open) => !open && setHistoryCustomer(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{historyCustomer?.name ?? 'Customer'} — Recent Orders</DialogTitle>
            <DialogDescription>
              Latest orders attached to this customer profile.
            </DialogDescription>
          </DialogHeader>

          {!historyCustomer?.recentOrders?.length ? (
            <p className="py-6 text-sm text-muted-foreground">No order history yet.</p>
          ) : (
            <div className="max-h-[420px] overflow-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historyCustomer.recentOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell>#{order.orderNumber}</TableCell>
                      <TableCell className="capitalize">{order.status}</TableCell>
                      <TableCell className="capitalize">{order.paymentStatus}</TableCell>
                      <TableCell>${order.total.toFixed(2)}</TableCell>
                      <TableCell>{new Date(order.createdAt).toLocaleString()}</TableCell>
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
