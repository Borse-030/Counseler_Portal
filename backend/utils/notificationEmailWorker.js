import { Notification } from '../models/index.js';
import { sendEmail } from './notificationService.js';

export const deliverNextNotificationEmail = async () => {
  const now = new Date();
  const job = await Notification.findOneAndUpdate({ $or: [
    { 'email.status': 'pending', 'email.nextAttemptAt': { $lte: now } },
    { 'email.status': 'sending', 'email.lockedUntil': { $lte: now } },
  ] }, {
    $set: { 'email.status': 'sending', 'email.lockedUntil': new Date(Date.now() + 120000) },
    $inc: { 'email.attempts': 1 },
  }, { returnDocument: 'after' }).select('+email').lean();
  if (!job) return false;
  const ownership = { id: job.id, 'email.status': 'sending', 'email.attempts': job.email.attempts };
  try {
    const result = await sendEmail({ ...job.email, messageId: `<${job.id}@notifications.bjs>` });
    if (result.skipped) {
      // Missing SMTP configuration is recoverable; keep durable jobs for later.
      await Notification.updateOne(ownership, { $set: {
        'email.status': result.reason === 'missing_recipient' ? 'skipped' : 'pending',
        'email.nextAttemptAt': new Date(Date.now() + 300000),
        'email.lastError': result.reason,
      }, $inc: { 'email.attempts': -1 }, $unset: { 'email.lockedUntil': 1 } });
    } else {
      await Notification.updateOne(ownership, { $set: { 'email.status': 'sent', 'email.sentAt': new Date() }, $unset: { 'email.lockedUntil': 1, 'email.lastError': 1 } });
    }
  } catch (error) {
    await Notification.updateOne(ownership, { $set: {
      'email.status': job.email.attempts >= 5 ? 'failed' : 'pending',
      'email.nextAttemptAt': new Date(Date.now() + Math.min(3600000, 30000 * 2 ** job.email.attempts)),
      'email.lastError': String(error.code || 'delivery_failed').slice(0, 100),
    }, $unset: { 'email.lockedUntil': 1 } });
  }
  return true;
};

export const startNotificationEmailWorker = () => {
  let stopped = false;
  let timer;
  const tick = async () => {
    try {
      // A bounded batch keeps memory and SMTP concurrency predictable.
      for (let i = 0; i < 20 && !stopped; i++) if (!await deliverNextNotificationEmail()) break;
    } catch (error) { console.error('Notification email worker:', error.message); }
    if (!stopped) { timer = setTimeout(tick, 2000); timer.unref(); }
  };
  void tick();
  return () => { stopped = true; clearTimeout(timer); };
};
