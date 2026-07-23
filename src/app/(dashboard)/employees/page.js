'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Plus, Search, MoreHorizontal, Edit3, KeyRound, UserX, UserCheck, Trash2 } from 'lucide-react';
import api from '@/lib/axios';
import { useDebounce } from '@/hooks/useDebounce';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import EmptyState from '@/components/shared/EmptyState';
import { PageSkeleton } from '@/components/shared/LoadingSkeleton';
import toast from 'react-hot-toast';

const initialForm = { name: '', email: '', password: '', department: '', position: '', phone: '', role: 'employee' };

export default function EmployeesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 400);
  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [resetPwUser, setResetPwUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [toggleUser, setToggleUser] = useState(null);
  const [deleteUser, setDeleteUser] = useState(null);
  const [form, setForm] = useState(initialForm);

  const { data, isLoading } = useQuery({
    queryKey: ['users', debouncedSearch],
    queryFn: () => api.get('/users', { params: { search: debouncedSearch || undefined } }).then(r => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (payload) => api.post('/users', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setShowCreate(false);
      setForm(initialForm);
      toast.success('Employee created');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, name, email, department, position, phone, role }) =>
      api.put(`/users/${id}`, { name, email, department, position, phone, role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setEditUser(null);
      toast.success('Employee updated');
    },
  });

  const resetPwMutation = useMutation({
    mutationFn: ({ id, password }) => api.put(`/users/${id}`, { action: 'reset-password', password }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setResetPwUser(null);
      setNewPassword('');
      toast.success('Password reset');
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id }) => api.put(`/users/${id}`, { action: 'toggle-status' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setToggleUser(null);
      toast.success('Status updated');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setDeleteUser(null);
      toast.success('Employee deleted');
    },
  });

  if (isLoading) return <PageSkeleton />;

  const users = data?.users || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search employees..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button onClick={() => setShowCreate(true)} size="sm">
          <Plus className="h-4 w-4 mr-1" /> Add Employee
        </Button>
      </div>

      {users.length === 0 ? (
        <EmptyState title="No employees" description="Add your first employee to get started" />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {users.map((u) => (
            <motion.div key={u._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="hover:shadow-sm transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-medium text-primary">{u.name.charAt(0).toUpperCase()}</span>
                      </div>
                      <div>
                        <p className="font-medium text-sm">{u.name}</p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditUser({ ...u })}>
                          <Edit3 className="h-3.5 w-3.5 mr-2" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setResetPwUser(u)}>
                          <KeyRound className="h-3.5 w-3.5 mr-2" /> Reset Password
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setToggleUser(u)}>
                          {u.isActive ? <UserX className="h-3.5 w-3.5 mr-2" /> : <UserCheck className="h-3.5 w-3.5 mr-2" />}
                          {u.isActive ? 'Disable' : 'Enable'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setDeleteUser(u)} className="text-destructive">
                          <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="mt-3 flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary" className="text-xs">{u.role}</Badge>
                    {u.department && <Badge variant="outline" className="text-xs">{u.department}</Badge>}
                    <Badge variant={u.isActive ? 'default' : 'destructive'} className="text-xs">
                      {u.isActive ? 'Active' : 'Disabled'}
                    </Badge>
                  </div>
                  {u.position && <p className="text-xs text-muted-foreground mt-2">{u.position}</p>}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create Employee Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Employee</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Name</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
            </div>
            <div><Label>Password</Label><Input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Department</Label><Input value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} /></div>
              <div><Label>Position</Label><Input value={form.position} onChange={e => setForm({ ...form, position: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
              <div>
                <Label>Role</Label>
                <Select value={form.role} onValueChange={v => setForm({ ...form, role: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employee">Employee</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate(form)} disabled={createMutation.isPending}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Employee Dialog */}
      <Dialog open={!!editUser} onOpenChange={() => setEditUser(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Employee</DialogTitle></DialogHeader>
          {editUser && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Name</Label><Input value={editUser.name} onChange={e => setEditUser({ ...editUser, name: e.target.value })} /></div>
                <div><Label>Email</Label><Input value={editUser.email} onChange={e => setEditUser({ ...editUser, email: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Department</Label><Input value={editUser.department || ''} onChange={e => setEditUser({ ...editUser, department: e.target.value })} /></div>
                <div><Label>Position</Label><Input value={editUser.position || ''} onChange={e => setEditUser({ ...editUser, position: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Phone</Label><Input value={editUser.phone || ''} onChange={e => setEditUser({ ...editUser, phone: e.target.value })} /></div>
                <div>
                  <Label>Role</Label>
                  <Select value={editUser.role} onValueChange={v => setEditUser({ ...editUser, role: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="employee">Employee</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)}>Cancel</Button>
            <Button
              onClick={() => updateMutation.mutate({
                id: editUser._id,
                name: editUser.name,
                email: editUser.email,
                department: editUser.department,
                position: editUser.position,
                phone: editUser.phone,
                role: editUser.role,
              })}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={!!resetPwUser} onOpenChange={() => setResetPwUser(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Reset Password — {resetPwUser?.name}</DialogTitle></DialogHeader>
          <div><Label>New Password</Label><Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Minimum 6 characters" /></div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetPwUser(null)}>Cancel</Button>
            <Button onClick={() => resetPwMutation.mutate({ id: resetPwUser._id, password: newPassword })} disabled={resetPwMutation.isPending}>Reset</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Toggle Status */}
      <ConfirmDialog
        open={!!toggleUser}
        onOpenChange={() => setToggleUser(null)}
        title={`${toggleUser?.isActive ? 'Disable' : 'Enable'} ${toggleUser?.name}?`}
        description={toggleUser?.isActive ? 'They will not be able to log in.' : 'They will be able to log in again.'}
        onConfirm={() => toggleMutation.mutate({ id: toggleUser._id })}
        loading={toggleMutation.isPending}
      />

      {/* Delete */}
      <ConfirmDialog
        open={!!deleteUser}
        onOpenChange={() => setDeleteUser(null)}
        title={`Delete ${deleteUser?.name}?`}
        description="This action cannot be undone."
        onConfirm={() => deleteMutation.mutate(deleteUser._id)}
        loading={deleteMutation.isPending}
        destructive
      />
    </div>
  );
}
