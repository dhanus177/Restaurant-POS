'use client'

import { usePOSStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Minus, Plus, Trash2, MessageSquare } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { useMemo, useState } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

interface CartProps {
  onCreateBill: () => void
  onSelectTable: () => void
  orderMode?: 'dine-in' | 'takeaway'
  className?: string
}

export function Cart({ onCreateBill, onSelectTable, orderMode = 'dine-in', className }: CartProps) {
  const {
    cart,
    selectedTable,
    customers,
    selectedCustomer,
    settings,
    currentCustomerCount,
    setSelectedCustomer,
    createCustomer,
    removeFromCart,
    updateCartItemQuantity,
    updateCartItemNotes,
    getCartTotal,
    clearCart,
  } = usePOSStore()
  const [editingNotes, setEditingNotes] = useState<string | null>(null)
  const [noteText, setNoteText] = useState('')
  const [customerSearch, setCustomerSearch] = useState('')
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const [quickAddName, setQuickAddName] = useState('')
  const [quickAddPhone, setQuickAddPhone] = useState('')
  const [quickAddEmail, setQuickAddEmail] = useState('')
  const [quickAddNotes, setQuickAddNotes] = useState('')
  const [quickAddSaving, setQuickAddSaving] = useState(false)

  const { subtotal, tax: serviceCharge, total } = getCartTotal()
  const filteredCustomers = useMemo(() => {
    const query = customerSearch.trim().toLowerCase()
    if (!query) return customers
    return customers.filter((customer) => {
      const haystack = `${customer.name} ${customer.phone ?? ''} ${customer.email ?? ''}`.toLowerCase()
      return haystack.includes(query)
    })
  }, [customerSearch, customers])

  const handleEditNotes = (itemId: string, currentNotes?: string) => {
    setEditingNotes(itemId)
    setNoteText(currentNotes || '')
  }

  const handleSaveNotes = (itemId: string) => {
    updateCartItemNotes(itemId, noteText)
    setEditingNotes(null)
    setNoteText('')
  }

  const resetQuickAdd = () => {
    setQuickAddName('')
    setQuickAddPhone('')
    setQuickAddEmail('')
    setQuickAddNotes('')
  }

  const handleQuickAddCustomer = async () => {
    if (!quickAddName.trim()) {
      toast.error('Customer name is required')
      return
    }

    setQuickAddSaving(true)
    try {
      const customer = await createCustomer({
        name: quickAddName.trim(),
        phone: quickAddPhone.trim() || undefined,
        email: quickAddEmail.trim() || undefined,
        notes: quickAddNotes.trim() || undefined,
      })

      if (!customer) {
        toast.error('Failed to create customer')
        return
      }

      setSelectedCustomer(customer)
      setQuickAddOpen(false)
      resetQuickAdd()
      toast.success(`Customer added: ${customer.name}`)
    } finally {
      setQuickAddSaving(false)
    }
  }

  const handleCreateBillClick = () => {
    if (settings.requireCustomerBeforeOrder === true && !selectedCustomer) {
      toast.error('Before billing: Step 1 is customer details.')
      return
    }

    if (!selectedTable && orderMode !== 'takeaway') {
      toast.error('Before billing: Step 2 is table selection.')
      onSelectTable()
      return
    }

    onCreateBill()
  }

  return (
    <div className={cn('flex h-full flex-col bg-card border-l border-border', className)}>
      {/* Header */}
      <div className="border-b border-border p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Current Order</h2>
          {cart.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clearCart} className="text-destructive hover:text-destructive">
              <Trash2 className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}
        </div>
        <div className="mt-2 space-y-1 rounded-md border p-2">
          <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
            {settings.requireCustomerBeforeOrder === true ? 'Step 1 — Customer details' : 'Customer details (optional)'}
          </p>
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Customer</span>
            <Dialog open={quickAddOpen} onOpenChange={setQuickAddOpen}>
              <DialogTrigger asChild>
                <Button type="button" variant="outline" size="sm" className="h-7 gap-1 px-2 text-xs">
                  <Plus className="h-3.5 w-3.5" />
                  Quick Add
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Customer</DialogTitle>
                  <DialogDescription>Create a customer and attach them to this order.</DialogDescription>
                </DialogHeader>
                <div className="space-y-3 py-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="quick-customer-name">Name</Label>
                    <Input
                      id="quick-customer-name"
                      value={quickAddName}
                      onChange={(e) => setQuickAddName(e.target.value)}
                      placeholder="Customer name"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="quick-customer-phone">Phone</Label>
                    <Input
                      id="quick-customer-phone"
                      value={quickAddPhone}
                      onChange={(e) => setQuickAddPhone(e.target.value)}
                      placeholder="555-0101"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="quick-customer-email">Email</Label>
                    <Input
                      id="quick-customer-email"
                      value={quickAddEmail}
                      onChange={(e) => setQuickAddEmail(e.target.value)}
                      placeholder="name@example.com"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="quick-customer-notes">Notes</Label>
                    <Input
                      id="quick-customer-notes"
                      value={quickAddNotes}
                      onChange={(e) => setQuickAddNotes(e.target.value)}
                      placeholder="Preferences, reminders"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setQuickAddOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="button" onClick={handleQuickAddCustomer} disabled={quickAddSaving}>
                    {quickAddSaving ? 'Saving...' : 'Save Customer'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          <Input
            value={customerSearch}
            onChange={(e) => setCustomerSearch(e.target.value)}
            placeholder="Search customers by name/phone"
            className="h-8"
          />
          <Select
            value={selectedCustomer?.id ?? 'walk-in'}
            onValueChange={(value) => {
              if (value === 'walk-in') {
                setSelectedCustomer(null)
                return
              }

              const customer = customers.find((entry) => entry.id === value) ?? null
              setSelectedCustomer(customer)
            }}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Walk-in customer" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="walk-in">Walk-in customer</SelectItem>
              {filteredCustomers.map((customer) => (
                <SelectItem key={customer.id} value={customer.id}>
                  {customer.name}{customer.phone ? ` • ${customer.phone}` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedCustomer?.notes && (
            <p className="text-xs text-muted-foreground">Note: {selectedCustomer.notes}</p>
          )}
        </div>

        <div className="mt-2 rounded-md border p-2">
          <p className="mb-2 text-[11px] uppercase tracking-[0.15em] text-muted-foreground">Step 2 — Table selection</p>
          <Button
            variant={selectedTable ? 'secondary' : 'outline'}
            size="sm"
            className="w-full justify-start"
            onClick={onSelectTable}
          >
            {selectedTable ? `Table: ${selectedTable.name}` : orderMode === 'takeaway' ? 'Takeaway' : 'Select Table'}
          </Button>
        </div>
      </div>

      {/* Cart Items */}
      <ScrollArea className="flex-1">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
            <p>No items in cart</p>
            <p className="text-sm">Tap items to add them</p>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {cart.map((item) => (
              <div key={item.id} className="bg-secondary/50 rounded-lg p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{item.name}</p>
                    {item.modifiers.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        + {item.modifiers.map(m => m.name).join(', ')}
                      </p>
                    )}
                    {item.notes && editingNotes !== item.id && (
                      <p className="text-xs text-primary mt-1 italic">Note: {item.notes}</p>
                    )}
                    {editingNotes === item.id && (
                      <div className="flex gap-2 mt-2">
                        <Input
                          value={noteText}
                          onChange={(e) => setNoteText(e.target.value)}
                          placeholder="Add note..."
                          className="h-8 text-sm"
                          autoFocus
                        />
                        <Button size="sm" onClick={() => handleSaveNotes(item.id)}>
                          Save
                        </Button>
                      </div>
                    )}
                  </div>
                  <p className="font-semibold text-foreground whitespace-nowrap">
                    {settings.currencySymbol}
                    {((item.price + item.modifiers.reduce((sum, m) => sum + m.price, 0)) * item.quantity).toFixed(2)}
                  </p>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => updateCartItemQuantity(item.id, item.quantity - 1)}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="w-8 text-center font-medium">{item.quantity}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => updateCartItemQuantity(item.id, item.quantity + 1)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleEditNotes(item.id, item.notes)}
                    >
                      <MessageSquare className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => removeFromCart(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Totals & Checkout */}
      <div className="border-t border-border p-4 space-y-3">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>Subtotal</span>
            <span>{settings.currencySymbol}{subtotal.toFixed(2)}</span>
          </div>
          {serviceCharge > 0 && (
            <div className="flex justify-between text-muted-foreground">
              <span>Service Charge ({settings.taxRate}%)</span>
              <span>{settings.currencySymbol}{serviceCharge.toFixed(2)}</span>
            </div>
          )}
          <Separator />
          <div className="flex justify-between text-lg font-bold text-foreground">
            <span>Total</span>
            <span>{settings.currencySymbol}{total.toFixed(2)}</span>
          </div>

          {currentCustomerCount > 1 && (
            <div className="flex justify-between text-sm text-primary">
              <span>Per Customer ({currentCustomerCount})</span>
              <span>{settings.currencySymbol}{(total / currentCustomerCount).toFixed(2)}</span>
            </div>
          )}
        </div>
        <Button
          size="lg"
          className="w-full h-14 text-lg font-semibold"
          disabled={cart.length === 0}
          onClick={handleCreateBillClick}
        >
          Create Bill {settings.currencySymbol}{total.toFixed(2)}
        </Button>
      </div>
    </div>
  )
}
