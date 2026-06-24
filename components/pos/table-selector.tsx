'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { usePOSStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { Users } from 'lucide-react'

interface TableSelectorProps {
  open: boolean
  onClose: () => void
}

export function TableSelector({ open, onClose }: TableSelectorProps) {
  const { tables, selectedTable, setSelectedTable } = usePOSStore()

  const handleSelectTable = (tableId: string | null) => {
    if (tableId === null) {
      setSelectedTable(null)
    } else {
      const table = tables.find((t) => t.id === tableId)
      if (table && table.status === 'available') {
        setSelectedTable(table)
      }
    }
    onClose()
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'border-primary bg-primary/10 hover:bg-primary/20'
      case 'occupied':
        return 'border-warning bg-warning/10'
      case 'reserved':
        return 'border-muted bg-muted'
      default:
        return ''
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Select Table</DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <div className="flex gap-4 mb-4">
            <Badge variant="outline" className="gap-1">
              <div className="h-2 w-2 rounded-full bg-primary" />
              Available
            </Badge>
            <Badge variant="outline" className="gap-1">
              <div className="h-2 w-2 rounded-full bg-warning" />
              Occupied
            </Badge>
            <Badge variant="outline" className="gap-1">
              <div className="h-2 w-2 rounded-full bg-muted-foreground" />
              Reserved
            </Badge>
          </div>

          <div className="grid grid-cols-4 md:grid-cols-5 gap-3">
            <Button
              variant={selectedTable === null ? 'default' : 'outline'}
              className={cn(
                'h-20 flex-col gap-1',
                selectedTable === null && 'bg-primary text-primary-foreground'
              )}
              onClick={() => handleSelectTable(null)}
            >
              <span className="font-semibold">Takeaway</span>
              <span className="text-xs opacity-80">No Table</span>
            </Button>

            {tables.map((table) => (
              <Button
                key={table.id}
                variant="outline"
                className={cn(
                  'h-20 flex-col gap-1 transition-colors',
                  getStatusColor(table.status),
                  selectedTable?.id === table.id && 'ring-2 ring-primary',
                  table.status !== 'available' && 'cursor-not-allowed opacity-60'
                )}
                onClick={() => handleSelectTable(table.id)}
                disabled={table.status !== 'available'}
              >
                <span className="font-semibold">{table.name}</span>
                <div className="flex items-center gap-1 text-xs opacity-80">
                  <Users className="h-3 w-3" />
                  {table.seats}
                </div>
              </Button>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
