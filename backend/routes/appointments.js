import express from 'express';
import { User, Appointment, Transaction, AppointmentType, AuditLog } from '../db.js';
import { sendNotification } from './notifications.js';

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

// Helper to log user actions in the audit trail
const logAction = async (userId, action, req) => {
  try {
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';
    const log = new AuditLog({
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      userId,
      action,
      timestamp: new Date(),
      ipAddress: ipAddress.replace('::ffff:', '')
    });
    await log.save();
  } catch (err) {
    console.error('Audit logging error:', err);
  }
};

// GET /api/appointments - fetch active user's appointments
router.get('/', authenticate, async (req, res) => {
  try {
    const currentUser = await User.findOne({ id: req.userId });

    if (!currentUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    let filtered = [];
    if (currentUser.role === 'patient') {
      filtered = await Appointment.find({ patientId: req.userId });
    } else if (currentUser.role === 'counselor') {
      filtered = await Appointment.find({ counselorId: req.userId });
    } else if (currentUser.role === 'admin') {
      filtered = await Appointment.find({}); // admins see all
    }

    // Sort: upcoming first, sorted chronologically. Past completed sessions sorted descending.
    filtered.sort((a, b) => {
      const dateTimeA = new Date(`${a.date}T${a.time}`);
      const dateTimeB = new Date(`${b.date}T${b.time}`);
      
      // Put upcoming sessions first
      if (a.status === 'upcoming' && b.status !== 'upcoming') return -1;
      if (a.status !== 'upcoming' && b.status === 'upcoming') return 1;
      
      // Sort chronologically within status
      return dateTimeA - dateTimeB;
    });

    res.json(filtered);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/appointments/:id - single appointment details
router.get('/:id', authenticate, async (req, res) => {
  try {
    const apt = await Appointment.findOne({ id: req.params.id });

    if (!apt) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Ensure security: only patient, counselor, or admin can access
    if (apt.patientId !== req.userId && apt.counselorId !== req.userId) {
      const u = await User.findOne({ id: req.userId });
      if (!u || u.role !== 'admin') {
        return res.status(403).json({ message: 'Forbidden access to session details' });
      }
    }

    res.json(apt);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/appointments - book an appointment & mock payment
router.post('/', authenticate, async (req, res) => {
  const { counselorId, date, time, intakeNotes, paymentDetails, appointmentType, paymentGateway } = req.body;

  try {
    const patient = await User.findOne({ id: req.userId, role: 'patient' });
    const counselor = await User.findOne({ id: counselorId, role: 'counselor', approved: true });

    if (!patient) {
      return res.status(400).json({ message: 'Only registered patients can book appointments.' });
    }

    if (!counselor) {
      return res.status(404).json({ message: 'Counselor not found or not approved.' });
    }

    if (!date || !time) {
      return res.status(400).json({ message: 'Date and time are required.' });
    }

    // Double check time slot is not already booked
    const alreadyBooked = await Appointment.findOne({
      counselorId: counselorId,
      date: date,
      time: time,
      status: { $in: ['upcoming', 'completed'] }
    });

    if (alreadyBooked) {
      return res.status(400).json({ message: 'This slot is no longer available. Please select another.' });
    }

    // Payment mock validation
    if (!paymentDetails || !paymentDetails.cardNumber || !paymentDetails.expiry || !paymentDetails.cvv) {
      return res.status(400).json({ message: 'Payment authorization failed. Missing card details.' });
    }

    // Find custom appointment type or use default
    const customType = await AppointmentType.findOne({ counselorId: counselorId, name: appointmentType });
    const selectedType = customType || {
      name: 'Video Consultation',
      duration: 60,
      price: counselor.price,
      description: 'Direct face-to-face video therapy.'
    };

    const aptId = `apt_${Date.now()}`;
    const txId = `tx_${Date.now()}`;

    // Auto-generate mock Zoom/Google Meet links for virtual sessions
    let meetingLink = '';
    let clinicAddress = '';
    if (selectedType.name === 'Video Consultation') {
      meetingLink = `https://zoom.us/j/${Math.floor(Math.random() * 9000000000) + 1000000000}`;
    } else if (selectedType.name === 'Audio Consultation') {
      meetingLink = `https://teams.microsoft.com/l/meetup-join/${Math.random().toString(36).substr(2, 9)}`;
    } else if (selectedType.name === 'Chat Consultation') {
      meetingLink = `https://mindease.chat/session/${aptId}`;
    } else if (selectedType.name === 'In-Person Consultation') {
      clinicAddress = '102 Medical Wellness Center, Suite 300, California';
    }

    const newAppointment = new Appointment({
      id: aptId,
      patientId: patient.id,
      patientName: patient.name,
      counselorId: counselor.id,
      counselorName: counselor.name,
      counselorSpecialty: counselor.specialty,
      appointmentType: selectedType.name,
      date,
      time,
      duration: selectedType.duration,
      amount: 0,
      status: 'upcoming',
      meetingLink,
      clinicAddress,
      intakeNotes: intakeNotes || '',
      sessionNotes: '',
      review: null
    });

    const gateway = paymentGateway || 'Stripe';
    const newTransaction = new Transaction({
      id: txId,
      appointmentId: aptId,
      patientId: patient.id,
      patientName: patient.name,
      counselorName: counselor.name,
      amount: 0,
      date: new Date(),
      status: 'successful',
      paymentMethod: `${gateway} - Card ending in ${paymentDetails.cardNumber.slice(-4)}`
    });

    await newAppointment.save();
    await newTransaction.save();

    await logAction(patient.id, `Booked ${selectedType.name} with ${counselor.name} for ${date} at ${time}`, req);

    // Send dispatch notifications
    await sendNotification(patient.id, `Your ${selectedType.name} with ${counselor.name} on ${date} at ${time} is successfully booked!`);
    await sendNotification(counselor.id, `New appointment booked by ${patient.name} for ${date} at ${time}.`);

    res.status(201).json({
      message: 'Appointment booked successfully',
      appointment: newAppointment,
      transaction: newTransaction
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/appointments/:id/reschedule - Reschedule appointment with notice check
router.post('/:id/reschedule', authenticate, async (req, res) => {
  const { date, time } = req.body;
  if (!date || !time) {
    return res.status(400).json({ message: 'Date and time are required for rescheduling.' });
  }

  try {
    const apt = await Appointment.findOne({ id: req.params.id });

    if (!apt) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Security Check: Only booking patient, counselor, or admin can reschedule
    if (apt.patientId !== req.userId && apt.counselorId !== req.userId) {
      const u = await User.findOne({ id: req.userId });
      if (!u || u.role !== 'admin') {
        return res.status(403).json({ message: 'Unauthorized action' });
      }
    }

    // Validate rescheduling notice (default 24h notice)
    const rescheduleNoticeHours = 24;
    const aptDateTime = new Date(`${apt.date}T${apt.time}`);
    const now = new Date();
    
    const hourDiff = (aptDateTime - now) / (1000 * 60 * 60);

    const checkAdmin = await User.findOne({ id: req.userId });
    const isAdmin = checkAdmin && checkAdmin.role === 'admin';

    if (hourDiff < rescheduleNoticeHours && !isAdmin) {
      return res.status(400).json({ 
        message: `Rescheduling is allowed only up to ${rescheduleNoticeHours} hours before the session. Please contact support.` 
      });
    }

    // Double check time slot is not already booked
    const alreadyBooked = await Appointment.findOne({
      counselorId: apt.counselorId,
      date: date,
      time: time,
      id: { $ne: apt.id },
      status: { $in: ['upcoming', 'completed'] }
    });

    if (alreadyBooked) {
      return res.status(400).json({ message: 'The selected slot is already booked by another patient.' });
    }

    const oldDate = apt.date;
    const oldTime = apt.time;

    apt.date = date;
    apt.time = time;
    apt.status = 'upcoming'; // reset status if cancelled
    await apt.save();
    
    await logAction(req.userId, `Rescheduled appointment ${apt.id} from ${oldDate} ${oldTime} to ${date} ${time}`, req);

    // Send notifications
    await sendNotification(apt.patientId, `Your appointment with ${apt.counselorName} has been rescheduled to ${date} at ${time}.`);
    await sendNotification(apt.counselorId, `Rescheduled Booking: Patient ${apt.patientName} has rescheduled the session to ${date} at ${time}.`);

    res.json({ message: 'Appointment rescheduled successfully', appointment: apt });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/appointments/:id/cancel - Cancel appointment with refund calculations
router.post('/:id/cancel', authenticate, async (req, res) => {
  try {
    const apt = await Appointment.findOne({ id: req.params.id });

    if (!apt) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    if (apt.status === 'cancelled') {
      return res.status(400).json({ message: 'Appointment is already cancelled.' });
    }

    // Security Check: Only booking patient, counselor, or admin can cancel
    if (apt.patientId !== req.userId && apt.counselorId !== req.userId) {
      const u = await User.findOne({ id: req.userId });
      if (!u || u.role !== 'admin') {
        return res.status(403).json({ message: 'Unauthorized action' });
      }
    }

    const cancelFullRefundHours = 48;
    const cancelHalfRefundHours = 24;
    const aptDateTime = new Date(`${apt.date}T${apt.time}`);
    const now = new Date();
    
    const hourDiff = (aptDateTime - now) / (1000 * 60 * 60);
    
    let refundPercentage = 0;
    let refundAmt = 0;

    if (hourDiff >= cancelFullRefundHours) {
      refundPercentage = 100;
    } else if (hourDiff >= cancelHalfRefundHours) {
      refundPercentage = 50;
    }

    refundAmt = Math.round(apt.amount * (refundPercentage / 100));

    // Update appointment status
    apt.status = 'cancelled';
    await apt.save();

    // Record refund transaction if refundAmt > 0
    if (refundAmt > 0) {
      const refTx = new Transaction({
        id: `tx_ref_${Date.now()}`,
        appointmentId: apt.id,
        patientId: apt.patientId,
        patientName: apt.patientName,
        counselorName: apt.counselorName,
        amount: refundAmt,
        date: new Date(),
        status: 'refunded',
        paymentMethod: `Refunded to card (${refundPercentage}% refund)`
      });
      await refTx.save();
    }

    await logAction(req.userId, `Cancelled appointment ${apt.id}. Notice hours: ${hourDiff.toFixed(1)}h. Refund: ${refundPercentage}% ($${refundAmt})`, req);

    // Send notifications
    await sendNotification(apt.patientId, `Your session with ${apt.counselorName} scheduled for ${apt.date} at ${apt.time} has been cancelled.`);
    await sendNotification(apt.counselorId, `Cancellation: Patient ${apt.patientName} has cancelled their session on ${apt.date} at ${apt.time}.`);

    res.json({ 
      message: `Appointment cancelled successfully. ${refundPercentage}% refund ($${refundAmt}) processed.`, 
      appointment: apt,
      refundAmount: refundAmt,
      refundPercentage
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PUT /api/appointments/:id - update status or session notes
router.put('/:id', authenticate, async (req, res) => {
  const { status, sessionNotes } = req.body;

  try {
    const apt = await Appointment.findOne({ id: req.params.id });

    if (!apt) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Authorization check
    if (apt.patientId !== req.userId && apt.counselorId !== req.userId) {
      const u = await User.findOne({ id: req.userId });
      if (!u || u.role !== 'admin') {
        return res.status(403).json({ message: 'Unauthorized modification' });
      }
    }

    if (status) {
      apt.status = status; // 'upcoming', 'completed', 'cancelled'
    }

    if (sessionNotes !== undefined) {
      // Only counselors can edit clinical session notes
      if (apt.counselorId !== req.userId) {
        return res.status(403).json({ message: 'Only the counselor can update clinical session notes.' });
      }
      apt.sessionNotes = sessionNotes;
    }

    await apt.save();

    res.json({ message: 'Appointment updated successfully', appointment: apt });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/appointments/:id/review - submit patient feedback rating
router.post('/:id/review', authenticate, async (req, res) => {
  const { rating, reviewText } = req.body;

  try {
    const apt = await Appointment.findOne({ id: req.params.id });

    if (!apt) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    if (apt.patientId !== req.userId) {
      return res.status(403).json({ message: 'Only the patient can review this appointment.' });
    }

    if (apt.status !== 'completed') {
      return res.status(400).json({ message: 'Reviews can only be written for completed sessions.' });
    }

    if (apt.review && apt.review.rating) {
      return res.status(400).json({ message: 'You have already reviewed this session.' });
    }

    const newReview = {
      rating: Number(rating) || 5,
      reviewText: reviewText || '',
      date: new Date()
    };

    apt.review = newReview;
    await apt.save();

    // Sync Counselor aggregate score metrics
    const counselor = await User.findOne({ id: apt.counselorId, role: 'counselor' });

    if (counselor) {
      const allAptsWithReview = await Appointment.find({ counselorId: counselor.id, review: { $ne: null } });
      const sumRatings = allAptsWithReview.reduce((sum, current) => sum + current.review.rating, 0);
      const count = allAptsWithReview.length;

      counselor.rating = count > 0 ? Number((sumRatings / count).toFixed(1)) : 5.0;
      counselor.reviewCount = count;

      await counselor.save();
    }

    await logAction(req.userId, `Submitted ${rating}-star feedback for ${apt.counselorName}`, req);

    res.json({ message: 'Review submitted successfully', review: newReview });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
