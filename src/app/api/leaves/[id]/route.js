import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Leave from '@/models/Leave';
import Notification from '@/models/Notification';

export async function PUT(request, { params }) {
  try {
    await connectDB();
    const { id } = await params;
    const role = request.headers.get('x-user-role');
    const adminId = request.headers.get('x-user-id');
    const adminName = request.headers.get('x-user-name');
    const body = await request.json();

    const leave = await Leave.findById(id);
    if (!leave) return NextResponse.json({ error: 'Leave not found' }, { status: 404 });

    if (body.action === 'approve' && role === 'admin') {
      leave.status = 'approved';
      leave.approvedBy = adminId;
      leave.approvedAt = new Date();
      leave.adminRemarks = body.remarks || '';
      await leave.save();

      await Notification.create({
        userId: leave.userId,
        type: 'task-approved',
        title: 'Leave Approved',
        message: `Your ${leave.type} leave (${leave.totalDays} days) has been approved.${body.remarks ? ' Remarks: ' + body.remarks : ''}`,
        relatedId: leave._id,
      });

      return NextResponse.json({ leave, message: 'Leave approved' });
    }

    if (body.action === 'reject' && role === 'admin') {
      leave.status = 'rejected';
      leave.approvedBy = adminId;
      leave.approvedAt = new Date();
      leave.adminRemarks = body.remarks || '';
      await leave.save();

      await Notification.create({
        userId: leave.userId,
        type: 'task-rejected',
        title: 'Leave Rejected',
        message: `Your ${leave.type} leave request has been rejected.${body.remarks ? ' Reason: ' + body.remarks : ''}`,
        relatedId: leave._id,
      });

      return NextResponse.json({ leave, message: 'Leave rejected' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Leave action error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    await connectDB();
    const { id } = await params;
    const userId = request.headers.get('x-user-id');

    const leave = await Leave.findById(id);
    if (!leave) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (leave.userId.toString() !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    if (leave.status !== 'pending') return NextResponse.json({ error: 'Can only cancel pending requests' }, { status: 400 });

    await Leave.findByIdAndDelete(id);
    return NextResponse.json({ message: 'Leave request cancelled' });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
