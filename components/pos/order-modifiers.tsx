'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Minus, Plus } from 'lucide-react'
import { usePOSStore } from '@/lib/store'
import type { MenuItem, SelectedModifier } from '@/lib/types'

interface OrderModifiersProps {
  item: MenuItem | null
  open: boolean
  onClose: () => void
  onConfirm: (item: MenuItem, modifiers: SelectedModifier[], quantity: number) => void
}

export function OrderModifiers({ item, open, onClose, onConfirm }: OrderModifiersProps) {
  const { settings } = usePOSStore()
  const [quantity, setQuantity] = useState(1)
  const [selectedModifiers, setSelectedModifiers] = useState<Record<string, SelectedModifier[]>>({})

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setQuantity(1)
      setSelectedModifiers({})
      onClose()
    }
  }

  const handleModifierToggle = (groupId: string, modifier: SelectedModifier, maxSelections: number) => {
    setSelectedModifiers((prev) => {
      const current = prev[groupId] || []
      const exists = current.find((m) => m.id === modifier.id)

      if (exists) {
        return { ...prev, [groupId]: current.filter((m) => m.id !== modifier.id) }
      }

      if (maxSelections === 1) {
        return { ...prev, [groupId]: [modifier] }
      }

      if (current.length >= maxSelections) {
        return prev
      }

      return { ...prev, [groupId]: [...current, modifier] }
    })
  }

  const isModifierSelected = (groupId: string, modifierId: string) => {
    return (selectedModifiers[groupId] || []).some((m) => m.id === modifierId)
  }

  const handleConfirm = () => {
    if (!item) return

    const allModifiers = Object.values(selectedModifiers).flat()
    onConfirm(item, allModifiers, quantity)
    setQuantity(1)
    setSelectedModifiers({})
  }

  const calculateTotal = () => {
    if (!item) return 0
    const modifiersTotal = Object.values(selectedModifiers)
      .flat()
      .reduce((sum, m) => sum + m.price, 0)
    return (item.price + modifiersTotal) * quantity
  }

  const canConfirm = () => {
    if (!item?.modifierGroups) return true
    return item.modifierGroups.every((group) => {
      if (!group.required) return true
      return (selectedModifiers[group.id] || []).length > 0
    })
  }

  if (!item) return null

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{item.name}</span>
            <span className="text-primary">{settings.currencySymbol}{item.price.toFixed(2)}</span>
          </DialogTitle>
          <DialogDescription className="sr-only">
            Select quantity and modifiers, then add the configured menu item to the order.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-6">
          {/* Quantity Selector */}
          <div className="flex items-center justify-between">
            <Label className="text-base font-medium">Quantity</Label>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-8 text-center text-lg font-semibold">{quantity}</span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setQuantity(quantity + 1)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Modifier Groups */}
          {item.modifierGroups?.map((group) => (
            <div key={group.id} className="space-y-3">
              <div className="flex items-center gap-2">
                <Label className="text-base font-medium">{group.name}</Label>
                {group.required && (
                  <Badge variant="destructive" className="text-xs">Required</Badge>
                )}
                {group.maxSelections > 1 && (
                  <Badge variant="secondary" className="text-xs">
                    Select up to {group.maxSelections}
                  </Badge>
                )}
              </div>

              {group.maxSelections === 1 ? (
                <RadioGroup
                  value={(selectedModifiers[group.id] || [])[0]?.id || ''}
                  onValueChange={(value) => {
                    const modifier = group.modifiers.find((m) => m.id === value)
                    if (modifier) {
                      handleModifierToggle(group.id, modifier, 1)
                    }
                  }}
                >
                  {group.modifiers.map((modifier) => (
                    <div
                      key={modifier.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent/50 cursor-pointer"
                      onClick={() => handleModifierToggle(group.id, modifier, 1)}
                    >
                      <div className="flex items-center gap-3">
                        <RadioGroupItem value={modifier.id} id={modifier.id} />
                        <Label htmlFor={modifier.id} className="cursor-pointer">
                          {modifier.name}
                        </Label>
                      </div>
                      {modifier.price > 0 && (
                        <span className="text-sm text-muted-foreground">
                          +{settings.currencySymbol}{modifier.price.toFixed(2)}
                        </span>
                      )}
                    </div>
                  ))}
                </RadioGroup>
              ) : (
                <div className="space-y-2">
                  {group.modifiers.map((modifier) => (
                    <div
                      key={modifier.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent/50 cursor-pointer"
                      onClick={() => handleModifierToggle(group.id, modifier, group.maxSelections)}
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={isModifierSelected(group.id, modifier.id)}
                          onCheckedChange={() =>
                            handleModifierToggle(group.id, modifier, group.maxSelections)
                          }
                        />
                        <span>{modifier.name}</span>
                      </div>
                      {modifier.price > 0 && (
                        <span className="text-sm text-muted-foreground">
                          +{settings.currencySymbol}{modifier.price.toFixed(2)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <DialogFooter className="flex-shrink-0 border-t border-border pt-4">
          <div className="flex w-full items-center justify-between">
            <span className="text-lg font-semibold">
              Total: {settings.currencySymbol}{calculateTotal().toFixed(2)}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleConfirm} disabled={!canConfirm()}>
                Add to Order
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
