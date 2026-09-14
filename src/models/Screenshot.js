import mongoose from 'mongoose';

const screenshotSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  department: { type: String, required: true },
  cloudinaryId: { type: String, required: true },
  url: { type: String, required: true },
  thumbnailUrl: { type: String, required: true },
  takenAt: { type: Date, required: true, default: Date.now },
  expiresAt: { type: Date, required: true }, // 24h from takenAt
  sessionId: { type: String }, // attendance date string
  metadata: {
    width: Number,
    height: Number,
    format: String,
    bytes: Number,
  }
}, { timestamps: true });

// Auto-delete after 24h via TTL index
screenshotSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
screenshotSchema.index({ userId: 1, takenAt: -1 });
screenshotSchema.index({ department: 1, takenAt: -1 });

export default mongoose.models.Screenshot || mongoose.model('Screenshot', screenshotSchema);
