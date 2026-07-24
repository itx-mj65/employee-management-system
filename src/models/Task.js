import mongoose from 'mongoose';

const approvalStepSchema = new mongoose.Schema({
  role: { type: String },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  action: { type: String },
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
    default: 'todo',
  },
  expectedCompletionTime: { type: String, default: '' },
  deadline: { type: Date },
  completedAt: { type: Date },
  approvalChain: [approvalStepSchema],
  currentApprover: { type: String, default: '' },
  rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  rejectionRemarks: { type: String, default: '' },
  date: { type: Date, required: true },
}, {
  timestamps: true,
  strict: false,
});

taskSchema.index({ userId: 1, date: 1 });
taskSchema.index({ assignedTo: 1 });
taskSchema.index({ status: 1 });

export default mongoose.models.Task || mongoose.model('Task', taskSchema);
