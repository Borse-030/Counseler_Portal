import express from 'express';
import { getNotifications, markAsRead } from '../controllers/notificationController.js';
import { getUserIdFromToken } from '../utils/security.js';
import { sendNotification } from '../utils/notificationService.js';

const router = express.Router();

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const userId = getUserIdFromToken(token);
    req.userId = userId;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

router.get('/', authenticate, getNotifications);
router.put('/:id/read', authenticate, markAsRead);

export default router;
export { router as notificationsRouter };
export { sendNotification };
