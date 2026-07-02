'use client'

import { CustomersManager } from '@/components/admin/customers'

export default function CustomersPage() {
  return (
    <div className="flex h-full flex-col bg-background">
      <div className="flex-1 overflow-auto">
        <CustomersManager />
      </div>
    </div>
  )
}
