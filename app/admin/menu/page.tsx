'use client'

import Image from 'next/image'
import { useState } from 'react'
import { usePOSStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Plus, Pencil, Trash2, Search, Upload, X, Image as ImageIcon } from 'lucide-react'
import { toast } from 'sonner'
import type { MenuItem } from '@/lib/types'

export default function MenuManagementPage() {
  const { menuItems, categories, settings, addMenuItem, updateMenuItem, deleteMenuItem, toggleItemAvailability } = usePOSStore()
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [showForm, setShowForm] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards')
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: 0,
    categoryId: '',
    isAvailable: true,
    applyServiceCharge: false,
    prepStation: 'kitchen' as 'kitchen' | 'ben-marie',
    image: '',
  })

  const filteredItems = menuItems.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = categoryFilter === 'all' || item.categoryId === categoryFilter
    return matchesSearch && matchesCategory
  })

  const handleEdit = (item: MenuItem) => {
    setSelectedItem(item)
    setFormData({
      name: item.name,
      description: item.description || '',
      price: item.price,
      categoryId: item.categoryId,
      isAvailable: item.isAvailable,
      applyServiceCharge: item.applyServiceCharge ?? false,
      prepStation: item.prepStation ?? 'kitchen',
      image: item.image ?? '',
    })
    setShowForm(true)
  }

  const handleAdd = () => {
    setSelectedItem(null)
    setFormData({
      name: '',
      description: '',
      price: 0,
      categoryId: categories[0]?.id || '',
      isAvailable: true,
      applyServiceCharge: false,
      prepStation: 'kitchen',
      image: '',
    })
    setShowForm(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedItem) {
      updateMenuItem(selectedItem.id, formData)
      toast.success('Menu item updated')
    } else {
      addMenuItem({
        id: `item-${Date.now()}`,
        ...formData,
        modifierGroups: [],
      })
      toast.success('Menu item added')
    }
    setShowForm(false)
  }

  const handleDelete = (item: MenuItem) => {
    setSelectedItem(item)
    setShowDeleteConfirm(true)
  }

  const confirmDelete = () => {
    if (selectedItem) {
      deleteMenuItem(selectedItem.id)
      toast.success('Menu item deleted')
      setSelectedItem(null)
      setShowDeleteConfirm(false)
    }
  }

  const getCategoryName = (categoryId: string) => {
    return categories.find((c) => c.id === categoryId)?.name || 'Unknown'
  }

  return (
    <div className="space-y-6 p-3 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Menu Management</h1>
          <p className="text-muted-foreground">Manage your menu items and categories</p>
        </div>
        <Button onClick={handleAdd} className="w-full gap-2 sm:w-auto">
          <Plus className="h-4 w-4" />
          Add Item
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search menu items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button variant={viewMode === 'cards' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('cards')}>Cards</Button>
        <Button variant={viewMode === 'table' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('table')}>Table</Button>
      </div>

      {viewMode === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => (
            <Card key={item.id} className={!item.isAvailable ? 'opacity-60' : ''}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold text-foreground">{item.name}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {item.description || 'No description'}
                    </p>
                  </div>
                  <span className="text-lg font-bold text-primary">
                    {settings.currencySymbol}{item.price.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{getCategoryName(item.categoryId)}</Badge>
                    <Badge variant={item.prepStation === 'ben-marie' ? 'secondary' : 'default'}>
                      {item.prepStation === 'ben-marie' ? 'Ben-Marie' : 'Kitchen'}
                    </Badge>
                    {item.applyServiceCharge && <Badge variant="secondary">Service Charge</Badge>}
                    {!item.isAvailable && (
                      <Badge variant="secondary">Unavailable</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Switch
                      checked={item.isAvailable}
                      onCheckedChange={() => toggleItemAvailability(item.id)}
                    />
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 text-destructive"
                      onClick={() => handleDelete(item)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="min-w-[720px] w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="p-3 text-left">Item</th>
                <th className="p-3 text-left">Category</th>
                <th className="p-3 text-left">Price</th>
                <th className="p-3 text-left">Prep Station</th>
                <th className="p-3 text-left">Service Charge</th>
                <th className="p-3 text-left">Available</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => (
                <tr key={item.id} className="border-t">
                  <td className="p-3">
                    <div className="font-medium">{item.name}</div>
                    <div className="text-xs text-muted-foreground">{item.description || 'No description'}</div>
                  </td>
                  <td className="p-3"><Badge variant="outline">{getCategoryName(item.categoryId)}</Badge></td>
                  <td className="p-3">{settings.currencySymbol}{item.price.toFixed(2)}</td>
                  <td className="p-3">
                    <Badge variant={item.prepStation === 'ben-marie' ? 'secondary' : 'default'}>
                      {item.prepStation === 'ben-marie' ? 'Ben-Marie' : 'Kitchen'}
                    </Badge>
                  </td>
                  <td className="p-3">{item.applyServiceCharge ? 'Yes' : 'No'}</td>
                  <td className="p-3">
                    <Switch checked={item.isAvailable} onCheckedChange={() => toggleItemAvailability(item.id)} />
                  </td>
                  <td className="p-3">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-10 w-10 text-destructive" onClick={() => handleDelete(item)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="w-[95vw] max-w-lg max-h-[92vh] overflow-hidden p-0">
          <DialogHeader className="px-6 pt-6 pb-2">
            <DialogTitle>{selectedItem ? 'Edit Menu Item' : 'Add Menu Item'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 pb-6">
              <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="grid gap-2 sm:col-span-2">
                  <Label>Item Picture</Label>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    {formData.image ? (
                      <div className="relative h-24 w-24 overflow-hidden rounded-lg border bg-muted">
                        <Image
                          src={formData.image}
                          alt={formData.name || 'Menu item'}
                          fill
                          className="object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, image: '' })}
                          className="absolute right-0.5 top-0.5 rounded-full bg-destructive p-0.5 text-destructive-foreground"
                          aria-label="Remove image"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex h-24 w-24 items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted text-muted-foreground">
                        <ImageIcon className="h-8 w-8 opacity-40" />
                      </div>
                    )}

                    <div className="flex flex-col gap-2">
                      <Label
                        htmlFor="item-image-upload"
                        className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:bg-accent"
                      >
                        <Upload className="h-4 w-4" />
                        {formData.image ? 'Replace Picture' : 'Upload Picture'}
                      </Label>
                      <Input
                        id="item-image-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (!file) return
                          const reader = new FileReader()
                          reader.onload = (ev) => {
                            setFormData({ ...formData, image: (ev.target?.result as string) ?? '' })
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
                  <Label htmlFor="price">Price</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={formData.categoryId}
                    onValueChange={(value) => setFormData({ ...formData, categoryId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="prepStation">Prep Station</Label>
                  <Select
                    value={formData.prepStation}
                    onValueChange={(value) => setFormData({ ...formData, prepStation: value as 'kitchen' | 'ben-marie' })}
                  >
                    <SelectTrigger id="prepStation">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kitchen">Kitchen</SelectItem>
                      <SelectItem value="ben-marie">Ben-Marie</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.isAvailable}
                  onCheckedChange={(checked) => setFormData({ ...formData, isAvailable: checked })}
                />
                <Label>Available</Label>
              </div>
              <div className="flex items-center gap-2 pb-2">
                <Switch
                  checked={formData.applyServiceCharge}
                  onCheckedChange={(checked) => setFormData({ ...formData, applyServiceCharge: checked })}
                />
                <Label>Apply service charge</Label>
              </div>
            </div>
            <div className="shrink-0 flex flex-col-reverse gap-2 border-t bg-background px-6 py-4 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button type="submit" className="w-full sm:w-auto">{selectedItem ? 'Update' : 'Add'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Menu Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedItem?.name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="h-10 bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
