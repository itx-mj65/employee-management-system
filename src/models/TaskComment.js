import mongoose from 'mongoose';

const taskCommentSchema = new mongoose.Schema({
  taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true, trim: true },
}, {
  timestamps: true,
});

taskCommentSchema.index({ taskId: 1 });

export default mongoose.models.TaskComment || mongoose.model('TaskComment', taskCommentSchema);
