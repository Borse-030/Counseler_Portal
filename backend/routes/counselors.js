import express from 'express';
import {
  getCounselors,
  getCounselorById,
  getAppointmentTypes,
  updateAppointmentTypes,
  getExceptions,
  addException,
  deleteException,
  getBookingLimits,
  updateBookingLimits,
  getAvailability,
  updateAvailability,
  getSlots
} from '../controllers/counselorController.js';
import { getUserIdFromToken } from '../utils/security.js';

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

router.get('/', getCounselors);
router.get('/:id', getCounselorById);
router.get('/:id/appointment-types', getAppointmentTypes);
router.put('/appointment-types', authenticate, updateAppointmentTypes);
router.get('/:id/exceptions', getExceptions);
router.post('/exceptions', authenticate, addException);
router.delete('/exceptions/:id', authenticate, deleteException);
router.get('/:id/booking-limits', getBookingLimits);
router.put('/booking-limits', authenticate, updateBookingLimits);
router.get('/:id/availability', getAvailability);
router.put('/availability', authenticate, updateAvailability);
router.get('/:id/slots', getSlots);

export default router;
