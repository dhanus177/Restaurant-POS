'use client'

import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api'
import { usePOSStore } from '@/lib/store'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { Store, Receipt, DollarSign, Save, Upload, X, Palette, Download } from 'lucide-react'
import Image from 'next/image'
import { useTheme } from 'next-themes'

const currencies = [
  { code: 'LKR', symbol: 'Rs', name: 'Sri Lankan Rupee' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '\u20AC', name: 'Euro' },
  { code: 'GBP', symbol: '\u00A3', name: 'British Pound' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
]

export default function SettingsPage() {
  const { currentUser, settings, updateSettings, loadFromDB } = usePOSStore()
  const [formData, setFormData] = useState(settings)
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isBackingUp, setIsBackingUp] = useState(false)
  const [isRestoring, setIsRestoring] = useState(false)
  const canManageRestaurant = currentUser?.role === 'super-admin'

  useEffect(() => {
    setMounted(true)
    void loadFromDB()
  }, [loadFromDB])

  useEffect(() => {
    setFormData(settings)
  }, [settings])

  const handleSave = async () => {
    if (!canManageRestaurant) {
      toast.error('Only the super admin can change restaurant settings')
      return
    }

    setIsSaving(true)
    try {
      const res = await apiFetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!res.ok) throw new Error('Failed to save settings')

      const saved = await res.json()
      updateSettings(saved)
      toast.success('Settings saved successfully')
    } catch (error) {
      console.error(error)
      toast.error('Failed to save settings')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCurrencyChange = (code: string) => {
    const currency = currencies.find((c) => c.code === code)
    if (currency) {
      setFormData({
        ...formData,
        currency: currency.code,
        currencySymbol: currency.symbol,
      })
    }
  }

  const handleBackup = async () => {
    if (!canManageRestaurant) {
      toast.error('Only the super admin can create backups')
      return
    }

    setIsBackingUp(true)
    try {
      const res = await apiFetch('/api/backup')
      if (!res.ok) throw new Error('Backup failed')
      const payload = await res.json()
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `pos-backup-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      toast.success('Database backup downloaded')
    } catch (error) {
      console.error(error)
      toast.error('Failed to create backup')
    } finally {
      setIsBackingUp(false)
    }
  }

  const handleRestoreFile = async (file?: File | null) => {
    if (!file) return
    if (!canManageRestaurant) {
      toast.error('Only the super admin can restore backups')
      return
    }
    const confirmed = confirm('Restore will overwrite current data. Continue?')
    if (!confirmed) return

    setIsRestoring(true)
    try {
      const text = await file.text()
      const payload = JSON.parse(text)
      const res = await apiFetch('/api/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Restore failed')
      await loadFromDB()
      toast.success('Database restored successfully')
    } catch (error) {
      console.error(error)
      toast.error('Failed to restore backup')
    } finally {
      setIsRestoring(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-3 sm:p-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground">Configure your restaurant POS system</p>
      </div>

      {!canManageRestaurant && (
        <Card className="border-amber-200 bg-amber-50/80 dark:border-amber-900/40 dark:bg-amber-500/10">
          <CardContent className="p-4 text-sm text-amber-900 dark:text-amber-100">
            You can view settings, but only the <span className="font-semibold">super admin</span> can change restaurant information, financial settings, and backup/restore data.
          </CardContent>
        </Card>
      )}

      {/* Restaurant Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="h-5 w-5" />
            Restaurant Information
          </CardTitle>
          <CardDescription>
            Basic information about your restaurant
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <fieldset disabled={!canManageRestaurant} className="space-y-4 disabled:pointer-events-none disabled:opacity-70">
          {/* Logo Upload */}
          <div className="grid gap-2">
            <Label>Company Logo</Label>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              {formData.logo ? (
                <div className="relative h-20 w-20 rounded-lg border overflow-hidden bg-muted flex items-center justify-center">
                  <Image
                    src={formData.logo}
                    alt="Company logo"
                    fill
                    className="object-contain"
                  />
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, logo: '' })}
                    className="absolute top-0.5 right-0.5 rounded-full bg-destructive text-destructive-foreground p-0.5 hover:opacity-90"
                    aria-label="Remove logo"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <div className="h-20 w-20 rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center bg-muted text-muted-foreground">
                  <Store className="h-8 w-8 opacity-40" />
                </div>
              )}
              <div className="flex flex-col gap-2">
                <Label
                  htmlFor="logo-upload"
                  className="cursor-pointer inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:bg-accent transition-colors"
                >
                  <Upload className="h-4 w-4" />
                  {formData.logo ? 'Replace Logo' : 'Upload Logo'}
                </Label>
                <input
                  id="logo-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    const reader = new FileReader()
                    reader.onload = (ev) => {
                      setFormData({ ...formData, logo: ev.target?.result as string })
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
            <Label htmlFor="name">Restaurant Name</Label>
            <Input
              id="name"
              value={formData.restaurantName}
              onChange={(e) => setFormData({ ...formData, restaurantName: e.target.value })}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>
          </fieldset>
        </CardContent>
      </Card>

      {/* Service Charge & Currency */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Service Charge & Currency
          </CardTitle>
          <CardDescription>
            Configure service charge rates and currency settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <fieldset disabled={!canManageRestaurant} className="space-y-4 disabled:pointer-events-none disabled:opacity-70">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="taxRate">Service Charge Rate (%)</Label>
              <Input
                id="taxRate"
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={formData.taxRate}
                onChange={(e) => setFormData({ ...formData, taxRate: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="currency">Currency</Label>
              <Select value={formData.currency} onValueChange={handleCurrencyChange}>
                <SelectTrigger>
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
          </fieldset>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Appearance
          </CardTitle>
          <CardDescription>
            Switch between Light, Dark, or System theme
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="appearance">Theme Mode</Label>
            {mounted && (
              <Select value={theme ?? 'system'} onValueChange={(value) => setTheme(value)}>
                <SelectTrigger id="appearance">
                  <SelectValue placeholder="Select theme" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="system">System</SelectItem>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Receipt Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Receipt Settings
          </CardTitle>
          <CardDescription>
            Customize your printed receipts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <fieldset disabled={!canManageRestaurant} className="space-y-4 disabled:pointer-events-none disabled:opacity-70">
          <div className="grid gap-2">
            <Label htmlFor="footer">Receipt Footer Message</Label>
            <Textarea
              id="footer"
              value={formData.receiptFooter}
              onChange={(e) => setFormData({ ...formData, receiptFooter: e.target.value })}
              placeholder="Thank you for dining with us!"
              rows={2}
            />
          </div>
          </fieldset>
        </CardContent>
      </Card>

      {/* Backup & Restore */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Database Backup & Restore
          </CardTitle>
          <CardDescription>
            Download a full JSON backup, or restore from a previously exported backup file.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={() => void handleBackup()} variant="outline" className="w-full sm:w-auto" disabled={!canManageRestaurant || isBackingUp || isRestoring}>
            {isBackingUp ? 'Creating backup...' : 'Download Backup'}
          </Button>

          <div>
            <Label htmlFor="restore-backup" className="mb-2 block">Restore from backup (.json)</Label>
            <Input
              id="restore-backup"
              type="file"
              accept="application/json,.json"
              disabled={!canManageRestaurant || isBackingUp || isRestoring}
              onChange={(e) => {
                const file = e.target.files?.[0]
                void handleRestoreFile(file)
                e.currentTarget.value = ''
              }}
            />
            <p className="mt-2 text-xs text-muted-foreground">Warning: restore replaces current operational data.</p>
          </div>
        </CardContent>
      </Card>

      <Separator />

      <div className="flex justify-end">
        <Button onClick={() => void handleSave()} size="lg" className="w-full gap-2 sm:w-auto" disabled={!canManageRestaurant || isSaving || isBackingUp || isRestoring}>
          <Save className="h-4 w-4" />
          {isSaving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  )
}
