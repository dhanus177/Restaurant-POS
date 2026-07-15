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
  prepStationFilter?: 'all' | 'kitchen' | 'ben-marie'
  showCategoryTabs?: boolean
  allowedCategoryIds?: string[]
}

const categoryIcons: Record<string, React.ReactNode> = {
  'utensils': <UtensilsCrossed className="h-4 w-4" />,
  'hamburger': <Sandwich className="h-4 w-4" />,
  'sides': <Salad className="h-4 w-4" />,
  'coffee': <Coffee className="h-4 w-4" />,
  'cake': <Cake className="h-4 w-4" />,
}

export function MenuGrid({ onSelectItem, prepStationFilter = 'all', showCategoryTabs = true, allowedCategoryIds }: MenuGridProps) {
  const { categories, menuItems, settings } = usePOSStore()
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  const sortedCategories = [...categories].sort((a, b) => a.order - b.order)
  const filteredItems = menuItems.filter((item) => {
    const matchesAllowedCategories = !allowedCategoryIds || allowedCategoryIds.length === 0
      ? true
      : allowedCategoryIds.includes(item.categoryId)
    const matchesCategory = selectedCategory ? item.categoryId === selectedCategory : true
    const matchesPrepStation = prepStationFilter === 'all' ? true : (item.prepStation ?? 'kitchen') === prepStationFilter
    return matchesAllowedCategories && matchesCategory && matchesPrepStation
  })

  return (
    <div className="flex h-full flex-col">
      {/* Category Tabs */}
      {showCategoryTabs && (
        <div className="border-b border-border p-2">
          <div className="overflow-x-auto pb-1">
            <div className="flex min-w-max gap-2 pr-2">
              <Button
                variant={selectedCategory === null ? 'default' : 'secondary'}
                size="sm"
                className={cn(
                  'h-10 flex-shrink-0 gap-2 px-4 sm:h-11 sm:px-6',
                  selectedCategory === null && 'bg-primary text-primary-foreground'
                )}
                onClick={() => setSelectedCategory(null)}
              >
                All
              </Button>
              {sortedCategories.map((category) => (
                <Button
                  key={category.id}
                  variant={selectedCategory === category.id ? 'default' : 'secondary'}
                  size="sm"
                  className={cn(
                    'h-10 flex-shrink-0 gap-2 px-4 sm:h-11 sm:px-6',
                    selectedCategory === category.id && 'bg-primary text-primary-foreground'
                  )}
                  onClick={() => setSelectedCategory(category.id)}
                >
                  {category.icon && categoryIcons[category.icon]}
                  {category.name}
                </Button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Menu Items Grid */}
      <ScrollArea className="flex-1 p-3 sm:p-4">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {filteredItems.map((item) => (
            <Button
              key={item.id}
              variant="outline"
              className={cn(
                'h-28 w-full flex-col items-start justify-between p-3 text-left transition-all sm:p-4',
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
                <div className="flex items-center gap-1">
                  <Badge variant={(item.prepStation ?? 'kitchen') === 'ben-marie' ? 'secondary' : 'default'} className="text-[10px]">
                    {(item.prepStation ?? 'kitchen') === 'ben-marie' ? 'Ben-Marie' : 'Kitchen'}
                  </Badge>
                  {item.modifierGroups && item.modifierGroups.length > 0 && item.isAvailable && (
                    <Badge variant="outline" className="text-xs">
                      Options
                    </Badge>
                  )}
                </div>
              </div>
            </Button>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
