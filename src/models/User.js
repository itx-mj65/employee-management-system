import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, select: false },
  role: { type: String, enum: ['admin', 'manager', 'team-lead', 'employee'], default: 'employee' },
  department: { type: String, trim: true, default: '' },
  position: { type: String, trim: true, default: '' },
  phone: { type: String, trim: true, default: '' },
  avatar: { type: String, default: '' },
  reportsTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isActive: { type: Boolean, default: true },
}, {
  timestamps: true,
});

userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ reportsTo: 1 });

export default mongoose.models.User || mongoose.model('User', userSchema);
