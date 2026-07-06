'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiFetch } from '@/lib/api'
import { CheckCircle2, KeyRound, LockKeyhole, Save, Store, UserCog } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type SetupStatus = {
  hasSettings: boolean
  hasSuperAdmin: boolean
  hasActiveLicense: boolean
  setupComplete: boolean
  requiresActivationOnly: boolean
  isPartiallyConfigured: boolean
}

const currencies = [
  { code: 'LKR', symbol: 'Rs', name: 'Sri Lankan Rupee' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
]

export default function SetupPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<SetupStatus | null>(null)
  const [setupSecret, setSetupSecret] = useState('')
  const [activationKey, setActivationKey] = useState('')
  const [licenseActive, setLicenseActive] = useState(false)
  const [isActivating, setIsActivating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState({
    restaurantName: '',
    address: '',
    phone: '',
    taxRate: 0,
    currency: 'LKR',
    currencySymbol: 'Rs',
    receiptFooter: 'Thank you for dining with us!',
    logo: '',
  })
  const [ownerName, setOwnerName] = useState('')
  const [ownerPin, setOwnerPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')

  const activationOnly = status?.requiresActivationOnly === true

  useEffect(() => {
    const loadStatus = async () => {
      try {
        const response = await apiFetch('/api/setup/status', { cache: 'no-store' })
        if (!response.ok) {
          throw new Error('Failed to load setup status')
        }
        const payload = (await response.json()) as SetupStatus
        setStatus(payload)
        setLicenseActive(payload.hasActiveLicense)

        if (payload.setupComplete) {
          router.replace('/')
          return
        }
      } catch (error) {
        console.error(error)
        toast.error('Unable to load setup status.')
      } finally {
        setLoading(false)
      }
    }

    void loadStatus()
  }, [router])

  const canContinueSetup = useMemo(() => {
    if (activationOnly) return false
    return licenseActive || activationKey.trim().length > 0
  }, [licenseActive, activationKey, activationOnly])

  const handleCurrencyChange = (code: string) => {
    const currency = currencies.find((item) => item.code === code)
    if (!currency) return

    setFormData((prev) => ({
      ...prev,
      currency: currency.code,
      currencySymbol: currency.symbol,
    }))
  }

  const handleActivate = async () => {
    if (!setupSecret.trim()) {
      toast.error('Setup secret is required.')
      return
    }

    if (!activationKey.trim()) {
      toast.error('Activation key is required.')
      return
    }

    setIsActivating(true)
    try {
      const response = await apiFetch('/api/license/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setupSecret, activationKey }),
      })

      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.error || 'Activation failed')
      }

      setLicenseActive(true)
      toast.success('License activated successfully.')

      if (activationOnly) {
        router.push('/')
      }
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : 'Activation failed')
    } finally {
      setIsActivating(false)
    }
  }

  const handleCreateSetup = async () => {
    if (!setupSecret.trim()) {
      toast.error('Setup secret is required.')
      return
    }

    if (!licenseActive && !activationKey.trim()) {
      toast.error('Activation key is required for first installation.')
      return
    }

    if (!formData.restaurantName.trim()) {
      toast.error('Restaurant name is required.')
      return
    }

    if (!ownerName.trim()) {
      toast.error('Super admin name is required.')
      return
    }

    if (!/^\d{4}$/.test(ownerPin)) {
      toast.error('Super admin PIN must be exactly 4 digits.')
      return
    }

    if (ownerPin !== confirmPin) {
      toast.error('PIN confirmation does not match.')
      return
    }

    setIsSaving(true)
    try {
      const response = await apiFetch('/api/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          setupSecret,
          activationKey,
          restaurant: formData,
          owner: {
            name: ownerName,
            pin: ownerPin,
          },
        }),
      })

      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.error || 'Setup failed')
      }

      toast.success(
        payload.licenseActivated
          ? 'License validated and setup completed successfully. Please log in with the new super admin PIN.'
          : 'Setup completed successfully. Please log in with the new super admin PIN.'
      )
      router.push('/')
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : 'Setup failed')
    } finally {
      setIsSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <p className="text-sm text-muted-foreground">Loading setup...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Veztra Soft setup</h1>
          <p className="mt-2 text-muted-foreground">
            Activate this Veztra Soft POS instance and configure the restaurant before staff can sign in.
          </p>
        </div>

        {status?.isPartiallyConfigured && (
          <Card className="border-amber-200 bg-amber-50/80 dark:border-amber-900/40 dark:bg-amber-500/10">
            <CardContent className="p-4 text-sm text-amber-900 dark:text-amber-100">
              This instance is partially configured. Activation can continue, but setup creation is blocked until the existing partial data is reviewed or cleaned up.
            </CardContent>
          </Card>
        )}

        {activationOnly && (
          <Card className="border-sky-200 bg-sky-50/80 dark:border-sky-900/40 dark:bg-sky-500/10">
            <CardContent className="p-4 text-sm text-sky-900 dark:text-sky-100">
              A super admin account and restaurant settings already exist for this instance. Only license activation is needed now to restore normal sign-in.
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LockKeyhole className="h-5 w-5" />
              Secure activation
            </CardTitle>
            <CardDescription>
              Enter the one-time setup secret and customer activation key. First installation is blocked on the server until the key is valid.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="setup-secret">Setup Secret</Label>
              <Input
                id="setup-secret"
                type="password"
                value={setupSecret}
                onChange={(e) => setSetupSecret(e.target.value)}
                placeholder="Enter the setup secret"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="activation-key">Activation Key</Label>
              <Input
                id="activation-key"
                value={activationKey}
                onChange={(e) => setActivationKey(e.target.value)}
                placeholder="XXXX-XXXX-XXXX"
              />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className={`h-4 w-4 ${licenseActive ? 'text-emerald-600' : 'text-muted-foreground'}`} />
                {licenseActive ? 'License activated for this instance' : 'Activation required before setup continues'}
              </div>
              <Button onClick={() => void handleActivate()} disabled={isActivating} className="gap-2">
                <KeyRound className="h-4 w-4" />
                {isActivating ? 'Activating...' : 'Activate License'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {!activationOnly && (
          <>
            <Card className={!canContinueSetup ? 'opacity-70' : ''}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Store className="h-5 w-5" />
                  Restaurant details
                </CardTitle>
                <CardDescription>Configure the restaurant profile and operational defaults.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <fieldset disabled={!canContinueSetup || status?.isPartiallyConfigured} className="space-y-4 disabled:pointer-events-none">
                  <div className="grid gap-2">
                    <Label htmlFor="restaurant-name">Restaurant Name *</Label>
                    <Input
                      id="restaurant-name"
                      value={formData.restaurantName}
                      onChange={(e) => setFormData((prev) => ({ ...prev, restaurantName: e.target.value }))}
                      placeholder="Restaurant name"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="restaurant-address">Address</Label>
                    <Input
                      id="restaurant-address"
                      value={formData.address}
                      onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
                      placeholder="Street, city, zip"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="restaurant-phone">Phone</Label>
                    <Input
                      id="restaurant-phone"
                      value={formData.phone}
                      onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                      placeholder="(555) 123-4567"
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor="tax-rate">Service Charge Rate (%)</Label>
                      <Input
                        id="tax-rate"
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={formData.taxRate}
                        onChange={(e) => setFormData((prev) => ({ ...prev, taxRate: parseFloat(e.target.value) || 0 }))}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="currency">Currency</Label>
                      <Select value={formData.currency} onValueChange={handleCurrencyChange}>
                        <SelectTrigger id="currency">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {currencies.map((currency) => (
                            <SelectItem key={currency.code} value={currency.code}>
                              {currency.symbol} {currency.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="receipt-footer">Receipt Footer</Label>
                    <Textarea
                      id="receipt-footer"
                      value={formData.receiptFooter}
                      onChange={(e) => setFormData((prev) => ({ ...prev, receiptFooter: e.target.value }))}
                      rows={2}
                    />
                  </div>
                </fieldset>
              </CardContent>
            </Card>

            <Card className={!canContinueSetup ? 'opacity-70' : ''}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCog className="h-5 w-5" />
                  Super admin account
                </CardTitle>
                <CardDescription>Create the owner login with full access to this instance.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <fieldset disabled={!canContinueSetup || status?.isPartiallyConfigured} className="space-y-4 disabled:pointer-events-none">
                  <div className="grid gap-2">
                    <Label htmlFor="owner-name">Super Admin Name *</Label>
                    <Input
                      id="owner-name"
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                      placeholder="Owner or manager name"
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor="owner-pin">Super Admin PIN *</Label>
                      <Input
                        id="owner-pin"
                        type="password"
                        inputMode="numeric"
                        maxLength={4}
                        value={ownerPin}
                        onChange={(e) => setOwnerPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        placeholder="1234"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="confirm-pin">Confirm PIN *</Label>
                      <Input
                        id="confirm-pin"
                        type="password"
                        inputMode="numeric"
                        maxLength={4}
                        value={confirmPin}
                        onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        placeholder="1234"
                      />
                    </div>
                  </div>
                </fieldset>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button
                onClick={() => void handleCreateSetup()}
                disabled={!canContinueSetup || isSaving || status?.isPartiallyConfigured}
                size="lg"
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                {isSaving ? 'Completing Setup...' : 'Complete Setup'}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}