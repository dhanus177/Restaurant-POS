'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { apiFetch } from '@/lib/api'
import { normalizeRoleId } from '@/lib/roles'

// Fire-and-forget API sync – keeps optimistic UI fast
async function dbSync(method: string, url: string, body?: unknown) {
  try {
    const response = await apiFetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`)
    }
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

const DEFAULT_SETTINGS: Settings = {
  restaurantName: 'Restaurant POS',
  address: '',
  phone: '',
  taxRate: 0,
  currency: 'LKR',
  currencySymbol: 'Rs',
  receiptFooter: 'Thank you for dining with us!',
  logo: '',
  requireCustomerBeforeOrder: false,
  takeawayPageEnabled: true,
  kitchenPageEnabled: true,
  whatsappReportsEnabled: false,
  whatsappRecipient: '',
  whatsappBreakfastTime: '11:00',
  whatsappLunchTime: '16:00',
  whatsappDinnerTime: '22:00',
  customRoles: [],
  waiterVisibleCategoryIds: [],
  supplierStatementPrinterName: undefined,
}

interface CartItem extends OrderItem {
  tableId?: string
  kitchenSentAt?: string | null
  benMarieSentAt?: string | null
}

function normalizeInventoryForApi(item: InventoryItem) {
  const normalizedSupplierId = item.supplierId && item.supplierId.trim().length > 0
    ? item.supplierId
    : undefined

  return {
    id: item.id,
    name: item.name,
    sku: item.sku,
    quantity: item.quantity,
    storageQuantity: item.storageQuantity ?? 0,
    unit: item.unit,
    minQuantity: item.minQuantity,
    costPrice: item.costPrice,
    supplierId: normalizedSupplierId,
    lastRestocked: item.lastRestocked,
    category: item.category,
  }
}

function normalizeInventoryPatchForApi(item: Partial<InventoryItem>) {
  const normalizedSupplierId = item.supplierId === undefined
    ? undefined
    : item.supplierId && item.supplierId.trim().length > 0
      ? item.supplierId
      : null

  const patch: Partial<InventoryItem> = {
    name: item.name,
    sku: item.sku,
    quantity: item.quantity,
    storageQuantity: item.storageQuantity,
    unit: item.unit,
    minQuantity: item.minQuantity,
    costPrice: item.costPrice,
    supplierId: normalizedSupplierId as InventoryItem['supplierId'],
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
  addUser: (user: User) => Promise<string | null>
  updateUser: (id: string, user: Partial<User>) => Promise<string | null>
  deleteUser: (id: string) => Promise<string | null>
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
  addMenuItem: (item: MenuItem) => Promise<string | null>
  updateMenuItem: (id: string, item: Partial<MenuItem>) => Promise<string | null>
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
  markCartItemsSentForStation: (itemIds: string[], station: 'kitchen' | 'ben-marie', sentAt: string) => void
  clearCart: (options?: { keepTable?: boolean; keepCustomer?: boolean; keepCustomerCount?: boolean }) => void
  setSelectedTable: (table: Table | null) => void
  setCurrentCustomerCount: (count: number) => void

  // Orders
  orders: Order[]
  orderNumber: number
  addOrder: (order: Order) => void
  updateOrder: (id: string, order: Partial<Order>) => void
  updateOrderStatus: (id: string, status: OrderStatus) => void
  updateOrderPayment: (id: string, paymentMethod: Order['paymentMethod'], paymentStatus: Order['paymentStatus'], paymentCollectedBy?: string) => void
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
      users: [],
      customers: [],
      selectedCustomer: null,
      setCurrentUser: (user) => set({ currentUser: user }),
      addUser: async (user) => {
        try {
          const response = await apiFetch('/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(user),
          })

          if (!response.ok) {
            const data = await response.json().catch(() => null)
            return data?.error ?? 'Failed to add user'
          }

          const created = (await response.json()) as User
          set((state) => ({
            users: [...state.users.filter((existing) => existing.id !== created.id), created],
          }))
          return null
        } catch (error) {
          console.error('[addUser error]', error)
          return 'Failed to add user'
        }
      },
      updateUser: async (id, userData) => {
        try {
          const response = await apiFetch(`/api/users/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData),
          })

          if (!response.ok) {
            const data = await response.json().catch(() => null)
            return data?.error ?? 'Failed to update user'
          }

          const updated = (await response.json()) as User
          set((state) => ({
            users: state.users.map((existing) => (existing.id === id ? updated : existing)),
          }))
          return null
        } catch (error) {
          console.error('[updateUser error]', error)
          return 'Failed to update user'
        }
      },
      deleteUser: async (id) => {
        try {
          const response = await apiFetch(`/api/users/${id}`, {
            method: 'DELETE',
          })

          if (!response.ok) {
            const data = await response.json().catch(() => null)
            return data?.error ?? 'Failed to delete user'
          }

          set((state) => ({ users: state.users.filter((existing) => existing.id !== id) }))
          return null
        } catch (error) {
          console.error('[deleteUser error]', error)
          return 'Failed to delete user'
        }
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

          set({ currentUser: { ...data.user, role: normalizeRoleId(data.user.role) } })
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
          set({ currentUser: user ? { ...user, role: normalizeRoleId(user.role) } : null })
          return user
        } catch (error) {
          console.error('[refreshCurrentUser error]', error)
          set({ currentUser: null })
          return null
        }
      },

      // Menu
      categories: [],
      menuItems: [],
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
      addMenuItem: async (item) => {
        try {
          const response = await apiFetch('/api/menu-items', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item),
          })

          if (!response.ok) {
            const data = await response.json().catch(() => null)
            return data?.error ?? 'Failed to add menu item'
          }

          const created = (await response.json()) as MenuItem
          set((state) => ({ menuItems: [...state.menuItems.filter((existing) => existing.id !== created.id), created] }))
          return null
        } catch (error) {
          console.error('[addMenuItem error]', error)
          return 'Failed to add menu item'
        }
      },
      updateMenuItem: async (id, itemData) => {
        try {
          const response = await apiFetch(`/api/menu-items/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(itemData),
          })

          if (!response.ok) {
            const data = await response.json().catch(() => null)
            return data?.error ?? 'Failed to update menu item'
          }

          const updated = (await response.json()) as MenuItem
          set((state) => ({ menuItems: state.menuItems.map((i) => (i.id === id ? updated : i)) }))
          return null
        } catch (error) {
          console.error('[updateMenuItem error]', error)
          return 'Failed to update menu item'
        }
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
              i.tableId === item.tableId &&
              i.menuItemId === item.menuItemId &&
              i.chairNumber === item.chairNumber &&
              JSON.stringify(i.modifiers) === JSON.stringify(item.modifiers)
          )
          if (existingIndex >= 0) {
            const newCart = [...state.cart]
            newCart[existingIndex].quantity += item.quantity
            newCart[existingIndex].kitchenSentAt = null
            newCart[existingIndex].benMarieSentAt = null
            return { cart: newCart }
          }
          return { cart: [...state.cart, { ...item, kitchenSentAt: null, benMarieSentAt: null }] }
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
                  i.id === itemId ? { ...i, quantity, kitchenSentAt: null, benMarieSentAt: null } : i
                ),
        })),
      updateCartItemNotes: (itemId, notes) =>
        set((state) => ({
          cart: state.cart.map((i) =>
            i.id === itemId ? { ...i, notes, kitchenSentAt: null, benMarieSentAt: null } : i
          ),
        })),
      markCartItemsSentForStation: (itemIds, station, sentAt) =>
        set((state) => ({
          cart: state.cart.map((item) => {
            if (!itemIds.includes(item.id)) return item
            if (station === 'kitchen') {
              return { ...item, kitchenSentAt: sentAt }
            }
            return { ...item, benMarieSentAt: sentAt }
          }),
        })),
      clearCart: (options: { keepTable?: boolean; keepCustomer?: boolean; keepCustomerCount?: boolean } = {}) => set((state) => ({
        cart: [],
        selectedTable: options?.keepTable ? state.selectedTable : null,
        selectedCustomer: options?.keepCustomer ? state.selectedCustomer : null,
        currentCustomerCount: options?.keepCustomerCount ? state.currentCustomerCount : 1,
      })),
      setSelectedTable: (table) => set({ selectedTable: table }),
      setCurrentCustomerCount: (count) => set({ currentCustomerCount: Math.max(1, count) }),

      // Orders
      orders: [],
      orderNumber: 1,
      addOrder: (order) => {
        set((state) => ({ orders: [...state.orders, order], orderNumber: state.orderNumber + 1 }))
        dbSync('POST', '/api/orders', order)
      },
      updateOrder: (id, orderData) => {
        set((state) => ({ orders: state.orders.map((o) => (o.id === id ? { ...o, ...orderData, updatedAt: new Date().toISOString() } : o)) }))
        dbSync('PATCH', `/api/orders/${id}`, orderData)
      },
      updateOrderStatus: (id, status) => {
        set((state) => ({ orders: state.orders.map((o) => (o.id === id ? { ...o, status, updatedAt: new Date().toISOString() } : o)) }))
        dbSync('PATCH', `/api/orders/${id}`, { status })
      },
      updateOrderPayment: (id, paymentMethod, paymentStatus, paymentCollectedBy) => {
        set((state) => ({ orders: state.orders.map((o) => (o.id === id ? { ...o, paymentMethod, paymentStatus, paymentCollectedBy, updatedAt: new Date().toISOString() } : o)) }))
        dbSync('PATCH', `/api/orders/${id}`, { paymentMethod, paymentStatus, paymentCollectedBy })
      },
      getNextOrderNumber: () => get().orderNumber,
      toggleOrderPriority: (id) => {
        const order = get().orders.find((o) => o.id === id)
        if (!order) return
        set((state) => ({ orders: state.orders.map((o) => (o.id === id ? { ...o, isPriority: !o.isPriority } : o)) }))
        dbSync('PATCH', `/api/orders/${id}`, { isPriority: !order.isPriority })
      },

      // Tables
      tables: [],
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
      inventory: [],
      suppliers: [],
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

        const updatedItem = get().inventory.find((entry) => entry.id === adjustment.inventoryItemId)
        if (updatedItem) {
          dbSync('PATCH', `/api/inventory/${adjustment.inventoryItemId}`, normalizeInventoryPatchForApi({
            quantity: updatedItem.quantity,
            storageQuantity: updatedItem.storageQuantity ?? 0,
            lastRestocked: updatedItem.lastRestocked,
          }))
        }

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
      settings: DEFAULT_SETTINGS,
      updateSettings: (settingsData) => {
        set((state) => ({ settings: { ...state.settings, ...settingsData } }))
        dbSync('PATCH', '/api/settings', settingsData)
      },

      // DB sync
      loadFromDB: async () => {
        try {
          const currentUser = await get().refreshCurrentUser()

          if (!currentUser) {
            const settings = await apiFetch('/api/settings').then((r) => (r.ok ? r.json() : Promise.resolve(null)))
            if (settings && !settings.error) {
              set({ settings: { ...DEFAULT_SETTINGS, ...settings } })
            }
            return
          }

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
          const inventoryRows = Array.isArray(inventory)
            ? inventory
            : Array.isArray((inventory as any)?.items)
              ? (inventory as any).items
              : Array.isArray((inventory as any)?.data)
                ? (inventory as any).data
                : []

          const incomingInventory: InventoryItem[] = inventoryRows.length > 0
            ? inventoryRows
                .map((row: any) => {
                  const id = row?.id
                  const name = row?.name
                  const sku = row?.sku
                  if (!id || !name || !sku) return null

                  const existing = currentInventory.find((i) => i.id === id)
                  return {
                    id: String(id),
                    name: String(name),
                    sku: String(sku),
                    quantity: Number(row?.quantity ?? 0),
                    storageQuantity: Number(row?.storageQuantity ?? row?.storage_quantity ?? existing?.storageQuantity ?? 0),
                    unit: String(row?.unit ?? existing?.unit ?? 'pcs'),
                    minQuantity: Number(row?.minQuantity ?? row?.min_quantity ?? existing?.minQuantity ?? 0),
                    costPrice: Number(row?.costPrice ?? row?.cost_price ?? existing?.costPrice ?? 0),
                    supplierId: row?.supplierId ?? row?.supplier_id ?? existing?.supplierId,
                    lastRestocked: row?.lastRestocked ?? row?.last_restocked ?? existing?.lastRestocked,
                    category: String(row?.category ?? existing?.category ?? 'General'),
                  } satisfies InventoryItem
                })
                .filter((item: InventoryItem | null): item is InventoryItem => Boolean(item))
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
          const incomingOrders: Order[] = Array.isArray(orders) ? orders : get().orders
          const nextOrderNumber = incomingOrders.length
            ? Math.max(...incomingOrders.map((order) => order.orderNumber)) + 1
            : 1
          const currentSelectedCustomerId = get().selectedCustomer?.id
          const syncedSelectedCustomer = currentSelectedCustomerId
            ? incomingCustomers.find((customer) => customer.id === currentSelectedCustomerId) ?? null
            : null

          set({
            users: Array.isArray(users)
              ? users.map((user: User) => ({ ...user, role: normalizeRoleId(user.role) }))
              : get().users,
            customers: incomingCustomers,
            selectedCustomer: syncedSelectedCustomer,
            categories: Array.isArray(categories) ? categories : get().categories,
            menuItems: Array.isArray(menuItems) ? menuItems : get().menuItems,
            tables: Array.isArray(tables) ? tables : get().tables,
            orders: incomingOrders,
            orderNumber: nextOrderNumber,
            inventory: incomingInventory,
            suppliers: Array.isArray(suppliers) ? suppliers : get().suppliers,
            cashDrawer: cashDrawer && !cashDrawer.error ? cashDrawer : get().cashDrawer,
            cashDrawerExpenses: Array.isArray(cashDrawerExpenses) ? cashDrawerExpenses : get().cashDrawerExpenses,
            cashDrawerReports: Array.isArray(cashDrawerReports) ? cashDrawerReports : get().cashDrawerReports,
            stockAdjustments: mergedAdjustments,
            settings: settings && !settings.error ? { ...DEFAULT_SETTINGS, ...settings } : DEFAULT_SETTINGS,
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
      version: 2,
      migrate: (persistedState) => {
        const state = (persistedState ?? {}) as Partial<POSStore>
        return {
          ...state,
          users: [],
          customers: [],
          categories: [],
          menuItems: [],
          orders: [],
          orderNumber: 1,
          tables: [],
          inventory: [],
          suppliers: [],
          cashDrawer: null,
          cashDrawerExpenses: [],
          cashDrawerReports: [],
          stockAdjustments: [],
          settings: DEFAULT_SETTINGS,
        }
      },
      partialize: (state) => ({
        users: state.users,
        customers: state.customers,
        selectedCustomer: state.selectedCustomer,
        categories: state.categories,
        menuItems: state.menuItems,
        cart: state.cart,
        selectedTable: state.selectedTable,
        currentCustomerCount: state.currentCustomerCount,
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
