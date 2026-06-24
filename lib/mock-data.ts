import type { User, Category, MenuItem, Table, InventoryItem, Order, Settings, Supplier } from './types'

export const mockUsers: User[] = [
  { id: '1', name: 'Admin User', pin: '1234', role: 'admin' },
  { id: '2', name: 'Sarah (Cashier)', pin: '2222', role: 'cashier' },
  { id: '3', name: 'Mike (Kitchen)', pin: '3333', role: 'kitchen' },
  { id: '4', name: 'Emma (Cashier)', pin: '4444', role: 'cashier' },
]

export const mockCategories: Category[] = [
  { id: 'cat-1', name: 'Mains', order: 1, icon: 'utensils' },
  { id: 'cat-2', name: 'Burgers', order: 2, icon: 'hamburger' },
  { id: 'cat-3', name: 'Sides', order: 3, icon: 'sides' },
  { id: 'cat-4', name: 'Drinks', order: 4, icon: 'coffee' },
  { id: 'cat-5', name: 'Desserts', order: 5, icon: 'cake' },
]

export const mockMenuItems: MenuItem[] = [
  // Mains
  {
    id: 'item-1',
    name: 'Grilled Chicken',
    price: 18.99,
    categoryId: 'cat-1',
    description: 'Herb-marinated grilled chicken with seasonal vegetables',
    isAvailable: true,
    modifierGroups: [
      {
        id: 'mg-1',
        name: 'Side Choice',
        required: true,
        maxSelections: 1,
        modifiers: [
          { id: 'mod-1', name: 'Fries', price: 0 },
          { id: 'mod-2', name: 'Mashed Potatoes', price: 0 },
          { id: 'mod-3', name: 'Garden Salad', price: 0 },
          { id: 'mod-4', name: 'Sweet Potato Fries', price: 2.00 },
        ]
      }
    ]
  },
  {
    id: 'item-2',
    name: 'Salmon Fillet',
    price: 24.99,
    categoryId: 'cat-1',
    description: 'Pan-seared Atlantic salmon with lemon butter sauce',
    isAvailable: true,
    modifierGroups: [
      {
        id: 'mg-2',
        name: 'Cooking Preference',
        required: false,
        maxSelections: 1,
        modifiers: [
          { id: 'mod-5', name: 'Medium', price: 0 },
          { id: 'mod-6', name: 'Well Done', price: 0 },
        ]
      }
    ]
  },
  {
    id: 'item-3',
    name: 'Steak (8oz)',
    price: 28.99,
    categoryId: 'cat-1',
    description: 'Premium ribeye steak cooked to perfection',
    isAvailable: true,
    modifierGroups: [
      {
        id: 'mg-3',
        name: 'Cooking Level',
        required: true,
        maxSelections: 1,
        modifiers: [
          { id: 'mod-7', name: 'Rare', price: 0 },
          { id: 'mod-8', name: 'Medium Rare', price: 0 },
          { id: 'mod-9', name: 'Medium', price: 0 },
          { id: 'mod-10', name: 'Well Done', price: 0 },
        ]
      },
      {
        id: 'mg-4',
        name: 'Extra Toppings',
        required: false,
        maxSelections: 3,
        modifiers: [
          { id: 'mod-11', name: 'Mushroom Sauce', price: 3.00 },
          { id: 'mod-12', name: 'Pepper Sauce', price: 3.00 },
          { id: 'mod-13', name: 'Garlic Butter', price: 2.00 },
        ]
      }
    ]
  },
  {
    id: 'item-4',
    name: 'Pasta Carbonara',
    price: 16.99,
    categoryId: 'cat-1',
    description: 'Creamy bacon pasta with parmesan',
    isAvailable: true,
  },
  // Burgers
  {
    id: 'item-5',
    name: 'Classic Burger',
    price: 14.99,
    categoryId: 'cat-2',
    description: 'Beef patty with lettuce, tomato, and special sauce',
    isAvailable: true,
    modifierGroups: [
      {
        id: 'mg-5',
        name: 'Add Extra',
        required: false,
        maxSelections: 5,
        modifiers: [
          { id: 'mod-14', name: 'Extra Patty', price: 5.00 },
          { id: 'mod-15', name: 'Bacon', price: 2.50 },
          { id: 'mod-16', name: 'Cheese', price: 1.50 },
          { id: 'mod-17', name: 'Avocado', price: 2.00 },
          { id: 'mod-18', name: 'Fried Egg', price: 1.50 },
        ]
      }
    ]
  },
  {
    id: 'item-6',
    name: 'Chicken Burger',
    price: 13.99,
    categoryId: 'cat-2',
    description: 'Crispy chicken fillet with mayo and lettuce',
    isAvailable: true,
  },
  {
    id: 'item-7',
    name: 'Veggie Burger',
    price: 12.99,
    categoryId: 'cat-2',
    description: 'Plant-based patty with fresh vegetables',
    isAvailable: true,
  },
  {
    id: 'item-8',
    name: 'BBQ Bacon Burger',
    price: 16.99,
    categoryId: 'cat-2',
    description: 'Beef patty with BBQ sauce, bacon, and onion rings',
    isAvailable: false,
  },
  // Sides
  {
    id: 'item-9',
    name: 'French Fries',
    price: 4.99,
    categoryId: 'cat-3',
    description: 'Crispy golden fries',
    isAvailable: true,
    modifierGroups: [
      {
        id: 'mg-6',
        name: 'Size',
        required: false,
        maxSelections: 1,
        modifiers: [
          { id: 'mod-19', name: 'Large', price: 2.00 },
        ]
      }
    ]
  },
  {
    id: 'item-10',
    name: 'Onion Rings',
    price: 5.99,
    categoryId: 'cat-3',
    description: 'Crispy battered onion rings',
    isAvailable: true,
  },
  {
    id: 'item-11',
    name: 'Garden Salad',
    price: 6.99,
    categoryId: 'cat-3',
    description: 'Fresh mixed greens with house dressing',
    isAvailable: true,
  },
  {
    id: 'item-12',
    name: 'Coleslaw',
    price: 3.99,
    categoryId: 'cat-3',
    description: 'Creamy house-made coleslaw',
    isAvailable: true,
  },
  // Drinks
  {
    id: 'item-13',
    name: 'Soft Drink',
    price: 2.99,
    categoryId: 'cat-4',
    description: 'Coca-Cola, Sprite, or Fanta',
    isAvailable: true,
    modifierGroups: [
      {
        id: 'mg-7',
        name: 'Choice',
        required: true,
        maxSelections: 1,
        modifiers: [
          { id: 'mod-20', name: 'Coca-Cola', price: 0 },
          { id: 'mod-21', name: 'Sprite', price: 0 },
          { id: 'mod-22', name: 'Fanta', price: 0 },
          { id: 'mod-23', name: 'Diet Coke', price: 0 },
        ]
      }
    ]
  },
  {
    id: 'item-14',
    name: 'Fresh Juice',
    price: 4.99,
    categoryId: 'cat-4',
    description: 'Orange, Apple, or Mixed Berry',
    isAvailable: true,
  },
  {
    id: 'item-15',
    name: 'Coffee',
    price: 3.99,
    categoryId: 'cat-4',
    description: 'Freshly brewed coffee',
    isAvailable: true,
    modifierGroups: [
      {
        id: 'mg-8',
        name: 'Milk',
        required: false,
        maxSelections: 1,
        modifiers: [
          { id: 'mod-24', name: 'Oat Milk', price: 0.50 },
          { id: 'mod-25', name: 'Almond Milk', price: 0.50 },
          { id: 'mod-26', name: 'Soy Milk', price: 0.50 },
        ]
      }
    ]
  },
  {
    id: 'item-16',
    name: 'Milkshake',
    price: 5.99,
    categoryId: 'cat-4',
    description: 'Chocolate, Vanilla, or Strawberry',
    isAvailable: true,
  },
  // Desserts
  {
    id: 'item-17',
    name: 'Chocolate Cake',
    price: 7.99,
    categoryId: 'cat-5',
    description: 'Rich chocolate layer cake',
    isAvailable: true,
    modifierGroups: [
      {
        id: 'mg-9',
        name: 'Add-ons',
        required: false,
        maxSelections: 2,
        modifiers: [
          { id: 'mod-27', name: 'Ice Cream', price: 2.00 },
          { id: 'mod-28', name: 'Whipped Cream', price: 1.00 },
        ]
      }
    ]
  },
  {
    id: 'item-18',
    name: 'Cheesecake',
    price: 8.99,
    categoryId: 'cat-5',
    description: 'New York style cheesecake',
    isAvailable: true,
  },
  {
    id: 'item-19',
    name: 'Ice Cream',
    price: 4.99,
    categoryId: 'cat-5',
    description: '2 scoops of your choice',
    isAvailable: true,
  },
  {
    id: 'item-20',
    name: 'Apple Pie',
    price: 6.99,
    categoryId: 'cat-5',
    description: 'Warm apple pie with cinnamon',
    isAvailable: true,
  },
]

export const mockTables: Table[] = [
  { id: 'table-1', number: 1, name: 'Table 1', seats: 2, status: 'available' },
  { id: 'table-2', number: 2, name: 'Table 2', seats: 2, status: 'available' },
  { id: 'table-3', number: 3, name: 'Table 3', seats: 4, status: 'available' },
  { id: 'table-4', number: 4, name: 'Table 4', seats: 4, status: 'available' },
  { id: 'table-5', number: 5, name: 'Table 5', seats: 6, status: 'available' },
  { id: 'table-6', number: 6, name: 'Table 6', seats: 6, status: 'available' },
  { id: 'table-7', number: 7, name: 'Table 7', seats: 8, status: 'available' },
  { id: 'table-8', number: 8, name: 'Table 8', seats: 8, status: 'available' },
  { id: 'table-9', number: 9, name: 'Bar 1', seats: 1, status: 'available' },
  { id: 'table-10', number: 10, name: 'Bar 2', seats: 1, status: 'available' },
]

export const mockSuppliers: Supplier[] = [
  { id: 'sup-1', name: 'Fresh Foods Co.', contact: 'John Smith', email: 'john@freshfoods.com', phone: '555-0101' },
  { id: 'sup-2', name: 'Beverage World', contact: 'Jane Doe', email: 'jane@beverageworld.com', phone: '555-0102' },
  { id: 'sup-3', name: 'Premium Meats', contact: 'Bob Wilson', email: 'bob@premiummeats.com', phone: '555-0103' },
]

export const mockInventory: InventoryItem[] = [
  { id: 'inv-1', name: 'Chicken Breast', sku: 'MEAT-001', quantity: 50, unit: 'kg', minQuantity: 10, costPrice: 8.50, supplierId: 'sup-3', category: 'Meat' },
  { id: 'inv-2', name: 'Beef Patties', sku: 'MEAT-002', quantity: 100, unit: 'pcs', minQuantity: 20, costPrice: 3.00, supplierId: 'sup-3', category: 'Meat' },
  { id: 'inv-3', name: 'Salmon Fillet', sku: 'FISH-001', quantity: 25, unit: 'kg', minQuantity: 5, costPrice: 18.00, supplierId: 'sup-1', category: 'Seafood' },
  { id: 'inv-4', name: 'Burger Buns', sku: 'BREAD-001', quantity: 80, unit: 'pcs', minQuantity: 30, costPrice: 0.50, supplierId: 'sup-1', category: 'Bakery' },
  { id: 'inv-5', name: 'Lettuce', sku: 'VEG-001', quantity: 15, unit: 'heads', minQuantity: 10, costPrice: 1.50, supplierId: 'sup-1', category: 'Vegetables' },
  { id: 'inv-6', name: 'Tomatoes', sku: 'VEG-002', quantity: 8, unit: 'kg', minQuantity: 5, costPrice: 2.50, supplierId: 'sup-1', category: 'Vegetables' },
  { id: 'inv-7', name: 'Potatoes', sku: 'VEG-003', quantity: 40, unit: 'kg', minQuantity: 15, costPrice: 1.20, supplierId: 'sup-1', category: 'Vegetables' },
  { id: 'inv-8', name: 'Coca-Cola', sku: 'BEV-001', quantity: 48, unit: 'cans', minQuantity: 24, costPrice: 0.80, supplierId: 'sup-2', category: 'Beverages' },
  { id: 'inv-9', name: 'Coffee Beans', sku: 'BEV-002', quantity: 5, unit: 'kg', minQuantity: 3, costPrice: 25.00, supplierId: 'sup-2', category: 'Beverages' },
  { id: 'inv-10', name: 'Cooking Oil', sku: 'MISC-001', quantity: 10, unit: 'L', minQuantity: 5, costPrice: 4.00, supplierId: 'sup-1', category: 'Supplies' },
  { id: 'inv-11', name: 'Cheese Slices', sku: 'DAIRY-001', quantity: 3, unit: 'packs', minQuantity: 5, costPrice: 8.00, supplierId: 'sup-1', category: 'Dairy' },
  { id: 'inv-12', name: 'Ice Cream (Vanilla)', sku: 'DAIRY-002', quantity: 8, unit: 'L', minQuantity: 4, costPrice: 12.00, supplierId: 'sup-1', category: 'Dairy' },
]

export const mockOrders: Order[] = [
  {
    id: 'order-1',
    orderNumber: 101,
    tableId: 'table-3',
    tableName: 'Table 3',
    items: [
      { id: 'oi-1', menuItemId: 'item-5', name: 'Classic Burger', quantity: 2, price: 14.99, modifiers: [{ id: 'mod-15', name: 'Bacon', price: 2.50 }] },
      { id: 'oi-2', menuItemId: 'item-9', name: 'French Fries', quantity: 2, price: 4.99, modifiers: [] },
      { id: 'oi-3', menuItemId: 'item-13', name: 'Soft Drink', quantity: 2, price: 2.99, modifiers: [{ id: 'mod-20', name: 'Coca-Cola', price: 0 }] },
    ],
    subtotal: 47.94,
    tax: 4.79,
    total: 52.73,
    status: 'preparing',
    paymentStatus: 'pending',
    createdAt: new Date(Date.now() - 15 * 60000).toISOString(),
    updatedAt: new Date(Date.now() - 10 * 60000).toISOString(),
    createdBy: '2',
  },
  {
    id: 'order-2',
    orderNumber: 102,
    tableId: 'table-5',
    tableName: 'Table 5',
    items: [
      { id: 'oi-4', menuItemId: 'item-3', name: 'Steak (8oz)', quantity: 1, price: 28.99, modifiers: [{ id: 'mod-8', name: 'Medium Rare', price: 0 }, { id: 'mod-11', name: 'Mushroom Sauce', price: 3.00 }], notes: 'No onions please' },
      { id: 'oi-5', menuItemId: 'item-2', name: 'Salmon Fillet', quantity: 1, price: 24.99, modifiers: [] },
      { id: 'oi-6', menuItemId: 'item-11', name: 'Garden Salad', quantity: 1, price: 6.99, modifiers: [] },
    ],
    subtotal: 63.97,
    tax: 6.40,
    total: 70.37,
    status: 'pending',
    paymentStatus: 'pending',
    createdAt: new Date(Date.now() - 5 * 60000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 60000).toISOString(),
    createdBy: '2',
    isPriority: true,
  },
]

export const mockSettings: Settings = {
  restaurantName: 'The Good Fork',
  address: '123 Main Street, Downtown',
  phone: '(555) 123-4567',
  taxRate: 10,
  currency: 'USD',
  currencySymbol: '$',
  receiptFooter: 'Thank you for dining with us!',
  logo: '',
}

export const mockProductRecipes = [
  { id: 'recipe-1', productId: 'item-5', ingredientId: 'inv-2', quantity: 1 },
  { id: 'recipe-2', productId: 'item-5', ingredientId: 'inv-4', quantity: 1 },
  { id: 'recipe-3', productId: 'item-5', ingredientId: 'inv-5', quantity: 0.05 },
  { id: 'recipe-4', productId: 'item-5', ingredientId: 'inv-6', quantity: 0.05 },
  { id: 'recipe-5', productId: 'item-2', ingredientId: 'inv-3', quantity: 0.25 },
  { id: 'recipe-6', productId: 'item-1', ingredientId: 'inv-1', quantity: 0.2 },
  { id: 'recipe-7', productId: 'item-9', ingredientId: 'inv-7', quantity: 0.15 },
  { id: 'recipe-8', productId: 'item-13', ingredientId: 'inv-8', quantity: 1 },
  { id: 'recipe-9', productId: 'item-15', ingredientId: 'inv-9', quantity: 0.015 },
]
