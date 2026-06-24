'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { usePOSStore } from '@/lib/store'
import { Header } from '@/components/shared/header'
import { MenuGrid } from '@/components/pos/menu-grid'
import { Cart } from '@/components/pos/cart'
import { OrderModifiers } from '@/components/pos/order-modifiers'
import { TableSelector } from '@/components/pos/table-selector'
import { PaymentModal } from '@/components/pos/payment-modal'
import type { MenuItem, SelectedModifier } from '@/lib/types'

export default function POSPage() {
  const router = useRouter()
  const { currentUser, addToCart } = usePOSStore()
  const [mounted, setMounted] = useState(false)
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null)
  const [showModifiers, setShowModifiers] = useState(false)
  const [showTableSelector, setShowTableSelector] = useState(false)
  const [showPayment, setShowPayment] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted && !currentUser) {
      router.push('/')
    }
  }, [currentUser, mounted, router])

  const handleSelectItem = (item: MenuItem) => {
    if (item.modifierGroups && item.modifierGroups.length > 0) {
      setSelectedItem(item)
      setShowModifiers(true)
    } else {
      // Add directly to cart without modifiers
      addToCart({
        id: `cart-${Date.now()}`,
        menuItemId: item.id,
        name: item.name,
        quantity: 1,
        price: item.price,
        modifiers: [],
      })
    }
  }

  const handleConfirmModifiers = (item: MenuItem, modifiers: SelectedModifier[], quantity: number) => {
    addToCart({
      id: `cart-${Date.now()}`,
      menuItemId: item.id,
      name: item.name,
      quantity,
      price: item.price,
      modifiers,
    })
    setShowModifiers(false)
    setSelectedItem(null)
  }

  if (!mounted || !currentUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      <Header title="POS Terminal" />

      <div className="flex flex-1 overflow-hidden">
        {/* Menu Section */}
        <div className="flex-1 overflow-hidden">
          <MenuGrid onSelectItem={handleSelectItem} />
        </div>

        {/* Cart Section */}
        <div className="w-full max-w-sm">
          <Cart
            onCheckout={() => setShowPayment(true)}
            onSelectTable={() => setShowTableSelector(true)}
          />
        </div>
      </div>

      {/* Modals */}
      <OrderModifiers
        item={selectedItem}
        open={showModifiers}
        onClose={() => {
          setShowModifiers(false)
          setSelectedItem(null)
        }}
        onConfirm={handleConfirmModifiers}
      />

      <TableSelector
        open={showTableSelector}
        onClose={() => setShowTableSelector(false)}
      />

      <PaymentModal
        open={showPayment}
        onClose={() => setShowPayment(false)}
        onComplete={() => setShowPayment(false)}
      />
    </div>
  )
}
