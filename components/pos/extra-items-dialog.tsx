'use client'

import { useMemo } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import type { MenuItem } from '@/lib/types'

interface ExtraItemsDialogProps {
  open: boolean
  sourceItem: MenuItem | null
  items: MenuItem[]
  currencySymbol: string
  onSelectItem: (item: MenuItem) => void
  onClose: () => void
}

export function ExtraItemsDialog({
  open,
  sourceItem,
  items,
  currencySymbol,
  onSelectItem,
  onClose,
}: ExtraItemsDialogProps) {
  const suggestedItems = useMemo(() => {
    if (!sourceItem) return []

    return [...items]
      .filter((item) => item.isAvailable && item.id !== sourceItem.id)
      .sort((a, b) => {
        const sameCategoryA = a.categoryId === sourceItem.categoryId ? 1 : 0
        const sameCategoryB = b.categoryId === sourceItem.categoryId ? 1 : 0
        if (sameCategoryA !== sameCategoryB) return sameCategoryB - sameCategoryA

        const optionsA = a.modifierGroups?.length ? 1 : 0
        const optionsB = b.modifierGroups?.length ? 1 : 0
        if (optionsA !== optionsB) return optionsA - optionsB

        return a.price - b.price
      })
      .slice(0, 12)
  }, [items, sourceItem])

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add extra items</DialogTitle>
          <DialogDescription>
            {sourceItem
              ? `You added ${sourceItem.name}. Want to add drinks, sides, or desserts too?`
              : 'Add more items before continuing.'}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] py-1 pr-1">
          {suggestedItems.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              No extra items available right now.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              {suggestedItems.map((item) => (
                <Button
                  key={item.id}
                  type="button"
                  variant="outline"
                  className={cn(
                    'h-28 w-full flex-col items-start justify-between p-3 text-left transition-all sm:p-4',
                    'hover:border-primary hover:bg-primary/5'
                  )}
                  onClick={() => onSelectItem(item)}
                >
                  <div className="w-full">
                    <p className="line-clamp-2 font-semibold text-foreground">{item.name}</p>
                    {item.description && (
                      <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{item.description}</p>
                    )}
                  </div>
                  <div className="mt-2 flex w-full items-center justify-between">
                    <span className="text-sm font-bold text-primary">
                      {currencySymbol}{item.price.toFixed(2)}
                    </span>
                    {item.modifierGroups && item.modifierGroups.length > 0 && (
                      <Badge variant="outline" className="text-[10px]">
                        Options
                      </Badge>
                    )}
                  </div>
                </Button>
              ))}
            </div>
          )}
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            No Thanks
          </Button>
          <Button onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}