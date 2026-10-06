import express from 'express';
import {
  getAppointments,
  getAppointmentById,
  createAppointment,
  rescheduleAppointment,
  cancelAppointment,
  updateAppointment,
  submitReview
} from '../controllers/appointmentController.js';
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

router.get('/', authenticate, getAppointments);
router.get('/:id', authenticate, getAppointmentById);
router.post('/', authenticate, createAppointment);
router.post('/:id/reschedule', authenticate, rescheduleAppointment);
router.post('/:id/cancel', authenticate, cancelAppointment);
router.put('/:id', authenticate, updateAppointment);
router.post('/:id/review', authenticate, submitReview);

export default router;
