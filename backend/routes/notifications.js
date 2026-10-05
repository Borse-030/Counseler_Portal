import express from 'express';
import { Notification } from '../db.js';

const router = express.Router();

// Middleware helper to authenticate using headers
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const userId = Buffer.from(token, 'base64').toString('ascii');
    req.userId = userId;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

// Dispatch notification helper
export const sendNotification = async (userId, message) => {
  try {
    const newNotification = new Notification({
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      userId,
      message,
      date: new Date(),
      read: false
    });
    await newNotification.save();
    console.log(`[Notification to ${userId}] ${message}`);
    return newNotification;
  } catch (error) {
    console.error('Error sending notification:', error);
  }
};

// GET /api/notifications
router.get('/', authenticate, async (req, res) => {
  try {
    const userNotifs = await Notification.find({ userId: req.userId }).sort({ date: -1 });
    res.json(userNotifs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PUT /api/notifications/:id/read
router.put('/:id/read', authenticate, async (req, res) => {
  try {
    const notif = await Notification.findOneAndUpdate(
      { id: req.params.id, userId: req.userId },
      { read: true },
      { new: true }
    );
    if (notif) {
      return res.json({ success: true, message: 'Notification marked as read.' });
    }
    res.status(404).json({ message: 'Notification not found.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
export { router as notificationsRouter };
