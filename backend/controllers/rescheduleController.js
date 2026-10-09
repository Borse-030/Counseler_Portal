import { randomUUID } from 'node:crypto';
import { Appointment, CareRequest, User } from '../models/index.js';
import { sendNotification } from '../utils/notificationService.js';
import { presentAppointment, sessionEndTime, sessionStatus } from '../utils/sessionOutcome.js';
import { validateSchedule, validOnlineMeetingLink } from '../utils/scheduling.js';

const missedStatuses = ['user_absent', 'counselor_absent', 'both_absent'];
const canRequest = (apt, actor) => (actor.role === 'counselor' && actor.id === apt.counselorId) || (['patient', 'user'].includes(actor.role) && actor.id === apt.patientId);
const eligible = apt => missedStatuses.includes(apt.status) || (apt.status === 'upcoming' && Number.isFinite(sessionEndTime(apt)) && sessionEndTime(apt) <= Date.now());
const notifyParties = async (apt, message) => Promise.all([...new Set([apt.patientId, apt.counselorId])].map(id => sendNotification(id, message)));
const requestSnapshot = request => {
  const data = request.toObject ? request.toObject() : { ...request };
  delete data.lockToken;
  delete data.leaseUntil;
  delete data.plannedDate;
  delete data.plannedTime;
  delete data.plannedMeetingLink;
  return data;
};

export const requestReschedule = async (req, res) => {
  try {
    const actor = await User.findOne({ id: req.userId });
    const apt = await Appointment.findOne({ id: req.params.id });
    if (!actor) return res.status(401).json({ message: 'User not found.' });
    if (actor.suspended) return res.status(403).json({ message: 'This account is inactive.' });
    if (!apt) return res.status(404).json({ message: 'Session not found.' });
    if (!canRequest(apt, actor)) return res.status(403).json({ message: 'Only the session user or assigned counselor can request rescheduling.' });
    if (!eligible(apt)) return res.status(409).json({ message: 'Rescheduling requests are available for missed sessions or ended sessions awaiting an outcome.' });
    if (['pending', 'scheduling'].includes(apt.rescheduleRequest?.status)) return res.json({ message: 'A rescheduling request is already awaiting admin review.', appointment: presentAppointment(apt, actor) });
    if (apt.rescheduleRequest?.status === 'scheduled') return res.status(409).json({ message: 'A replacement session has already been scheduled. Open its details instead.' });
    const { reason, preferredDate = '', preferredTime = '' } = req.body;
    if (typeof reason !== 'string' || !reason.trim() || reason.length > 1000 || typeof preferredTime !== 'string' || preferredTime.length > 120) return res.status(400).json({ message: 'Explain why you need another session (up to 1,000 characters).' });
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    if (typeof preferredDate !== 'string' || (preferredDate && (!/^\d{4}-\d{2}-\d{2}$/.test(preferredDate) || !Number.isFinite(Date.parse(preferredDate + 'T00:00:00Z')) || new Date(preferredDate + 'T00:00:00Z').toISOString().slice(0, 10) !== preferredDate || preferredDate < today))) return res.status(400).json({ message: 'Choose today or a future preferred date, or leave it empty.' });
    const request = { id: randomUUID(), status: 'pending', requesterId: actor.id, requesterName: actor.name, requesterRole: actor.role, reason: reason.trim(), preferredDate, preferredTime: preferredTime.trim(), requestedAt: new Date() };
    const updated = await Appointment.findOneAndUpdate({ id: apt.id, status: apt.status, date: apt.date, time: apt.time, 'rescheduleRequest.id': apt.rescheduleRequest?.id || null }, {
      $set: { rescheduleRequest: request }, $push: { rescheduleHistory: request },
    }, { new: true, runValidators: true });
    if (!updated) return res.status(409).json({ message: 'The session or request changed. Refresh before trying again.' });
    const admins = await User.find({ role: 'admin', suspended: { $ne: true } });
    await Promise.all(admins.map(admin => sendNotification(admin.id, `${actor.name} (${actor.role === 'counselor' ? 'counselor' : 'user'}) requested rescheduling for ${apt.patientName}'s session on ${apt.date} at ${apt.time} IST. Review it in Sessions & feedback.`)));
    res.status(201).json({ message: 'Rescheduling request sent to the admin.', appointment: presentAppointment(updated, actor) });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

// A deterministic replacement ID and an atomic claim make retries safe on standalone MongoDB.
export const reviewReschedule = async (req, res) => {
  let claimed = null;
  let replacementId = '';
  let token = '';
  try {
    const actor = await User.findOne({ id: req.userId });
    if (actor?.role !== 'admin' || actor.suspended) return res.status(403).json({ message: 'Only an admin can review rescheduling requests.' });
    const apt = await Appointment.findOne({ id: req.params.id });
    if (!apt) return res.status(404).json({ message: 'Session not found.' });
    const request = apt.rescheduleRequest;
    const { action, requestId, response = '', missedOutcome } = req.body;
    const date = request?.status === 'scheduling' ? request.plannedDate : req.body.date;
    const time = request?.status === 'scheduling' ? request.plannedTime : req.body.time;
    const meetingLink = request?.status === 'scheduling' ? request.plannedMeetingLink || '' : req.body.meetingLink || '';
    if (!request || request.id !== requestId) return res.status(409).json({ message: 'This request changed. Refresh it before reviewing.' });
    if (!['approve', 'decline'].includes(action) || typeof response !== 'string' || response.length > 1000) return res.status(400).json({ message: 'Choose approve or decline and keep the response under 1,000 characters.' });
    replacementId = `apt_reschedule_${request.id}`;
    const finish = async replacement => {
      const reviewed = { ...requestSnapshot(request), status: 'scheduled', reviewerId: actor.id, reviewerName: actor.name, reviewedAt: new Date(), response: response.trim(), replacementId: replacement.id, replacementDate: replacement.date, replacementTime: replacement.time };
      if (apt.careRequestId) await CareRequest.updateOne({ id: apt.careRequestId }, {
        $addToSet: { appointmentIds: replacement.id },
        ...(apt.appointmentKind === 'discovery' ? { $set: { discoveryAppointmentId: replacement.id } } : {}),
      });
      const updated = await Appointment.findOneAndUpdate({ id: apt.id, 'rescheduleRequest.id': request.id, 'rescheduleRequest.status': 'scheduling' }, {
        $set: { rescheduleRequest: reviewed }, $push: { rescheduleHistory: reviewed },
      }, { new: true, runValidators: true });
      if (updated) await notifyParties(apt, `Your missed session has been rescheduled by the admin to ${replacement.date} at ${replacement.time} IST. Open the replacement session on your dashboard for joining details.`);
      const latest = updated || await Appointment.findOne({ id: apt.id });
      return res.json({ message: 'Replacement session scheduled.', appointment: presentAppointment(latest, actor), replacement: presentAppointment(replacement, actor) });
    };
    if (request.status === 'scheduled') {
      if (action !== 'approve') return res.status(409).json({ message: 'This request has already been approved.' });
      const replacement = await Appointment.findOne({ id: request.replacementId });
      if (!replacement) return res.status(409).json({ message: 'The replacement session could not be found. Refresh the session list.' });
      return res.json({ message: 'Replacement session already scheduled.', appointment: presentAppointment(apt, actor), replacement: presentAppointment(replacement, actor) });
    }
    if (!['pending', 'scheduling'].includes(request.status)) return res.status(409).json({ message: 'This request has already been reviewed.' });
    if (request.status === 'scheduling') {
      const existing = await Appointment.findOne({ id: replacementId, rescheduledFromId: apt.id });
      if (existing) return await finish(existing);
      if (action === 'decline' || new Date(request.leaseUntil).getTime() > Date.now()) return res.status(409).json({ message: 'This request is being scheduled. Refresh shortly before retrying.' });
    }
    if (!eligible(apt)) return res.status(409).json({ message: 'The session is no longer eligible for a replacement. Review its outcome.' });
    if (action === 'decline') {
      if (!response.trim()) return res.status(400).json({ message: 'Give a reason for declining this request.' });
      const reviewed = { ...requestSnapshot(request), status: 'declined', response: response.trim(), reviewerId: actor.id, reviewerName: actor.name, reviewedAt: new Date() };
      const updated = await Appointment.findOneAndUpdate({ id: apt.id, status: apt.status, 'rescheduleRequest.id': request.id, 'rescheduleRequest.status': 'pending' }, { $set: { rescheduleRequest: reviewed }, $push: { rescheduleHistory: reviewed } }, { new: true, runValidators: true });
      if (!updated) return res.status(409).json({ message: 'Another admin already reviewed this request.' });
      await notifyParties(apt, `The admin declined the rescheduling request for ${apt.date} at ${apt.time} IST. Reason: ${response.trim()}`);
      return res.json({ message: 'Rescheduling request declined.', appointment: presentAppointment(updated, actor) });
    }
    const outcome = missedStatuses.includes(apt.status) ? apt.status : missedOutcome;
    if (!missedStatuses.includes(outcome)) return res.status(400).json({ message: 'Confirm who was absent before scheduling a replacement.' });
    const offline = apt.appointmentType === 'In-Person Consultation';
    if (!offline && (typeof meetingLink !== 'string' || !validOnlineMeetingLink(meetingLink))) return res.status(400).json({ message: 'Add a valid Zoom or Google Meet link for the replacement online session.' });
    const patient = await User.findOne({ id: apt.patientId, role: { $in: ['patient', 'user'] }, approved: true, suspended: { $ne: true } });
    if (!patient) return res.status(409).json({ message: 'The user is not active. Review their account before rescheduling.' });
    const error = await validateSchedule(apt.counselorId, date, time, Number(apt.duration) || 60, '', apt.patientId, apt.appointmentType);
    if (error) {
      if (request.status === 'scheduling') {
        // A crashed process may leave a plan whose time has passed or become unavailable.
        await Appointment.updateOne({ id: apt.id, 'rescheduleRequest.id': request.id, 'rescheduleRequest.status': 'scheduling', 'rescheduleRequest.leaseUntil': { $lte: new Date() } }, {
          $set: { 'rescheduleRequest.status': 'pending' },
          $unset: { 'rescheduleRequest.lockToken': 1, 'rescheduleRequest.leaseUntil': 1, 'rescheduleRequest.plannedDate': 1, 'rescheduleRequest.plannedTime': 1, 'rescheduleRequest.plannedMeetingLink': 1 },
        });
        return res.status(409).json({ message: 'The interrupted scheduling plan is no longer available. Refresh and choose a new time. ' + error });
      }
      return res.status(400).json({ message: error });
    }
    const at = new Date();
    token = randomUUID();
    const stateGuard = request.status === 'pending' ? { 'rescheduleRequest.status': 'pending' } : { 'rescheduleRequest.status': 'scheduling', 'rescheduleRequest.leaseUntil': { $lte: at } };
    const fields = { 'rescheduleRequest.status': 'scheduling', 'rescheduleRequest.lockToken': token, 'rescheduleRequest.leaseUntil': new Date(Date.now() + 300000), 'rescheduleRequest.plannedDate': date, 'rescheduleRequest.plannedTime': time, 'rescheduleRequest.plannedMeetingLink': offline ? '' : meetingLink.trim() };
    const push = {};
    if (apt.status === 'upcoming') {
      Object.assign(fields, { status: outcome, outcomeRecordedAt: at, outcomeRecordedById: actor.id, outcomeRecordedByName: actor.name });
      push.outcomeHistory = { previousStatus: sessionStatus(apt), outcome, actorId: actor.id, actorName: actor.name, actorRole: actor.role, reason: 'Attendance confirmed while approving rescheduling.', at };
    }
    claimed = await Appointment.findOneAndUpdate({ id: apt.id, status: apt.status, date: apt.date, time: apt.time, 'rescheduleRequest.id': request.id, ...stateGuard }, { $set: fields, ...(Object.keys(push).length ? { $push: push } : {}) }, { new: true, runValidators: true });
    if (!claimed) return res.status(409).json({ message: 'Another person changed the session or request. Refresh before continuing.' });
    let replacement;
    try {
      replacement = await Appointment.create({
        id: replacementId, rescheduledFromId: apt.id, careRequestId: apt.careRequestId || '', appointmentKind: apt.appointmentKind || 'session',
        patientId: apt.patientId, patientName: apt.patientName, counselorId: apt.counselorId, counselorName: apt.counselorName, counselorSpecialty: apt.counselorSpecialty || '',
        appointmentType: apt.appointmentType, date, time, duration: Number(apt.duration) || 60, amount: 0, status: 'upcoming', purpose: apt.purpose || '',
        intakeNotes: apt.intakeNotes || '', clinicAddress: offline ? 'HO' : '', meetingLink: offline ? '' : meetingLink.trim(), sessionNotes: '', review: null,
      });
    } catch (error) {
      replacement = await Appointment.findOne({ id: replacementId, rescheduledFromId: apt.id });
      if (!replacement) throw error;
    }
    return await finish(replacement);
  } catch (error) {
    if (claimed) {
      try {
        const existing = await Appointment.findOne({ id: replacementId });
        if (!existing) await Appointment.updateOne({ id: claimed.id, 'rescheduleRequest.lockToken': token, 'rescheduleRequest.status': 'scheduling' }, { $set: { 'rescheduleRequest.status': 'pending' }, $unset: { 'rescheduleRequest.lockToken': 1, 'rescheduleRequest.leaseUntil': 1, 'rescheduleRequest.plannedDate': 1, 'rescheduleRequest.plannedTime': 1, 'rescheduleRequest.plannedMeetingLink': 1 } });
      } catch { /* Lease expiry permits retry if the database was temporarily unavailable. */ }
    }
    res.status(500).json({ message: 'Could not finish rescheduling. Refresh the request before retrying. ' + error.message });
  }
};
