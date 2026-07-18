'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/shared/header'
import { hasEffectiveRole } from '@/lib/roles'
import { MenuGrid } from '@/components/pos/menu-grid'
import { OrderModifiers } from '@/components/pos/order-modifiers'
import { usePOSStore } from '@/lib/store'
import { useIsMobile } from '@/hooks/use-mobile'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { ChevronRight, Send, ShoppingCart, Table2, Users, UtensilsCrossed, Minus, Plus, Trash2, Lock, LockOpen } from 'lucide-react'
import { printBenMarieDocket, printKitchenDocket } from '@/lib/print'
import type { MenuItem, Order, SelectedModifier, Table as RestaurantTable } from '@/lib/types'

const WAITER_PENDING_BILLER_REVIEW = 'WAITER_PENDING_BILLER_REVIEW'
const WAITER_KITCHEN_DOCKET = 'WAITER_KITCHEN_DOCKET'
const WAITER_BEN_MARIE_DOCKET = 'WAITER_BEN_MARIE_DOCKET'

function normalizeQueueFlag(value?: string | null): string {
  return (value ?? '').trim().toUpperCase()
}

function isWaiterPendingForBiller(order: Order): boolean {
  const normalized = normalizeQueueFlag(order.paymentCollectedBy)
  return normalized === WAITER_PENDING_BILLER_REVIEW || normalized.startsWith('WAITER_PENDING_BILLER')
}

function isKitchenDocketOrder(order: Order): boolean {
  const normalized = normalizeQueueFlag(order.paymentCollectedBy)
  return normalized === WAITER_KITCHEN_DOCKET
}

function isBenMarieDocketOrder(order: Order): boolean {
  const normalized = normalizeQueueFlag(order.paymentCollectedBy)
  return normalized === WAITER_BEN_MARIE_DOCKET
}

function groupCartItemsByChair(items: Order['items']) {
  return items.reduce<Record<number, Order['items']>>((acc, item) => {
    const chairNumber = item.chairNumber ?? 1
    if (!acc[chairNumber]) {
      acc[chairNumber] = []
    }
    acc[chairNumber].push(item)
    return acc
  }, {})
}

function getItemLineTotal(item: Order['items'][number]) {
  const modifiersTotal = item.modifiers.reduce((sum, modifier) => sum + modifier.price, 0)
  return (item.price + modifiersTotal) * item.quantity
}

function getItemServiceChargeLine(item: Order['items'][number], taxRate: number) {
  if (!item.serviceChargeApplicable) return 0
  return getItemLineTotal(item) * (taxRate / 100)
}

function getOrderChairNumber(order: Order): number | null {
  const firstItemChair = order.items.find((item) => typeof item.chairNumber === 'number' && item.chairNumber > 0)?.chairNumber
  if (typeof firstItemChair === 'number') return firstItemChair

  const tableNameMatch = order.tableName?.match(/\bChair\s+(\d+)\b/i)
  if (!tableNameMatch) return null

  const parsedChair = Number(tableNameMatch[1])
  return Number.isFinite(parsedChair) && parsedChair > 0 ? parsedChair : null
}

function getOrderChairNumbers(order: Order): number[] {
  const chairsFromItems = Array.from(
    new Set(
      order.items
        .map((item) => item.chairNumber)
        .filter((chair): chair is number => typeof chair === 'number' && chair > 0)
    )
  ).sort((a, b) => a - b)

  if (chairsFromItems.length > 0) {
    return chairsFromItems
  }

  const singleChair = getOrderChairNumber(order)
  return singleChair ? [singleChair] : []
}

export default function WaiterPage() {
  const router = useRouter()
  const {
    currentUser,
    tables,
    orders,
    selectedTable,
    setSelectedTable,
    cart,
    addToCart,
    removeFromCart,
    updateCartItemQuantity,
    settings,
    getNextOrderNumber,
    addOrder,
    updateOrder,
    updateTableStatus,
    markCartItemsSentForStation,
  } = usePOSStore()

  const [mounted, setMounted] = useState(false)
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null)
  const [showModifiers, setShowModifiers] = useState(false)
  const [prepStationFilter, setPrepStationFilter] = useState<'kitchen' | 'ben-marie'>('kitchen')
  const [selectedChair, setSelectedChair] = useState(1)
  const [handoffMode, setHandoffMode] = useState<'single' | 'multi'>('single')
  const [multiSelectedChairs, setMultiSelectedChairs] = useState<number[]>([])
  const [multiGroupSets, setMultiGroupSets] = useState<number[][]>([])
  const [recentlyQueuedChairs, setRecentlyQueuedChairs] = useState<number[]>([])
  const [isSending, setIsSending] = useState(false)
  const [isSendingPrep, setIsSendingPrep] = useState(false)
  const [showMobileHandoff, setShowMobileHandoff] = useState(false)
  const tableSectionRef = useRef<HTMLDivElement | null>(null)
  const isMobile = useIsMobile()

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted || !currentUser) return
    if (!hasEffectiveRole(currentUser.role, ['waiter', 'admin', 'super-admin'], settings)) {
      router.push('/pos')
    }
  }, [currentUser, mounted, router, settings])

  useEffect(() => {
    if (selectedTable) {
      setSelectedChair((prev) => Math.min(Math.max(prev, 1), Math.max(selectedTable.seats, 1)))
    } else {
      setSelectedChair(1)
    }
  }, [selectedTable])

  useEffect(() => {
    setHandoffMode('single')
    setMultiSelectedChairs([])
    setMultiGroupSets([])
    setRecentlyQueuedChairs([])
  }, [selectedTable?.id])

  const openTables = useMemo(
    () => [...tables].filter((table) => table.status !== 'reserved').sort((a, b) => a.number - b.number),
    [tables]
  )

  const tableScopedCart = useMemo(() => {
    if (!selectedTable) return []
    return cart.filter((item) => item.tableId === selectedTable.id)
  }, [cart, selectedTable])

  const chairCount = selectedTable?.seats ?? 0
  const cartCount = tableScopedCart.reduce((sum, item) => sum + item.quantity, 0)
  const tableSubtotal = useMemo(
    () => tableScopedCart.reduce((sum, item) => sum + getItemLineTotal(item), 0),
    [tableScopedCart]
  )
  const tableTax = useMemo(
    () => tableScopedCart.reduce((sum, item) => sum + getItemServiceChargeLine(item, settings.taxRate), 0),
    [settings.taxRate, tableScopedCart]
  )
  const total = tableSubtotal + tableTax
  const groupedCartByChair = useMemo(() => {
    const grouped = groupCartItemsByChair(
      tableScopedCart.map((item) => ({
        ...item,
        chairNumber: item.chairNumber ?? selectedChair,
      }))
    )

    return Object.keys(grouped)
      .map((chair) => Number(chair))
      .sort((a, b) => a - b)
      .map((chairNumber) => {
        const items = grouped[chairNumber] ?? []
        const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)
        const chairSubtotal = items.reduce((sum, item) => sum + getItemLineTotal(item), 0)
        const chairTax = items.reduce((sum, item) => sum + getItemServiceChargeLine(item, settings.taxRate), 0)
        return {
          chairNumber,
          items,
          itemCount,
          subtotal: chairSubtotal,
          tax: chairTax,
          total: chairSubtotal + chairTax,
        }
      })
  }, [selectedChair, settings.taxRate, tableScopedCart])

  const activeChairSummary = useMemo(
    () => groupedCartByChair.find((group) => group.chairNumber === selectedChair),
    [groupedCartByChair, selectedChair]
  )
  const activeChairItems = useMemo(
    () => tableScopedCart.filter((item) => (item.chairNumber ?? selectedChair) === selectedChair),
    [selectedChair, tableScopedCart]
  )
  const lockedChairNumbers = useMemo(() => {
    if (!selectedTable) return [] as number[]

    const locked = new Set<number>()
    orders
      .filter((order) => order.tableId === selectedTable.id && order.paymentStatus === 'pending' && order.status !== 'cancelled')
      .forEach((order) => {
        order.items.forEach((item) => {
          if (typeof item.chairNumber === 'number' && item.chairNumber > 0) {
            locked.add(item.chairNumber)
          }
        })
      })

    return Array.from(locked).sort((a, b) => a - b)
  }, [orders, selectedTable])
  const dispatchChairNumbers = useMemo(() => {
    if (handoffMode === 'single') {
      return [selectedChair]
    }

    if (multiSelectedChairs.length === 0) {
      return [selectedChair]
    }

    return Array.from(new Set(multiSelectedChairs)).sort((a, b) => a - b)
  }, [handoffMode, multiSelectedChairs, selectedChair])
  const dispatchItems = useMemo(
    () => tableScopedCart.filter((item) => dispatchChairNumbers.includes(item.chairNumber ?? selectedChair)),
    [dispatchChairNumbers, selectedChair, tableScopedCart]
  )
  const activeMultiGroupIndex = useMemo(() => {
    if (handoffMode !== 'multi' || multiGroupSets.length === 0) return -1

    const currentSelection = Array.from(new Set(dispatchChairNumbers)).sort((a, b) => a - b)
    const exactMatchIndex = multiGroupSets.findIndex(
      (group) => group.length === currentSelection.length && group.every((chair, idx) => chair === currentSelection[idx])
    )

    if (exactMatchIndex >= 0) return exactMatchIndex
    if (currentSelection.length === 1) {
      return multiGroupSets.findIndex((group) => group.includes(currentSelection[0]))
    }

    return -1
  }, [dispatchChairNumbers, handoffMode, multiGroupSets])
  const activeMultiGroup = activeMultiGroupIndex >= 0 ? multiGroupSets[activeMultiGroupIndex] : null
  const handoffViewItems = useMemo(() => activeChairItems, [activeChairItems])
  const handoffViewItemCount = useMemo(
    () => handoffViewItems.reduce((sum, item) => sum + item.quantity, 0),
    [handoffViewItems]
  )
  const handoffViewTotal = useMemo(
    () => handoffViewItems.reduce((sum, item) => sum + getItemLineTotal(item), 0),
    [handoffViewItems]
  )
  const hasKitchenDispatchItems = useMemo(
    () => dispatchItems.some((item) => (item.prepStation ?? 'kitchen') === 'kitchen'),
    [dispatchItems]
  )
  const hasBenMarieDispatchItems = useMemo(
    () => dispatchItems.some((item) => (item.prepStation ?? 'kitchen') === 'ben-marie'),
    [dispatchItems]
  )
  const isSelectedChairLocked = lockedChairNumbers.includes(selectedChair)
  const waiterVisibleCategoryIds = settings.waiterVisibleCategoryIds ?? []

  const selectTable = (table: RestaurantTable) => {
    setSelectedTable(table)
    setSelectedChair(1)
  }

  const toggleChairInMultiSelection = (chair: number) => {
    setMultiSelectedChairs((current) => {
      if (current.includes(chair)) {
        return current.filter((value) => value !== chair)
      }
      return [...current, chair].sort((a, b) => a - b)
    })
  }

  const addCurrentGroupSelection = () => {
    const normalizedSelection = Array.from(new Set(dispatchChairNumbers)).sort((a, b) => a - b)
    if (normalizedSelection.length < 2) {
      toast.error('Select at least 2 chairs to create a group')
      return
    }

    const alreadyAssigned = normalizedSelection.find((chair) =>
      multiGroupSets.some((group) => group.includes(chair))
    )
    if (alreadyAssigned) {
      toast.error(`Chair ${alreadyAssigned} is already assigned to another group`)
      return
    }

    setMultiGroupSets((current) => [...current, normalizedSelection])
    setMultiSelectedChairs([])
    toast.success(`Group added: Chairs ${normalizedSelection.join(', ')}`)
  }

  const ensureReady = () => {
    if (!selectedTable) {
      toast.error('Please select a table first')
      return false
    }

    if (selectedChair < 1 || selectedChair > selectedTable.seats) {
      toast.error('Please select a valid chair')
      return false
    }

    return true
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
      chairNumber: selectedChair,
      tableId: selectedTable?.id,
    })
  }

  const handleSelectItem = (item: MenuItem) => {
    if (!ensureReady()) return

    if (item.modifierGroups && item.modifierGroups.length > 0) {
      setSelectedItem(item)
      setShowModifiers(true)
      return
    }

    addMenuItemToCart(item)
  }

  const handleConfirmModifiers = (item: MenuItem, modifiers: SelectedModifier[], quantity: number) => {
    if (!ensureReady()) return

    addMenuItemToCart(item, modifiers, quantity)

    setSelectedItem(null)
    setShowModifiers(false)
  }

  const buildPendingOrders = (
    itemsForBill: Order['items'],
    groupAsSingleBill = false,
    nextOrderNumberOverride?: number
  ): Order[] => {
    const now = new Date().toISOString()
    const cartItems = itemsForBill.map((item) => ({
      ...item,
      chairNumber: item.chairNumber ?? selectedChair,
    }))
    const groupedByChair = groupCartItemsByChair(cartItems)
    const chairNumbers = Object.keys(groupedByChair)
      .map((chair) => Number(chair))
      .sort((a, b) => a - b)

    let nextOrderNumber = nextOrderNumberOverride ?? getNextOrderNumber()

    if (groupAsSingleBill) {
      const subtotal = cartItems.reduce((sum, item) => {
        const lineTotal = item.price + item.modifiers.reduce((modifierSum, modifier) => modifierSum + modifier.price, 0)
        return sum + lineTotal * item.quantity
      }, 0)
      const tax = cartItems.reduce((sum, item) => {
        if (!item.serviceChargeApplicable) return sum
        const lineTotal = item.price + item.modifiers.reduce((modifierSum, modifier) => modifierSum + modifier.price, 0)
        return sum + lineTotal * item.quantity
      }, 0) * (settings.taxRate / 100)

      return [
        {
          id: `waiter-order-${Date.now()}-group-${chairNumbers.join('-')}`,
          orderNumber: nextOrderNumber,
          tableId: selectedTable?.id,
          tableName: `${selectedTable?.name ?? 'Table'} • Chairs ${chairNumbers.join(', ')}`,
          items: cartItems,
          subtotal,
          tax,
          total: subtotal + tax,
          status: 'pending',
          paymentMethod: undefined,
          paymentStatus: 'pending',
          paymentCollectedBy: WAITER_PENDING_BILLER_REVIEW,
          createdAt: now,
          updatedAt: now,
          createdBy: currentUser?.id || 'unknown',
        },
      ]
    }

    return chairNumbers.map((chairNumber, index) => {
      const chairItems = groupedByChair[chairNumber]
      const chairSubtotal = chairItems.reduce((sum, item) => {
        const lineTotal = item.price + item.modifiers.reduce((modifierSum, modifier) => modifierSum + modifier.price, 0)
        return sum + lineTotal * item.quantity
      }, 0)
      const chairTax = chairItems.reduce((sum, item) => {
        if (!item.serviceChargeApplicable) return sum
        const lineTotal = item.price + item.modifiers.reduce((modifierSum, modifier) => modifierSum + modifier.price, 0)
        return sum + lineTotal * item.quantity
      }, 0) * (settings.taxRate / 100)
      const orderTotal = chairSubtotal + chairTax

      return {
        id: `waiter-order-${Date.now()}-${chairNumber}-${index}`,
        orderNumber: nextOrderNumber + index,
        tableId: selectedTable?.id,
        tableName: `${selectedTable?.name ?? 'Table'} • Chair ${chairNumber}`,
        items: chairItems,
        subtotal: chairSubtotal,
        tax: chairTax,
        total: orderTotal,
        status: 'pending',
        paymentMethod: undefined,
        paymentStatus: 'pending',
        paymentCollectedBy: WAITER_PENDING_BILLER_REVIEW,
        createdAt: now,
        updatedAt: now,
        createdBy: currentUser?.id || 'unknown',
      }
    })
  }

  const buildStationOrders = (itemsForStation: Order['items'], station: 'kitchen' | 'ben-marie'): Order[] => {
    const now = new Date().toISOString()
    const stationItems = itemsForStation.map((item) => ({
      ...item,
      chairNumber: item.chairNumber ?? selectedChair,
    }))

    if (stationItems.length === 0) return []

    const groupedByChair = groupCartItemsByChair(stationItems)
    const chairNumbers = Object.keys(groupedByChair)
      .map((chair) => Number(chair))
      .sort((a, b) => a - b)

    let nextOrderNumber = getNextOrderNumber()

    return chairNumbers.map((chairNumber, index) => {
      const chairItems = groupedByChair[chairNumber] ?? []
      const chairSubtotal = chairItems.reduce((sum, item) => {
        const lineTotal = item.price + item.modifiers.reduce((modifierSum, modifier) => modifierSum + modifier.price, 0)
        return sum + lineTotal * item.quantity
      }, 0)
      const chairTax = chairItems.reduce((sum, item) => {
        if (!item.serviceChargeApplicable) return sum
        const lineTotal = item.price + item.modifiers.reduce((modifierSum, modifier) => modifierSum + modifier.price, 0)
        return sum + lineTotal * item.quantity
      }, 0) * (settings.taxRate / 100)

      return {
        id: `station-order-${station}-${Date.now()}-${chairNumber}-${index}`,
        orderNumber: nextOrderNumber + index,
        tableId: selectedTable?.id,
        tableName: `${selectedTable?.name ?? 'Table'} • Chair ${chairNumber}`,
        items: chairItems,
        subtotal: chairSubtotal,
        tax: chairTax,
        total: chairSubtotal + chairTax,
        status: 'pending',
        paymentMethod: undefined,
        paymentStatus: 'pending',
        paymentCollectedBy: station === 'kitchen' ? WAITER_KITCHEN_DOCKET : WAITER_BEN_MARIE_DOCKET,
        createdAt: now,
        updatedAt: now,
        createdBy: currentUser?.id || 'unknown',
      }
    })
  }

  const getSharedStationOrderNumberForChairs = (chairNumbers: number[]): number | null => {
    if (!selectedTable || chairNumbers.length === 0) return null

    const normalizedChairs = Array.from(new Set(chairNumbers)).sort((a, b) => a - b)
    const matchingNumbers = orders
      .filter((order) => {
        if (order.paymentStatus !== 'pending') return false
        if (!(isKitchenDocketOrder(order) || isBenMarieDocketOrder(order))) return false
        if (order.tableId !== selectedTable.id) return false

        const orderChairs = getOrderChairNumbers(order)
        return orderChairs.length === 1 && normalizedChairs.includes(orderChairs[0])
      })
      .map((order) => order.orderNumber)
      .sort((a, b) => a - b)

    return matchingNumbers[0] ?? null
  }

  const getUnsentStationCartItems = (station: 'kitchen' | 'ben-marie', chairScope: number[] = dispatchChairNumbers) => {
    const sentKey = station === 'kitchen' ? 'kitchenSentAt' : 'benMarieSentAt'
    return tableScopedCart.filter(
      (item) =>
        (item.prepStation ?? 'kitchen') === station &&
        chairScope.includes(item.chairNumber ?? selectedChair) &&
        !(item as any)[sentKey]
    )
  }

  const handleSendToBiller = async () => {
    if (!ensureReady()) return
    if (handoffMode === 'multi' && dispatchChairNumbers.length === 0) {
      toast.error('Select at least one chair for multi handoff')
      return
    }
    if (dispatchItems.length === 0) {
      toast.error(
        handoffMode === 'multi'
          ? 'Add at least one item for the selected handoff chairs before sending to biller'
          : `Add at least one item for Chair ${selectedChair} before sending to biller`
      )
      return
    }

    setIsSending(true)
    try {
      if (handoffMode === 'multi' && multiGroupSets.length > 0) {
        const currentSelection = Array.from(new Set(dispatchChairNumbers)).sort((a, b) => a - b)
        const exactSelectedGroup =
          currentSelection.length > 1
            ? multiGroupSets.find(
                (group) => group.length === currentSelection.length && group.every((chair, idx) => chair === currentSelection[idx])
              )
            : undefined
        const selectedChairGroup =
          currentSelection.length === 1
            ? multiGroupSets.find((group) => group.includes(currentSelection[0]))
            : undefined

        let groupToSend = exactSelectedGroup ?? selectedChairGroup ?? null

        if (!groupToSend && currentSelection.length > 1) {
          const overlap = currentSelection.find((chair) => multiGroupSets.some((group) => group.includes(chair)))
          if (overlap) {
            toast.error(`Chair ${overlap} is already in another group. Select a staged group before sending.`)
            return
          }
          groupToSend = currentSelection
        }

        if (!groupToSend) {
          toast.error('Select a grouped chair set to send to biller')
          return
        }

        const chairsInGroups = new Set<number>()
        const groupedOrdersToSend: Order[] = []
        const targetOrderIds: string[] = []

        const sharedGroupOrderNumber = getSharedStationOrderNumberForChairs(groupToSend)
        let nextGroupOrderNumber = sharedGroupOrderNumber ?? getNextOrderNumber()

        const groupItems = tableScopedCart.filter((item) => groupToSend.includes(item.chairNumber ?? selectedChair))
        if (groupItems.length > 0) {
          const built = buildPendingOrders(groupItems, true, nextGroupOrderNumber)
          if (built.length > 0) {
            const groupedOrder = built[0]
            addOrder(groupedOrder)
            groupedOrdersToSend.push(groupedOrder)
            targetOrderIds.push(groupedOrder.id)
            groupToSend.forEach((chair) => chairsInGroups.add(chair))
            nextGroupOrderNumber += 1
          }
        }

        if (groupedOrdersToSend.length === 0) {
          toast.error('No items found for selected groups')
          return
        }

        if (selectedTable) {
          updateTableStatus(selectedTable.id, 'occupied', targetOrderIds[0])
        }

        const chairsList = Array.from(chairsInGroups)
        const itemIdsToRemove = tableScopedCart
          .filter((item) => chairsList.includes(item.chairNumber ?? selectedChair))
          .map((item) => item.id)
        itemIdsToRemove.forEach((itemId) => removeFromCart(itemId))

        setRecentlyQueuedChairs((current) => Array.from(new Set([...current, ...chairsList])).sort((a, b) => a - b))
        setMultiGroupSets((current) =>
          current.filter(
            (group) => !(group.length === groupToSend.length && group.every((chair, idx) => chair === groupToSend?.[idx]))
          )
        )
        setMultiSelectedChairs([])

        toast.success(`Grouped bill sent to biller (Chairs ${groupToSend.join(', ')})`)

        if (currentUser && hasEffectiveRole(currentUser.role, ['admin', 'super-admin', 'biller'], settings)) {
          router.push('/biller-confirmation')
        }

        return
      }

      const groupAsSingleBill = handoffMode === 'multi' && dispatchChairNumbers.length > 1
      const sharedDispatchOrderNumber = getSharedStationOrderNumberForChairs(dispatchChairNumbers)
      const ordersToSend = buildPendingOrders(
        dispatchItems,
        groupAsSingleBill,
        sharedDispatchOrderNumber ?? undefined
      )
      const targetOrderIds: string[] = []

      ordersToSend.forEach((order) => {
        if (groupAsSingleBill) {
          addOrder(order)
          targetOrderIds.push(order.id)
          return
        }

        const chairNumber = getOrderChairNumber(order)
        const existingChairBill = orders.find((existingOrder) => {
          if (existingOrder.paymentStatus !== 'pending') return false
          if (!isWaiterPendingForBiller(existingOrder)) return false
          if (existingOrder.tableId !== order.tableId) return false

          const existingChairs = getOrderChairNumbers(existingOrder)
          if (existingChairs.length !== 1) return false

          return chairNumber !== null && existingChairs[0] === chairNumber
        })

        if (existingChairBill) {
          updateOrder(existingChairBill.id, {
            items: [...existingChairBill.items, ...order.items],
            subtotal: existingChairBill.subtotal + order.subtotal,
            tax: existingChairBill.tax + order.tax,
            total: existingChairBill.total + order.total,
            updatedAt: new Date().toISOString(),
          })
          targetOrderIds.push(existingChairBill.id)
        } else {
          const chairNumber = getOrderChairNumber(order)
          const sharedChairOrderNumber =
            typeof chairNumber === 'number' ? getSharedStationOrderNumberForChairs([chairNumber]) : null
          const orderToAdd = sharedChairOrderNumber
            ? {
                ...order,
                orderNumber: sharedChairOrderNumber,
              }
            : order

          addOrder(orderToAdd)
          targetOrderIds.push(orderToAdd.id)
        }
      })

      if (selectedTable) {
        updateTableStatus(selectedTable.id, 'occupied', targetOrderIds[0] ?? ordersToSend[0]?.id)
      }

      dispatchItems.forEach((item) => {
        removeFromCart(item.id)
      })

      setRecentlyQueuedChairs(dispatchChairNumbers)

      toast.success(
        groupAsSingleBill
          ? `Grouped bill sent to biller (Chairs ${dispatchChairNumbers.join(', ')})`
          : ordersToSend.length === 1
            ? `Chair ${ordersToSend[0].tableName?.split('• Chair ')[1] ?? selectedChair} sent to biller`
            : `${ordersToSend.length} chair bills sent to biller (${dispatchChairNumbers.join(', ')})`
      )

      // Waiter should remain on waiter screen after handoff.
      // Only biller/admin style roles should navigate to biller confirmation queue.
      if (currentUser && hasEffectiveRole(currentUser.role, ['admin', 'super-admin', 'biller'], settings)) {
        router.push('/biller-confirmation')
      }
    } finally {
      setIsSending(false)
    }
  }

  const sendStationDockets = async (
    station: 'kitchen' | 'ben-marie',
    sharedOrderNumbersByChair?: Map<number, number>
  ) => {
    const stationLabel = station === 'kitchen' ? 'Kitchen' : 'Ben-Marie'
    const stationItemsAll = dispatchItems

    if (stationItemsAll.length === 0) {
      return { sent: false, stationLabel, ordersCount: 0 }
    }

    try {
      const sentKey = station === 'kitchen' ? 'kitchenSentAt' : 'benMarieSentAt'
      const stationItemsToPrint = tableScopedCart.filter(
        (item) =>
          dispatchChairNumbers.includes(item.chairNumber ?? selectedChair) &&
          !(item as any)[sentKey]
      )
      if (stationItemsToPrint.length === 0) {
        return { sent: false, stationLabel, ordersCount: 0 }
      }

      const stationOrders = buildStationOrders(stationItemsAll, station)
      const targetOrderIds: string[] = []
      const sentAt = new Date().toISOString()
      let nextStationOrderNumber = getNextOrderNumber()

      stationOrders.forEach((order) => {
        const chairNumber = getOrderChairNumber(order)
        const addonItemIdsForChair = stationItemsToPrint
          .filter((item) => (item.chairNumber ?? selectedChair) === (chairNumber ?? selectedChair))
          .map((item) => item.id)
        const existingStationOrder = orders.find((existingOrder) => {
          if (existingOrder.paymentStatus !== 'pending') return false
          if (station === 'kitchen' ? !isKitchenDocketOrder(existingOrder) : !isBenMarieDocketOrder(existingOrder)) return false
          if (existingOrder.tableId !== order.tableId) return false

          const existingChairs = getOrderChairNumbers(existingOrder)
          if (existingChairs.length !== 1) return false

          return chairNumber !== null && existingChairs[0] === chairNumber
        })

        if (existingStationOrder) {
          const updatedStationOrder: Order = {
            ...existingStationOrder,
            items: order.items,
            subtotal: order.subtotal,
            tax: order.tax,
            total: order.total,
            updatedAt: new Date().toISOString(),
          }

          updateOrder(existingStationOrder.id, {
            items: updatedStationOrder.items,
            subtotal: updatedStationOrder.subtotal,
            tax: updatedStationOrder.tax,
            total: updatedStationOrder.total,
            updatedAt: updatedStationOrder.updatedAt,
          })

          if (station === 'kitchen') {
            printKitchenDocket(updatedStationOrder, settings, { addonItemIds: addonItemIdsForChair })
          } else {
            printBenMarieDocket(updatedStationOrder, settings, { addonItemIds: addonItemIdsForChair })
          }
          targetOrderIds.push(existingStationOrder.id)
        } else {
          const mappedOrderNumber =
            typeof chairNumber === 'number' && sharedOrderNumbersByChair
              ? sharedOrderNumbersByChair.get(chairNumber)
              : undefined
          const reusedStationNumber =
            mappedOrderNumber ??
            (typeof chairNumber === 'number' ? getSharedStationOrderNumberForChairs([chairNumber]) ?? undefined : undefined)
          const assignedOrderNumber = reusedStationNumber ?? nextStationOrderNumber

          if (reusedStationNumber === undefined) {
            nextStationOrderNumber += 1
          }

          if (typeof chairNumber === 'number' && sharedOrderNumbersByChair) {
            sharedOrderNumbersByChair.set(chairNumber, assignedOrderNumber)
          }

          const newStationOrder: Order = {
            ...order,
            orderNumber: assignedOrderNumber,
          }

          addOrder(newStationOrder)

          if (station === 'kitchen') {
            printKitchenDocket(newStationOrder, settings)
          } else {
            printBenMarieDocket(newStationOrder, settings)
          }
          targetOrderIds.push(newStationOrder.id)
        }
      })

      markCartItemsSentForStation(stationItemsToPrint.map((item) => item.id), station, sentAt)

      if (selectedTable && targetOrderIds.length > 0) {
        updateTableStatus(selectedTable.id, 'occupied', targetOrderIds[0])
      }

      return { sent: true, stationLabel, ordersCount: stationOrders.length }
    } catch (error) {
      console.error(`[waiter ${station} send error]`, error)
      throw error
    }
  }

  const handleSendToPrepStations = async () => {
    if (!ensureReady()) return
    if (handoffMode === 'multi' && dispatchChairNumbers.length === 0) {
      toast.error('Select at least one chair for multi handoff')
      return
    }
    if (dispatchItems.length === 0) {
      toast.error(
        handoffMode === 'multi'
          ? 'Add at least one item for the selected handoff chairs before sending dockets'
          : `Add at least one item for Chair ${selectedChair} before sending dockets`
      )
      return
    }
    if (!hasKitchenDispatchItems && !hasBenMarieDispatchItems) {
      toast.error('No Kitchen or Ben-Marie items found in the selected chairs')
      return
    }

    setIsSendingPrep(true)
    try {
      const sharedOrderNumbersByChair = new Map<number, number>()
      const kitchenResult = await sendStationDockets('kitchen', sharedOrderNumbersByChair)
      const benMarieResult = await sendStationDockets('ben-marie', sharedOrderNumbersByChair)

      const sentStations = [kitchenResult, benMarieResult].filter((result) => result.sent)
      if (sentStations.length === 0) {
        toast.info('No new station items to print')
        return
      }

      const sentLabels = sentStations.map((result) => result.stationLabel).join(' + ')
      toast.success(`Sent separate ${sentLabels} dockets for chairs ${dispatchChairNumbers.join(', ')}`)
    } finally {
      setIsSendingPrep(false)
    }
  }

  const handleUnlockChair = (chairNumber: number) => {
    if (!selectedTable) {
      toast.error('Please select a table first')
      return
    }

    const now = new Date().toISOString()
    const pendingChairOrders = orders.filter((order) => {
      if (order.tableId !== selectedTable.id) return false
      if (order.paymentStatus !== 'pending') return false
      if (order.status === 'cancelled') return false
      return order.items.some((item) => item.chairNumber === chairNumber)
    })

    if (pendingChairOrders.length === 0) {
      toast.info(`Chair ${chairNumber} is already unlocked`)
      return
    }

    pendingChairOrders.forEach((order) => {
      updateOrder(order.id, {
        status: 'cancelled',
        paymentStatus: 'refunded',
        updatedAt: now,
      })
    })

    setRecentlyQueuedChairs((current) => current.filter((chair) => chair !== chairNumber))
    toast.success(`Chair ${chairNumber} unlocked`)
  }

  const scrollToTableSection = () => {
    tableSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const renderHandoffPanel = (mobile = false) => (
    <Card className={cn('border-sky-200 shadow-sm dark:border-sky-900/40', mobile ? 'border-0 shadow-none' : 'h-fit lg:sticky lg:top-20')}>
      <CardHeader className="bg-sky-50/70 dark:bg-card/70">
        <CardTitle className="flex items-center gap-2">
          <Send className="h-5 w-5 text-sky-700 dark:text-sky-300" />
          Kitchen & biller handoff
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-3 sm:p-4 lg:p-6">
        <div className="rounded-lg border border-sky-200/80 bg-sky-50/70 px-3 py-2 text-xs text-sky-900 dark:border-sky-900/40 dark:bg-sky-500/10 dark:text-sky-200">
          Waiter cannot print bills. Send to Kitchen/Ben-Marie for docket printing, then send to Biller for final bill printing.
        </div>

        {recentlyQueuedChairs.length > 0 && (
          <div className="rounded-lg border border-amber-300/80 bg-amber-50/80 px-3 py-2 text-xs text-amber-900 dark:border-amber-700/60 dark:bg-amber-500/10 dark:text-amber-200">
            Chairs <span className="font-semibold">{recentlyQueuedChairs.join(', ')}</span> were sent to Biller Queue and are now locked.
            They unlock automatically after payment is completed.
          </div>
        )}

        <div className="space-y-2 rounded-lg border border-sky-200/80 bg-background px-2.5 py-2 sm:px-3 dark:border-sky-900/40">
          {lockedChairNumbers.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {lockedChairNumbers.map((chair) => (
                <div key={`locked-chair-${chair}`} className="inline-flex items-center gap-1 rounded-md border border-amber-300/80 bg-amber-50 px-2 py-1 text-xs text-amber-900 dark:border-amber-700/60 dark:bg-amber-500/10 dark:text-amber-200">
                  <Lock className="h-3 w-3" />
                  <span>Chair {chair} locked</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-6 px-2 text-[11px]"
                    onClick={() => handleUnlockChair(chair)}
                  >
                    <LockOpen className="mr-1 h-3 w-3" />
                    Unlock
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-lg border border-sky-200/80 bg-background p-2.5 dark:border-sky-900/40">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant={handoffMode === 'single' ? 'default' : 'outline'}
              onClick={() => {
                setHandoffMode('single')
                setMultiSelectedChairs([])
                setMultiGroupSets([])
              }}
            >
              Single Chair Handoff
            </Button>
            <Button
              type="button"
              size="sm"
              variant={handoffMode === 'multi' ? 'default' : 'outline'}
              onClick={() => {
                setHandoffMode('multi')
                setMultiSelectedChairs((current) => {
                  if (current.length > 0) return current
                  return [selectedChair]
                })
              }}
            >
              Multi Group Handoff
            </Button>
          </div>

          {handoffMode === 'multi' && selectedTable && (
            <div className="mt-2 space-y-2">
              <p className="text-xs text-muted-foreground">
                Select one or more chairs to combine into one grouped bill:
              </p>
              <p className="text-[11px] text-muted-foreground">Selected chairs will be combined into one bill in biller confirmation.</p>
              <p className="text-[11px] text-muted-foreground">Tip: Add multiple groups to send 2+ grouped bills in one handoff.</p>
              <p className="text-[11px] text-muted-foreground">Handoff selection does not change the order panel. The panel always shows only Chair {selectedChair}.</p>
              {activeMultiGroup && (
                <div className="rounded-md border border-sky-300/80 bg-sky-50 px-2.5 py-2 text-[11px] font-medium text-sky-900 dark:border-sky-700/60 dark:bg-sky-500/10 dark:text-sky-200">
                  Ready to send: Group {activeMultiGroupIndex + 1} (Chairs {activeMultiGroup.join(', ')})
                </div>
              )}
              <div className="flex flex-wrap gap-1.5">
                {Array.from({ length: chairCount }, (_, index) => index + 1).map((chair) => {
                  const included = dispatchChairNumbers.includes(chair)
                  return (
                    <Button
                      key={`handoff-chair-${chair}`}
                      type="button"
                      size="sm"
                      variant={included ? 'default' : 'outline'}
                      className="h-8 px-2"
                      onClick={() => toggleChairInMultiSelection(chair)}
                    >
                      Chair {chair}
                    </Button>
                  )
                })}
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={addCurrentGroupSelection}
                  disabled={dispatchChairNumbers.length < 2}
                >
                  Add Current Selection as Group
                </Button>
                {multiGroupSets.length > 0 && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setMultiGroupSets([])}
                  >
                    Clear Groups
                  </Button>
                )}
              </div>
              {multiGroupSets.length > 0 && (
                <div className="space-y-1 rounded-md border bg-muted/20 p-2 text-xs text-muted-foreground">
                  {multiGroupSets.map((group, idx) => (
                    <div
                      key={`group-set-${idx}`}
                      className={cn(
                        'flex items-center justify-between gap-2 rounded-md px-2 py-1',
                        idx === activeMultiGroupIndex && 'border border-sky-300/80 bg-sky-50 text-sky-900 dark:border-sky-700/60 dark:bg-sky-500/10 dark:text-sky-200'
                      )}
                    >
                      <span>Group {idx + 1}: Chairs {group.join(', ')}</span>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 text-[11px]"
                          onClick={() => {
                            setSelectedChair(group[0])
                            setMultiSelectedChairs(group)
                          }}
                        >
                          Use
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 text-[11px]"
                          onClick={() => setMultiGroupSets((current) => current.filter((_, i) => i !== idx))}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {mobile && (
          <div className="grid gap-2">
            <Button
              size="lg"
              variant="secondary"
              className="h-auto min-h-12 justify-start whitespace-normal break-words px-3 py-2 text-left text-sm font-semibold leading-tight"
              onClick={() => {
                void handleSendToPrepStations()
              }}
              disabled={isSendingPrep || isSending || dispatchItems.length === 0 || !selectedTable}
            >
              <UtensilsCrossed className="mr-2 h-4 w-4" />
              {isSendingPrep ? 'Sending...' : 'Send Station Dockets'}
            </Button>

            <Button
              size="lg"
              className="h-auto min-h-12 justify-start whitespace-normal break-words px-3 py-2 text-left text-sm font-semibold leading-tight"
              onClick={() => {
                void handleSendToBiller()
                setShowMobileHandoff(false)
              }}
              disabled={isSending || isSendingPrep || dispatchItems.length === 0 || !selectedTable}
            >
              {isSending ? 'Sending...' : 'Send Chair Bills to Biller (Print Bill)'}
            </Button>
          </div>
        )}

        <ScrollArea className={cn(mobile ? 'max-h-[36dvh] pr-2 sm:pr-3' : 'max-h-[30rem] pr-3')}>
          {handoffViewItems.length === 0 ? (
            <div className="flex min-h-32 items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
              {`No items added for Chair ${selectedChair}`}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="rounded-xl border border-sky-200/80 bg-background p-3 dark:border-sky-900/40">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <span className="rounded-md bg-sky-100 px-2 py-1 text-left text-xs font-semibold uppercase tracking-[0.14em] text-sky-900 dark:bg-sky-500/20 dark:text-sky-200">
                    {`Chair ${selectedChair}`}
                  </span>
                  <div className="text-right text-xs text-muted-foreground">
                    <p>{handoffViewItemCount} item{handoffViewItemCount === 1 ? '' : 's'}</p>
                    <p className="font-semibold text-foreground">{settings.currencySymbol}{handoffViewTotal.toFixed(2)}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  {handoffViewItems.map((item) => (
                    <div key={item.id} className="rounded-lg border bg-muted/20 p-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-foreground truncate">{item.name}</p>
                          <div className="mt-1 flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                            <span>Qty {item.quantity}</span>
                          </div>
                          {item.modifiers.length > 0 && (
                            <p className="mt-1 text-xs text-muted-foreground">+ {item.modifiers.map((modifier) => modifier.name).join(', ')}</p>
                          )}
                          {item.notes && <p className="mt-1 text-xs italic text-sky-700 dark:text-sky-300">Note: {item.notes}</p>}
                        </div>
                        <p className="whitespace-nowrap font-semibold text-foreground">
                          {settings.currencySymbol}{getItemLineTotal(item).toFixed(2)}
                        </p>
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => updateCartItemQuantity(item.id, item.quantity - 1)}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="w-8 text-center text-sm font-medium text-foreground">{item.quantity}</span>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => updateCartItemQuantity(item.id, item.quantity + 1)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => removeFromCart(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </ScrollArea>

        {!mobile && <div className="grid gap-2">
          <Button
            size="lg"
            variant="secondary"
            className="h-auto min-h-12 justify-start whitespace-normal break-words px-3 py-2 text-left text-sm font-semibold leading-tight"
            onClick={() => {
              void handleSendToPrepStations()
            }}
            disabled={isSendingPrep || isSending || dispatchItems.length === 0 || !selectedTable}
          >
            <UtensilsCrossed className="mr-2 h-4 w-4" />
            {isSendingPrep ? 'Sending...' : 'Send Station Dockets'}
          </Button>

          <Button
            size="lg"
            className="h-auto min-h-12 justify-start whitespace-normal break-words px-3 py-2 text-left text-sm font-semibold leading-tight"
            onClick={() => {
              void handleSendToBiller()
              if (mobile) {
                setShowMobileHandoff(false)
              }
            }}
            disabled={isSending || isSendingPrep || dispatchItems.length === 0 || !selectedTable}
          >
            {isSending ? 'Sending...' : 'Send Chair Bills to Biller (Print Bill)'}
          </Button>
        </div>}
      </CardContent>
    </Card>
  )

  if (!mounted || !currentUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh flex-col bg-gradient-to-b from-sky-50 via-background to-background dark:from-slate-950 dark:via-background dark:to-background">
      <Header title="Waiter" />

      <div className="mx-auto flex w-full max-w-[1500px] flex-1 flex-col gap-4 overflow-hidden p-3 sm:p-4 lg:p-6">
        <div className="rounded-2xl border border-sky-200 bg-sky-50/70 p-4 shadow-sm sm:p-5 dark:border-sky-900/40 dark:bg-card/80">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700 dark:text-sky-300">Waiter service</p>
              <h1 className="text-xl font-bold leading-tight text-foreground sm:text-2xl">Choose a table, pick a chair, and send each chair&apos;s order separately</h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="bg-sky-100 text-sky-900 hover:bg-sky-100 dark:bg-sky-500/15 dark:text-sky-200">
                {currentUser.role}
              </Badge>
              <Badge variant="outline">{cartCount} items</Badge>
              {selectedTable && <Badge variant="outline">Table {selectedTable.name}</Badge>}
              {selectedTable && <Badge variant="outline">Chair {selectedChair}</Badge>}
            </div>
          </div>
        </div>

        <div className={cn('grid items-start gap-4 lg:grid-cols-[minmax(0,1.45fr)_360px] 2xl:grid-cols-[minmax(0,1.55fr)_380px]', isMobile && 'pb-[calc(5.5rem+env(safe-area-inset-bottom))]')}>
          <div className="space-y-4 min-w-0">
            <Card ref={tableSectionRef} className="overflow-hidden border-sky-200 shadow-sm dark:border-sky-900/40">
              <CardHeader className="bg-sky-50/70 dark:bg-card/70">
                <CardTitle className="flex items-center gap-2">
                  <Table2 className="h-5 w-5 text-sky-700 dark:text-sky-300" />
                  Table selection
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-4 sm:p-6">
                {openTables.length === 0 ? (
                  <div className="flex min-h-28 items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
                    No available tables right now.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                    {openTables.map((table) => (
                      <Button
                        key={table.id}
                        type="button"
                        variant={selectedTable?.id === table.id ? 'default' : 'outline'}
                        className={cn(
                          'h-20 min-h-[5rem] flex-col items-start justify-between p-3 text-left',
                          selectedTable?.id === table.id && 'bg-sky-600 text-white hover:bg-sky-600'
                        )}
                        onClick={() => selectTable(table)}
                      >
                        <div className="flex w-full items-center justify-between gap-2">
                          <span className="font-semibold">{table.name}</span>
                          <ChevronRight className="h-4 w-4 opacity-70" />
                        </div>
                        <div className="flex w-full items-center justify-between text-xs opacity-80">
                          <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {table.seats}</span>
                          <span className="capitalize">{table.status}</span>
                        </div>
                      </Button>
                    ))}
                  </div>
                )}
                {selectedTable && (
                  <div className="rounded-xl border bg-background p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{selectedTable.name}</p>
                        <p className="text-xs text-muted-foreground">Select a chair before adding items.</p>
                      </div>
                      <Badge variant="secondary">{chairCount} chairs</Badge>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                      {Array.from({ length: chairCount }, (_, index) => index + 1).map((chair) => (
                        (() => {
                          const chairSummary = groupedCartByChair.find((group) => group.chairNumber === chair)
                          const chairItems = chairSummary?.itemCount ?? 0
                          const isInHandoffSelection = dispatchChairNumbers.includes(chair)
                          return (
                        <Button
                          key={chair}
                          type="button"
                          size="sm"
                          variant={selectedChair === chair ? 'default' : 'outline'}
                          className={cn(
                            'h-auto min-h-10 w-full justify-start py-1.5',
                            selectedChair === chair && 'bg-sky-600 text-white hover:bg-sky-600',
                            chairItems > 0 && selectedChair !== chair && 'border-sky-300 text-sky-700 dark:border-sky-700 dark:text-sky-300'
                          )}
                          onClick={() => setSelectedChair(chair)}
                        >
                          <span className="flex flex-col items-start leading-tight">
                            <span className="inline-flex items-center gap-1">
                              Chair {chair}
                              {lockedChairNumbers.includes(chair) && <Lock className="h-3 w-3" />}
                            </span>
                            {handoffMode === 'multi' && isInHandoffSelection && (
                              <span className="text-[10px] font-medium text-sky-700 opacity-90 dark:text-sky-300">
                                Selected for handoff
                              </span>
                            )}
                            {chairItems > 0 && <span className="text-[10px] opacity-80">{chairItems} item{chairItems === 1 ? '' : 's'}</span>}
                          </span>
                        </Button>
                          )
                        })()
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="min-h-[24rem] overflow-hidden border-sky-200 shadow-sm dark:border-sky-900/40 lg:min-h-[28rem]">
              <CardHeader className="bg-sky-50/70 dark:bg-card/70">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-sky-700 dark:text-sky-300" />
                  Menu for {selectedTable ? selectedTable.name : 'selected table'}
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[26rem] p-0 sm:h-[30rem] xl:h-[32rem]">
                <div className="border-b border-border px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" size="sm" variant={prepStationFilter === 'ben-marie' ? 'default' : 'outline'} onClick={() => setPrepStationFilter('ben-marie')}>
                      Ben-Marie Items
                    </Button>
                    <Button type="button" size="sm" variant={prepStationFilter === 'kitchen' ? 'default' : 'outline'} onClick={() => setPrepStationFilter('kitchen')}>
                      Kitchen Items
                    </Button>
                  </div>
                </div>
                <MenuGrid
                  onSelectItem={handleSelectItem}
                  prepStationFilter={prepStationFilter}
                  showCategoryTabs={false}
                  allowedCategoryIds={waiterVisibleCategoryIds}
                />
                {isSelectedChairLocked && (
                  <div className="flex flex-col items-start gap-2 border-t border-border px-4 py-3 text-xs text-amber-700 sm:flex-row sm:items-center sm:justify-between dark:text-amber-300">
                    <span>Chair {selectedChair} has a pending bill. New items will be appended when you send again.</span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-[11px]"
                      onClick={() => handleUnlockChair(selectedChair)}
                    >
                      <LockOpen className="mr-1 h-3 w-3" />
                      Unlock Chair {selectedChair}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {!isMobile && renderHandoffPanel()}
        </div>
      </div>

      {isMobile && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 px-3 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="mx-auto flex w-full max-w-6xl items-center gap-2">
            <Button
              variant="outline"
              className="h-11 flex-1 justify-start"
              onClick={scrollToTableSection}
            >
              <Users className="mr-2 h-4 w-4" />
              {selectedTable ? selectedTable.name : 'Select Table'}
            </Button>
            <Button
              className="h-11 flex-[1.4] justify-between"
              onClick={() => setShowMobileHandoff(true)}
            >
              <span className="inline-flex items-center gap-2">
                <ShoppingCart className="h-4 w-4" />
                Order ({cartCount})
              </span>
              <span>{settings.currencySymbol}{total.toFixed(2)}</span>
            </Button>
          </div>
        </div>
      )}

      {isMobile && (
        <Drawer open={showMobileHandoff} onOpenChange={setShowMobileHandoff}>
          <DrawerContent className="max-h-[92dvh] overflow-hidden">
            <DrawerHeader>
              <DrawerTitle>Biller handoff</DrawerTitle>
            </DrawerHeader>
            <div className="overflow-y-auto pb-[env(safe-area-inset-bottom)]">
              {renderHandoffPanel(true)}
            </div>
          </DrawerContent>
        </Drawer>
      )}

      <OrderModifiers
        item={selectedItem}
        open={showModifiers}
        onClose={() => {
          setShowModifiers(false)
          setSelectedItem(null)
        }}
        onConfirm={handleConfirmModifiers}
      />

    </div>
  )
}