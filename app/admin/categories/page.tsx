'use client'

import { CategoriesManager } from '@/components/admin/categories'

export default function CategoriesPage() {
  return (
    <div className="flex flex-col h-full bg-background">
      <div className="flex-1 overflow-auto">
        <CategoriesManager />
      </div>
    </div>
  )
}
