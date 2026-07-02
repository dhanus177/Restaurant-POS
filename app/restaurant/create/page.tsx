'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Store, Save, Upload, X, ArrowLeft, UserCog } from 'lucide-react'
import { usePOSStore } from '@/lib/store'
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
import { toast } from 'sonner'

const currencies = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
]

export default function CreateRestaurantPage() {
  const router = useRouter()
  const { currentUser, settings, updateSettings, setCurrentUser, loadFromDB } = usePOSStore()

  const initialData = useMemo(
    () => ({
      restaurantName: settings.restaurantName ?? '',
      address: settings.address ?? '',
      phone: settings.phone ?? '',
      taxRate: settings.taxRate ?? 0,
      currency: settings.currency ?? 'USD',
      currencySymbol: settings.currencySymbol ?? '$',
      receiptFooter: settings.receiptFooter ?? '',
      logo: settings.logo ?? '',
    }),
    [settings]
  )

  const [formData, setFormData] = useState(initialData)
  const [adminName, setAdminName] = useState('')
  const [adminPin, setAdminPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [existingAdminId, setExistingAdminId] = useState<string | null>(null)
  const [ownerExists, setOwnerExists] = useState(false)
  const [isSaving, setIsSaving] = useState(false)


  useEffect(() => {
    setFormData(initialData)
  }, [initialData])

  useEffect(() => {
    void loadFromDB()

    const loadExistingAdmin = async () => {
      try {
        const res = await fetch('/api/users', { credentials: 'same-origin' })
        if (!res.ok) return
        const users: Array<{ id: string; name: string; pin: string; role: string }> = await res.json()
        const admin = users.find((u) => u.role === 'super-admin') ?? users.find((u) => u.role === 'admin')
        if (!admin) return
        setOwnerExists(true)
        setExistingAdminId(admin.id)
        setAdminName(admin.name)
      } catch {
        // no-op: setup can still proceed
      }
    }

    void loadExistingAdmin()
  }, [loadFromDB])

  const handleCurrencyChange = (code: string) => {
    const currency = currencies.find((c) => c.code === code)
    if (!currency) return
    setFormData((prev) => ({
      ...prev,
      currency: currency.code,
      currencySymbol: currency.symbol,
    }))
  }

  const handleSave = async () => {
    if (ownerExists && currentUser?.role !== 'super-admin') {
      toast.error('Only the super admin can update restaurant ownership details')
      return
    }

    if (!formData.restaurantName.trim()) {
      toast.error('Restaurant name is required')
      return
    }

    if (!adminName.trim()) {
      toast.error('Admin name is required')
      return
    }

    if (!/^\d{4}$/.test(adminPin)) {
      toast.error('Admin PIN must be exactly 4 digits')
      return
    }

    if (adminPin !== confirmPin) {
      toast.error('PIN confirmation does not match')
      return
    }

    setIsSaving(true)
    try {
      const settingsRes = await fetch('/api/settings', {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!settingsRes.ok) {
        throw new Error('Failed to save restaurant settings')
      }

      const adminPayload = {
        id: existingAdminId ?? crypto.randomUUID(),
        name: adminName.trim(),
        pin: adminPin,
        role: 'super-admin',
      }

      const adminRes = await fetch(existingAdminId ? `/api/users/${existingAdminId}` : '/api/users', {
        method: existingAdminId ? 'PATCH' : 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(adminPayload),
      })

      if (!adminRes.ok) {
        throw new Error('Failed to save admin account')
      }

      const savedAdmin = await adminRes.json()

      if (!existingAdminId) {
        const loginRes = await fetch('/api/auth/login', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pin: adminPin }),
        })

        if (!loginRes.ok) {
          throw new Error('Failed to sign in new super admin')
        }

        const loginData = await loginRes.json()
        setCurrentUser(loginData.user)
      }

      updateSettings(formData)
      await loadFromDB()

      toast.success(existingAdminId ? 'Restaurant and super admin updated successfully' : 'Restaurant and super admin created successfully')
      router.push('/admin')
    } catch (error) {
      console.error(error)
      toast.error('Unable to complete setup. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Create Restaurant</h1>
            <p className="text-muted-foreground">Set up your restaurant details to get started</p>
          </div>
          <Button variant="outline" onClick={() => router.push('/')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </div>

        {ownerExists && currentUser?.role !== 'super-admin' && (
          <Card className="border-amber-200 bg-amber-50/80 dark:border-amber-900/40 dark:bg-amber-500/10">
            <CardContent className="p-4 text-sm text-amber-900 dark:text-amber-100">
              A super admin already exists. Please log in as the super admin to update restaurant information or ownership details.
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="h-5 w-5" />
              Restaurant Information
            </CardTitle>
            <CardDescription>Basic information for receipts and POS screen</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label>Company Logo</Label>
              <div className="flex items-center gap-4">
                {formData.logo ? (
                  <div className="relative h-20 w-20 overflow-hidden rounded-lg border bg-muted">
                    <Image
                      src={formData.logo}
                      alt="Restaurant logo"
                      fill
                      className="object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, logo: '' }))}
                      className="absolute right-0.5 top-0.5 rounded-full bg-destructive p-0.5 text-destructive-foreground"
                      aria-label="Remove logo"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted text-muted-foreground">
                    <Store className="h-8 w-8 opacity-40" />
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  <Label
                    htmlFor="logo-upload"
                    className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:bg-accent"
                  >
                    <Upload className="h-4 w-4" />
                    {formData.logo ? 'Replace Logo' : 'Upload Logo'}
                  </Label>
                  <Input
                    id="logo-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      const reader = new FileReader()
                      reader.onload = (ev) => {
                        setFormData((prev) => ({
                          ...prev,
                          logo: (ev.target?.result as string) ?? '',
                        }))
                      }
                      reader.readAsDataURL(file)
                      e.target.value = ''
                    }}
                  />
                  <p className="text-xs text-muted-foreground">PNG, JPG, SVG up to 2 MB</p>
                </div>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="restaurant-name">Restaurant Name *</Label>
              <Input
                id="restaurant-name"
                value={formData.restaurantName}
                onChange={(e) => setFormData((prev) => ({ ...prev, restaurantName: e.target.value }))}
                placeholder="Your restaurant name"
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
                <Label htmlFor="tax-rate">Tax Rate (%)</Label>
                <Input
                  id="tax-rate"
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={formData.taxRate}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      taxRate: parseFloat(e.target.value) || 0,
                    }))
                  }
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="currency">Currency</Label>
                <Select value={formData.currency} onValueChange={handleCurrencyChange}>
                  <SelectTrigger id="currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.symbol} {c.name}
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
                placeholder="Thank you for dining with us!"
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCog className="h-5 w-5" />
              Super Admin Account
            </CardTitle>
            <CardDescription>Create the owner login with full access to this POS</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="admin-name">Super Admin Name *</Label>
              <Input
                id="admin-name"
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                placeholder="Owner or Manager name"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="admin-pin">Super Admin PIN (4 digits) *</Label>
                <Input
                  id="admin-pin"
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={adminPin}
                  onChange={(e) => setAdminPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
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
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isSaving || (ownerExists && currentUser?.role !== 'super-admin')} className="gap-2" size="lg">
            <Save className="h-4 w-4" />
            {isSaving ? 'Saving...' : existingAdminId ? 'Update Setup' : 'Create Restaurant & Super Admin'}
          </Button>
        </div>
      </div>
    </div>
  )
}
