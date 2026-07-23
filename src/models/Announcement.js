import mongoose from 'mongoose';

const announcementSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  content: { type: String, required: true, trim: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  isActive: { type: Boolean, default: true },
}, {
  timestamps: true,
});

announcementSchema.index({ createdAt: -1 });

export default mongoose.models.Announcement || mongoose.model('Announcement', announcementSchema);
