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
  lunchBreakStart: { type: Date },
  lunchBreakEnd: { type: Date },
  shortBreaks: [shortBreakSchema],
  totalWorkingHours: { type: Number, default: 0 },
  totalBreakHours: { type: Number, default: 0 },
  status: { type: String, enum: ['present', 'absent', 'half-day', 'holiday'], default: 'present' },
}, {
  timestamps: true,
});

attendanceSchema.index({ userId: 1, date: 1 }, { unique: true });
attendanceSchema.index({ date: 1 });

export default mongoose.models.Attendance || mongoose.model('Attendance', attendanceSchema);
