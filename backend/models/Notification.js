import mongoose from 'mongoose';

const NotificationSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  message: { type: String, required: true },
  date: { type: Date, default: Date.now },
  read: { type: Boolean, default: false },
  email: {
    type: new mongoose.Schema({
      to: String, subject: String, text: String, html: String,
      status: { type: String, enum: ['pending', 'sending', 'sent', 'failed', 'skipped'] },
      attempts: { type: Number, default: 0 },
      nextAttemptAt: Date, lockedUntil: Date, sentAt: Date, lastError: String,
    }, { _id: false }),
    select: false,
  },
});

NotificationSchema.index({ userId: 1, date: -1, id: -1 });
NotificationSchema.index({ userId: 1, read: 1, date: -1, id: -1 });
NotificationSchema.index({ 'email.status': 1, 'email.nextAttemptAt': 1 });
NotificationSchema.index({ 'email.status': 1, 'email.lockedUntil': 1 });

export const Notification = mongoose.model('Notification', NotificationSchema);
export default Notification;
