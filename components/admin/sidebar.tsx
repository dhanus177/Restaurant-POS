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
  Users,
  BarChart3,
  Settings,
  ChefHat,
  Package,
  Store,
  BookOpen,
  Tags,
} from 'lucide-react'

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/menu', label: 'Menu Items', icon: UtensilsCrossed },
  { href: '/admin/categories', label: 'Categories', icon: Tags },
  { href: '/admin/recipes', label: 'Recipes', icon: BookOpen },
  { href: '/admin/tables', label: 'Tables', icon: Grid3X3 },
  { href: '/admin/staff', label: 'Staff', icon: Users },
  { href: '/admin/reports', label: 'Reports', icon: BarChart3 },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
]

const quickLinks = [
  { href: '/pos', label: 'POS Terminal', icon: Store },
  { href: '/kitchen', label: 'Kitchen Display', icon: ChefHat },
  { href: '/inventory', label: 'Inventory', icon: Package },
]

export function AdminSidebar() {
  const pathname = usePathname()

  return (
    <div className="flex h-full w-64 flex-col border-r border-border bg-card">
      <div className="border-b border-border bg-card px-4 py-4">
        <h2 className="text-lg font-bold tracking-tight text-foreground">Admin Panel</h2>
        <p className="text-xs text-muted-foreground mt-1">Management Dashboard</p>
      </div>

      <ScrollArea className="flex-1 px-2 py-4">
        <nav className="space-y-1">
          {navItems.map((item) => (
            <Button
              key={item.href}
              variant={pathname === item.href ? 'secondary' : 'ghost'}
              className={cn(
                'w-full justify-start gap-3 h-10 px-3 rounded-md transition-colors',
                pathname === item.href ? 'bg-secondary text-secondary-foreground font-medium' : 'text-muted-foreground hover:text-foreground'
              )}
              asChild
            >
              <Link href={item.href}>
                <item.icon className="h-4 w-4 flex-shrink-0" />
                <span className="text-sm">{item.label}</span>
              </Link>
            </Button>
          ))}
        </nav>

        <div className="mt-8 border-t border-border pt-4">
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
