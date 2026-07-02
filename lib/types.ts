// User & Roles
export type Role = 'super-admin' | 'admin' | 'cashier' | 'kitchen' | 'pay-counter' | 'takeaway'

export interface User {
  id: string
  name: string
  pin: string
  role: Role
}

export interface Customer {
  id: string
  name: string
  phone?: string
  email?: string
  notes?: string
  loyaltyPoints?: number
  lifetimeSpent?: number
  orderCount?: number
  lastOrderAt?: string
  recentOrders?: Array<{
    id: string
    orderNumber: number
    total: number
    paymentStatus: PaymentStatus
    status: OrderStatus
    createdAt: string
  }>
  createdAt?: string
  updatedAt?: string
}

// Menu
export interface Category {
  id: string
  name: string
  order: number
  icon?: string
}

export interface Modifier {
  id: string
  name: string
  price: number
}

export interface ModifierGroup {
  id: string
  name: string
  required: boolean
  maxSelections: number
  modifiers: Modifier[]
}

export interface MenuItem {
  id: string
  name: string
  price: number
  categoryId: string
  description?: string
  image?: string
  modifierGroups?: ModifierGroup[]
  isAvailable: boolean
}

// Orders
export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled'
export type PaymentMethod = 'cash' | 'card' | 'split'
export type PaymentStatus = 'pending' | 'paid' | 'refunded'

export interface SelectedModifier {
  id: string
  name: string
  price: number
}

export interface OrderItem {
  id: string
  menuItemId: string
  name: string
  quantity: number
  price: number
  modifiers: SelectedModifier[]
  notes?: string
}

export interface Order {
  id: string
  orderNumber: number
  tableId?: string
  tableName?: string
  customerId?: string
  customerName?: string
  customerPhone?: string
  items: OrderItem[]
  subtotal: number
  tax: number
  total: number
  status: OrderStatus
  paymentMethod?: PaymentMethod
  paymentStatus: PaymentStatus
  createdAt: string
  updatedAt: string
  createdBy: string
  isPriority?: boolean
}

// Tables
export type TableStatus = 'available' | 'occupied' | 'reserved'

export interface Table {
  id: string
  number: number
  name: string
  seats: number
  status: TableStatus
  currentOrderId?: string
}

// Inventory
export interface Supplier {
  id: string
  name: string
  contact: string
  email: string
  phone: string
}

export interface InventoryItem {
  id: string
  name: string
  sku: string
  quantity: number // Daily operational stock (kitchen/front)
  storageQuantity?: number // External storage stock
  unit: string
  minQuantity: number
  costPrice: number
  supplierId?: string
  lastRestocked?: string
  category: string
}

export interface StockAdjustment {
  id: string
  inventoryItemId: string
  type: 'add' | 'remove' | 'waste' | 'transfer'
  location?: 'inventory' | 'storage'
  fromLocation?: 'inventory' | 'storage'
  toLocation?: 'inventory' | 'storage'
  quantity: number
  reason: string
  createdAt: string
  createdBy: string
}

// Settings
export interface Settings {
  restaurantName: string
  address: string
  phone: string
  taxRate: number
  currency: string
  currencySymbol: string
  receiptFooter: string
  logo?: string
}
