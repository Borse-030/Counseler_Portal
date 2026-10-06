import express from 'express';
import {
  createRequest,
  getRequests,
  getRequestById,
  assignCounselor,
  handleDecision,
  updateDiscoveryNotes,
  assignFinalCounselor,
  scheduleSession,
  closeCase
} from '../controllers/sessionRequestController.js';
import { User } from '../models/index.js';
import { getUserIdFromToken } from '../utils/security.js';

const router = express.Router();

const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const userId = getUserIdFromToken(authHeader.slice(7));
    const user = await User.findOne({ id: userId, suspended: { $ne: true } });
    if (!user) return res.status(401).json({ message: 'Invalid or suspended account.' });
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token.' });
  }
};

router.post('/', authenticate, createRequest);
router.get('/', authenticate, getRequests);
router.get('/:id', authenticate, getRequestById);
router.post('/:id/assign', authenticate, assignCounselor);
router.post('/:id/decision', authenticate, handleDecision);
router.put('/:id/discovery-notes', authenticate, updateDiscoveryNotes);
router.post('/:id/final-assignment', authenticate, assignFinalCounselor);
router.post('/:id/sessions', authenticate, scheduleSession);
router.post('/:id/close', authenticate, closeCase);

export default router;
