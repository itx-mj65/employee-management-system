import mongoose from 'mongoose';

const timeLogSchema = new mongoose.Schema({
  start: { type: Date, required: true },
  end: { type: Date, default: null },
}, { _id: false });

const approvalStepSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  role: String, action: String, remarks: String,
  timestamp: { type: Date, default: Date.now },
}, { _id: false });

const taskSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '', trim: true },
  priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
  deadline: { type: Date },
  status: {
    type: String,
    enum: ['assigned', 'accepted', 'submitted', 'returned', 'approved', 'rejected',
           'draft', 'pending-tl', 'pending-manager', 'completed'],
    default: 'assigned',
  },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  productiveSeconds: { type: Number, default: 0 },
  timerStartedAt: { type: Date, default: null },
  timeLog: [timeLogSchema],
  approvalChain: [approvalStepSchema],
}, { timestamps: true });

taskSchema.index({ userId: 1, status: 1 });
taskSchema.index({ assignedBy: 1 });

export default mongoose.models.Task || mongoose.model('Task', taskSchema);
