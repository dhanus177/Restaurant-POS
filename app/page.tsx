'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { usePOSStore } from '@/lib/store'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { UtensilsCrossed, ChefHat, Settings, Lock, Delete, WalletCards } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const { currentUser, loginWithPin, setCurrentUser, settings } = usePOSStore()
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (currentUser) {
      redirectToRole(currentUser.role)
    }
  }, [currentUser])

  const redirectToRole = (role: string) => {
    switch (role) {
      case 'cashier':
        router.push('/pos')
        break
      case 'kitchen':
        router.push('/kitchen')
        break
      case 'admin':
        router.push('/admin')
        break
      case 'pay-counter':
        router.push('/pay')
        break
    }
  }

  const handlePinInput = (digit: string) => {
    if (pin.length < 4) {
      const newPin = pin + digit
      setPin(newPin)
      setError('')
      
      if (newPin.length === 4) {
        const user = loginWithPin(newPin)
        if (user) {
          redirectToRole(user.role)
        } else {
          setError('Invalid PIN')
          setTimeout(() => setPin(''), 500)
        }
      }
    }
  }

  const handleDelete = () => {
    setPin(pin.slice(0, -1))
    setError('')
  }

  const handleClear = () => {
    setPin('')
    setError('')
  }

  const handleQuickLogin = (role: 'cashier' | 'kitchen' | 'admin' | 'pay-counter') => {
    const pins: Record<string, string> = {
      cashier: '2222',
      kitchen: '3333',
      admin: '1234',
      'pay-counter': '5555',
    }
    const user = loginWithPin(pins[role])
    if (user) {
      redirectToRole(user.role)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-foreground">{settings.restaurantName}</h1>
        <p className="text-muted-foreground mt-2">Point of Sale System</p>
      </div>

      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <Lock className="h-5 w-5" />
            Enter PIN
          </CardTitle>
          <CardDescription>Enter your 4-digit PIN to login</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <div className="flex justify-center gap-3 mb-4">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`h-4 w-4 rounded-full border-2 transition-colors ${
                    pin.length > i
                      ? error
                        ? 'bg-destructive border-destructive'
                        : 'bg-primary border-primary'
                      : 'border-muted-foreground'
                  }`}
                />
              ))}
            </div>
            {error && (
              <p className="text-center text-sm text-destructive">{error}</p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
              <Button
                key={digit}
                variant="secondary"
                size="lg"
                className="h-16 text-2xl font-semibold"
                onClick={() => handlePinInput(digit.toString())}
              >
                {digit}
              </Button>
            ))}
            <Button
              variant="outline"
              size="lg"
              className="h-16 text-sm"
              onClick={handleClear}
            >
              Clear
            </Button>
            <Button
              variant="secondary"
              size="lg"
              className="h-16 text-2xl font-semibold"
              onClick={() => handlePinInput('0')}
            >
              0
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="h-16"
              onClick={handleDelete}
            >
              <Delete className="h-6 w-6" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="mt-8">
        <p className="text-center text-sm text-muted-foreground mb-4">Quick Access </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button
            variant="outline"
            size="lg"
            className="gap-2"
            onClick={() => handleQuickLogin('cashier')}
          >
            <UtensilsCrossed className="h-5 w-5" />
            Cashier
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="gap-2"
            onClick={() => handleQuickLogin('kitchen')}
          >
            <ChefHat className="h-5 w-5" />
            Kitchen
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="gap-2"
            onClick={() => handleQuickLogin('admin')}
          >
            <Settings className="h-5 w-5" />
            Admin
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="gap-2"
            onClick={() => handleQuickLogin('pay-counter')}
          >
            <WalletCards className="h-5 w-5" />
            Pay Counter
          </Button>
        </div>
      </div>

      <div className="mt-8 text-center text-xs text-muted-foreground">
        <div className="mb-3">
          <Button asChild variant="outline" size="sm">
            <Link href="/restaurant/create">Create Restaurant</Link>
          </Button>
        </div>
        <p>All Rights Reserved © {new Date().getFullYear()}</p>
      </div>
    </div>
  )
}
