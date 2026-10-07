import { sessionEndTime, resolvedStatuses, presentAppointment, hasFeedback } from '../utils/sessionOutcome.js';
import { User, Appointment, CareRequest, Transaction, AppointmentType, AuditLog } from '../models/index.js';
import { sendNotification } from '../utils/notificationService.js';
import { validateSchedule, validOnlineMeetingLink } from '../utils/scheduling.js';

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
      filtered = await Appointment.find({ counselorId: req.userId });
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

    res.json(filtered.map(apt => presentAppointment(apt, currentUser)));
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

    const actor = await User.findOne({ id: req.userId });
    if (!actor || !(actor.role === 'admin' || (['patient', 'user'].includes(actor.role) && apt.patientId === actor.id) || (actor.role === 'counselor' && apt.counselorId === actor.id))) return res.status(403).json({ message: 'Forbidden access to session details' });
    res.json(presentAppointment(apt, actor));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createAppointment = async (req, res) => {
  const { counselorId, date, time, intakeNotes, paymentDetails, appointmentType, paymentGateway } = req.body;

  try {
    const patient = await User.findOne({ id: req.userId, role: { $in: ['patient', 'user'] } });
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

    const alreadyBooked = await Appointment.findOne({
      counselorId: counselorId,
      date: date,
      time: time,
      status: { $in: ['upcoming', 'completed'] }
    });

    if (alreadyBooked) {
      return res.status(400).json({ message: 'This slot is no longer available. Please select another.' });
    }

    if (!paymentDetails || !paymentDetails.cardNumber || !paymentDetails.expiry || !paymentDetails.cvv) {
      return res.status(400).json({ message: 'Payment authorization failed. Missing card details.' });
    }

    const customType = await AppointmentType.findOne({ counselorId: counselorId, name: appointmentType });
    const selectedType = customType || {
      name: 'Video Consultation',
      duration: 60,
      price: counselor.price,
      description: 'Direct face-to-face video therapy.'
    };

    const scheduleError = await validateSchedule(counselor.id, date, time, Number(selectedType.duration) || 60, '', patient.id, selectedType.name);
    if (scheduleError) return res.status(400).json({ message: scheduleError });

    const aptId = `apt_${Date.now()}`;
    const txId = `tx_${Date.now()}`;

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
};

export const rescheduleAppointment = async (req, res) => {
  const { date, time } = req.body;
  if (!date || !time) {
    return res.status(400).json({ message: 'Date and time are required for rescheduling.' });
  }

  try {
    const actor = await User.findOne({ id: req.userId });
    if (!actor) return res.status(401).json({ message: 'User not found.' });
    if (actor.role === 'counselor') return res.status(403).json({ message: 'Counselors can attend assigned sessions and add notes only. Contact an admin for schedule changes.' });

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

    if (apt.status === 'completed' || hasFeedback(apt)) return res.status(409).json({ message: 'Completed sessions keep their original record. Schedule a new session instead.' });
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

    const scheduleError = await validateSchedule(apt.counselorId, date, time, Number(apt.duration) || 60, apt.id, apt.patientId, apt.appointmentType);
    if (scheduleError) return res.status(400).json({ message: scheduleError });

    const oldDate = apt.date;
    const oldTime = apt.time;

    apt.date = date;
    apt.time = time;
    apt.status = 'upcoming';
    await apt.save();

    await logAction(req.userId, `Rescheduled appointment ${apt.id} from ${oldDate} ${oldTime} to ${date} ${time}`, req);

    await sendNotification(apt.patientId, `Your appointment with ${apt.counselorName} has been rescheduled to ${date} at ${time}.`);
    await sendNotification(apt.counselorId, `Rescheduled Booking: Patient ${apt.patientName} has rescheduled the session to ${date} at ${time}.`);

    res.json({ message: 'Appointment rescheduled successfully', appointment: presentAppointment(apt, actor) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const cancelAppointment = async (req, res) => {
  try {
    const actor = await User.findOne({ id: req.userId });
    if (!actor) return res.status(401).json({ message: 'User not found.' });
    if (actor.role === 'counselor') return res.status(403).json({ message: 'Counselors can attend assigned sessions and add notes only. Contact an admin for schedule changes.' });

    const apt = await Appointment.findOne({ id: req.params.id });

    if (!apt) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    if (resolvedStatuses.includes(apt.status)) return res.status(409).json({ message: 'Resolved sessions cannot be cancelled. An admin can correct the outcome instead.' });
    if (apt.status === 'cancelled') {
      return res.status(400).json({ message: 'Appointment is already cancelled.' });
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
      message: `Appointment cancelled successfully. ${refundPercentage}% refund ($${refundAmt}) processed.`,
      appointment: presentAppointment(apt, actor),
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
    // Keep older admin clients on the same guarded completion workflow.
    if (status === 'completed') {
      const actor = await User.findOne({ id: req.userId });
      if (actor?.role !== 'admin') return res.status(403).json({ message: 'Use the session outcome workflow to confirm attendance.' });
      if (Object.keys(req.body).length !== 1) return res.status(400).json({ message: 'Record the outcome separately from other changes.' });
      req.body = { outcome: 'completed' };
      return recordSessionOutcome(req, res);
    }
    const apt = await Appointment.findOne({ id: req.params.id });

    if (!apt) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    const actor = await User.findOne({ id: req.userId });
    if (!actor) return res.status(401).json({ message: 'User not found.' });
    const isAssignedCounselor = actor.role === 'counselor' && apt.counselorId === actor.id;
    const isAdmin = actor.role === 'admin';
    if (actor.role === 'counselor' && Object.keys(req.body).some(field => field !== 'sessionNotes')) {
      return res.status(403).json({ message: 'Counselors can update session notes only.' });
    }

    if (meetingLink !== undefined) {
      if (!isAdmin) return res.status(403).json({ message: 'Only an admin can update meeting links.' });
      if (apt.appointmentType === 'In-Person Consultation') return res.status(400).json({ message: 'Offline sessions take place at HO and do not use meeting links.' });
      if (typeof meetingLink !== 'string' || !validOnlineMeetingLink(meetingLink)) return res.status(400).json({ message: 'Use a valid HTTPS Zoom or Google Meet link.' });
      apt.meetingLink = meetingLink.trim();
    }

    if (status) {
      if (!['completed', 'cancelled'].includes(status)) {
        return res.status(400).json({ message: 'Use the dedicated workflow to set this appointment status.' });
      }
      if (!isAdmin) {
        return res.status(403).json({ message: 'Only an admin can update appointment status.' });
      }
      if (apt.status !== 'upcoming') {
        return res.status(409).json({ message: 'Only scheduled appointments can be completed or cancelled.' });
      }
      apt.status = status;
    }

    if (sessionNotes !== undefined) {
      if (!isAssignedCounselor) {
        return res.status(403).json({ message: 'Only the counselor can update clinical session notes.' });
      }
      if (!['upcoming', ...resolvedStatuses].includes(apt.status)) return res.status(409).json({ message: 'Notes can only be added to scheduled or resolved sessions.' });
      if (typeof sessionNotes !== 'string' || sessionNotes.length > 20000) {
        return res.status(400).json({ message: 'Session notes must be under 20,000 characters.' });
      }
      if (sessionNotes === (apt.sessionNotes || '')) return res.json({ message: 'Session notes are unchanged.', appointment: presentAppointment(apt, actor) });
      if (!Array.isArray(apt.sessionNoteHistory)) apt.sessionNoteHistory = [];
      apt.sessionNoteHistory.push({ notes: apt.sessionNotes || '', actorId: actor.id, actorName: actor.name, at: new Date() });
      apt.sessionNotes = sessionNotes;
    }

    await apt.save();

    res.json({ message: 'Appointment updated successfully', appointment: presentAppointment(apt, actor) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


export const recordSessionOutcome = async (req, res) => {
  try {
    const actor = await User.findOne({ id: req.userId });
    const apt = await Appointment.findOne({ id: req.params.id });
    if (!actor) return res.status(401).json({ message: 'User not found.' });
    if (!apt) return res.status(404).json({ message: 'Appointment not found.' });
    const isAdmin = actor.role === 'admin';
    if (!isAdmin && !(actor.role === 'counselor' && actor.id === apt.counselorId)) return res.status(403).json({ message: 'Only the assigned counselor or an admin can record the outcome.' });
    const { outcome, reason = '', expectedStatus, expectedRecordedAt } = req.body;
    if (!resolvedStatuses.includes(outcome)) return res.status(400).json({ message: 'Choose a valid attendance outcome.' });
    if (typeof reason !== 'string' || reason.length > 1000) return res.status(400).json({ message: 'Attendance notes must be under 1,000 characters.' });
    if (!Number.isFinite(sessionEndTime(apt)) || sessionEndTime(apt) > Date.now()) return res.status(409).json({ message: 'Confirm the outcome after the scheduled session end time (IST).' });
    if (!['upcoming', ...resolvedStatuses].includes(apt.status)) return res.status(409).json({ message: 'Only scheduled or resolved sessions can have an outcome.' });
    if (apt.status === outcome) return res.json({ message: 'This outcome is already recorded.', appointment: presentAppointment(apt, actor) });
    const correction = resolvedStatuses.includes(apt.status);
    if (correction && !isAdmin) return res.status(403).json({ message: 'Only an admin can correct a recorded outcome.' });
    if (correction && !reason.trim()) return res.status(400).json({ message: 'Explain why the recorded outcome needs correcting.' });
    const presented = presentAppointment(apt, actor);
    if ((expectedStatus && expectedStatus !== presented.status) || (expectedRecordedAt !== undefined && String(expectedRecordedAt || '') !== String(apt.outcomeRecordedAt?.toISOString() || ''))) return res.status(409).json({ message: 'The outcome changed. Refresh this session before making a correction.' });
    const at = new Date();
    const requestFeedback = outcome === 'completed' && apt.appointmentKind !== 'discovery' && !apt.feedbackRequestedAt && !hasFeedback(apt);
    const fields = { status: outcome, outcomeRecordedAt: at, outcomeRecordedById: actor.id, outcomeRecordedByName: actor.name };
    if (requestFeedback) fields.feedbackRequestedAt = at;
    const updated = await Appointment.findOneAndUpdate({ id: apt.id, status: apt.status, date: apt.date, time: apt.time, duration: apt.duration, outcomeRecordedAt: apt.outcomeRecordedAt || null }, {
      $set: fields,
      $push: { outcomeHistory: { previousStatus: presented.status, outcome, actorId: actor.id, actorName: actor.name, actorRole: actor.role, reason: reason.trim(), at } },
    }, { new: true, runValidators: true });
    if (!updated) return res.status(409).json({ message: 'Another person recorded an outcome. Refresh this session.' });
    if (requestFeedback) await sendNotification(apt.patientId, 'Your counseling session with ' + apt.counselorName + ' on ' + apt.date + ' is completed. Please share your feedback from your dashboard (Past journey).');
    if (apt.appointmentKind === 'discovery' && outcome === 'completed' && apt.careRequestId) {
      const request = await CareRequest.findOne({ id: apt.careRequestId, assignedCounselorId: apt.counselorId });
      if (request?.status === 'discovery_scheduled') {
        request.status = 'discovery_completed';
        request.timeline.push({ status: 'discovery_completed', actorId: actor.id, actorName: actor.name, note: 'Discovery call completed.', at });
        await request.save();
      }
    }
    await logAction(actor.id, 'Recorded session outcome ' + apt.id + ': ' + outcome + (correction ? ' (correction)' : ''), req);
    res.json({ message: 'Session outcome recorded.', appointment: presentAppointment(updated, actor) });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const submitReview = async (req, res) => {
  const { reviewText } = req.body;
  try {
    const apt = await Appointment.findOne({ id: req.params.id });
    if (!apt) return res.status(404).json({ message: 'Appointment not found.' });
    if (apt.patientId !== req.userId) return res.status(403).json({ message: 'Only the session user can submit feedback.' });
    if (apt.status !== 'completed' || apt.appointmentKind === 'discovery') return res.status(400).json({ message: 'Feedback is available only for completed counseling sessions.' });
    if (hasFeedback(apt)) return res.status(409).json({ message: 'You have already submitted feedback for this session.' });
    if (typeof reviewText !== 'string' || !reviewText.trim() || reviewText.length > 2000) return res.status(400).json({ message: 'Write your session feedback (up to 2,000 characters).' });
    if (req.body.rating !== undefined) return res.status(400).json({ message: 'Session feedback is text only. Ratings are not accepted.' });
    const newReview = { reviewText: reviewText.trim(), date: new Date() };
    const saved = await Appointment.findOneAndUpdate({
      id: apt.id, patientId: req.userId, status: 'completed', 'review.date': { $exists: false },
      $or: [{ 'review.reviewText': { $exists: false } }, { 'review.reviewText': null }, { 'review.reviewText': { $regex: '^\s*$' } }],
    }, { $set: { review: newReview } }, { new: true, runValidators: true });
    if (!saved) return res.status(409).json({ message: 'Feedback was already submitted or the session outcome changed. Refresh your dashboard.' });
    await logAction(req.userId, 'Submitted written session feedback for ' + apt.counselorName, req);
    res.json({ message: 'Feedback submitted successfully.', review: newReview });
  } catch (error) { res.status(500).json({ message: error.message }); }
};
