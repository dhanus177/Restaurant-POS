'use client'

import { useState } from 'react'
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
import { Store, Receipt, DollarSign, Save, Upload, X } from 'lucide-react'
import Image from 'next/image'

const currencies = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '\u20AC', name: 'Euro' },
  { code: 'GBP', symbol: '\u00A3', name: 'British Pound' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
]

export default function SettingsPage() {
  const { settings, updateSettings } = usePOSStore()
  const [formData, setFormData] = useState(settings)

  const handleSave = () => {
    updateSettings(formData)
    toast.success('Settings saved successfully')
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

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground">Configure your restaurant POS system</p>
      </div>

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
          {/* Logo Upload */}
          <div className="grid gap-2">
            <Label>Company Logo</Label>
            <div className="flex items-center gap-4">
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
        </CardContent>
      </Card>

      {/* Tax & Currency */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Tax & Currency
          </CardTitle>
          <CardDescription>
            Configure tax rates and currency settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="taxRate">Tax Rate (%)</Label>
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
        </CardContent>
      </Card>

      <Separator />

      <div className="flex justify-end">
        <Button onClick={handleSave} size="lg" className="gap-2">
          <Save className="h-4 w-4" />
          Save Settings
        </Button>
      </div>
    </div>
  )
}
