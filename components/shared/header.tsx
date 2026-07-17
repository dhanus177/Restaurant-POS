'use client'

import { useRouter } from 'next/navigation'
import { getRoleDisplayName, hasEffectiveRole, resolveEffectiveRole } from '@/lib/roles'
import { usePOSStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { UtensilsCrossed, ChefHat, Package, Settings, LogOut, User, WalletCards, ShoppingBag, ClipboardList } from 'lucide-react'
import Link from 'next/link'

interface HeaderProps {
  title: string
}

export function Header({ title }: HeaderProps) {
  const router = useRouter()
  const { currentUser, settings, logout } = usePOSStore()
  const effectiveRole = resolveEffectiveRole(currentUser?.role ?? '', settings)
  const canAccessKitchen = settings.kitchenPageEnabled !== false || effectiveRole === 'super-admin'
  const canAccessTakeaway = settings.takeawayPageEnabled !== false || effectiveRole === 'super-admin'
  const canAccessWaiter = hasEffectiveRole(currentUser?.role ?? '', ['waiter', 'admin', 'super-admin'], settings)

  const handleLogout = async () => {
    await logout()
    router.push('/')
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getRoleBadgeColor = (role: string) => {
    switch (resolveEffectiveRole(role, settings)) {
      case 'super-admin':
        return 'bg-violet-600'
      case 'admin':
        return 'bg-primary'
      case 'biller':
        return 'bg-indigo-600'
      case 'cashier':
        return 'bg-emerald-600'
      case 'kitchen':
        return 'bg-warning'
      case 'takeaway':
        return 'bg-orange-600'
      case 'waiter':
        return 'bg-sky-600'
      default:
        return 'bg-muted'
    }
  }

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card px-3 sm:px-4">
      <div className="flex min-w-0 items-center gap-2 sm:gap-4">
        <h1 className="truncate text-base font-bold text-foreground sm:text-lg md:text-xl">{title}</h1>
        <span className="text-sm text-muted-foreground hidden md:block">
          {settings.restaurantName}
        </span>
      </div>

      <div className="flex items-center gap-2">
        {/* Quick Navigation for Admin */}
        {hasEffectiveRole(currentUser?.role ?? '', ['admin', 'super-admin'], settings) && (
          <nav className="hidden md:flex items-center gap-1 mr-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/pos" className="gap-2">
                <UtensilsCrossed className="h-4 w-4" />
                POS
              </Link>
            </Button>
            {canAccessWaiter && (
              <Button variant="ghost" size="sm" asChild>
                <Link href="/waiter" className="gap-2">
                  <User className="h-4 w-4" />
                  Waiter
                </Link>
              </Button>
            )}
            {canAccessKitchen && (
              <Button variant="ghost" size="sm" asChild>
                <Link href="/kitchen" className="gap-2">
                  <ChefHat className="h-4 w-4" />
                  Kitchen
                </Link>
              </Button>
            )}
            <Button variant="ghost" size="sm" asChild>
              <Link href="/inventory" className="gap-2">
                <Package className="h-4 w-4" />
                Inventory
              </Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/pay" className="gap-2">
                <WalletCards className="h-4 w-4" />
                Cashier
              </Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/biller-confirmation" className="gap-2">
                <ClipboardList className="h-4 w-4" />
                Biller Queue
              </Link>
            </Button>
            {canAccessTakeaway && (
              <Button variant="ghost" size="sm" asChild>
                <Link href="/takeaway" className="gap-2">
                  <ShoppingBag className="h-4 w-4" />
                  Takeaway
                </Link>
              </Button>
            )}
            <Button variant="ghost" size="sm" asChild>
              <Link href="/admin" className="gap-2">
                <Settings className="h-4 w-4" />
                Admin
              </Link>
            </Button>
          </nav>
        )}

        {/* Time Display */}
        <div className="hidden sm:block text-sm text-muted-foreground">
          {new Date().toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative gap-2 px-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className={getRoleBadgeColor(currentUser?.role || '')}>
                  {currentUser ? getInitials(currentUser.name) : '?'}
                </AvatarFallback>
              </Avatar>
              <span className="hidden sm:block text-sm font-medium">
                {currentUser?.name || 'Guest'}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span>{currentUser?.name}</span>
                <span className="text-xs text-muted-foreground capitalize">
                  {currentUser ? getRoleDisplayName(currentUser.role, settings) : 'Guest'}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            
            {/* Mobile Navigation */}
            <div className="md:hidden">
              <DropdownMenuItem asChild>
                <Link href="/pos" className="gap-2">
                  <UtensilsCrossed className="h-4 w-4" />
                  POS Terminal
                </Link>
              </DropdownMenuItem>
              {canAccessWaiter && (
                <DropdownMenuItem asChild>
                  <Link href="/waiter" className="gap-2">
                    <User className="h-4 w-4" />
                    Waiter
                  </Link>
                </DropdownMenuItem>
              )}
              {canAccessKitchen && hasEffectiveRole(currentUser?.role ?? '', ['admin', 'super-admin', 'kitchen'], settings) && (
                <DropdownMenuItem asChild>
                  <Link href="/kitchen" className="gap-2">
                    <ChefHat className="h-4 w-4" />
                    Kitchen Display
                  </Link>
                </DropdownMenuItem>
              )}
              {hasEffectiveRole(currentUser?.role ?? '', ['admin', 'super-admin', 'cashier'], settings) && (
                <DropdownMenuItem asChild>
                  <Link href="/pay" className="gap-2">
                    <WalletCards className="h-4 w-4" />
                    Cashier
                  </Link>
                </DropdownMenuItem>
              )}
              {hasEffectiveRole(currentUser?.role ?? '', ['admin', 'super-admin', 'cashier', 'biller'], settings) && (
                <DropdownMenuItem asChild>
                  <Link href="/biller-confirmation" className="gap-2">
                    <ClipboardList className="h-4 w-4" />
                    Biller Queue
                  </Link>
                </DropdownMenuItem>
              )}
              {canAccessTakeaway && hasEffectiveRole(currentUser?.role ?? '', ['admin', 'super-admin', 'cashier', 'takeaway'], settings) && (
                <DropdownMenuItem asChild>
                  <Link href="/takeaway" className="gap-2">
                    <ShoppingBag className="h-4 w-4" />
                    Takeaway Counter
                  </Link>
                </DropdownMenuItem>
              )}
              {hasEffectiveRole(currentUser?.role ?? '', ['admin', 'super-admin'], settings) && (
                <>
                  <DropdownMenuItem asChild>
                    <Link href="/inventory" className="gap-2">
                      <Package className="h-4 w-4" />
                      Inventory
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/admin" className="gap-2">
                      <Settings className="h-4 w-4" />
                      Admin
                    </Link>
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
            </div>

            <DropdownMenuItem asChild>
              <Link href="/" className="gap-2">
                <User className="h-4 w-4" />
                Switch User
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleLogout} className="text-destructive gap-2">
              <LogOut className="h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
