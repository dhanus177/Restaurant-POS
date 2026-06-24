'use client'

import { usePOSStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Minus, Plus, Trash2, MessageSquare } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { useState } from 'react'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

interface CartProps {
  onCreateBill: () => void
  onSelectTable: () => void
}

export function Cart({ onCreateBill, onSelectTable }: CartProps) {
  const {
    cart,
    selectedTable,
    settings,
    currentOrderSource,
    currentCustomerCount,
    setCurrentOrderSource,
    removeFromCart,
    updateCartItemQuantity,
    updateCartItemNotes,
    getCartTotal,
    clearCart,
  } = usePOSStore()
  const [editingNotes, setEditingNotes] = useState<string | null>(null)
  const [noteText, setNoteText] = useState('')

  const { subtotal, tax, total } = getCartTotal()

  const handleEditNotes = (itemId: string, currentNotes?: string) => {
    setEditingNotes(itemId)
    setNoteText(currentNotes || '')
  }

  const handleSaveNotes = (itemId: string) => {
    updateCartItemNotes(itemId, noteText)
    setEditingNotes(null)
    setNoteText('')
  }

  return (
    <div className="flex h-full flex-col bg-card border-l border-border">
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
        <Button
          variant={selectedTable ? 'secondary' : 'outline'}
          size="sm"
          className="mt-2 w-full justify-start"
          onClick={onSelectTable}
        >
          {selectedTable ? `Table: ${selectedTable.name}` : 'Select Table (Optional)'}
        </Button>

        <ToggleGroup
          type="single"
          value={currentOrderSource}
          onValueChange={(value) => {
            if (value === 'counter' || value === 'diner-mobile') {
              setCurrentOrderSource(value)
            }
          }}
          className="mt-2 grid grid-cols-2"
        >
          <ToggleGroupItem value="counter" className="text-xs">Billing Counter</ToggleGroupItem>
          <ToggleGroupItem value="diner-mobile" className="text-xs">Diner Mobile App</ToggleGroupItem>
        </ToggleGroup>
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
          <div className="flex justify-between text-muted-foreground">
            <span>Tax ({settings.taxRate}%)</span>
            <span>{settings.currencySymbol}{tax.toFixed(2)}</span>
          </div>
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
          onClick={onCreateBill}
        >
          Create Bill {settings.currencySymbol}{total.toFixed(2)}
        </Button>
      </div>
    </div>
  )
}
