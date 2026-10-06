import { validateSchedule, validMeetingLink } from '../utils/scheduling.js';
import { User, Appointment, CareRequest, Transaction, AppointmentType, AuditLog } from '../models/index.js';
import { sendNotification } from '../utils/notificationService.js';

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

export const getAppointments = async (req, res) => {
  try {
    const currentUser = await User.findOne({ id: req.userId });

    if (!currentUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    let filtered = [];
    if (currentUser.role === 'patient' || currentUser.role === 'user') {
      filtered = await Appointment.find({ patientId: req.userId });
    } else if (currentUser.role === 'counselor') {
      const cases = await CareRequest.find({ $or: [{ assignedCounselorId: req.userId }, { finalCounselorId: req.userId }] });
      filtered = await Appointment.find({ $or: [{ counselorId: req.userId }, { careRequestId: { $in: cases.map(item => item.id) } }] });
    } else if (currentUser.role === 'admin') {
      filtered = await Appointment.find({});
    }

    filtered.sort((a, b) => {
      const dateTimeA = new Date(`${a.date}T${a.time}`);
      const dateTimeB = new Date(`${b.date}T${b.time}`);

      if (a.status === 'upcoming' && b.status !== 'upcoming') return -1;
      if (a.status !== 'upcoming' && b.status === 'upcoming') return 1;

      return dateTimeA - dateTimeB;
    });

    res.json(filtered.map(appointment => {
      const data = appointment.toObject();
      if (['patient', 'user'].includes(currentUser.role)) delete data.sessionNotes;
      return data;
    }));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getAppointmentById = async (req, res) => {
  try {
    const apt = await Appointment.findOne({ id: req.params.id });

    if (!apt) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    if (apt.patientId !== req.userId && apt.counselorId !== req.userId) {
      const u = await User.findOne({ id: req.userId });
      const relatedCase = u?.role === 'counselor' && apt.careRequestId
        ? await CareRequest.findOne({ id: apt.careRequestId, $or: [{ assignedCounselorId: u.id }, { finalCounselorId: u.id }] }) : null;
      if (!u || (u.role !== 'admin' && !relatedCase)) {
        return res.status(403).json({ message: 'Forbidden access to session details' });
      }
    }

    const actor = await User.findOne({ id: req.userId });
    const data = apt.toObject();
    if (apt.appointmentKind === 'discovery' && apt.careRequestId) {
      const care = await CareRequest.findOne({ id: apt.careRequestId });
      if (care) data.sessionNotes = care.discoveryNotes || data.sessionNotes;
    }
    if (['patient', 'user'].includes(actor?.role)) delete data.sessionNotes;
    else {
      const patient = await User.findOne({ id: apt.patientId });
      data.patientMobile = patient?.mobile || '';
    }
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createAppointment = async (req, res) => {
  return res.status(409).json({ message: 'BJS sessions must be proposed through the care plan and reviewed by an admin.' });
};

export const rescheduleAppointment = async (req, res) => {
  const { date, time } = req.body;
  if (!date || !time) {
    return res.status(400).json({ message: 'Date and time are required for rescheduling.' });
  }

  try {
    const actor = await User.findOne({ id: req.userId });
    if (!actor || !['admin', 'counselor'].includes(actor.role)) return res.status(403).json({ message: 'Contact the BJS care team to request a schedule change.' });
    const apt = await Appointment.findOne({ id: req.params.id });

    if (!apt) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    if (apt.patientId !== req.userId && apt.counselorId !== req.userId) {
      const u = await User.findOne({ id: req.userId });
      if (!u || u.role !== 'admin') {
        return res.status(403).json({ message: 'Unauthorized action' });
      }
    }

    if (apt.status !== 'upcoming') return res.status(409).json({ message: 'Only confirmed sessions can be rescheduled.' });
    const scheduleError = await validateSchedule(apt.counselorId, date, time, apt.duration, apt.id, apt.patientId);
    if (scheduleError) return res.status(400).json({ message: scheduleError });
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
    apt.status = apt.appointmentKind === 'discovery' ? 'upcoming' : 'pending_admin';
    apt.reviewedById = '';
    apt.reviewedByName = '';
    apt.reviewedAt = undefined;
    await apt.save();

    await logAction(req.userId, `Rescheduled appointment ${apt.id} from ${oldDate} ${oldTime} to ${date} ${time}`, req);

    await sendNotification(apt.patientId, `Your appointment with ${apt.counselorName} has been rescheduled to ${date} at ${time}.`);
    await sendNotification(apt.counselorId, `Rescheduled Booking: Patient ${apt.patientName} has rescheduled the session to ${date} at ${time}.`);

    res.json({ message: 'Schedule change saved. Counseling sessions require admin review again.', appointment: apt });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const cancelAppointment = async (req, res) => {
  try {
    const apt = await Appointment.findOne({ id: req.params.id });

    if (!apt) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    if (!['upcoming', 'pending_admin'].includes(apt.status)) {
      return res.status(400).json({ message: 'Only upcoming sessions or pending proposals can be cancelled.' });
    }

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

    apt.status = 'cancelled';
    await apt.save();

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

    await sendNotification(apt.patientId, `Your session with ${apt.counselorName} scheduled for ${apt.date} at ${apt.time} has been cancelled.`);
    await sendNotification(apt.counselorId, `Cancellation: Patient ${apt.patientName} has cancelled their session on ${apt.date} at ${apt.time}.`);

    res.json({
      message: 'Appointment cancelled successfully.',
      appointment: apt,
      refundAmount: refundAmt,
      refundPercentage
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateAppointment = async (req, res) => {
  const { status, sessionNotes, meetingLink } = req.body;

  try {
    const apt = await Appointment.findOne({ id: req.params.id });

    if (!apt) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    const actor = await User.findOne({ id: req.userId });
    if (!actor) return res.status(401).json({ message: 'User not found.' });
    const isAssignedCounselor = actor.role === 'counselor' && apt.counselorId === actor.id;
    const isAdmin = actor.role === 'admin';

    if (status) {
      if (!['completed', 'cancelled'].includes(status)) {
        return res.status(400).json({ message: 'Use the dedicated workflow to set this appointment status.' });
      }
      if (!isAssignedCounselor && !isAdmin) {
        return res.status(403).json({ message: 'Only the assigned counselor or an admin can update appointment status.' });
      }
      if (apt.status !== 'upcoming') {
        return res.status(409).json({ message: 'Only scheduled appointments can be completed or cancelled.' });
      }
      apt.status = status;
    }

    if (meetingLink !== undefined) {
      if (!isAssignedCounselor && !isAdmin) return res.status(403).json({ message: 'Staff access required.' });
      if (!validMeetingLink(meetingLink)) return res.status(400).json({ message: 'Use a valid HTTPS meeting link.' });
      apt.meetingLink = meetingLink;
    }
    if (sessionNotes !== undefined) {
      if (typeof sessionNotes !== 'string' || sessionNotes.length > 10000) return res.status(400).json({ message: 'Notes must be under 10,000 characters.' });
      if (!isAssignedCounselor) {
        return res.status(403).json({ message: 'Only the counselor can update clinical session notes.' });
      }
      apt.sessionNotes = sessionNotes;
    }

    await apt.save();

    if (apt.appointmentKind === 'discovery' && apt.careRequestId) {
      const careRequest = await CareRequest.findOne({ id: apt.careRequestId, assignedCounselorId: apt.counselorId });
      if (careRequest) {
        if (sessionNotes !== undefined) careRequest.discoveryNotes = sessionNotes.trim();
        if (status === 'completed' && careRequest.status === 'discovery_scheduled') {
          const confirmed = await Appointment.findOne({ careRequestId: careRequest.id, appointmentKind: { $in: ['session', 'follow_up'] }, status: { $in: ['upcoming', 'completed'] } });
          careRequest.status = confirmed ? 'active' : 'discovery_completed';
          careRequest.timeline.push({ status: careRequest.status, actorId: actor.id, actorName: actor.name, note: 'Discovery call completed.', at: new Date() });
        }
        if (status === 'cancelled' && careRequest.status === 'discovery_scheduled') {
          careRequest.status = 'accepted';
          careRequest.discoveryAppointmentId = '';
        }
        await careRequest.save();
      }
    }
    if (status === 'completed' && apt.appointmentKind !== 'discovery') {
      await sendNotification(apt.patientId, 'Your BJS session is complete. Please share feedback from your session history.');
    }

    res.json({ message: 'Appointment updated successfully', appointment: apt });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const submitReview = async (req, res) => {
  const { rating, reviewText = '' } = req.body;
  if (!Number.isInteger(rating) || rating < 1 || rating > 5 || typeof reviewText !== 'string' || reviewText.length > 5000) {
    return res.status(400).json({ message: 'Choose a rating from 1 to 5 and keep feedback under 5,000 characters.' });
  }

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

    if (apt.appointmentKind === 'discovery') {
      return res.status(400).json({ message: 'Discovery calls cannot be reviewed as counseling sessions.' });
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
};
