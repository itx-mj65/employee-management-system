import mongoose from 'mongoose';

const departmentSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  description: { type: String, default: '', trim: true },
  head: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isActive: { type: Boolean, default: true },
  breakSlots: { type: Number, default: 1 },
  shortBreakDuration: { type: Number, default: 15 },
}, {
  timestamps: true,
});

departmentSchema.index({ name: 1 });

export default mongoose.models.Department || mongoose.model('Department', departmentSchema);
