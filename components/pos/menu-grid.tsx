'use client'

import { useState } from 'react'
import { usePOSStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { UtensilsCrossed, Sandwich, Salad, Coffee, Cake } from 'lucide-react'
import type { MenuItem, Category } from '@/lib/types'

interface MenuGridProps {
  onSelectItem: (item: MenuItem) => void
}

const categoryIcons: Record<string, React.ReactNode> = {
  'utensils': <UtensilsCrossed className="h-4 w-4" />,
  'hamburger': <Sandwich className="h-4 w-4" />,
  'sides': <Salad className="h-4 w-4" />,
  'coffee': <Coffee className="h-4 w-4" />,
  'cake': <Cake className="h-4 w-4" />,
}

export function MenuGrid({ onSelectItem }: MenuGridProps) {
  const { categories, menuItems, settings } = usePOSStore()
  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    categories[0]?.id || null
  )

  const sortedCategories = [...categories].sort((a, b) => a.order - b.order)
  const filteredItems = selectedCategory
    ? menuItems.filter((item) => item.categoryId === selectedCategory)
    : menuItems

  return (
    <div className="flex h-full flex-col">
      {/* Category Tabs */}
      <div className="border-b border-border p-2">
        <ScrollArea className="w-full">
          <div className="flex gap-2">
            {sortedCategories.map((category) => (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? 'default' : 'secondary'}
                size="lg"
                className={cn(
                  'flex-shrink-0 gap-2 px-6',
                  selectedCategory === category.id && 'bg-primary text-primary-foreground'
                )}
                onClick={() => setSelectedCategory(category.id)}
              >
                {category.icon && categoryIcons[category.icon]}
                {category.name}
              </Button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Menu Items Grid */}
      <ScrollArea className="flex-1 p-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {filteredItems.map((item) => (
            <Button
              key={item.id}
              variant="outline"
              className={cn(
                'h-28 flex-col items-start justify-between p-4 text-left transition-all',
                !item.isAvailable && 'opacity-50 cursor-not-allowed',
                item.isAvailable && 'hover:border-primary hover:bg-primary/5'
              )}
              onClick={() => item.isAvailable && onSelectItem(item)}
              disabled={!item.isAvailable}
            >
              <div className="w-full">
                <p className="font-semibold text-foreground line-clamp-2 text-balance">
                  {item.name}
                </p>
                {item.description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                    {item.description}
                  </p>
                )}
              </div>
              <div className="flex w-full items-center justify-between mt-2">
                <span className="text-lg font-bold text-primary">
                  {settings.currencySymbol}{item.price.toFixed(2)}
                </span>
                {!item.isAvailable && (
                  <Badge variant="secondary" className="text-xs">
                    Sold Out
                  </Badge>
                )}
                {item.modifierGroups && item.modifierGroups.length > 0 && item.isAvailable && (
                  <Badge variant="outline" className="text-xs">
                    Options
                  </Badge>
                )}
              </div>
            </Button>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
