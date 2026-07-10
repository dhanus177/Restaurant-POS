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
  applyServiceCharge?: boolean
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
  serviceChargeApplicable?: boolean
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
  inventoryItemCount?: number
  totalPurchases?: number
  totalPayments?: number
  balanceDue?: number
  aging0to30?: number
  aging31to60?: number
  aging61to90?: number
  aging90plus?: number
  overdueAmount?: number
}

export type SupplierLedgerEntryType = 'purchase' | 'payment' | 'grn' | 'return'

export interface SupplierLedgerEntry {
  id: string
  supplierId: string
  type: SupplierLedgerEntryType
  reference?: string | null
  inventoryItemId?: string | null
  quantity?: number | null
  amount: number
  notes?: string | null
  createdAt: string
}

export interface CashDrawer {
  id: string
  openingBalance: number
  notes?: string | null
  openedAt?: string
  updatedAt?: string
}

export interface CashDrawerExpense {
  id: string
  drawerId: string
  amount: number
  reason: string
  createdAt: string
  createdBy: string
}

export interface CashDrawerReport {
  id: string
  openingBalance: number
  expectedBalance: number
  countedCash: number
  variance: number
  notes?: string | null
  closedAt: string
  closedBy: string
}

export interface Shift {
  id: string
  openedAt: string
  openedBy: string
  openingFloat: number
  status: 'open' | 'closed' | string
  notes?: string | null
  closedAt?: string | null
  closedBy?: string | null
  expectedCash?: number | null
  countedCash?: number | null
  variance?: number | null
  denominations?: Record<string, number> | null
  createdAt: string
  updatedAt: string
}

export interface BackupSchedule {
  id: string
  enabled: boolean
  frequencyHours: number
  retentionCount: number
  verifyChecksum: boolean
  lastRunAt?: string | null
  nextRunAt?: string | null
  updatedAt: string
}

export interface BackupSnapshot {
  id: string
  trigger: string
  checksum: string
  verified: boolean
  sizeBytes: number
  exportedAt: string
  createdBy?: string | null
  createdAt: string
}

export interface AuditLog {
  id: string
  action: string
  resource: string
  resourceId?: string | null
  details?: unknown
  actorId?: string | null
  actorName?: string | null
  actorRole?: string | null
  ipAddress?: string | null
  createdAt: string
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
  requireCustomerBeforeOrder?: boolean
  takeawayPageEnabled?: boolean
  kitchenPageEnabled?: boolean
  whatsappReportsEnabled?: boolean
  whatsappRecipient?: string
  whatsappBreakfastTime?: string
  whatsappLunchTime?: string
  whatsappDinnerTime?: string
}
