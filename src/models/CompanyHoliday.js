import mongoose from 'mongoose';

const companyHolidaySchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  date: { type: Date, required: true },
  description: { type: String, default: '', trim: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, {
  timestamps: true,
});

companyHolidaySchema.index({ date: 1 });

export default mongoose.models.CompanyHoliday || mongoose.model('CompanyHoliday', companyHolidaySchema);
