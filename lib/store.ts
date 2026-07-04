'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { apiFetch } from '@/lib/api'

// Fire-and-forget API sync – keeps optimistic UI fast
async function dbSync(method: string, url: string, body?: unknown) {
  try {
    await apiFetch(url, {
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
  Customer,
  Category,
  MenuItem,
  Table,
  Order,
  OrderItem,
  InventoryItem,
  CashDrawer,
  CashDrawerExpense,
  CashDrawerReport,
  Settings,
  Supplier,
  OrderStatus,
  TableStatus,
  StockAdjustment,
} from './types'
import {
  mockUsers,
  mockCustomers,
  mockCategories,
  mockMenuItems,
  mockTables,
  mockOrders,
  mockInventory,
  mockSettings,
  mockSuppliers,
} from './mock-data'

interface CartItem extends OrderItem {}

function normalizeInventoryForApi(item: InventoryItem) {
  return {
    id: item.id,
    name: item.name,
    sku: item.sku,
    quantity: item.quantity,
    unit: item.unit,
    minQuantity: item.minQuantity,
    costPrice: item.costPrice,
    supplierId: item.supplierId,
    lastRestocked: item.lastRestocked,
    category: item.category,
  }
}

function normalizeInventoryPatchForApi(item: Partial<InventoryItem>) {
  const patch: Partial<InventoryItem> = {
    name: item.name,
    sku: item.sku,
    quantity: item.quantity,
    unit: item.unit,
    minQuantity: item.minQuantity,
    costPrice: item.costPrice,
    supplierId: item.supplierId,
    lastRestocked: item.lastRestocked,
    category: item.category,
  }

  return Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined))
}

interface POSStore {
  // Auth
  currentUser: User | null
  users: User[]
  customers: Customer[]
  selectedCustomer: Customer | null
  setCurrentUser: (user: User | null) => void
  addUser: (user: User) => void
  updateUser: (id: string, user: Partial<User>) => void
  deleteUser: (id: string) => void
  addCustomer: (customer: Customer) => void
  createCustomer: (customer: Pick<Customer, 'name' | 'phone' | 'email' | 'notes'>) => Promise<Customer | null>
  updateCustomer: (id: string, customer: Partial<Customer>) => void
  deleteCustomer: (id: string) => void
  setSelectedCustomer: (customer: Customer | null) => void
  loginWithPin: (pin: string) => Promise<User | null>
  logout: () => Promise<void>
  refreshCurrentUser: () => Promise<User | null>

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
  currentCustomerCount: number
  addToCart: (item: CartItem) => void
  removeFromCart: (itemId: string) => void
  updateCartItemQuantity: (itemId: string, quantity: number) => void
  updateCartItemNotes: (itemId: string, notes: string) => void
  clearCart: () => void
  setSelectedTable: (table: Table | null) => void
  setCurrentCustomerCount: (count: number) => void

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
  cashDrawer: CashDrawer | null
  cashDrawerExpenses: CashDrawerExpense[]
  cashDrawerReports: CashDrawerReport[]
  stockAdjustments: StockAdjustment[]
  addInventoryItem: (item: InventoryItem) => void
  updateInventoryItem: (id: string, item: Partial<InventoryItem>) => void
  deleteInventoryItem: (id: string) => void
  adjustStock: (adjustment: StockAdjustment) => void
  addSupplier: (supplier: Supplier) => void
  updateSupplier: (id: string, supplier: Partial<Supplier>) => void
  deleteSupplier: (id: string) => void
  updateCashDrawer: (cashDrawer: Partial<CashDrawer>) => void
  addCashDrawerExpense: (expense: Pick<CashDrawerExpense, 'amount' | 'reason' | 'createdBy'>) => Promise<CashDrawerExpense | null>
  createCashDrawerReport: (report: Omit<CashDrawerReport, 'id' | 'closedAt'> & { closedAt?: string }) => Promise<CashDrawerReport | null>

  // Settings
  settings: Settings
  updateSettings: (settings: Partial<Settings>) => void

  // DB sync
  loadFromDB: () => Promise<void>

  // Helpers
  getCartTotal: () => { subtotal: number; tax: number; total: number }
  getCashDrawerBalance: () => { openingBalance: number; cashSales: number; cashRefunds: number; currentBalance: number }
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
      customers: mockCustomers,
      selectedCustomer: null,
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
      addCustomer: (customer) => {
        set((state) => ({ customers: [...state.customers, customer] }))
        dbSync('POST', '/api/customers', customer)
      },
      createCustomer: async (customerInput) => {
        try {
          const response = await apiFetch('/api/customers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(customerInput),
          })

          if (!response.ok) {
            return null
          }

          const created = (await response.json()) as Customer
          set((state) => ({
            customers: [...state.customers.filter((customer) => customer.id !== created.id), created],
          }))
          return created
        } catch (error) {
          console.error('[createCustomer error]', error)
          return null
        }
      },
      updateCustomer: (id, customerData) => {
        set((state) => ({
          customers: state.customers.map((customer) =>
            customer.id === id ? { ...customer, ...customerData } : customer
          ),
          selectedCustomer:
            state.selectedCustomer?.id === id
              ? { ...state.selectedCustomer, ...customerData }
              : state.selectedCustomer,
        }))
        dbSync('PATCH', `/api/customers/${id}`, customerData)
      },
      deleteCustomer: (id) => {
        set((state) => ({
          customers: state.customers.filter((customer) => customer.id !== id),
          selectedCustomer: state.selectedCustomer?.id === id ? null : state.selectedCustomer,
        }))
        dbSync('DELETE', `/api/customers/${id}`)
      },
      setSelectedCustomer: (customer) => set({ selectedCustomer: customer }),
      loginWithPin: async (pin) => {
        try {
const response = await apiFetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
          })

          if (!response.ok) {
            return null
          }

          const data = await response.json()
          if (!data?.user) {
            return null
          }

          set({ currentUser: data.user })
          await get().loadFromDB()
          return data.user
        } catch (error) {
          console.error('[login error]', error)
          return null
        }
      },
      logout: async () => {
        try {
          await apiFetch('/api/auth/logout', {
            method: 'POST',
          })
        } catch (error) {
          console.error('[logout error]', error)
        } finally {
          set({ currentUser: null })
        }
      },
      refreshCurrentUser: async () => {
        try {
const response = await apiFetch('/api/auth/me', {
        method: 'GET',
        cache: 'no-store',
          })

          if (!response.ok) {
            set({ currentUser: null })
            return null
          }

          const data = await response.json()
          const user = data?.user ?? null
          set({ currentUser: user })
          return user
        } catch (error) {
          console.error('[refreshCurrentUser error]', error)
          set({ currentUser: null })
          return null
        }
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
      currentCustomerCount: 1,
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
      clearCart: () => set({ cart: [], selectedTable: null, selectedCustomer: null, currentCustomerCount: 1 }),
      setSelectedTable: (table) => set({ selectedTable: table }),
      setCurrentCustomerCount: (count) => set({ currentCustomerCount: Math.max(1, count) }),

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
      cashDrawer: null,
      cashDrawerExpenses: [],
      cashDrawerReports: [],
      stockAdjustments: [],
      addInventoryItem: (item) => {
        const normalized: InventoryItem = {
          ...item,
          storageQuantity: item.storageQuantity ?? 0,
        }
        set((state) => ({ inventory: [...state.inventory, normalized] }))
        dbSync('POST', '/api/inventory', normalizeInventoryForApi(normalized))
      },
      updateInventoryItem: (id, itemData) => {
        set((state) => ({ inventory: state.inventory.map((i) => (i.id === id ? { ...i, ...itemData } : i)) }))
        dbSync('PATCH', `/api/inventory/${id}`, normalizeInventoryPatchForApi(itemData))
      },
      deleteInventoryItem: (id) => {
        set((state) => ({ inventory: state.inventory.filter((i) => i.id !== id) }))
        dbSync('DELETE', `/api/inventory/${id}`)
      },
      adjustStock: (adjustment) => {
        set((state) => {
          const item = state.inventory.find((i) => i.id === adjustment.inventoryItemId)
          if (!item) return state
          const currentStorage = item.storageQuantity ?? 0

          let nextInventoryQty = item.quantity
          let nextStorageQty = currentStorage

          if (adjustment.type === 'transfer') {
            if (adjustment.fromLocation === 'storage' && adjustment.toLocation === 'inventory') {
              const moved = Math.min(currentStorage, adjustment.quantity)
              nextStorageQty = currentStorage - moved
              nextInventoryQty = item.quantity + moved
            } else if (adjustment.fromLocation === 'inventory' && adjustment.toLocation === 'storage') {
              const moved = Math.min(item.quantity, adjustment.quantity)
              nextInventoryQty = item.quantity - moved
              nextStorageQty = currentStorage + moved
            }
          } else {
            const location = adjustment.location ?? 'inventory'
            if (location === 'inventory') {
              nextInventoryQty = adjustment.type === 'add'
                ? item.quantity + adjustment.quantity
                : item.quantity - adjustment.quantity
            } else {
              nextStorageQty = adjustment.type === 'add'
                ? currentStorage + adjustment.quantity
                : currentStorage - adjustment.quantity
            }
          }

          nextInventoryQty = Math.max(0, nextInventoryQty)
          nextStorageQty = Math.max(0, nextStorageQty)

          return {
            inventory: state.inventory.map((i) =>
              i.id === adjustment.inventoryItemId
                ? {
                    ...i,
                    quantity: nextInventoryQty,
                    storageQuantity: nextStorageQty,
                    lastRestocked:
                      adjustment.type === 'add' && (adjustment.location ?? 'inventory') === 'inventory'
                        ? new Date().toISOString()
                        : i.lastRestocked,
                  }
                : i
            ),
            stockAdjustments: [...state.stockAdjustments, adjustment],
          }
        })

        // Keep DB sync compatible with current schema (daily inventory only)
        if (adjustment.type !== 'transfer' && (adjustment.location ?? 'inventory') === 'inventory') {
          dbSync('POST', '/api/stock-adjustments', {
            id: adjustment.id,
            inventoryItemId: adjustment.inventoryItemId,
            type: adjustment.type,
            quantity: adjustment.quantity,
            reason: adjustment.reason,
            createdAt: adjustment.createdAt,
            createdBy: adjustment.createdBy,
          })
        }
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
      updateCashDrawer: (cashDrawerData) => {
        set((state) => ({
          cashDrawer: {
            id: 'singleton',
            openingBalance: state.cashDrawer?.openingBalance ?? 0,
            notes: state.cashDrawer?.notes,
            openedAt: state.cashDrawer?.openedAt,
            ...state.cashDrawer,
            ...cashDrawerData,
            updatedAt: new Date().toISOString(),
          },
        }))
        dbSync('PATCH', '/api/cash-drawer', cashDrawerData)
      },
      addCashDrawerExpense: async (expenseInput) => {
        try {
          const response = await apiFetch('/api/cash-drawer/expenses', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(expenseInput),
          })

          if (!response.ok) {
            return null
          }

          const created = (await response.json()) as CashDrawerExpense
          set((state) => ({ cashDrawerExpenses: [created, ...state.cashDrawerExpenses] }))
          return created
        } catch (error) {
          console.error('[addCashDrawerExpense error]', error)
          return null
        }
      },
      createCashDrawerReport: async (reportInput) => {
        try {
          const response = await apiFetch('/api/cash-drawer/reports', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(reportInput),
          })

          if (!response.ok) {
            return null
          }

          const created = (await response.json()) as CashDrawerReport
          set((state) => ({
            cashDrawerReports: [created, ...state.cashDrawerReports.filter((report) => report.id !== created.id)],
          }))
          return created
        } catch (error) {
          console.error('[createCashDrawerReport error]', error)
          return null
        }
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
          await get().refreshCurrentUser()
          const [users, customers, categories, menuItems, tables, orders, inventory, suppliers, cashDrawer, cashDrawerExpenses, cashDrawerReports, stockAdjustments, settings] =
            await Promise.all([
              apiFetch('/api/users').then((r) => (r.ok ? r.json() : Promise.resolve(null))),
              apiFetch('/api/customers').then((r) => (r.ok ? r.json() : Promise.resolve(null))),
              apiFetch('/api/categories').then((r) => (r.ok ? r.json() : Promise.resolve(null))),
              apiFetch('/api/menu-items').then((r) => (r.ok ? r.json() : Promise.resolve(null))),
              apiFetch('/api/tables').then((r) => (r.ok ? r.json() : Promise.resolve(null))),
              apiFetch('/api/orders').then((r) => (r.ok ? r.json() : Promise.resolve(null))),
              apiFetch('/api/inventory').then((r) => (r.ok ? r.json() : Promise.resolve(null))),
              apiFetch('/api/suppliers').then((r) => (r.ok ? r.json() : Promise.resolve(null))),
              apiFetch('/api/cash-drawer').then((r) => (r.ok ? r.json() : Promise.resolve(null))),
              apiFetch('/api/cash-drawer/expenses').then((r) => (r.ok ? r.json() : Promise.resolve(null))),
              apiFetch('/api/cash-drawer/reports').then((r) => (r.ok ? r.json() : Promise.resolve(null))),
              apiFetch('/api/stock-adjustments').then((r) => (r.ok ? r.json() : Promise.resolve(null))),
              apiFetch('/api/settings').then((r) => (r.ok ? r.json() : Promise.resolve(null))),
            ])
          const currentInventory = get().inventory
          const incomingInventory: InventoryItem[] = Array.isArray(inventory)
            ? inventory.map((item: InventoryItem) => {
                const existing = currentInventory.find((i) => i.id === item.id)
                return {
                  ...item,
                  storageQuantity: item.storageQuantity ?? existing?.storageQuantity ?? 0,
                }
              })
            : currentInventory

          const mergedAdjustments = (() => {
            const existing = get().stockAdjustments
            const incoming = Array.isArray(stockAdjustments) ? stockAdjustments : []
            const map = new Map<string, StockAdjustment>()
            ;[...existing, ...incoming].forEach((adj: StockAdjustment) => {
              map.set(adj.id, adj)
            })
            return Array.from(map.values()).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
          })()

          const incomingCustomers: Customer[] = Array.isArray(customers) ? customers : get().customers
          const currentSelectedCustomerId = get().selectedCustomer?.id
          const syncedSelectedCustomer = currentSelectedCustomerId
            ? incomingCustomers.find((customer) => customer.id === currentSelectedCustomerId) ?? null
            : null

          set({
            users: Array.isArray(users) ? users : get().users,
            customers: incomingCustomers,
            selectedCustomer: syncedSelectedCustomer,
            categories: Array.isArray(categories) ? categories : get().categories,
            menuItems: Array.isArray(menuItems) ? menuItems : get().menuItems,
            tables: Array.isArray(tables) ? tables : get().tables,
            orders: Array.isArray(orders) ? orders : get().orders,
            inventory: incomingInventory,
            suppliers: Array.isArray(suppliers) ? suppliers : get().suppliers,
            cashDrawer: cashDrawer && !cashDrawer.error ? cashDrawer : get().cashDrawer,
            cashDrawerExpenses: Array.isArray(cashDrawerExpenses) ? cashDrawerExpenses : get().cashDrawerExpenses,
            cashDrawerReports: Array.isArray(cashDrawerReports) ? cashDrawerReports : get().cashDrawerReports,
            stockAdjustments: mergedAdjustments,
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
        const serviceChargeBase = state.cart.reduce((sum, item) => {
          if (!item.serviceChargeApplicable || !state.selectedTable) return sum
          const itemTotal = item.price * item.quantity
          const modifiersTotal = item.modifiers.reduce((m, mod) => m + mod.price, 0) * item.quantity
          return sum + itemTotal + modifiersTotal
        }, 0)
        const tax = serviceChargeBase * (state.settings.taxRate / 100)
        return { subtotal, tax, total: subtotal + tax }
      },
      getLowStockItems: () => {
        return get().inventory.filter((item) => item.quantity <= item.minQuantity)
      },
      getCashDrawerBalance: () => {
        const state = get()
        const openedAt = state.cashDrawer?.openedAt ? new Date(state.cashDrawer.openedAt) : null
        const openingBalance = state.cashDrawer?.openingBalance ?? 0
        const cashSales = state.orders
          .filter(
            (o) =>
              o.paymentStatus === 'paid' &&
              o.paymentMethod === 'cash' &&
              (!openedAt || new Date(o.createdAt) >= openedAt)
          )
          .reduce((sum, o) => sum + o.total, 0)
        const cashRefunds = state.orders
          .filter(
            (o) =>
              o.paymentStatus === 'refunded' &&
              o.paymentMethod === 'cash' &&
              (!openedAt || new Date(o.updatedAt) >= openedAt)
          )
          .reduce((sum, o) => sum + o.total, 0)
        const cashOuts = state.cashDrawerExpenses
          .filter((expense) => !openedAt || new Date(expense.createdAt) >= openedAt)
          .reduce((sum, expense) => sum + expense.amount, 0)
        return {
          openingBalance,
          cashSales,
          cashRefunds,
          currentBalance: openingBalance + cashSales - cashRefunds - cashOuts,
        }
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
        customers: state.customers,
        categories: state.categories,
        menuItems: state.menuItems,
        orders: state.orders,
        orderNumber: state.orderNumber,
        tables: state.tables,
        inventory: state.inventory,
        suppliers: state.suppliers,
        cashDrawer: state.cashDrawer,
        cashDrawerExpenses: state.cashDrawerExpenses,
        cashDrawerReports: state.cashDrawerReports,
        stockAdjustments: state.stockAdjustments,
        settings: state.settings,
      }),
    }
  )
)
