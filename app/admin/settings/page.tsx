'use client'

import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api'
import { usePOSStore } from '@/lib/store'
import type { BackupSchedule, BackupSnapshot } from '@/lib/types'
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
import { Store, Receipt, DollarSign, Save, Upload, X, Palette, Download, MessageCircle } from 'lucide-react'
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
  const { currentUser, categories, settings, updateSettings, loadFromDB } = usePOSStore()
  const [formData, setFormData] = useState(settings)
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isBackingUp, setIsBackingUp] = useState(false)
  const [isRestoring, setIsRestoring] = useState(false)
  const [isSavingSchedule, setIsSavingSchedule] = useState(false)
  const [isRunningScheduledBackup, setIsRunningScheduledBackup] = useState(false)
  const [isCreatingSnapshot, setIsCreatingSnapshot] = useState(false)
  const [isSendingWhatsAppReport, setIsSendingWhatsAppReport] = useState(false)
  const [backupSchedule, setBackupSchedule] = useState<BackupSchedule | null>(null)
  const [backupSnapshots, setBackupSnapshots] = useState<BackupSnapshot[]>([])
  const canManageRestaurant = currentUser?.role === 'super-admin'

  useEffect(() => {
    setMounted(true)
    void loadFromDB()
  }, [loadFromDB])

  useEffect(() => {
    setFormData(settings)
  }, [settings])

  useEffect(() => {
    if (!mounted || !canManageRestaurant) return
    void loadBackupAutomation()
  }, [mounted, canManageRestaurant])

  const loadBackupAutomation = async () => {
    try {
      const [scheduleRes, snapshotsRes] = await Promise.all([
        apiFetch('/api/backup/schedule'),
        apiFetch('/api/backup/snapshots'),
      ])

      if (scheduleRes.ok) {
        const schedule = (await scheduleRes.json()) as BackupSchedule
        setBackupSchedule(schedule)
      }

      if (snapshotsRes.ok) {
        const snapshots = (await snapshotsRes.json()) as BackupSnapshot[]
        setBackupSnapshots(Array.isArray(snapshots) ? snapshots : [])
      }
    } catch (error) {
      console.error(error)
      toast.error('Failed to load backup automation settings')
    }
  }

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

      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { error?: string } | null
        throw new Error(payload?.error || 'Failed to save settings')
      }

      const saved = await res.json()
      updateSettings(saved)
      toast.success('Settings saved successfully')
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : 'Failed to save settings')
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
      a.download = `pos-full-db-backup-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      toast.success('Full database backup downloaded')
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

  const handleSaveBackupSchedule = async () => {
    if (!canManageRestaurant || !backupSchedule) return

    setIsSavingSchedule(true)
    try {
      const res = await apiFetch('/api/backup/schedule', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: backupSchedule.enabled,
          frequencyHours: backupSchedule.frequencyHours,
          retentionCount: backupSchedule.retentionCount,
          verifyChecksum: backupSchedule.verifyChecksum,
        }),
      })

      if (!res.ok) throw new Error('Failed to save backup schedule')
      const saved = (await res.json()) as BackupSchedule
      setBackupSchedule(saved)
      toast.success('Backup schedule updated')
    } catch (error) {
      console.error(error)
      toast.error('Failed to save backup schedule')
    } finally {
      setIsSavingSchedule(false)
    }
  }

  const handleRunScheduledBackupNow = async () => {
    if (!canManageRestaurant) return

    setIsRunningScheduledBackup(true)
    try {
      const res = await apiFetch('/api/backup/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: true }),
      })
      if (!res.ok) throw new Error('Failed to run scheduled backup')

      const data = await res.json()
      if (data?.schedule) {
        setBackupSchedule(data.schedule as BackupSchedule)
      }
      toast.success(data?.snapshotId ? 'Scheduled backup snapshot completed' : 'Backup schedule checked')
      await loadBackupAutomation()
    } catch (error) {
      console.error(error)
      toast.error('Failed to run scheduled backup')
    } finally {
      setIsRunningScheduledBackup(false)
    }
  }

  const handleCreateSnapshot = async () => {
    if (!canManageRestaurant) return

    setIsCreatingSnapshot(true)
    try {
      const res = await apiFetch('/api/backup/snapshots', { method: 'POST' })
      if (!res.ok) throw new Error('Failed to create verified snapshot')
      toast.success('Verified backup snapshot created')
      await loadBackupAutomation()
    } catch (error) {
      console.error(error)
      toast.error('Failed to create backup snapshot')
    } finally {
      setIsCreatingSnapshot(false)
    }
  }

  const handleSendWhatsAppReportNow = async () => {
    if (!canManageRestaurant) return

    setIsSendingWhatsAppReport(true)
    try {
      const res = await apiFetch('/api/whatsapp-reports/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: true }),
      })

      const payload = (await res.json().catch(() => null)) as
        | { sent?: Array<{ meal: string }>; skipped?: Array<{ meal?: string; reason: string }>; error?: string }
        | null

      if (!res.ok) {
        throw new Error(payload?.error || 'Failed to trigger WhatsApp report send')
      }

      const sentCount = payload?.sent?.length ?? 0
      const skippedCount = payload?.skipped?.length ?? 0
      toast.success(`WhatsApp report run complete. Sent: ${sentCount}, Skipped: ${skippedCount}`)
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : 'Failed to trigger WhatsApp reports')
    } finally {
      setIsSendingWhatsAppReport(false)
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            WhatsApp Daily Reports
          </CardTitle>
          <CardDescription>
            Send breakfast, lunch, and dinner sales summaries with customizable send times.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <fieldset disabled={!canManageRestaurant} className="space-y-4 disabled:pointer-events-none disabled:opacity-70">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="whatsappReportsEnabled">Daily WhatsApp reports</Label>
                <Select
                  value={formData.whatsappReportsEnabled === true ? 'enabled' : 'disabled'}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      whatsappReportsEnabled: value === 'enabled',
                    })
                  }
                >
                  <SelectTrigger id="whatsappReportsEnabled">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="enabled">Enabled</SelectItem>
                    <SelectItem value="disabled">Disabled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="whatsappRecipient">Recipient number</Label>
                <Input
                  id="whatsappRecipient"
                  placeholder="whatsapp:+94771234567"
                  value={formData.whatsappRecipient ?? ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      whatsappRecipient: e.target.value,
                    })
                  }
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="whatsappBreakfastTime">Breakfast report time</Label>
                <Input
                  id="whatsappBreakfastTime"
                  type="time"
                  value={formData.whatsappBreakfastTime ?? '11:00'}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      whatsappBreakfastTime: e.target.value,
                    })
                  }
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="whatsappLunchTime">Lunch report time</Label>
                <Input
                  id="whatsappLunchTime"
                  type="time"
                  value={formData.whatsappLunchTime ?? '16:00'}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      whatsappLunchTime: e.target.value,
                    })
                  }
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="whatsappDinnerTime">Dinner report time</Label>
                <Input
                  id="whatsappDinnerTime"
                  type="time"
                  value={formData.whatsappDinnerTime ?? '22:00'}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      whatsappDinnerTime: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Tip: Add the recipient as <span className="font-mono">whatsapp:+countrycodeNumber</span> (or +countrycodeNumber) and configure WhatsApp provider env vars.
            </p>

            <Button
              type="button"
              variant="outline"
              onClick={() => void handleSendWhatsAppReportNow()}
              disabled={isSendingWhatsAppReport || isSaving || isBackingUp || isRestoring}
            >
              {isSendingWhatsAppReport ? 'Sending reports...' : 'Send Reports Now (Test)'}
            </Button>
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
            <div className="grid gap-2">
              <Label htmlFor="requireCustomerBeforeOrder">Customer required before order</Label>
              <Select
                value={formData.requireCustomerBeforeOrder === true ? 'enabled' : 'disabled'}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    requireCustomerBeforeOrder: value === 'enabled',
                  })
                }
              >
                <SelectTrigger id="requireCustomerBeforeOrder">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="enabled">Enabled</SelectItem>
                  <SelectItem value="disabled">Disabled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="takeawayPageEnabled">Takeaway page access</Label>
              <Select
                value={formData.takeawayPageEnabled !== false ? 'enabled' : 'disabled'}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    takeawayPageEnabled: value === 'enabled',
                  })
                }
              >
                <SelectTrigger id="takeawayPageEnabled">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="enabled">Enabled</SelectItem>
                  <SelectItem value="disabled">Disabled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="kitchenPageEnabled">Kitchen page access</Label>
              <Select
                value={formData.kitchenPageEnabled !== false ? 'enabled' : 'disabled'}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    kitchenPageEnabled: value === 'enabled',
                  })
                }
              >
                <SelectTrigger id="kitchenPageEnabled">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="enabled">Enabled</SelectItem>
                  <SelectItem value="disabled">Disabled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            When enabled, staff must select or create a customer before starting a new order in POS.
          </p>
          <p className="text-xs text-muted-foreground">
            Disable a page to lock access for all non-super-admin users.
          </p>

          <div className="space-y-3 rounded-lg border p-4">
            <div>
              <Label>Waiter visible categories</Label>
              <p className="mt-1 text-xs text-muted-foreground">
                Choose which menu categories waiters are allowed to see. Leave all unselected to show every category.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => {
                const isSelected = (formData.waiterVisibleCategoryIds ?? []).includes(category.id)
                return (
                  <Button
                    key={category.id}
                    type="button"
                    variant={isSelected ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      const current = formData.waiterVisibleCategoryIds ?? []
                      setFormData({
                        ...formData,
                        waiterVisibleCategoryIds: isSelected
                          ? current.filter((id) => id !== category.id)
                          : [...current, category.id],
                      })
                    }}
                  >
                    {category.name}
                  </Button>
                )
              })}
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
            Full DB Backup & Restore
          </CardTitle>
          <CardDescription>
            Download a full JSON backup, or restore from a previously exported backup file.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={() => void handleBackup()} variant="outline" className="w-full sm:w-auto" disabled={!canManageRestaurant || isBackingUp || isRestoring}>
            {isBackingUp ? 'Creating full backup...' : 'Download Full DB Backup'}
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

          {canManageRestaurant && backupSchedule && (
            <div className="space-y-4 rounded-lg border p-4">
              <div>
                <h3 className="text-sm font-semibold">Scheduled + Verified Backups</h3>
                <p className="text-xs text-muted-foreground">Configure automatic backup snapshots with checksum verification and retention.</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="backup-enabled">Automation</Label>
                  <Select
                    value={backupSchedule.enabled ? 'enabled' : 'disabled'}
                    onValueChange={(value) => setBackupSchedule((current) => (current ? { ...current, enabled: value === 'enabled' } : current))}
                  >
                    <SelectTrigger id="backup-enabled">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="enabled">Enabled</SelectItem>
                      <SelectItem value="disabled">Disabled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="backup-verify">Checksum Verify</Label>
                  <Select
                    value={backupSchedule.verifyChecksum ? 'yes' : 'no'}
                    onValueChange={(value) => setBackupSchedule((current) => (current ? { ...current, verifyChecksum: value === 'yes' } : current))}
                  >
                    <SelectTrigger id="backup-verify">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">Enabled</SelectItem>
                      <SelectItem value="no">Disabled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="backup-frequency">Frequency (hours)</Label>
                  <Input
                    id="backup-frequency"
                    type="number"
                    min={1}
                    max={336}
                    value={backupSchedule.frequencyHours}
                    onChange={(e) => setBackupSchedule((current) => (current ? { ...current, frequencyHours: Number(e.target.value) || 1 } : current))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="backup-retention">Retention (snapshots)</Label>
                  <Input
                    id="backup-retention"
                    type="number"
                    min={1}
                    max={120}
                    value={backupSchedule.retentionCount}
                    onChange={(e) => setBackupSchedule((current) => (current ? { ...current, retentionCount: Number(e.target.value) || 1 } : current))}
                  />
                </div>
              </div>

              <div className="rounded-md bg-muted/40 p-3 text-xs text-muted-foreground space-y-1">
                <p>Last run: {backupSchedule.lastRunAt ? new Date(backupSchedule.lastRunAt).toLocaleString() : 'Never'}</p>
                <p>Next run: {backupSchedule.nextRunAt ? new Date(backupSchedule.nextRunAt).toLocaleString() : 'Not scheduled'}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => void handleSaveBackupSchedule()} disabled={isSavingSchedule || isBackingUp || isRestoring}>
                  {isSavingSchedule ? 'Saving schedule...' : 'Save Schedule'}
                </Button>
                <Button variant="outline" onClick={() => void handleRunScheduledBackupNow()} disabled={isRunningScheduledBackup || isBackingUp || isRestoring}>
                  {isRunningScheduledBackup ? 'Running backup...' : 'Run Scheduled Backup Now'}
                </Button>
                <Button variant="outline" onClick={() => void handleCreateSnapshot()} disabled={isCreatingSnapshot || isBackingUp || isRestoring}>
                  {isCreatingSnapshot ? 'Creating snapshot...' : 'Create Verified Snapshot'}
                </Button>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Recent backup snapshots</p>
                {backupSnapshots.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No snapshots yet.</p>
                ) : (
                  <div className="max-h-48 space-y-2 overflow-auto rounded-md border p-2">
                    {backupSnapshots.slice(0, 10).map((snapshot) => (
                      <div key={snapshot.id} className="rounded-md border bg-background p-2 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium">{snapshot.trigger.toUpperCase()}</span>
                          <span className={snapshot.verified ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}>
                            {snapshot.verified ? 'Verified' : 'Verification Failed'}
                          </span>
                        </div>
                        <div className="mt-1 text-muted-foreground">{new Date(snapshot.createdAt).toLocaleString()}</div>
                        <div className="mt-1 font-mono text-[10px] text-muted-foreground">{snapshot.checksum.slice(0, 20)}…</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
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
