import mongoose from 'mongoose';

const dateEntrySchema = new mongoose.Schema({
  date: { type: Date, required: true },
  checkIn: { type: Date },
  checkoutTime: { type: String, default: '' },
}, { _id: false });

const checkoutRequestSchema = new mongoose.Schema({
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  department: { type: String, required: true },
  status: { type: String, enum: ['pending', 'completed'], default: 'pending' },
  dates: [dateEntrySchema],
  remarks: { type: String, default: '' },
  completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  completedAt: { type: Date },
}, {
  timestamps: true,
});

checkoutRequestSchema.index({ status: 1 });
checkoutRequestSchema.index({ assignedTo: 1 });

export default mongoose.models.CheckoutRequest || mongoose.model('CheckoutRequest', checkoutRequestSchema);
