'use client'

import { useRouter } from 'next/navigation'
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
import { UtensilsCrossed, ChefHat, Package, Settings, LogOut, User, WalletCards, ShoppingBag } from 'lucide-react'
import Link from 'next/link'

interface HeaderProps {
  title: string
}

export function Header({ title }: HeaderProps) {
  const router = useRouter()
  const { currentUser, settings, logout } = usePOSStore()
  const canAccessKitchen = settings.kitchenPageEnabled !== false || currentUser?.role === 'super-admin'
  const canAccessTakeaway = settings.takeawayPageEnabled !== false || currentUser?.role === 'super-admin'

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
    switch (role) {
      case 'super-admin':
        return 'bg-violet-600'
      case 'admin':
        return 'bg-primary'
      case 'cashier':
        return 'bg-chart-2'
      case 'kitchen':
        return 'bg-warning'
      case 'pay-counter':
        return 'bg-emerald-600'
      case 'takeaway':
        return 'bg-orange-600'
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
        {['admin', 'super-admin'].includes(currentUser?.role ?? '') && (
          <nav className="hidden md:flex items-center gap-1 mr-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/pos" className="gap-2">
                <UtensilsCrossed className="h-4 w-4" />
                POS
              </Link>
            </Button>
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
                Pay Counter
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
                  {currentUser?.role}
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
              {canAccessKitchen && (['admin', 'super-admin'].includes(currentUser?.role ?? '') || currentUser?.role === 'kitchen') && (
                <DropdownMenuItem asChild>
                  <Link href="/kitchen" className="gap-2">
                    <ChefHat className="h-4 w-4" />
                    Kitchen Display
                  </Link>
                </DropdownMenuItem>
              )}
              {(['admin', 'super-admin'].includes(currentUser?.role ?? '') || currentUser?.role === 'pay-counter') && (
                <DropdownMenuItem asChild>
                  <Link href="/pay" className="gap-2">
                    <WalletCards className="h-4 w-4" />
                    Pay Counter
                  </Link>
                </DropdownMenuItem>
              )}
              {canAccessTakeaway && (['admin', 'super-admin'].includes(currentUser?.role ?? '') || currentUser?.role === 'pay-counter' || currentUser?.role === 'cashier' || currentUser?.role === 'takeaway') && (
                <DropdownMenuItem asChild>
                  <Link href="/takeaway" className="gap-2">
                    <ShoppingBag className="h-4 w-4" />
                    Takeaway Counter
                  </Link>
                </DropdownMenuItem>
              )}
              {['admin', 'super-admin'].includes(currentUser?.role ?? '') && (
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
