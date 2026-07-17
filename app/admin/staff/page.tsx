'use client'

import { useEffect, useMemo, useState } from 'react'
import { apiFetch } from '@/lib/api'
import { getAllRoleDefinitions, getRoleDisplayName, hasEffectiveRole, resolveEffectiveRole, slugifyRoleName, SYSTEM_ROLE_DEFINITIONS } from '@/lib/roles'
import { usePOSStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
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
import { Plus, Pencil, Trash2, User } from 'lucide-react'
import { toast } from 'sonner'
import type { BuiltInRole, Role, RoleDefinition, User as UserType } from '@/lib/types'

export default function StaffManagementPage() {
  const { users, currentUser, settings, updateSettings, addUser, updateUser, deleteUser, loadFromDB } = usePOSStore()
  const [showForm, setShowForm] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showRoleForm, setShowRoleForm] = useState(false)
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards')
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null)
  const [selectedRole, setSelectedRole] = useState<RoleDefinition | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    pin: '',
    role: 'biller' as Role,
  })
  const [roleForm, setRoleForm] = useState({
    name: '',
    baseRole: 'biller' as Exclude<BuiltInRole, 'super-admin'>,
  })
  const canManageSuperAdmins = currentUser?.role === 'super-admin'
  const customRoles = settings.customRoles ?? []
  const roleDefinitions = useMemo(() => getAllRoleDefinitions(settings), [settings])

  useEffect(() => {
    void loadFromDB()
  }, [loadFromDB])

  const assignableRoles = useMemo(
    () => roleDefinitions
      .filter((role) => canManageSuperAdmins || role.baseRole !== 'super-admin')
      .map((role) => ({ value: role.id, label: role.name })),
    [canManageSuperAdmins, roleDefinitions]
  )

  useEffect(() => {
    const isCurrentRoleAssignable = assignableRoles.some((r) => r.value === formData.role)
    if (!isCurrentRoleAssignable && assignableRoles.length > 0) {
      setFormData((prev) => ({ ...prev, role: assignableRoles[0].value as Role }))
    }
  }, [assignableRoles, formData.role])

  const handleEdit = (user: UserType) => {
    if (user.role === 'super-admin' && !canManageSuperAdmins) {
      toast.error('Only the super admin can edit the owner account')
      return
    }
    setSelectedUser(user)
    setFormData({
      name: user.name,
      pin: user.pin,
      role: user.role,
    })
    setShowForm(true)
  }

  const handleAdd = () => {
    setSelectedUser(null)
    setFormData({
      name: '',
      pin: '',
      role: 'biller',
    })
    setShowForm(true)
  }

  const handleAddRole = () => {
    setSelectedRole(null)
    setRoleForm({
      name: '',
      baseRole: 'biller',
    })
    setShowRoleForm(true)
  }

  const handleEditRole = (role: RoleDefinition) => {
    setSelectedRole(role)
    setRoleForm({
      name: role.name,
      baseRole: role.baseRole === 'super-admin' ? 'biller' : role.baseRole,
    })
    setShowRoleForm(true)
  }

  const persistCustomRoles = async (nextRoles: RoleDefinition[]) => {
    const res = await apiFetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...settings,
        customRoles: nextRoles,
      }),
    })

    if (!res.ok) {
      const payload = (await res.json().catch(() => null)) as { error?: string } | null
      throw new Error(payload?.error || 'Failed to save roles')
    }

    const saved = await res.json()
    updateSettings(saved)
  }

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!canManageSuperAdmins) {
      toast.error('Only super admin can manage custom roles')
      return
    }

    const trimmedName = roleForm.name.trim()
    if (!trimmedName) {
      toast.error('Role name is required')
      return
    }

    const duplicateName = customRoles.find((role) => role.name.toLowerCase() === trimmedName.toLowerCase() && role.id !== selectedRole?.id)
    if (duplicateName || SYSTEM_ROLE_DEFINITIONS.some((role) => role.name.toLowerCase() === trimmedName.toLowerCase())) {
      toast.error('Role name already exists')
      return
    }

    const nextRole: RoleDefinition = selectedRole
      ? { ...selectedRole, name: trimmedName, baseRole: roleForm.baseRole }
      : {
          id: `custom-${slugifyRoleName(trimmedName) || 'role'}-${Date.now()}`,
          name: trimmedName,
          baseRole: roleForm.baseRole,
        }

    const nextRoles = selectedRole
      ? customRoles.map((role) => (role.id === selectedRole.id ? nextRole : role))
      : [...customRoles, nextRole]

    try {
      await persistCustomRoles(nextRoles)
      toast.success(selectedRole ? 'Role updated' : 'Role created')
      setShowRoleForm(false)
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : 'Failed to save role')
    }
  }

  const handleDeleteRole = async (role: RoleDefinition) => {
    if (!canManageSuperAdmins) {
      toast.error('Only super admin can manage custom roles')
      return
    }

    const assignedUsers = users.filter((user) => user.role === role.id)
    if (assignedUsers.length > 0) {
      toast.error(`Cannot delete role. It is assigned to ${assignedUsers.length} staff member${assignedUsers.length === 1 ? '' : 's'}.`)
      return
    }

    if (!confirm(`Delete role ${role.name}?`)) return

    try {
      await persistCustomRoles(customRoles.filter((entry) => entry.id !== role.id))
      toast.success('Role deleted')
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : 'Failed to delete role')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (formData.role === 'super-admin' && !canManageSuperAdmins) {
      toast.error('Only super admin can create a super-admin account')
      return
    }

    // Check for duplicate PIN
    const existingUser = users.find(
      (u) => u.pin === formData.pin && u.id !== selectedUser?.id
    )
    if (existingUser) {
      toast.error(`PIN already used by ${existingUser.name}`)
      return
    }

    if (formData.pin.length !== 4) {
      toast.error('PIN must be 4 digits')
      return
    }

    if (selectedUser) {
      const updateError = await updateUser(selectedUser.id, formData)
      if (updateError) {
        toast.error(updateError)
        return
      }
      toast.success('Staff member updated')
    } else {
      const addError = await addUser({
        id: `user-${Date.now()}`,
        ...formData,
      })
      if (addError) {
        toast.error(addError)
        return
      }
      toast.success('Staff member added')
    }
    setShowForm(false)
  }

  const handleDelete = (user: UserType) => {
    if (user.role === 'super-admin' && !canManageSuperAdmins) {
      toast.error('Only the super admin can delete the owner account')
      return
    }
    setSelectedUser(user)
    setShowDeleteConfirm(true)
  }

  const confirmDelete = async () => {
    if (selectedUser) {
      const deleteError = await deleteUser(selectedUser.id)
      if (deleteError) {
        toast.error(deleteError)
        return
      }
      toast.success('Staff member deleted')
      setSelectedUser(null)
      setShowDeleteConfirm(false)
    }
  }

  const getRoleBadgeColor = (role: Role) => {
    switch (resolveEffectiveRole(role, settings)) {
      case 'super-admin':
        return 'bg-violet-600 text-white'
      case 'admin':
        return 'bg-primary text-primary-foreground'
      case 'biller':
        return 'bg-indigo-600 text-white dark:bg-indigo-500 dark:text-slate-950'
      case 'cashier':
        return 'bg-emerald-600 text-white dark:bg-emerald-500 dark:text-slate-950'
      case 'kitchen':
        return 'bg-warning text-warning-foreground'
      case 'takeaway':
        return 'bg-orange-600 text-white dark:bg-orange-500 dark:text-slate-950'
      case 'waiter':
        return 'bg-sky-600 text-white dark:bg-sky-500 dark:text-slate-950'
      default:
        return ''
    }
  }

  return (
    <div className="space-y-6 p-3 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Staff Management</h1>
          <p className="text-muted-foreground">Manage staff members and their roles</p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          {canManageSuperAdmins && (
            <Button variant="outline" onClick={handleAddRole} className="w-full gap-2 sm:w-auto">
              <Plus className="h-4 w-4" />
              Add Role
            </Button>
          )}
          <Button onClick={handleAdd} className="w-full gap-2 sm:w-auto">
            <Plus className="h-4 w-4" />
            Add Staff
          </Button>
        </div>
      </div>

      {canManageSuperAdmins && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {customRoles.length === 0 ? (
            <Card className="lg:col-span-2 xl:col-span-3">
              <CardContent className="p-4 text-sm text-muted-foreground">
                No custom roles yet. Create a role and choose which built-in access profile it should inherit.
              </CardContent>
            </Card>
          ) : customRoles.map((role) => (
            <Card key={role.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-foreground">{role.name}</h3>
                    <p className="text-sm text-muted-foreground">Inherits: {getRoleDisplayName(role.baseRole, settings)}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Assigned: {users.filter((user) => user.role === role.id).length}</p>
                  </div>
                  <Badge className={getRoleBadgeColor(role.id)}>{getRoleDisplayName(role.id, settings)}</Badge>
                </div>
                <div className="mt-4 flex justify-end gap-1">
                  <Button variant="ghost" size="icon" onClick={() => handleEditRole(role)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="text-destructive" onClick={() => void handleDeleteRole(role)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="flex items-center justify-end gap-2">
        <Button variant={viewMode === 'cards' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('cards')}>Cards</Button>
        <Button variant={viewMode === 'table' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('table')}>Table</Button>
      </div>

      {viewMode === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {users.map((user) => (
            <Card key={user.id}>
              <CardContent className="p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center ${getRoleBadgeColor(user.role)}`}>
                      <User className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{user.name}</h3>
                      <p className="text-sm text-muted-foreground">PIN: {user.pin}</p>
                    </div>
                  </div>
                  <Badge className={`w-fit ${getRoleBadgeColor(user.role)}`}>
                    {getRoleDisplayName(user.role, settings)}
                  </Badge>
                </div>
                <div className="flex justify-end gap-1 mt-4">
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(user)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 text-destructive"
                    onClick={() => handleDelete(user)}
                    disabled={user.id === currentUser?.id || (user.role === 'super-admin' && !canManageSuperAdmins)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="min-w-[680px] w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="p-3 text-left">Name</th>
                <th className="p-3 text-left">PIN</th>
                <th className="p-3 text-left">Role</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-t">
                  <td className="p-3 font-medium">{user.name}</td>
                  <td className="p-3">{user.pin}</td>
                  <td className="p-3"><Badge className={getRoleBadgeColor(user.role)}>{getRoleDisplayName(user.role, settings)}</Badge></td>
                  <td className="p-3">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(user)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-10 w-10 text-destructive" onClick={() => handleDelete(user)} disabled={user.id === currentUser?.id || (user.role === 'super-admin' && !canManageSuperAdmins)}><Trash2 className="h-4 w-4" /></Button>
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
        <DialogContent className="w-[95vw] max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedUser ? 'Edit Staff' : 'Add Staff'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
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
              <Label htmlFor="pin">PIN (4 digits)</Label>
              <Input
                id="pin"
                type="text"
                inputMode="numeric"
                pattern="[0-9]{4}"
                maxLength={4}
                value={formData.pin}
                onChange={(e) => setFormData({ ...formData, pin: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                placeholder="0000"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="role">Role</Label>
              <Select
                value={formData.role}
                onValueChange={(value) => setFormData({ ...formData, role: value as Role })}
              >
                <SelectTrigger className="w-full" id="role">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {assignableRoles.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!canManageSuperAdmins && (
                <p className="text-xs text-muted-foreground">Only super admin can assign the super-admin role.</p>
              )}
            </div>
            <div className="sticky bottom-0 flex flex-col-reverse gap-2 border-t bg-background pt-4 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button type="submit" className="w-full sm:w-auto">{selectedUser ? 'Update' : 'Add'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showRoleForm} onOpenChange={setShowRoleForm}>
        <DialogContent className="w-[95vw] max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedRole ? 'Edit Role' : 'Create Role'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveRole} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="role-name">Role Name</Label>
              <Input
                id="role-name"
                value={roleForm.name}
                onChange={(e) => setRoleForm((current) => ({ ...current, name: e.target.value }))}
                placeholder="e.g. Floor Supervisor"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="role-base">Access Template</Label>
              <Select
                value={roleForm.baseRole}
                onValueChange={(value) => setRoleForm((current) => ({ ...current, baseRole: value as Exclude<BuiltInRole, 'super-admin'> }))}
              >
                <SelectTrigger id="role-base">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SYSTEM_ROLE_DEFINITIONS.filter((role) => role.baseRole !== 'super-admin').map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Custom roles inherit permissions from the selected built-in role.</p>
            </div>
            <div className="sticky bottom-0 flex flex-col-reverse gap-2 border-t bg-background pt-4 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => setShowRoleForm(false)}>
                Cancel
              </Button>
              <Button type="submit" className="w-full sm:w-auto">{selectedRole ? 'Update Role' : 'Create Role'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Staff Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedUser?.name}? This action cannot be undone.
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
