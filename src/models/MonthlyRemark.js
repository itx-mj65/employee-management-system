import mongoose from 'mongoose';

const monthlyRemarkSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  month: { type: Number, required: true, min: 1, max: 12 },
  year: { type: Number, required: true },
  completedTasks: { type: Number, default: 0 },
  pendingTasks: { type: Number, default: 0 },
  rejectedTasks: { type: Number, default: 0 },
  attendancePercentage: { type: Number, default: 0 },
  performanceScore: { type: Number, default: 0, min: 0, max: 100 },
  remarks: { type: String, default: '' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, {
  timestamps: true,
});

monthlyRemarkSchema.index({ userId: 1, month: 1, year: 1 }, { unique: true });

export default mongoose.models.MonthlyRemark || mongoose.model('MonthlyRemark', monthlyRemarkSchema);
