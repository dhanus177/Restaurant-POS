'use client'

import { SuppliersManager } from '@/components/admin/suppliers'

export default function SuppliersPage() {
  return (
    <div className="flex h-full flex-col bg-background">
      <div className="flex-1 overflow-auto">
        <SuppliersManager />
      </div>
    </div>
  )
}