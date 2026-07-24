'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Plus, Building2, Users, Edit3, Trash2, Coffee, Settings } from 'lucide-react';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import EmptyState from '@/components/shared/EmptyState';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import { PageSkeleton } from '@/components/shared/LoadingSkeleton';
import StatusBadge from '@/components/shared/StatusBadge';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';

function SimpleSelect({ value, onChange, options, className, placeholder }) {
  return (<select value={value} onChange={e => onChange(e.target.value)} className={cn('flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring', className)}>
    {placeholder && <option value="">{placeholder}</option>}
    {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
  </select>);
}

export default function DepartmentsPage() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editDept, setEditDept] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', head: '', breakSlots: 1 });

  const { data, isLoading } = useQuery({
    queryKey: ['departments'],
    queryFn: () => api.get('/departments?active=false').then(r => r.data),
  });

  const { data: usersData } = useQuery({
    queryKey: ['users-list'],
    queryFn: () => api.get('/users').then(r => r.data),
  });
  const managers = usersData?.users?.filter(u => ['admin', 'manager', 'team-lead'].includes(u.role)) || [];

  const createMut = useMutation({
    mutationFn: p => api.post('/departments', p),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['departments'] }); setShowCreate(false); setForm({ name: '', description: '', head: '', breakSlots: 1 }); toast.success('Department created'); },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, ...d }) => api.put(`/departments/${id}`, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['departments'] }); setEditDept(null); toast.success('Updated'); },
  });

  const toggleMut = useMutation({
    mutationFn: (id) => api.put(`/departments/${id}`, { action: 'toggle' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['departments'] }); toast.success('Status changed'); },
  });

  const deleteMut = useMutation({
    mutationFn: (id) => api.delete(`/departments/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['departments'] }); setDeleteId(null); toast.success('Deleted'); },
  });

  if (isLoading) return <PageSkeleton />;
  const depts = data?.departments || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Departments</h2>
          <p className="text-sm text-muted-foreground">{depts.length} departments configured</p>
        </div>
        <Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-1.5" /> Add Department</Button>
      </div>

      {depts.length === 0 ? (
        <EmptyState icon={Building2} title="No departments" description="Create departments to organize your team"
          action={<Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-1" /> Add</Button>} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {depts.map((dept, i) => (
            <motion.div key={dept._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className={cn('relative overflow-hidden', !dept.isActive && 'opacity-60')}>
                <div className="absolute top-0 left-0 right-0 h-1 bg-primary" />
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{dept.name}</h3>
                        {dept.head && <p className="text-xs text-muted-foreground">Head: {dept.head.name}</p>}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditDept(dept)}>
                        <Edit3 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {dept.description && <p className="text-xs text-muted-foreground mb-3">{dept.description}</p>}

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 rounded-lg bg-muted/50">
                      <Users className="h-3.5 w-3.5 mx-auto mb-1 text-muted-foreground" />
                      <p className="text-lg font-bold">{dept.employeeCount}</p>
                      <p className="text-[10px] text-muted-foreground">Members</p>
                    </div>
                    <div className="p-2 rounded-lg bg-muted/50">
                      <Coffee className="h-3.5 w-3.5 mx-auto mb-1 text-muted-foreground" />
                      <p className="text-lg font-bold">{dept.breakSlots}</p>
                      <p className="text-[10px] text-muted-foreground">Break Slots</p>
                    </div>
                    <div className="p-2 rounded-lg bg-muted/50">
                      <Settings className="h-3.5 w-3.5 mx-auto mb-1 text-muted-foreground" />
                      <p className="text-lg font-bold">{dept.breakStatus?.onBreak || 0}</p>
                      <p className="text-[10px] text-muted-foreground">On Break</p>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-3">
                    <Button variant="outline" size="sm" className="flex-1 h-8 text-xs" onClick={() => toggleMut.mutate(dept._id)}>
                      {dept.isActive ? 'Deactivate' : 'Activate'}
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 text-xs text-destructive" onClick={() => setDeleteId(dept._id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Department</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Name</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Engineering" className="mt-1" /></div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="What this department does" rows={2} className="mt-1" /></div>
            <div><Label>Department Head</Label><SimpleSelect value={form.head} onChange={v => setForm({ ...form, head: v })} options={[{ value: '', label: 'None' }, ...managers.map(m => ({ value: m._id, label: `${m.name} (${m.role})` }))]} className="mt-1" /></div>
            <div><Label>Break Slots (concurrent breaks allowed)</Label><Input type="number" min="1" max="5" value={form.breakSlots} onChange={e => setForm({ ...form, breakSlots: parseInt(e.target.value) || 1 })} className="mt-1" /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button><Button onClick={() => createMut.mutate(form)} disabled={createMut.isPending}>{createMut.isPending ? 'Creating...' : 'Create'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit */}
      <Dialog open={!!editDept} onOpenChange={() => setEditDept(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Department</DialogTitle></DialogHeader>
          {editDept && (<div className="space-y-4">
            <div><Label>Name</Label><Input value={editDept.name} onChange={e => setEditDept({ ...editDept, name: e.target.value })} className="mt-1" /></div>
            <div><Label>Description</Label><Textarea value={editDept.description || ''} onChange={e => setEditDept({ ...editDept, description: e.target.value })} rows={2} className="mt-1" /></div>
            <div><Label>Department Head</Label><SimpleSelect value={editDept.head?._id || editDept.head || ''} onChange={v => setEditDept({ ...editDept, head: v })} options={[{ value: '', label: 'None' }, ...managers.map(m => ({ value: m._id, label: `${m.name} (${m.role})` }))]} className="mt-1" /></div>
            <div><Label>Break Slots</Label><Input type="number" min="1" max="5" value={editDept.breakSlots || 1} onChange={e => setEditDept({ ...editDept, breakSlots: parseInt(e.target.value) || 1 })} className="mt-1" /></div>
          </div>)}
          <DialogFooter><Button variant="outline" onClick={() => setEditDept(null)}>Cancel</Button><Button onClick={() => updateMut.mutate({ id: editDept._id, name: editDept.name, description: editDept.description, head: editDept.head?._id || editDept.head || null, breakSlots: editDept.breakSlots })} disabled={updateMut.isPending}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)} title="Delete Department" description="Employees in this department will keep their department name but it won't be selectable." onConfirm={() => deleteMut.mutate(deleteId)} loading={deleteMut.isPending} destructive />
    </div>
  );
}
