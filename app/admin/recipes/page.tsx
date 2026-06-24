'use client'

import { RecipesManager } from '@/components/admin/recipes'

export default function RecipesPage() {
  return (
    <div className="flex flex-col h-full bg-background">
      <div className="flex-1 overflow-auto">
        <RecipesManager />
      </div>
    </div>
  )
}
