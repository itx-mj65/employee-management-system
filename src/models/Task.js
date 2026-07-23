import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema({
  dailyTaskListId: { type: mongoose.Schema.Types.ObjectId, ref: 'DailyTaskList' },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, trim: true, default: '' },
  priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
  status: {
    type: String,
    enum: ['todo', 'in-progress', 'pending-approval', 'approved', 'rejected', 'on-hold'],
    default: 'todo',
  },
  expectedCompletionTime: { type: String, default: '' },
  completedAt: { type: Date },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt: { type: Date },
  date: { type: Date, required: true },
}, {
  timestamps: true,
});

taskSchema.index({ userId: 1, date: 1 });
taskSchema.index({ status: 1 });
taskSchema.index({ dailyTaskListId: 1 });

export default mongoose.models.Task || mongoose.model('Task', taskSchema);
