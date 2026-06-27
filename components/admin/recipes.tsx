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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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

interface Recipe {
  id: string
  productId: string
  productName: string
  ingredientId: string
  ingredientName: string
  ingredientSku: string
  ingredientUnit: string
  quantity: number
}

interface MenuItem {
  id: string
  name: string
}

interface InventoryItem {
  id: string
  name: string
  sku: string
  unit: string
}

export function RecipesManager() {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    productId: '',
    ingredientId: '',
    quantity: '',
  })

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      setLoading(true)
      const [recipesRes, menuRes, invRes] = await Promise.all([
        fetch('/api/product-recipes'),
        fetch('/api/menu-items'),
        fetch('/api/inventory'),
      ])

      if (!recipesRes.ok) throw new Error(`Failed to fetch recipes: ${recipesRes.status}`)
      if (!menuRes.ok) throw new Error(`Failed to fetch menu items: ${menuRes.status}`)
      if (!invRes.ok) throw new Error(`Failed to fetch inventory: ${invRes.status}`)

      const recipesData = await recipesRes.json()
      const menuData = await menuRes.json()
      const invData = await invRes.json()

      setRecipes(Array.isArray(recipesData) ? recipesData : [])
      setMenuItems(Array.isArray(menuData) ? menuData : [])
      setInventory(Array.isArray(invData) ? invData : [])
    } catch (error) {
      console.error('Failed to load data:', error)
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!formData.productId || !formData.ingredientId || !formData.quantity) {
      toast.error('Please fill all fields')
      return
    }

    try {
      if (editingId) {
        // Update
        const res = await fetch(`/api/product-recipes/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ quantity: parseFloat(formData.quantity) }),
        })

        if (!res.ok) {
          let errorMsg = 'Failed to update recipe'
          try {
            const error = await res.json()
            errorMsg = error.error || errorMsg
          } catch (e) {
            // Response body is not JSON or empty
          }
          throw new Error(errorMsg)
        }

        toast.success('Recipe updated')
      } else {
        // Create
        const res = await fetch('/api/product-recipes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productId: formData.productId,
            ingredientId: formData.ingredientId,
            quantity: parseFloat(formData.quantity),
          }),
        })

        if (!res.ok) {
          let errorMsg = 'Failed to create recipe'
          try {
            const error = await res.json()
            errorMsg = error.error || errorMsg
          } catch (e) {
            // Response body is not JSON or empty
          }
          throw new Error(errorMsg)
        }

        toast.success('Recipe created')
      }

      setFormData({ productId: '', ingredientId: '', quantity: '' })
      setEditingId(null)
      setDialogOpen(false)
      await loadData()
    } catch (error: any) {
      console.error('Form submit error:', error)
      toast.error(error.message || 'Operation failed')
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this recipe?')) return

    try {
      const res = await fetch(`/api/product-recipes/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      toast.success('Recipe deleted')
      await loadData()
    } catch (error) {
      toast.error('Failed to delete recipe')
    }
  }

  function handleEdit(recipe: Recipe) {
    setFormData({
      productId: recipe.productId,
      ingredientId: recipe.ingredientId,
      quantity: recipe.quantity.toString(),
    })
    setEditingId(recipe.id)
    setDialogOpen(true)
  }

  function handleCloseDialog() {
    setDialogOpen(false)
    setEditingId(null)
    setFormData({ productId: '', ingredientId: '', quantity: '' })
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-1">
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Product Recipes</h2>
          <p className="text-sm text-muted-foreground mt-1">Manage menu items and their required ingredients</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingId(null)} className="gap-2 w-full sm:w-auto">
              <Plus className="h-5 w-5" />
              <span className="hidden sm:inline">Add Recipe</span>
              <span className="sm:hidden">Add</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="w-full max-w-md mx-4 sm:mx-auto">
            <DialogHeader>
              <DialogTitle className="text-xl">{editingId ? 'Edit Recipe' : 'Add New Recipe'}</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-5 py-4">
              <div className="space-y-2">
                <Label htmlFor="product" className="text-sm font-medium">Menu Item <span className="text-red-500">*</span></Label>
                <Select value={formData.productId} onValueChange={(v) => setFormData({ ...formData, productId: v })}>
                  <SelectTrigger id="product" disabled={Boolean(editingId)} className="h-10">
                    <SelectValue placeholder="Select menu item" />
                  </SelectTrigger>
                  <SelectContent>
                    {menuItems.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ingredient" className="text-sm font-medium">Ingredient <span className="text-red-500">*</span></Label>
                <Select value={formData.ingredientId} onValueChange={(v) => setFormData({ ...formData, ingredientId: v })}>
                  <SelectTrigger id="ingredient" disabled={Boolean(editingId)} className="h-10">
                    <SelectValue placeholder="Select ingredient" />
                  </SelectTrigger>
                  <SelectContent>
                    {inventory.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name} ({item.unit})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantity" className="text-sm font-medium">
                  Quantity Required <span className="text-red-500">*</span>
                  {formData.ingredientId && (
                    <span className="text-xs text-muted-foreground ml-2">
                      ({inventory.find((i) => i.id === formData.ingredientId)?.unit})
                    </span>
                  )}
                </Label>
                <Input
                  id="quantity"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="e.g., 2"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  className="h-10"
                />
              </div>

              <div className="flex gap-2 justify-end pt-6">
                <Button type="button" variant="outline" onClick={handleCloseDialog} className="px-6">
                  Cancel
                </Button>
                <Button type="submit" className="px-6">{editingId ? 'Update' : 'Create'} Recipe</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">All Recipes ({recipes.length})</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {loading ? (
            <div className="py-12 text-center text-muted-foreground">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-primary mb-2"></div>
              <p>Loading recipes...</p>
            </div>
          ) : recipes.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">No recipes yet. Create one to get started.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b bg-muted/30 hover:bg-muted/30">
                    <TableHead className="font-semibold text-foreground">Menu Item</TableHead>
                    <TableHead className="font-semibold text-foreground">Ingredient</TableHead>
                    <TableHead className="font-semibold text-foreground">SKU</TableHead>
                    <TableHead className="text-right font-semibold text-foreground">Qty</TableHead>
                    <TableHead className="font-semibold text-foreground">Unit</TableHead>
                    <TableHead className="text-right font-semibold text-foreground w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recipes.map((recipe, idx) => (
                    <TableRow
                      key={recipe.id}
                      className={idx % 2 === 0 ? 'bg-card/80 dark:bg-card/80' : 'bg-muted/40 dark:bg-muted/20'}
                    >
                      <TableCell className="font-medium text-foreground">{recipe.productName}</TableCell>
                      <TableCell className="text-foreground">{recipe.ingredientName}</TableCell>
                      <TableCell className="text-sm text-muted-foreground font-mono">{recipe.ingredientSku}</TableCell>
                      <TableCell className="text-right font-semibold">{recipe.quantity}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{recipe.ingredientUnit}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(recipe)}
                            className="h-8 w-8 p-0 hover:bg-blue-100 hover:text-blue-600 dark:hover:bg-blue-500/20 dark:hover:text-blue-400"
                            title="Edit recipe"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(recipe.id)}
                            className="h-8 w-8 p-0 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-500/20 dark:hover:text-red-400"
                            title="Delete recipe"
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
