import type { InventoryItem } from '@/lib/types'

export const DEFAULT_INVENTORY_CATEGORIES = [
  'Meat',
  'Seafood',
  'Vegetables',
  'Dairy',
  'Bakery',
  'Beverages',
  'Supplies',
]

export function normalizeInventoryCategory(category: string) {
  return category.trim().replace(/\s+/g, ' ')
}

export function getInventoryCategories(items: InventoryItem[]) {
  const merged = new Set(DEFAULT_INVENTORY_CATEGORIES)

  for (const item of items) {
    const normalized = normalizeInventoryCategory(item.category)
    if (normalized) {
      merged.add(normalized)
    }
  }

  return Array.from(merged).sort((a, b) => a.localeCompare(b))
}
