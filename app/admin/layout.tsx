'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { usePOSStore } from '@/lib/store'
import { Header } from '@/components/shared/header'
import { AdminSidebar } from '@/components/admin/sidebar'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { currentUser } = usePOSStore()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted && !currentUser) {
      router.push('/')
    } else if (mounted && !['admin', 'super-admin'].includes(currentUser?.role ?? '')) {
      router.push('/pos')
    }
  }, [currentUser, mounted, router])

  if (!mounted || !currentUser || !['admin', 'super-admin'].includes(currentUser.role)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <Header title="Admin" />
      <div className="flex flex-1 flex-col overflow-hidden md:flex-row">
        <AdminSidebar />
        <main className="flex-1 overflow-auto">
          <div className="h-full w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
