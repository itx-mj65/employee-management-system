import mongoose from 'mongoose';

const dailyTaskListSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true },
  tasks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Task' }],
  isCheckedIn: { type: Boolean, default: true },
}, {
  timestamps: true,
});

dailyTaskListSchema.index({ userId: 1, date: 1 }, { unique: true });

export default mongoose.models.DailyTaskList || mongoose.model('DailyTaskList', dailyTaskListSchema);
