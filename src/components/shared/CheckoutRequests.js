'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Clock, Send, CheckCircle2, User, ChevronDown } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { useEmployeeList } from '@/hooks/useSharedData';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import SimpleSelect from '@/components/shared/SimpleSelect';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import { cn } from '@/lib/utils';

export default function CheckoutRequests() {
  const { isAdmin, role } = useAuth();
  const qc = useQueryClient();
  const { employees } = useEmployeeList();
  const [showSend, setShowSend] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState('');
  const [fillReq, setFillReq] = useState(null);
  const [fillDates, setFillDates] = useState([]);
  const [fillRemarks, setFillRemarks] = useState('');

  const { data } = useQuery({
    queryKey: ['checkout-requests'],
    queryFn: () => api.get('/checkout-requests').then(r => r.data),
  });

  const sendMut = useMutation({
    mutationFn: (p) => api.post('/checkout-requests', p),
    onSuccess: (res) => { qc.invalidateQueries({ queryKey: ['checkout-requests'] }); setShowSend(false); setSelectedEmp(''); toast.success(res.data.message); },
  });

  const submitMut = useMutation({
    mutationFn: (p) => api.put('/checkout-requests', p),
    onSuccess: (res) => { qc.invalidateQueries({ queryKey: ['checkout-requests'] }); qc.invalidateQueries({ queryKey: ['att-analytics'] }); setFillReq(null); toast.success(res.data.message); },
  });

  const requests = data?.requests || [];
  const pendingForMe = requests.filter(r => r.status === 'pending');
  const canFill = role === 'team-lead' || role === 'manager' || isAdmin;

  const openFillDialog = (req) => {
    setFillDates(req.dates.map(d => ({ ...d, checkoutTime: d.checkoutTime || '3:00 AM' })));
    setFillRemarks('');
    setFillReq(req);
  };

  const setAllOnTime = () => {
    setFillDates(fillDates.map(d => ({ ...d, checkoutTime: '3:00 AM' })));
  };

  const updateTime = (idx, time) => {
    const updated = [...fillDates];
    updated[idx].checkoutTime = time;
    setFillDates(updated);
  };

  if (requests.length === 0 && !isAdmin) return null;

  return (
    <>
      {/* Admin: Send Request button */}
      {isAdmin && (
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">Checkout Time Requests</p>
              <p className="text-xs text-muted-foreground">{pendingForMe.length} pending</p>
            </div>
            <Button size="sm" onClick={() => setShowSend(true)}><Send className="h-3.5 w-3.5 mr-1.5" />Request Checkout Times</Button>
          </CardContent>
        </Card>
      )}

      {/* Pending requests for TL/Manager to fill */}
      {pendingForMe.length > 0 && canFill && (
        <Card className="border-amber-300 dark:border-amber-700">
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Clock className="h-4 w-4 text-amber-500" />Pending Checkout Requests</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {pendingForMe.map(req => (
              <div key={req._id} className="flex items-center gap-3 p-3 rounded-lg border bg-amber-50/30 dark:bg-amber-950/10">
                <div className="w-9 h-9 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                  <User className="h-4 w-4 text-amber-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{req.employeeId?.name}</p>
                  <p className="text-xs text-muted-foreground">{req.dates.length} dates need checkout times · {req.department}</p>
                </div>
                <Button size="sm" onClick={() => openFillDialog(req)} className="bg-amber-600 hover:bg-amber-700">Fill Times</Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Completed requests history */}
      {requests.filter(r => r.status === 'completed').length > 0 && (isAdmin || canFill) && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" />Completed Requests</CardTitle></CardHeader>
          <CardContent className="space-y-1.5">
            {requests.filter(r => r.status === 'completed').slice(0, 5).map(req => (
              <div key={req._id} className="flex items-center gap-3 p-2.5 rounded-lg text-sm">
                <span className="font-medium">{req.employeeId?.name}</span>
                <span className="text-xs text-muted-foreground">{req.dates.length} dates</span>
                <span className="text-xs text-emerald-600">✓ by {req.completedBy?.name}</span>
                <span className="text-xs text-muted-foreground ml-auto">{dayjs(req.completedAt).format('MMM D')}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Send Request Dialog (Admin) */}
      <Dialog open={showSend} onOpenChange={setShowSend}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Request Checkout Times</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">Select employee — all their pending checkout dates will be sent to their Team Lead to fill.</p>
            <div><Label>Employee</Label>
              <SimpleSelect value={selectedEmp} onChange={setSelectedEmp} options={[{ value: '', label: 'Select employee' }, ...employees.map(e => ({ value: e._id, label: `${e.name} (${e.department})` }))]} className="mt-1" />
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowSend(false)}>Cancel</Button><Button onClick={() => sendMut.mutate({ employeeId: selectedEmp })} disabled={!selectedEmp || sendMut.isPending}>{sendMut.isPending ? 'Sending...' : 'Send to TL'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Fill Times Dialog (TL) */}
      <Dialog open={!!fillReq} onOpenChange={() => setFillReq(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Fill Checkout Times — {fillReq?.employeeId?.name}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Button variant="outline" size="sm" onClick={setAllOnTime} className="w-full">✅ All On Time (3:00 AM)</Button>
            <div className="space-y-2">
              {fillDates.map((d, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg border">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{dayjs(d.date).format('ddd, MMM D')}</p>
                    <p className="text-[11px] text-muted-foreground">Check-in: {d.checkIn ? dayjs(d.checkIn).format('h:mm A') : '—'}</p>
                  </div>
                  <div className="w-28">
                    <Input value={d.checkoutTime} onChange={e => updateTime(i, e.target.value)} placeholder="3:00 AM" className="h-9 text-center text-sm" />
                  </div>
                </div>
              ))}
            </div>
            <div><Label>Remarks</Label><Textarea value={fillRemarks} onChange={e => setFillRemarks(e.target.value)} placeholder="Optional notes..." rows={2} className="mt-1" /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setFillReq(null)}>Cancel</Button><Button onClick={() => submitMut.mutate({ requestId: fillReq._id, dates: fillDates, remarks: fillRemarks })} disabled={submitMut.isPending}>{submitMut.isPending ? 'Submitting...' : `Submit All (${fillDates.length})`}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
