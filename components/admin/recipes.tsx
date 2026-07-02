'use client'

import { useState, useEffect } from 'react'
import { apiFetch } from '@/lib/api'
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
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table')

  const [formData, setFormData] = useState({
    productId: '',
    ingredientId: '',
    quantity: '',
  })
  const [ingredientRows, setIngredientRows] = useState<Array<{ ingredientId: string; quantity: string }>>([
    { ingredientId: '', quantity: '' },
  ])

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      setLoading(true)
      const [recipesRes, menuRes, invRes] = await Promise.all([
        apiFetch('/api/product-recipes'),
        apiFetch('/api/menu-items'),
        apiFetch('/api/inventory'),
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

    try {
      if (editingId) {
        if (!formData.productId || !formData.ingredientId || !formData.quantity) {
          toast.error('Please fill all fields')
          return
        }

        // Update
        const res = await apiFetch(`/api/product-recipes/${editingId}`, {
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
        if (!formData.productId) {
          toast.error('Please select a menu item')
          return
        }

        const validRows = ingredientRows.filter((row) => row.ingredientId && parseFloat(row.quantity) > 0)
        if (validRows.length === 0) {
          toast.error('Add at least one ingredient with quantity')
          return
        }

        const duplicateIngredient = (() => {
          const seen = new Set<string>()
          for (const row of validRows) {
            if (seen.has(row.ingredientId)) return true
            seen.add(row.ingredientId)
          }
          return false
        })()

        if (duplicateIngredient) {
          toast.error('Duplicate ingredients found. Use each ingredient once per menu item.')
          return
        }

        const creationResults = await Promise.all(
          validRows.map(async (row) => {
            const res = await apiFetch('/api/product-recipes', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                productId: formData.productId,
                ingredientId: row.ingredientId,
                quantity: parseFloat(row.quantity),
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
              return { ok: false, errorMsg }
            }

            return { ok: true as const }
          })
        )

        const createdCount = creationResults.filter((result) => result.ok).length
        const failedCount = creationResults.length - createdCount

        if (createdCount > 0) {
          toast.success(`Added ${createdCount} ingredient${createdCount > 1 ? 's' : ''} to menu item`)
        }
        if (failedCount > 0) {
          const firstError = creationResults.find((result) => !result.ok)
          toast.error(`${failedCount} ingredient${failedCount > 1 ? 's' : ''} failed: ${firstError?.errorMsg ?? 'Unknown error'}`)
        }
      }

      setFormData({ productId: '', ingredientId: '', quantity: '' })
      setIngredientRows([{ ingredientId: '', quantity: '' }])
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
      const res = await apiFetch(`/api/product-recipes/${id}`, { method: 'DELETE' })
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
    setIngredientRows([{ ingredientId: '', quantity: '' }])
  }

  return (
    <div className="space-y-6 p-3 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-1">
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Product Recipes</h2>
          <p className="text-sm text-muted-foreground mt-1">Manage menu items and their required ingredients</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => {
                setEditingId(null)
                setFormData({ productId: '', ingredientId: '', quantity: '' })
                setIngredientRows([{ ingredientId: '', quantity: '' }])
              }}
              className="gap-2 w-full sm:w-auto"
            >
              <Plus className="h-5 w-5" />
              <span className="hidden sm:inline">Add Recipe</span>
              <span className="sm:hidden">Add</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[95vw] max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl">{editingId ? 'Edit Recipe' : 'Add Ingredients to Menu Item'}</DialogTitle>
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

              {editingId ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="ingredient" className="text-sm font-medium">Ingredient <span className="text-red-500">*</span></Label>
                    <Select value={formData.ingredientId} onValueChange={(v) => setFormData({ ...formData, ingredientId: v })}>
                      <SelectTrigger id="ingredient" disabled className="h-10">
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
                </>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Ingredients <span className="text-red-500">*</span></Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIngredientRows((prev) => [...prev, { ingredientId: '', quantity: '' }])}
                    >
                      <Plus className="h-4 w-4 mr-1" /> Add Ingredient
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {ingredientRows.map((row, index) => (
                      <div key={index} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_110px_auto]">
                        <Select
                          value={row.ingredientId}
                          onValueChange={(v) =>
                            setIngredientRows((prev) =>
                              prev.map((r, i) => (i === index ? { ...r, ingredientId: v } : r))
                            )
                          }
                        >
                          <SelectTrigger className="h-10">
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

                        <Input
                          type="number"
                          step="0.01"
                          min="0.01"
                          placeholder="Qty"
                          value={row.quantity}
                          onChange={(e) =>
                            setIngredientRows((prev) =>
                              prev.map((r, i) => (i === index ? { ...r, quantity: e.target.value } : r))
                            )
                          }
                          className="h-10"
                        />

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={ingredientRows.length === 1}
                          onClick={() =>
                            setIngredientRows((prev) => prev.filter((_, i) => i !== index))
                          }
                          title="Remove ingredient"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="sticky bottom-0 flex gap-2 justify-end border-t bg-background pt-6">
                <Button type="button" variant="outline" onClick={handleCloseDialog} className="px-6">
                  Cancel
                </Button>
                <Button type="submit" className="px-6">{editingId ? 'Update' : 'Create'} Recipe</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button variant={viewMode === 'cards' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('cards')}>Cards</Button>
        <Button variant={viewMode === 'table' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('table')}>Table</Button>
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
          ) : viewMode === 'table' ? (
            <div className="overflow-x-auto">
              <Table className="min-w-[760px]">
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
                            className="h-10 w-10 p-0 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-500/20 dark:hover:text-red-400"
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
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {recipes.map((recipe) => (
                <Card key={recipe.id}>
                  <CardContent className="p-4">
                    <p className="font-medium">{recipe.productName}</p>
                    <p className="text-sm text-muted-foreground">{recipe.ingredientName} ({recipe.ingredientUnit})</p>
                    <p className="mt-1 text-xs text-muted-foreground font-mono">SKU: {recipe.ingredientSku}</p>
                    <p className="mt-2 text-sm">Qty: <span className="font-semibold">{recipe.quantity}</span></p>
                    <div className="mt-3 flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(recipe)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-10 w-10 text-destructive" onClick={() => handleDelete(recipe.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
