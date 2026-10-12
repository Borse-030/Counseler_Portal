import express from 'express';
import { getNotifications, markAsRead, markAllAsRead, streamNotifications } from '../controllers/notificationController.js';
import { getUserIdFromToken } from '../utils/security.js';
import { User } from '../models/index.js';
import { sendNotification } from '../utils/notificationService.js';

const router = express.Router();
const authenticate = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const userId = getUserIdFromToken(header.slice(7));
    const user = await User.findOne({ id: userId }).select('id suspended').lean();
    if (!user) return res.status(401).json({ message: 'Invalid token' });
    if (user.suspended) return res.status(403).json({ message: 'Your account has been suspended.' });
    req.userId = userId;
    next();
  } catch { return res.status(401).json({ message: 'Invalid token' }); }
};
router.use(authenticate);
router.get('/stream', streamNotifications);
router.get('/', getNotifications);
router.put('/read-all', markAllAsRead);
router.put('/:id/read', markAsRead);
export default router;
export { router as notificationsRouter, sendNotification };
