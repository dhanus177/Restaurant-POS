'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { usePOSStore } from '@/lib/store'
import { Header } from '@/components/shared/header'
import { MenuGrid } from '@/components/pos/menu-grid'
import { Cart } from '@/components/pos/cart'
import { OrderModifiers } from '@/components/pos/order-modifiers'
import { TableSelector } from '@/components/pos/table-selector'
import { useIsMobile } from '@/hooks/use-mobile'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import { Button } from '@/components/ui/button'
import { ShoppingCart, Users } from 'lucide-react'
import type { MenuItem, SelectedModifier } from '@/lib/types'

export default function POSPage() {
  const router = useRouter()
  const { currentUser, addToCart, cart, selectedTable, settings, getCartTotal } = usePOSStore()
  const [mounted, setMounted] = useState(false)
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null)
  const [showModifiers, setShowModifiers] = useState(false)
  const [showTableSelector, setShowTableSelector] = useState(false)
  const [showMobileCart, setShowMobileCart] = useState(false)
  const isMobile = useIsMobile()

  const { total } = getCartTotal()
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0)

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
    <div className="flex min-h-dvh flex-col bg-background">
      <Header title="POS Terminal" />

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Menu Section */}
        <div className={`min-w-0 flex-1 overflow-hidden ${isMobile ? 'pb-[calc(5.5rem+env(safe-area-inset-bottom))]' : ''}`}>
          <MenuGrid onSelectItem={handleSelectItem} />
        </div>

        {/* Desktop Cart Section */}
        {!isMobile && (
          <div className="w-full max-w-sm">
            <Cart
              onCreateBill={() => router.push('/billing')}
              onSelectTable={() => setShowTableSelector(true)}
            />
          </div>
        )}
      </div>

      {/* Mobile Waiter Action Bar */}
      {isMobile && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 px-3 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="mx-auto flex w-full max-w-6xl items-center gap-2">
            <Button
              variant="outline"
              className="h-11 flex-1 justify-start"
              onClick={() => setShowTableSelector(true)}
            >
              <Users className="h-4 w-4 mr-2" />
              {selectedTable ? selectedTable.name : 'Takeaway'}
            </Button>
            <Button
              className="h-11 flex-[1.4] justify-between"
              onClick={() => setShowMobileCart(true)}
            >
              <span className="inline-flex items-center gap-2">
                <ShoppingCart className="h-4 w-4" />
                Cart ({cartCount})
              </span>
              <span>{settings.currencySymbol}{total.toFixed(2)}</span>
            </Button>
          </div>
        </div>
      )}

      {/* Mobile Cart Drawer */}
      {isMobile && (
        <Drawer open={showMobileCart} onOpenChange={setShowMobileCart}>
          <DrawerContent className="max-h-[92dvh]">
            <DrawerHeader>
              <DrawerTitle>Current Order</DrawerTitle>
            </DrawerHeader>
            <div className="h-[78dvh] overflow-hidden pb-[env(safe-area-inset-bottom)]">
              <Cart
                className="h-full border-l-0"
                onCreateBill={() => {
                  setShowMobileCart(false)
                  router.push('/billing')
                }}
                onSelectTable={() => {
                  setShowMobileCart(false)
                  setShowTableSelector(true)
                }}
              />
            </div>
          </DrawerContent>
        </Drawer>
      )}

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
    </div>
  )
}
