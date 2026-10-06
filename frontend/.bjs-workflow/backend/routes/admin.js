import express from 'express';
import {
  getUsers,
  updateUserStatus,
  getTransactions,
  getStats,
  createUser,
  resetDatabase
} from '../controllers/adminController.js';
import { User } from '../models/index.js';
import { getUserIdFromToken } from '../utils/security.js';

const router = express.Router();

const authenticateAdmin = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const userId = getUserIdFromToken(token);
    const user = await User.findOne({ id: userId });

    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden. Admin privileges required.' });
    }

    req.userId = userId;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

router.get('/users', authenticateAdmin, getUsers);
router.put('/users/:id/status', authenticateAdmin, updateUserStatus);
router.get('/transactions', authenticateAdmin, getTransactions);
router.get('/stats', authenticateAdmin, getStats);
router.post('/users', authenticateAdmin, createUser);
router.post('/reset', authenticateAdmin, resetDatabase);

export default router;
