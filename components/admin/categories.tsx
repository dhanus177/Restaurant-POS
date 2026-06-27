'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Trash2, Plus, Edit2 } from 'lucide-react'
import { toast } from 'sonner'

interface Category {
  id: string
  name: string
  order: number
  color?: string
  description?: string
}

export function CategoriesManager() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#000000',
  })

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      setLoading(true)
      const res = await fetch('/api/categories')
      if (!res.ok) throw new Error(`Failed to fetch categories: ${res.status}`)
      const data = await res.json()
      setCategories(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Failed to load categories:', error)
      toast.error('Failed to load categories')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!formData.name.trim()) {
      toast.error('Category name is required')
      return
    }

    try {
      if (editingId) {
        // Update
        const res = await fetch(`/api/categories/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name,
            description: formData.description || null,
            color: formData.color,
          }),
        })

        if (!res.ok) {
          let errorMsg = 'Failed to update category'
          try {
            const error = await res.json()
            errorMsg = error.error || errorMsg
          } catch (e) {
            // Response body is not JSON or empty
          }
          throw new Error(errorMsg)
        }

        toast.success('Category updated')
      } else {
        // Create
        const res = await fetch('/api/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name,
            description: formData.description || null,
            color: formData.color,
            order: categories.length,
          }),
        })

        if (!res.ok) {
          let errorMsg = 'Failed to create category'
          try {
            const error = await res.json()
            errorMsg = error.error || errorMsg
          } catch (e) {
            // Response body is not JSON or empty
          }
          throw new Error(errorMsg)
        }

        toast.success('Category created')
      }

      setFormData({ name: '', description: '', color: '#000000' })
      setEditingId(null)
      setDialogOpen(false)
      await loadData()
    } catch (error: any) {
      console.error('Form submit error:', error)
      toast.error(error.message || 'Operation failed')
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this category?')) return

    try {
      const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      toast.success('Category deleted')
      await loadData()
    } catch (error) {
      toast.error('Failed to delete category')
    }
  }

  function handleEdit(category: Category) {
    setFormData({
      name: category.name,
      description: category.description || '',
      color: category.color || '#3B82F6',
    })
    setEditingId(category.id)
    setDialogOpen(true)
  }

  function handleCloseDialog() {
    setDialogOpen(false)
    setEditingId(null)
    setFormData({ name: '', description: '', color: '#000000' })
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-1">
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Categories</h2>
          <p className="text-sm text-muted-foreground mt-1">Organize your menu items into categories</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingId(null)} className="gap-2 w-full sm:w-auto">
              <Plus className="h-5 w-5" />
              <span className="hidden sm:inline">Add Category</span>
              <span className="sm:hidden">Add</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="w-full max-w-md mx-4 sm:mx-auto">
            <DialogHeader>
              <DialogTitle className="text-xl">{editingId ? 'Edit Category' : 'Add New Category'}</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-5 py-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium">Category Name <span className="text-red-500">*</span></Label>
                <Input
                  id="name"
                  placeholder="e.g., Appetizers"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="h-10"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-medium">Description</Label>
                <Input
                  id="description"
                  placeholder="Optional description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="h-10"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="color" className="text-sm font-medium">Color</Label>
                <div className="flex gap-2 items-center">
                  <input
                    id="color"
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="h-10 w-14 rounded cursor-pointer"
                  />
                  <span className="text-xs text-muted-foreground font-mono">{formData.color}</span>
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-6">
                <Button type="button" variant="outline" onClick={handleCloseDialog} className="px-6">
                  Cancel
                </Button>
                <Button type="submit" className="px-6">{editingId ? 'Update' : 'Create'} Category</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">All Categories ({categories.length})</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {loading ? (
            <div className="py-12 text-center text-muted-foreground">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-primary mb-2"></div>
              <p>Loading categories...</p>
            </div>
          ) : categories.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">No categories yet. Create one to get started.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b bg-muted/30 hover:bg-muted/30">
                    <TableHead className="font-semibold text-foreground">Color</TableHead>
                    <TableHead className="font-semibold text-foreground">Category Name</TableHead>
                    <TableHead className="font-semibold text-foreground">Description</TableHead>
                    <TableHead className="text-right font-semibold text-foreground">Order</TableHead>
                    <TableHead className="text-right font-semibold text-foreground w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map((category, idx) => (
                    <TableRow
                      key={category.id}
                      className={idx % 2 === 0 ? 'bg-card/80 dark:bg-card/80' : 'bg-muted/40 dark:bg-muted/20'}
                    >
                      <TableCell>
                        <div
                          className="h-6 w-6 rounded border border-border"
                          style={{ backgroundColor: category.color || '#000000' }}
                          title={category.color}
                        />
                      </TableCell>
                      <TableCell className="font-medium text-foreground">{category.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{category.description || '—'}</TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">{category.order}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(category)}
                            className="h-8 w-8 p-0 hover:bg-blue-100 hover:text-blue-600 dark:hover:bg-blue-500/20 dark:hover:text-blue-400"
                            title="Edit category"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(category.id)}
                            className="h-8 w-8 p-0 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-500/20 dark:hover:text-red-400"
                            title="Delete category"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
