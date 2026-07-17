'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  LayoutDashboard,
  UtensilsCrossed,
  Grid3X3,
  ContactRound,
  Truck,
  Users,
  BarChart3,
  Settings,
  ChefHat,
  Package,
  Store,
  BookOpen,
  Tags,
  WalletCards,
  ShoppingBag,
  ReceiptText,
  ShieldCheck,
  ClipboardList,
} from 'lucide-react'
import { usePOSStore } from '@/lib/store'

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/menu', label: 'Menu Items', icon: UtensilsCrossed },
  { href: '/admin/categories', label: 'Categories', icon: Tags },
  { href: '/admin/customers', label: 'Customers', icon: ContactRound },
  { href: '/admin/suppliers', label: 'Suppliers', icon: Truck },
  { href: '/admin/recipes', label: 'Recipes', icon: BookOpen },
  { href: '/admin/tables', label: 'Tables', icon: Grid3X3 },
  { href: '/admin/staff', label: 'Staff', icon: Users },
  { href: '/admin/reports', label: 'Reports', icon: BarChart3 },
  { href: '/admin/cash-drawer-reports', label: 'Cash Drawer Reports', icon: ReceiptText },
  { href: '/admin/activity-log', label: 'Activity Log', icon: ShieldCheck },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
]

const quickLinks = [
  { href: '/pos', label: 'POS Terminal', icon: Store },
  { href: '/pay', label: 'Cashier', icon: WalletCards },
  { href: '/biller-confirmation', label: 'Biller Queue', icon: ClipboardList },
  { href: '/takeaway', label: 'Takeaway Counter', icon: ShoppingBag },
  { href: '/kitchen', label: 'Kitchen Display', icon: ChefHat },
  { href: '/inventory', label: 'Inventory', icon: Package },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const { currentUser } = usePOSStore()

  const visibleNavItems = navItems.filter((item) => {
    if (item.href === '/admin/settings') {
      return currentUser?.role === 'super-admin'
    }
    return true
  })

  return (
    <div className="flex w-full flex-col border-b border-border bg-card md:h-full md:w-64 md:border-b-0 md:border-r">
      <div className="border-b border-border bg-card px-4 py-3 md:py-4">
        <h2 className="text-lg font-bold tracking-tight text-foreground">Admin Panel</h2>
        <p className="text-xs text-muted-foreground mt-1">Management Dashboard</p>
      </div>

      <ScrollArea className="px-2 py-3 md:flex-1 md:py-4">
        <nav className="grid grid-cols-2 gap-1 sm:grid-cols-3 md:grid-cols-1 md:space-y-1">
          {visibleNavItems.map((item) => (
            <Button
              key={item.href}
              variant={pathname === item.href ? 'secondary' : 'ghost'}
              className={cn(
                'h-10 w-full justify-start gap-2 px-3 rounded-md transition-colors',
                pathname === item.href ? 'bg-secondary text-secondary-foreground font-medium' : 'text-muted-foreground hover:text-foreground'
              )}
              asChild
            >
              <Link href={item.href}>
                <item.icon className="h-4 w-4 flex-shrink-0" />
                <span className="truncate text-sm">{item.label}</span>
              </Link>
            </Button>
          ))}
        </nav>

        <div className="mt-4 hidden border-t border-border pt-4 md:mt-8 md:block">
          <p className="px-3 text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Quick Access</p>
          <nav className="space-y-1">
            {quickLinks.map((item) => (
              <Button
                key={item.href}
                variant="ghost"
                className="w-full justify-start gap-3 h-10 px-3 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md transition-colors"
                asChild
              >
                <Link href={item.href}>
                  <item.icon className="h-4 w-4 flex-shrink-0" />
                  <span className="text-sm">{item.label}</span>
                </Link>
              </Button>
            ))}
          </nav>
        </div>
      </ScrollArea>
    </div>
  )
}
