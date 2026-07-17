'use client'

import { useEffect, useMemo, useState } from 'react'
import { apiFetch } from '@/lib/api'
import { usePOSStore } from '@/lib/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ListFilter, RefreshCw, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import type { AuditLog } from '@/lib/types'

type RoleFilter = 'all' | 'super-admin' | 'admin' | 'biller' | 'cashier' | 'kitchen' | 'takeaway'

export default function ActivityLogPage() {
  const { currentUser } = usePOSStore()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [action, setAction] = useState('all')
  const [resource, setResource] = useState('all')
  const [actorRole, setActorRole] = useState<RoleFilter>('all')

  async function loadLogs() {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      params.set('limit', '300')
      if (query.trim()) params.set('query', query.trim())
      if (action !== 'all') params.set('action', action)
      if (resource !== 'all') params.set('resource', resource)
      if (actorRole !== 'all') params.set('actorRole', actorRole)

      const res = await apiFetch(`/api/audit-logs?${params.toString()}`)
      if (!res.ok) throw new Error(`Failed to load activity logs (${res.status})`)
      const data = await res.json()
      setLogs(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Failed to load activity logs', error)
      toast.error('Failed to load activity logs')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!currentUser || !['admin', 'super-admin'].includes(currentUser.role)) return
    void loadLogs()
  }, [currentUser])

  const actionOptions = useMemo(() => {
    const values = Array.from(new Set(logs.map((log) => log.action).filter(Boolean))).sort()
    return values
  }, [logs])

  const resourceOptions = useMemo(() => {
    const values = Array.from(new Set(logs.map((log) => log.resource).filter(Boolean))).sort()
    return values
  }, [logs])

  if (!currentUser || !['admin', 'super-admin'].includes(currentUser.role)) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6 text-muted-foreground">
        You do not have access to this page.
      </div>
    )
  }

  return (
    <div className="space-y-6 p-3 sm:p-6">
      <div className="rounded-2xl border border-sky-200 bg-sky-50/80 p-4 shadow-sm dark:border-sky-900/40 dark:bg-card/80">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700 dark:text-sky-300">Security</p>
            <h1 className="text-2xl font-bold text-foreground">Activity Log</h1>
            <p className="text-sm text-muted-foreground">Monitor sensitive system actions and operational changes.</p>
          </div>
          <Badge variant="secondary" className="w-fit gap-2">
            <ShieldCheck className="h-3.5 w-3.5" />
            {logs.length} records
          </Badge>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <ListFilter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.2fr_1fr_1fr_1fr_auto_auto]">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search action, actor, resource"
          />

          <Select value={action} onValueChange={setAction}>
            <SelectTrigger>
              <SelectValue placeholder="Action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All actions</SelectItem>
              {actionOptions.map((value) => (
                <SelectItem key={value} value={value}>{value}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={resource} onValueChange={setResource}>
            <SelectTrigger>
              <SelectValue placeholder="Resource" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All resources</SelectItem>
              {resourceOptions.map((value) => (
                <SelectItem key={value} value={value}>{value}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={actorRole} onValueChange={(value) => setActorRole(value as RoleFilter)}>
            <SelectTrigger>
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              <SelectItem value="super-admin">Super Admin</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="biller">Biller</SelectItem>
              <SelectItem value="cashier">Cashier</SelectItem>
              <SelectItem value="kitchen">Kitchen</SelectItem>
              <SelectItem value="takeaway">Takeaway</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={() => { setQuery(''); setAction('all'); setResource('all'); setActorRole('all') }}>
            Reset
          </Button>

          <Button onClick={() => void loadLogs()} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Audit Events</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 text-center text-muted-foreground">Loading activity logs...</div>
          ) : logs.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">No activity records found for the selected filters.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-[1150px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Resource</TableHead>
                    <TableHead>Actor</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>IP</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap">{new Date(log.createdAt).toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{log.action}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {log.resource}
                        {log.resourceId ? <span className="ml-1 text-xs text-muted-foreground">({log.resourceId})</span> : null}
                      </TableCell>
                      <TableCell>{log.actorName || log.actorId || 'system'}</TableCell>
                      <TableCell>{log.actorRole || '—'}</TableCell>
                      <TableCell>{log.ipAddress || '—'}</TableCell>
                      <TableCell className="max-w-[420px] text-muted-foreground">
                        <div className="max-h-12 overflow-hidden text-ellipsis">{log.details ? JSON.stringify(log.details) : '—'}</div>
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
