import mongoose from 'mongoose';

const dailyReportSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true },
  tasksCompleted: { type: String, required: true, trim: true },
  challenges: { type: String, default: '', trim: true },
  planTomorrow: { type: String, default: '', trim: true },
  remarks: { type: String, default: '', trim: true },
}, {
  timestamps: true,
});

dailyReportSchema.index({ userId: 1, date: 1 }, { unique: true });
dailyReportSchema.index({ date: 1 });

export default mongoose.models.DailyReport || mongoose.model('DailyReport', dailyReportSchema);
