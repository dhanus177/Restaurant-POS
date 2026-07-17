'use client'

import { useState } from 'react'
import Image from 'next/image'
import { usePOSStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { UtensilsCrossed, Sandwich, Salad, Coffee, Cake, Search, X } from 'lucide-react'
import type { MenuItem } from '@/lib/types'

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
  const [searchInput, setSearchInput] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  const applySearch = () => {
    setSearchTerm(searchInput.trim().toLowerCase())
  }

  const clearSearch = () => {
    setSearchInput('')
    setSearchTerm('')
  }

  const sortedCategories = [...categories].sort((a, b) => a.order - b.order)
  const filteredItems = menuItems.filter((item) => {
    const matchesAllowedCategories = !allowedCategoryIds || allowedCategoryIds.length === 0
      ? true
      : allowedCategoryIds.includes(item.categoryId)
    const matchesCategory = selectedCategory ? item.categoryId === selectedCategory : true
    const matchesPrepStation = prepStationFilter === 'all' ? true : (item.prepStation ?? 'kitchen') === prepStationFilter
    const searchHaystack = `${item.name} ${item.description ?? ''}`.toLowerCase()
    const matchesSearch = searchTerm.length === 0 ? true : searchHaystack.includes(searchTerm)
    return matchesAllowedCategories && matchesCategory && matchesPrepStation && matchesSearch
  })

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border p-2.5 sm:p-3">
        <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                applySearch()
              }
            }}
            placeholder="Search menu items"
            className="h-10 text-sm placeholder:text-muted-foreground/80"
          />
          <Button type="button" variant="secondary" className="h-10 gap-2 text-sm" onClick={applySearch}>
            <Search className="h-4 w-4" />
            Search
          </Button>
          <Button type="button" variant="outline" className="h-10 gap-2 text-sm" onClick={clearSearch}>
            <X className="h-4 w-4" />
            Clear
          </Button>
        </div>
      </div>

      {/* Category Tabs */}
      {showCategoryTabs && (
        <div className="border-b border-border p-2">
          <div className="overflow-x-auto pb-1 sm:overflow-visible">
            <div className="flex min-w-max gap-2 pr-2 sm:min-w-0 sm:flex-wrap sm:pr-0">
              <Button
                variant={selectedCategory === null ? 'default' : 'secondary'}
                size="sm"
                className={cn(
                  'h-10 flex-shrink-0 gap-2 rounded-lg px-4 text-sm font-medium sm:h-11 sm:px-6',
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
                      'h-10 flex-shrink-0 gap-2 rounded-lg px-4 text-sm font-medium sm:h-11 sm:px-6',
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
      <div className="flex-1 overflow-y-auto p-3 sm:p-4">
        {filteredItems.length === 0 ? (
          <div className="flex h-full min-h-[14rem] items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
            No menu items found for this filter.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
            {filteredItems.map((item) => (
            <Button
              key={item.id}
              variant="outline"
              className={cn(
                'h-44 w-full flex-col items-start justify-between p-3 text-left transition-all sm:h-48 sm:p-4',
                !item.isAvailable && 'opacity-50 cursor-not-allowed',
                item.isAvailable && 'hover:border-primary hover:bg-primary/5'
              )}
              onClick={() => item.isAvailable && onSelectItem(item)}
              disabled={!item.isAvailable}
            >
              <div className="w-full space-y-2">
                <div className="relative h-16 w-full overflow-hidden rounded-md border bg-muted sm:h-20">
                  {item.image ? (
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      sizes="(max-width: 768px) 50vw, 25vw"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-muted-foreground/90 dark:text-muted-foreground">
                      No picture
                    </div>
                  )}
                </div>
                <div>
                  <p className="line-clamp-2 text-sm font-semibold leading-tight text-foreground sm:text-base">
                    {item.name}
                  </p>
                  {item.description && (
                    <p className="mt-1 line-clamp-1 text-xs text-muted-foreground/90 dark:text-muted-foreground">
                      {item.description}
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-2 w-full space-y-1">
                <div className="flex w-full items-center justify-between gap-2">
                  <span className="text-base font-bold leading-none text-primary sm:text-lg">
                    {settings.currencySymbol}{item.price.toFixed(2)}
                  </span>
                  {!item.isAvailable && (
                    <Badge variant="secondary" className="whitespace-nowrap text-[10px] leading-none">
                      Sold Out
                    </Badge>
                  )}
                </div>
                <div className="flex w-full flex-wrap items-center gap-1">
                  <Badge
                    variant={(item.prepStation ?? 'kitchen') === 'ben-marie' ? 'secondary' : 'default'}
                    className={cn(
                      'whitespace-nowrap px-2 py-0.5 text-[10px] leading-none',
                      (item.prepStation ?? 'kitchen') === 'ben-marie'
                        ? 'bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-200'
                        : 'bg-sky-600 text-white dark:bg-sky-500 dark:text-white'
                    )}
                  >
                    {(item.prepStation ?? 'kitchen') === 'ben-marie' ? 'Ben-Marie' : 'Kitchen'}
                  </Badge>
                  {item.modifierGroups && item.modifierGroups.length > 0 && item.isAvailable && (
                    <Badge variant="outline" className="whitespace-nowrap border-muted-foreground/30 px-2 py-0.5 text-[10px] leading-none text-foreground/90 dark:text-foreground">
                      Options
                    </Badge>
                  )}
                </div>
              </div>
            </Button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
