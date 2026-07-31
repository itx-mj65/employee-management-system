import mongoose from 'mongoose';

const shortBreakSchema = new mongoose.Schema({
  start: { type: Date },
  end: { type: Date },
}, { _id: false });

const attendanceSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true },
  checkIn: { type: Date },
  checkOut: { type: Date },
  status: { type: String, enum: ['present', 'absent', 'half-day', 'late'], default: 'present' },
  lunchBreakStart: { type: Date },
  lunchBreakEnd: { type: Date },
  shortBreaks: [shortBreakSchema],
  totalWorkingHours: { type: Number, default: 0 },
  totalBreakHours: { type: Number, default: 0 },
  autoCheckout: { type: Boolean, default: false },
  reportMissing: { type: Boolean, default: false },
}, {
  timestamps: true,
});

// Compound index for fast lookups
attendanceSchema.index({ userId: 1, date: 1 }, { unique: true });
attendanceSchema.index({ date: 1 });

export default mongoose.models.Attendance || mongoose.model('Attendance', attendanceSchema);
