'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Fire-and-forget API sync – keeps optimistic UI fast
async function dbSync(method: string, url: string, body?: unknown) {
  try {
    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch (e) {
    console.error('[db-sync error]', method, url, e)
  }
}

import type {
  User,
  Category,
  MenuItem,
  Table,
  Order,
  OrderItem,
  InventoryItem,
  Settings,
  Supplier,
  OrderStatus,
  TableStatus,
  StockAdjustment,
} from './types'
import {
  mockUsers,
  mockCategories,
  mockMenuItems,
  mockTables,
  mockOrders,
  mockInventory,
  mockSettings,
  mockSuppliers,
} from './mock-data'

interface CartItem extends OrderItem {}

interface POSStore {
  // Auth
  currentUser: User | null
  users: User[]
  setCurrentUser: (user: User | null) => void
  addUser: (user: User) => void
  updateUser: (id: string, user: Partial<User>) => void
  deleteUser: (id: string) => void
  loginWithPin: (pin: string) => User | null

  // Menu
  categories: Category[]
  menuItems: MenuItem[]
  addCategory: (category: Category) => void
  updateCategory: (id: string, category: Partial<Category>) => void
  deleteCategory: (id: string) => void
  addMenuItem: (item: MenuItem) => void
  updateMenuItem: (id: string, item: Partial<MenuItem>) => void
  deleteMenuItem: (id: string) => void
  toggleItemAvailability: (id: string) => void

  // Cart
  cart: CartItem[]
  selectedTable: Table | null
  addToCart: (item: CartItem) => void
  removeFromCart: (itemId: string) => void
  updateCartItemQuantity: (itemId: string, quantity: number) => void
  updateCartItemNotes: (itemId: string, notes: string) => void
  clearCart: () => void
  setSelectedTable: (table: Table | null) => void

  // Orders
  orders: Order[]
  orderNumber: number
  addOrder: (order: Order) => void
  updateOrderStatus: (id: string, status: OrderStatus) => void
  updateOrderPayment: (id: string, paymentMethod: Order['paymentMethod'], paymentStatus: Order['paymentStatus']) => void
  getNextOrderNumber: () => number
  toggleOrderPriority: (id: string) => void

  // Tables
  tables: Table[]
  addTable: (table: Table) => void
  updateTable: (id: string, table: Partial<Table>) => void
  deleteTable: (id: string) => void
  updateTableStatus: (id: string, status: TableStatus, orderId?: string) => void

  // Inventory
  inventory: InventoryItem[]
  suppliers: Supplier[]
  stockAdjustments: StockAdjustment[]
  addInventoryItem: (item: InventoryItem) => void
  updateInventoryItem: (id: string, item: Partial<InventoryItem>) => void
  deleteInventoryItem: (id: string) => void
  adjustStock: (adjustment: StockAdjustment) => void
  addSupplier: (supplier: Supplier) => void
  updateSupplier: (id: string, supplier: Partial<Supplier>) => void
  deleteSupplier: (id: string) => void

  // Settings
  settings: Settings
  updateSettings: (settings: Partial<Settings>) => void

  // DB sync
  loadFromDB: () => Promise<void>

  // Helpers
  getCartTotal: () => { subtotal: number; tax: number; total: number }
  getLowStockItems: () => InventoryItem[]
  getTodayOrders: () => Order[]
  getTodaySales: () => number
}

export const usePOSStore = create<POSStore>()(
  persist(
    (set, get) => ({
      // Auth
      currentUser: null,
      users: mockUsers,
      setCurrentUser: (user) => set({ currentUser: user }),
      addUser: (user) => {
        set((state) => ({ users: [...state.users, user] }))
        dbSync('POST', '/api/users', user)
      },
      updateUser: (id, userData) => {
        set((state) => ({ users: state.users.map((u) => (u.id === id ? { ...u, ...userData } : u)) }))
        dbSync('PATCH', `/api/users/${id}`, userData)
      },
      deleteUser: (id) => {
        set((state) => ({ users: state.users.filter((u) => u.id !== id) }))
        dbSync('DELETE', `/api/users/${id}`)
      },
      loginWithPin: (pin) => {
        const user = get().users.find((u) => u.pin === pin)
        if (user) {
          set({ currentUser: user })
          return user
        }
        return null
      },

      // Menu
      categories: mockCategories,
      menuItems: mockMenuItems,
      addCategory: (category) => {
        set((state) => ({ categories: [...state.categories, category] }))
        dbSync('POST', '/api/categories', category)
      },
      updateCategory: (id, categoryData) => {
        set((state) => ({ categories: state.categories.map((c) => (c.id === id ? { ...c, ...categoryData } : c)) }))
        dbSync('PATCH', `/api/categories/${id}`, categoryData)
      },
      deleteCategory: (id) => {
        set((state) => ({ categories: state.categories.filter((c) => c.id !== id) }))
        dbSync('DELETE', `/api/categories/${id}`)
      },
      addMenuItem: (item) => {
        set((state) => ({ menuItems: [...state.menuItems, item] }))
        dbSync('POST', '/api/menu-items', item)
      },
      updateMenuItem: (id, itemData) => {
        set((state) => ({ menuItems: state.menuItems.map((i) => (i.id === id ? { ...i, ...itemData } : i)) }))
        dbSync('PATCH', `/api/menu-items/${id}`, itemData)
      },
      deleteMenuItem: (id) => {
        set((state) => ({ menuItems: state.menuItems.filter((i) => i.id !== id) }))
        dbSync('DELETE', `/api/menu-items/${id}`)
      },
      toggleItemAvailability: (id) => {
        const item = get().menuItems.find((i) => i.id === id)
        if (!item) return
        set((state) => ({ menuItems: state.menuItems.map((i) => (i.id === id ? { ...i, isAvailable: !i.isAvailable } : i)) }))
        dbSync('PATCH', `/api/menu-items/${id}`, { isAvailable: !item.isAvailable })
      },

      // Cart
      cart: [],
      selectedTable: null,
      addToCart: (item) =>
        set((state) => {
          const existingIndex = state.cart.findIndex(
            (i) =>
              i.menuItemId === item.menuItemId &&
              JSON.stringify(i.modifiers) === JSON.stringify(item.modifiers)
          )
          if (existingIndex >= 0) {
            const newCart = [...state.cart]
            newCart[existingIndex].quantity += item.quantity
            return { cart: newCart }
          }
          return { cart: [...state.cart, item] }
        }),
      removeFromCart: (itemId) =>
        set((state) => ({
          cart: state.cart.filter((i) => i.id !== itemId),
        })),
      updateCartItemQuantity: (itemId, quantity) =>
        set((state) => ({
          cart:
            quantity <= 0
              ? state.cart.filter((i) => i.id !== itemId)
              : state.cart.map((i) =>
                  i.id === itemId ? { ...i, quantity } : i
                ),
        })),
      updateCartItemNotes: (itemId, notes) =>
        set((state) => ({
          cart: state.cart.map((i) =>
            i.id === itemId ? { ...i, notes } : i
          ),
        })),
      clearCart: () => set({ cart: [], selectedTable: null }),
      setSelectedTable: (table) => set({ selectedTable: table }),

      // Orders
      orders: mockOrders,
      orderNumber: 103,
      addOrder: (order) => {
        set((state) => ({ orders: [...state.orders, order], orderNumber: state.orderNumber + 1 }))
        dbSync('POST', '/api/orders', order)
      },
      updateOrderStatus: (id, status) => {
        set((state) => ({ orders: state.orders.map((o) => (o.id === id ? { ...o, status, updatedAt: new Date().toISOString() } : o)) }))
        dbSync('PATCH', `/api/orders/${id}`, { status })
      },
      updateOrderPayment: (id, paymentMethod, paymentStatus) => {
        set((state) => ({ orders: state.orders.map((o) => (o.id === id ? { ...o, paymentMethod, paymentStatus, updatedAt: new Date().toISOString() } : o)) }))
        dbSync('PATCH', `/api/orders/${id}`, { paymentMethod, paymentStatus })
      },
      getNextOrderNumber: () => get().orderNumber,
      toggleOrderPriority: (id) => {
        const order = get().orders.find((o) => o.id === id)
        if (!order) return
        set((state) => ({ orders: state.orders.map((o) => (o.id === id ? { ...o, isPriority: !o.isPriority } : o)) }))
        dbSync('PATCH', `/api/orders/${id}`, { isPriority: !order.isPriority })
      },

      // Tables
      tables: mockTables,
      addTable: (table) => {
        set((state) => ({ tables: [...state.tables, table] }))
        dbSync('POST', '/api/tables', table)
      },
      updateTable: (id, tableData) => {
        set((state) => ({ tables: state.tables.map((t) => (t.id === id ? { ...t, ...tableData } : t)) }))
        dbSync('PATCH', `/api/tables/${id}`, tableData)
      },
      deleteTable: (id) => {
        set((state) => ({ tables: state.tables.filter((t) => t.id !== id) }))
        dbSync('DELETE', `/api/tables/${id}`)
      },
      updateTableStatus: (id, status, orderId) => {
        set((state) => ({ tables: state.tables.map((t) => (t.id === id ? { ...t, status, currentOrderId: orderId } : t)) }))
        dbSync('PATCH', `/api/tables/${id}`, { status, currentOrderId: orderId ?? null })
      },

      // Inventory
      inventory: mockInventory,
      suppliers: mockSuppliers,
      stockAdjustments: [],
      addInventoryItem: (item) => {
        set((state) => ({ inventory: [...state.inventory, item] }))
        dbSync('POST', '/api/inventory', item)
      },
      updateInventoryItem: (id, itemData) => {
        set((state) => ({ inventory: state.inventory.map((i) => (i.id === id ? { ...i, ...itemData } : i)) }))
        dbSync('PATCH', `/api/inventory/${id}`, itemData)
      },
      deleteInventoryItem: (id) => {
        set((state) => ({ inventory: state.inventory.filter((i) => i.id !== id) }))
        dbSync('DELETE', `/api/inventory/${id}`)
      },
      adjustStock: (adjustment) => {
        set((state) => {
          const item = state.inventory.find((i) => i.id === adjustment.inventoryItemId)
          if (!item) return state
          const newQuantity =
            adjustment.type === 'add'
              ? item.quantity + adjustment.quantity
              : item.quantity - adjustment.quantity
          return {
            inventory: state.inventory.map((i) =>
              i.id === adjustment.inventoryItemId
                ? { ...i, quantity: Math.max(0, newQuantity), lastRestocked: adjustment.type === 'add' ? new Date().toISOString() : i.lastRestocked }
                : i
            ),
            stockAdjustments: [...state.stockAdjustments, adjustment],
          }
        })
        dbSync('POST', '/api/stock-adjustments', adjustment)
      },
      addSupplier: (supplier) => {
        set((state) => ({ suppliers: [...state.suppliers, supplier] }))
        dbSync('POST', '/api/suppliers', supplier)
      },
      updateSupplier: (id, supplierData) => {
        set((state) => ({ suppliers: state.suppliers.map((s) => (s.id === id ? { ...s, ...supplierData } : s)) }))
        dbSync('PATCH', `/api/suppliers/${id}`, supplierData)
      },
      deleteSupplier: (id) => {
        set((state) => ({ suppliers: state.suppliers.filter((s) => s.id !== id) }))
        dbSync('DELETE', `/api/suppliers/${id}`)
      },

      // Settings
      settings: mockSettings,
      updateSettings: (settingsData) => {
        set((state) => ({ settings: { ...state.settings, ...settingsData } }))
        dbSync('PATCH', '/api/settings', settingsData)
      },

      // DB sync
      loadFromDB: async () => {
        try {
          const [users, categories, menuItems, tables, orders, inventory, suppliers, stockAdjustments, settings] =
            await Promise.all([
              fetch('/api/users').then((r) => (r.ok ? r.json() : Promise.resolve(null))),
              fetch('/api/categories').then((r) => (r.ok ? r.json() : Promise.resolve(null))),
              fetch('/api/menu-items').then((r) => (r.ok ? r.json() : Promise.resolve(null))),
              fetch('/api/tables').then((r) => (r.ok ? r.json() : Promise.resolve(null))),
              fetch('/api/orders').then((r) => (r.ok ? r.json() : Promise.resolve(null))),
              fetch('/api/inventory').then((r) => (r.ok ? r.json() : Promise.resolve(null))),
              fetch('/api/suppliers').then((r) => (r.ok ? r.json() : Promise.resolve(null))),
              fetch('/api/stock-adjustments').then((r) => (r.ok ? r.json() : Promise.resolve(null))),
              fetch('/api/settings').then((r) => (r.ok ? r.json() : Promise.resolve(null))),
            ])
          set({
            users: Array.isArray(users) ? users : get().users,
            categories: Array.isArray(categories) ? categories : get().categories,
            menuItems: Array.isArray(menuItems) ? menuItems : get().menuItems,
            tables: Array.isArray(tables) ? tables : get().tables,
            orders: Array.isArray(orders) ? orders : get().orders,
            inventory: Array.isArray(inventory) ? inventory : get().inventory,
            suppliers: Array.isArray(suppliers) ? suppliers : get().suppliers,
            stockAdjustments: Array.isArray(stockAdjustments) ? stockAdjustments : get().stockAdjustments,
            settings: settings && !settings.error ? settings : get().settings,
          })
        } catch (e) {
          console.error('[loadFromDB error]', e)
        }
      },

      // Helpers
      getCartTotal: () => {
        const state = get()
        const subtotal = state.cart.reduce((sum, item) => {
          const itemTotal = item.price * item.quantity
          const modifiersTotal = item.modifiers.reduce((m, mod) => m + mod.price, 0) * item.quantity
          return sum + itemTotal + modifiersTotal
        }, 0)
        const tax = subtotal * (state.settings.taxRate / 100)
        return { subtotal, tax, total: subtotal + tax }
      },
      getLowStockItems: () => {
        return get().inventory.filter((item) => item.quantity <= item.minQuantity)
      },
      getTodayOrders: () => {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        return get().orders.filter((order) => new Date(order.createdAt) >= today)
      },
      getTodaySales: () => {
        const todayOrders = get().getTodayOrders()
        return todayOrders
          .filter((o) => o.paymentStatus === 'paid')
          .reduce((sum, o) => sum + o.total, 0)
      },
    }),
    {
      name: 'pos-storage',
      partialize: (state) => ({
        users: state.users,
        categories: state.categories,
        menuItems: state.menuItems,
        orders: state.orders,
        orderNumber: state.orderNumber,
        tables: state.tables,
        inventory: state.inventory,
        suppliers: state.suppliers,
        stockAdjustments: state.stockAdjustments,
        settings: state.settings,
      }),
    }
  )
)
