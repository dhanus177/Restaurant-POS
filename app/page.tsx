'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { apiFetch } from '@/lib/api'
import { usePOSStore } from '@/lib/store'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { UtensilsCrossed, ChefHat, Settings, Lock, Delete, WalletCards, ShoppingBag } from 'lucide-react'

type SetupStatus = {
  hasSettings: boolean
  hasSuperAdmin: boolean
  hasActiveLicense: boolean
  setupComplete: boolean
  requiresActivationOnly?: boolean
  isPartiallyConfigured?: boolean
}

const showDemoAccess = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'

export default function LoginPage() {
  const router = useRouter()
  const { currentUser, loginWithPin, loadFromDB, settings } = usePOSStore()
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [checkingSetup, setCheckingSetup] = useState(true)
  const [setupStatus, setSetupStatus] = useState<SetupStatus | null>(null)

  useEffect(() => {
    void loadFromDB()

    const loadSetupStatus = async () => {
      try {
        const response = await apiFetch('/api/setup/status', { cache: 'no-store' })
        if (!response.ok) {
          throw new Error('Failed to load setup status')
        }

        const status = (await response.json()) as SetupStatus
        setSetupStatus(status)

        if (!status.setupComplete) {
          router.replace('/setup')
          return
        }
      } catch (setupError) {
        console.error(setupError)
      } finally {
        setCheckingSetup(false)
      }
    }

    void loadSetupStatus()
  }, [loadFromDB])

  useEffect(() => {
    if (!checkingSetup && setupStatus?.setupComplete && currentUser) {
      redirectToRole(currentUser.role)
    }
  }, [checkingSetup, currentUser, setupStatus])

  const redirectToRole = (role: string) => {
    switch (role) {
      case 'super-admin':
        router.push('/admin')
        break
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
      case 'takeaway':
        router.push('/takeaway')
        break
      default:
        router.push('/pos')
        break
    }
  }

  const handlePinInput = async (digit: string) => {
    if (pin.length < 4) {
      const newPin = pin + digit
      setPin(newPin)
      setError('')
      
      if (newPin.length === 4) {
        const user = await loginWithPin(newPin)
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

  const handleQuickLogin = async (role: 'cashier' | 'kitchen' | 'admin' | 'super-admin' | 'pay-counter' | 'takeaway') => {
    const pins: Record<string, string> = {
      cashier: '2222',
      kitchen: '3333',
      admin: '1234',
      'super-admin': '2111',
      'pay-counter': '5555',
      takeaway: '6666',
    }
    const user = await loginWithPin(pins[role])
    if (user) {
      redirectToRole(user.role)
    }
  }

  if (checkingSetup) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <p className="text-sm text-muted-foreground">Checking setup status...</p>
      </div>
    )
  }

  if (setupStatus && !setupStatus.setupComplete) {
    const setupMessage = setupStatus.requiresActivationOnly
      ? 'This restaurant already has a super admin account, but the license still needs to be activated before normal sign-in is available.'
      : setupStatus.isPartiallyConfigured
        ? 'This instance is partially configured. Open setup to finish activation and review the existing configuration.'
        : 'This instance still needs to be configured before staff can sign in.'

    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <Lock className="h-5 w-5" />
              Setup required
            </CardTitle>
            <CardDescription>{setupMessage}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-500/10 dark:text-amber-100">
              {setupStatus.requiresActivationOnly
                ? 'Super admin authentication is working, but the license gate is still closed. Activate the license to continue.'
                : 'Finish the guided setup before using the PIN login screen.'}
            </div>
            <div className="flex justify-center">
              <Button asChild size="lg" className="gap-2">
                <Link href="/setup">
                  <Settings className="h-5 w-5" />
                  Open setup
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
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

      {showDemoAccess && (
        <div className="mt-8">
          <p className="mb-4 text-center text-sm text-muted-foreground">Quick Access</p>
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
              onClick={() => handleQuickLogin('super-admin')}
            >
              <Settings className="h-5 w-5" />
              Super Admin
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
            <Button
              variant="outline"
              size="lg"
              className="gap-2"
              onClick={() => handleQuickLogin('takeaway')}
            >
              <ShoppingBag className="h-5 w-5" />
              Takeaway Counter
            </Button>
          </div>
        </div>
      )}

      <div className="mt-8 text-center text-xs text-muted-foreground">
        <div className="mb-3">
          <Button asChild variant="outline" size="sm">
            <Link href="/setup">Open Setup</Link>
          </Button>
        </div>
        <p>All Rights Reserved © {new Date().getFullYear()}</p>
      </div>
    </div>
  )
}
