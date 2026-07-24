import mongoose from 'mongoose';

const approvalStepSchema = new mongoose.Schema({
  role: { type: String, enum: ['team-lead', 'manager', 'admin'] },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  action: { type: String, enum: ['approved', 'rejected', 'forwarded'] },
  remarks: { type: String, default: '' },
  timestamp: { type: Date, default: Date.now },
}, { _id: false });

const taskSchema = new mongoose.Schema({
  dailyTaskListId: { type: mongoose.Schema.Types.ObjectId, ref: 'DailyTaskList' },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  title: { type: String, required: true, trim: true },
  description: { type: String, trim: true, default: '' },
  priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
  status: {
    type: String,
    enum: ['todo', 'in-progress', 'pending-tl', 'pending-manager', 'pending-admin', 'approved', 'rejected', 'on-hold'],
    default: 'todo',
  },
  expectedCompletionTime: { type: String, default: '' },
  deadline: { type: Date },
  completedAt: { type: Date },
  approvalChain: [approvalStepSchema],
  currentApprover: { type: String, enum: ['team-lead', 'manager', 'admin'], default: 'team-lead' },
  rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  rejectionRemarks: { type: String, default: '' },
  date: { type: Date, required: true },
}, {
  timestamps: true,
});

taskSchema.index({ userId: 1, date: 1 });
taskSchema.index({ assignedTo: 1 });
taskSchema.index({ status: 1 });
taskSchema.index({ deadline: 1 });

export default mongoose.models.Task || mongoose.model('Task', taskSchema);
