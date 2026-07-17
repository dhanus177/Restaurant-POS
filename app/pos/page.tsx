'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { hasEffectiveRole, resolveEffectiveRole } from '@/lib/roles'
import { usePOSStore } from '@/lib/store'
import { Header } from '@/components/shared/header'
import { MenuGrid } from '@/components/pos/menu-grid'
import { Cart } from '@/components/pos/cart'
import { OrderModifiers } from '@/components/pos/order-modifiers'
import { TableSelector } from '@/components/pos/table-selector'
import { useIsMobile } from '@/hooks/use-mobile'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ClipboardList, ShoppingCart, Users } from 'lucide-react'
import type { MenuItem, SelectedModifier } from '@/lib/types'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

function normalizePhoneNumber(value: string) {
  return value.replace(/\D/g, '')
}

const PHONE_KEYPAD_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0'] as const
const MIN_PHONE_DIGITS_FOR_NEW_CUSTOMER = 7

export default function POSPage() {
  const router = useRouter()
  const {
    currentUser,
    customers,
    selectedCustomer,
    setSelectedCustomer,
    createCustomer,
    addToCart,
    cart,
    clearCart,
    selectedTable,
    settings,
    getCartTotal,
  } = usePOSStore()
  const [mounted, setMounted] = useState(false)
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null)
  const [showModifiers, setShowModifiers] = useState(false)
  const [showTableSelector, setShowTableSelector] = useState(false)
  const [showMobileCart, setShowMobileCart] = useState(false)
  const [orderMode, setOrderMode] = useState<'dine-in' | 'takeaway'>('dine-in')
  const [showCustomerPrompt, setShowCustomerPrompt] = useState(false)
  const [customerPhoneLookup, setCustomerPhoneLookup] = useState('')
  const [newCustomerName, setNewCustomerName] = useState('')
  const [newCustomerPhone, setNewCustomerPhone] = useState('')
  const [newCustomerEmail, setNewCustomerEmail] = useState('')
  const [newCustomerNotes, setNewCustomerNotes] = useState('')
  const [isSavingCustomer, setIsSavingCustomer] = useState(false)
  const [lastNameAutoFocusPhone, setLastNameAutoFocusPhone] = useState('')
  const newCustomerNameInputRef = useRef<HTMLInputElement | null>(null)
  const lastFeedbackAtRef = useRef(0)
  const isMobile = useIsMobile()
  const requireCustomerBeforeOrder = settings.requireCustomerBeforeOrder === true

  const { total } = getCartTotal()
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0)
  const normalizedLookupPhone = normalizePhoneNumber(customerPhoneLookup)
  const existingCustomerMatch = normalizedLookupPhone
    ? customers.find((customer) => normalizePhoneNumber(customer.phone ?? '') === normalizedLookupPhone) ?? null
    : null

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted && !currentUser) {
      router.push('/')
    }
  }, [currentUser, mounted, router])

  useEffect(() => {
    if (!mounted || !currentUser) return

    if (!hasEffectiveRole(currentUser.role, ['admin', 'super-admin', 'waiter', 'biller'], settings)) {
      const effectiveRole = resolveEffectiveRole(currentUser.role, settings)
      if (effectiveRole === 'cashier') {
        router.push('/pay')
        return
      }
      router.push('/')
    }
  }, [currentUser, mounted, router, settings])

  useEffect(() => {
    if (!mounted || !currentUser) return
    if (!hasEffectiveRole(currentUser.role, ['admin', 'super-admin', 'biller'], settings)) return

    const hasWaiterDraftItems = cart.some((item) => typeof item.chairNumber === 'number' && item.chairNumber > 0)
    if (!hasWaiterDraftItems) return

    clearCart()
    toast.info('Waiter order drafts are available in Biller Queue only. POS cart was reset.')
  }, [cart, clearCart, currentUser, mounted, settings])

  useEffect(() => {
    if (selectedTable) {
      setOrderMode('dine-in')
    }
  }, [selectedTable])

  useEffect(() => {
    if (!mounted || !currentUser) return
    if (requireCustomerBeforeOrder && cart.length === 0 && !selectedCustomer) {
      setShowCustomerPrompt(true)
    }
  }, [mounted, currentUser, requireCustomerBeforeOrder, cart.length, selectedCustomer])

  useEffect(() => {
    if (!showCustomerPrompt) return

    if (!normalizedLookupPhone) {
      if (lastNameAutoFocusPhone) {
        setLastNameAutoFocusPhone('')
      }
      return
    }

    if (existingCustomerMatch) return
    if (normalizedLookupPhone.length < MIN_PHONE_DIGITS_FOR_NEW_CUSTOMER) return
    if (lastNameAutoFocusPhone === normalizedLookupPhone) return

    setLastNameAutoFocusPhone(normalizedLookupPhone)
    requestAnimationFrame(() => {
      newCustomerNameInputRef.current?.focus()
    })
  }, [showCustomerPrompt, normalizedLookupPhone, existingCustomerMatch, lastNameAutoFocusPhone])

  const ensureCustomerReady = () => {
    if (!requireCustomerBeforeOrder) return true
    if (selectedCustomer) return true
    setShowCustomerPrompt(true)
    toast.error('Please create or select a customer before taking the order.')
    return false
  }

  const ensureOrderModeReady = () => {
    if (orderMode === 'takeaway') return true
    if (selectedTable) return true

    toast.error('Please select a table for dine-in or switch to takeaway first.')
    setShowTableSelector(true)
    return false
  }

  const addMenuItemToCart = (item: MenuItem, modifiers: SelectedModifier[] = [], quantity = 1) => {
    addToCart({
      id: `cart-${Date.now()}`,
      menuItemId: item.id,
      name: item.name,
      quantity,
      price: item.price,
      modifiers,
      prepStation: item.prepStation ?? 'kitchen',
      serviceChargeApplicable: item.applyServiceCharge,
    })
  }

  const handleSelectItem = (item: MenuItem) => {
    if (!ensureCustomerReady()) return
    if (!ensureOrderModeReady()) return

    if (item.modifierGroups && item.modifierGroups.length > 0) {
      setSelectedItem(item)
      setShowModifiers(true)
    } else {
      addMenuItemToCart(item)
    }
  }

  const handleConfirmModifiers = (item: MenuItem, modifiers: SelectedModifier[], quantity: number) => {
    if (!ensureCustomerReady()) return
    if (!ensureOrderModeReady()) return

    addMenuItemToCart(item, modifiers, quantity)
    setShowModifiers(false)
    setSelectedItem(null)
  }

  const setLookupPhone = (value: string) => {
    const normalized = normalizePhoneNumber(value)
    setCustomerPhoneLookup(normalized)
    setNewCustomerPhone(normalized)
  }

  const triggerKeypadFeedback = () => {
    if (typeof window === 'undefined') return

    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(14)
    }

    const now = Date.now()
    if (now - lastFeedbackAtRef.current < 45) return
    lastFeedbackAtRef.current = now

    try {
      const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AudioCtx) return

      const context = new AudioCtx()
      const oscillator = context.createOscillator()
      const gain = context.createGain()

      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(880, context.currentTime)
      gain.gain.setValueAtTime(0.0001, context.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.015, context.currentTime + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.07)

      oscillator.connect(gain)
      gain.connect(context.destination)
      oscillator.start()
      oscillator.stop(context.currentTime + 0.08)
      oscillator.onended = () => {
        void context.close()
      }
    } catch {
      // Ignore feedback API failures (browser/device restrictions)
    }
  }

  const handlePhoneKeypadPress = (key: string) => {
    triggerKeypadFeedback()
    const next = `${normalizedLookupPhone}${key}`
    setLookupPhone(next)
  }

  const handlePhoneBackspace = () => {
    triggerKeypadFeedback()
    setLookupPhone(normalizedLookupPhone.slice(0, -1))
  }

  const handlePhoneClear = () => {
    triggerKeypadFeedback()
    setLookupPhone('')
  }

  const handleConfirmCustomer = async () => {
    if (!normalizedLookupPhone) {
      toast.error('Phone number is required')
      return
    }

    if (existingCustomerMatch) {
      setSelectedCustomer(existingCustomerMatch)
      setShowCustomerPrompt(false)
      toast.success(`Customer selected: ${existingCustomerMatch.name}`)
      return
    }

    if (!newCustomerName.trim()) {
      toast.error('Customer name is required')
      return
    }

    setIsSavingCustomer(true)
    try {
      const created = await createCustomer({
        name: newCustomerName.trim(),
        phone: customerPhoneLookup.trim() || newCustomerPhone.trim() || undefined,
        email: newCustomerEmail.trim() || undefined,
        notes: newCustomerNotes.trim() || undefined,
      })

      if (!created) {
        toast.error('Failed to create customer')
        return
      }

      setSelectedCustomer(created)
      setShowCustomerPrompt(false)
      handlePhoneClear()
      setLastNameAutoFocusPhone('')
      setNewCustomerName('')
      setNewCustomerEmail('')
      setNewCustomerNotes('')
      toast.success(`Customer created: ${created.name}`)
    } finally {
      setIsSavingCustomer(false)
    }
  }

  const handleMobileCartOpenChange = (open: boolean) => {
    if (open && requireCustomerBeforeOrder && !selectedCustomer) {
      setShowCustomerPrompt(true)
      toast.error('Please create or select a customer before opening cart/order flow.')
      setShowMobileCart(false)
      return
    }

    setShowMobileCart(open)
  }

  if (!mounted || !currentUser || !hasEffectiveRole(currentUser.role, ['admin', 'super-admin', 'biller'], settings)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh flex-col bg-gradient-to-b from-sky-50 via-background to-background dark:from-slate-950 dark:via-background dark:to-background">
      <Header title="POS Terminal" />

      <div className="mx-auto flex w-full max-w-[1500px] flex-1 flex-col gap-4 overflow-hidden p-3 sm:p-4 lg:p-6">
        <div className="rounded-2xl border border-sky-200 bg-sky-50/70 p-4 shadow-sm sm:p-5 dark:border-sky-900/40 dark:bg-card/80">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700 dark:text-sky-300">POS service</p>
              <h1 className="text-xl font-bold leading-tight text-foreground sm:text-2xl">Take orders, review cart, and send to billing</h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="bg-sky-100 text-sky-900 hover:bg-sky-100 dark:bg-sky-500/15 dark:text-sky-200">
                {currentUser.role}
              </Badge>
              <Badge variant="outline">{cartCount} items</Badge>
              <Badge variant="outline">
                {selectedTable ? selectedTable.name : orderMode === 'takeaway' ? 'Takeaway' : 'No table'}
              </Badge>
              <Button variant="outline" className="gap-2" onClick={() => router.push('/biller-confirmation')}>
                <ClipboardList className="h-4 w-4" />
                Waiter Bill Confirmation
              </Button>
            </div>
          </div>
        </div>

        <div className={cn('grid min-h-0 flex-1 items-start gap-4 lg:h-[calc(100dvh-14.75rem)] lg:grid-cols-[minmax(0,1.5fr)_380px]', isMobile && 'pb-[calc(5.5rem+env(safe-area-inset-bottom))]')}>
          <Card className="h-full min-h-0 overflow-hidden border-sky-200 shadow-sm dark:border-sky-900/40">
            <CardHeader className="bg-sky-50/70 dark:bg-card/70">
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-sky-700 dark:text-sky-300" />
                Menu
              </CardTitle>
            </CardHeader>
            <CardContent className="h-full min-h-0 p-0">
              <MenuGrid onSelectItem={handleSelectItem} />
            </CardContent>
          </Card>

          {/* Desktop Cart Section */}
          {!isMobile && (
            <div className="h-full min-h-0 overflow-hidden rounded-2xl border border-sky-200 bg-background/90 dark:border-sky-900/40 dark:bg-card/60">
              <Cart
                className="h-full"
                orderMode={orderMode}
                onCreateBill={() => router.push('/billing')}
                onSelectTable={() => setShowTableSelector(true)}
              />
            </div>
          )}
        </div>
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
              {selectedTable ? selectedTable.name : orderMode === 'takeaway' ? 'Takeaway' : 'Select Table'}
            </Button>
            <Button
              className="h-11 flex-[1.4] justify-between"
              onClick={() => handleMobileCartOpenChange(true)}
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
        <Drawer open={showMobileCart} onOpenChange={handleMobileCartOpenChange}>
          <DrawerContent className="max-h-[92dvh]">
            <DrawerHeader>
              <DrawerTitle>Current Order</DrawerTitle>
            </DrawerHeader>
            <div className="h-[78dvh] overflow-hidden pb-[env(safe-area-inset-bottom)]">
              <Cart
                className="h-full border-l-0"
                orderMode={orderMode}
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
        onOrderModeChange={setOrderMode}
      />

      <Dialog
        open={showCustomerPrompt}
        onOpenChange={(open) => {
          if (!open && !selectedCustomer && cart.length === 0) return
          setShowCustomerPrompt(open)
        }}
      >
        <DialogContent className="w-[95vw] max-w-md" showCloseButton={Boolean(selectedCustomer || cart.length > 0)}>
          <DialogHeader>
            <DialogTitle>Customer required before order</DialogTitle>
            <DialogDescription>
              Enter the customer's phone number. If the customer exists, their name will appear. Otherwise, add the customer details.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="customer-phone-lookup">Phone Number</Label>
              <Input
                id="customer-phone-lookup"
                value={customerPhoneLookup}
                onChange={(e) => {
                  setLookupPhone(e.target.value)
                }}
                placeholder="Enter phone number"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Keypad</p>
              <div className="grid grid-cols-3 gap-2">
                {PHONE_KEYPAD_KEYS.map((key) => (
                  <Button
                    key={key}
                    type="button"
                    variant="outline"
                    className="h-11 text-base font-semibold"
                    onClick={() => handlePhoneKeypadPress(key)}
                  >
                    {key}
                  </Button>
                ))}
                <Button
                  type="button"
                  variant="secondary"
                  className="h-11 text-sm"
                  onClick={handlePhoneBackspace}
                >
                  Back
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-11 text-sm"
                  onClick={handlePhoneClear}
                >
                  Clear
                </Button>
              </div>
            </div>

            {existingCustomerMatch ? (
              <div className="rounded-md border bg-secondary/30 p-3">
                <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Existing customer found</p>
                <p className="mt-2 font-semibold text-foreground">{existingCustomerMatch.name}</p>
                <p className="text-sm text-muted-foreground">{existingCustomerMatch.phone ?? customerPhoneLookup}</p>
                {existingCustomerMatch.email && <p className="text-sm text-muted-foreground">{existingCustomerMatch.email}</p>}
                {existingCustomerMatch.notes && <p className="mt-1 text-xs text-muted-foreground">Note: {existingCustomerMatch.notes}</p>}
              </div>
            ) : (
              <>
                {normalizedLookupPhone ? (
                  <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                    No customer found for this phone number. Please add customer details below.
                  </div>
                ) : null}
                <div className="space-y-2">
                  <Label htmlFor="new-customer-name">Name</Label>
                  <Input
                    id="new-customer-name"
                    ref={newCustomerNameInputRef}
                    value={newCustomerName}
                    onChange={(e) => setNewCustomerName(e.target.value)}
                    placeholder="Customer name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-customer-phone">Phone</Label>
                  <Input
                    id="new-customer-phone"
                    value={newCustomerPhone}
                    onChange={(e) => setNewCustomerPhone(e.target.value)}
                    placeholder="Phone number"
                    disabled
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-customer-email">Email</Label>
                  <Input
                    id="new-customer-email"
                    value={newCustomerEmail}
                    onChange={(e) => setNewCustomerEmail(e.target.value)}
                    placeholder="Email address"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-customer-notes">Notes</Label>
                  <Input
                    id="new-customer-notes"
                    value={newCustomerNotes}
                    onChange={(e) => setNewCustomerNotes(e.target.value)}
                    placeholder="Optional notes"
                  />
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button onClick={() => void handleConfirmCustomer()} disabled={isSavingCustomer}>
              {isSavingCustomer ? 'Saving...' : existingCustomerMatch ? 'Use Customer' : 'Create Customer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
