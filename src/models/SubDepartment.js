import mongoose from 'mongoose';

const subDepartmentSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  department: { type: String, required: true, trim: true },
  description: { type: String, default: '', trim: true },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

subDepartmentSchema.index({ department: 1 });

export default mongoose.models.SubDepartment || mongoose.model('SubDepartment', subDepartmentSchema);
