import mongoose from 'mongoose';

const reportSettingSchema = new mongoose.Schema({
  department: { type: String, required: true },
  mode: { type: String, enum: ['all', 'specific'], default: 'all' },
  specificUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, {
  timestamps: true,
});

reportSettingSchema.index({ department: 1 });

export default mongoose.models.ReportSetting || mongoose.model('ReportSetting', reportSettingSchema);
