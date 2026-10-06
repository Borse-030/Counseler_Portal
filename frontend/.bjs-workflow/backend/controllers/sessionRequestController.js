import { validateSchedule, overlaps, validMeetingLink } from '../utils/scheduling.js';
import crypto from 'crypto';
import { Appointment, AppointmentType, Availability, BookingLimit, CareRequest, Exception, User } from '../models/index.js';
import { sendNotification } from '../utils/notificationService.js';

import { createAssignedCareRequest } from '../utils/careRequestService.js';
const appointmentId = () => `apt_${crypto.randomUUID()}`;
const patientRoles = ['patient', 'user'];

const canViewRequest = (request, user) => (
  user.role === 'admin' ||
  (patientRoles.includes(user.role) && request.patientId === user.id) ||
  (user.role === 'counselor' && (request.assignedCounselorId === user.id || request.finalCounselorId === user.id || (request.status === 'submitted' && !request.assignedCounselorId)))
);

const addTimeline = (careRequest, status, actor, note = '') => {
  careRequest.status = status;
  careRequest.timeline.push({
    status,
    actorId: actor.id,
    actorName: actor.name,
    note,
    at: new Date(),
  });
};

const createAppointmentForRequest = async (careRequest, actor, { date, time, appointmentType, kind, meetingLink = '' }) => {
  const appointmentCounselorId = kind === 'discovery' ? careRequest.assignedCounselorId : careRequest.finalCounselorId;
  const counselor = await User.findOne({ id: appointmentCounselorId, role: 'counselor', approved: true, suspended: { $ne: true } });
  if (!counselor) throw new Error('The assigned counselor is not active.');
  const normalizedType = appointmentType === 'Online Consultation' ? 'Video Consultation' : appointmentType;
  const type = await AppointmentType.findOne({ counselorId: counselor.id, name: normalizedType });
  const duration = kind === 'discovery' ? 20 : (type?.duration || 60);
  const id = appointmentId();
  const appointment = new Appointment({
    id,
    careRequestId: careRequest.id,
    appointmentKind: kind,
    patientId: careRequest.patientId,
    patientName: careRequest.patientName,
    counselorId: counselor.id,
    counselorName: counselor.name,
    counselorSpecialty: counselor.specialty || '',
    appointmentType: normalizedType,
    date,
    time,
    duration,
    amount: 0,
    status: 'upcoming',
    clinicAddress: normalizedType === 'In-Person Consultation' ? 'BJS counseling center' : '',
    meetingLink,
    intakeNotes: kind === 'session' ? careRequest.intakeNotes : '',
    sessionNotes: '',
    review: null,
  });

  await appointment.save();
  careRequest.appointmentIds.push(id);
  if (kind === 'discovery') careRequest.discoveryAppointmentId = id;
  if (kind === 'session') addTimeline(careRequest, 'active', actor, `Session scheduled for ${date} at ${time}.`);
  await careRequest.save();

  await sendNotification(careRequest.patientId, `${kind === 'discovery' ? 'Discovery call' : 'Counseling session'} scheduled with ${counselor.name} for ${date} at ${time}.`);
  await sendNotification(counselor.id, `${kind === 'discovery' ? 'Discovery call' : 'Counseling session'} scheduled with ${careRequest.patientName} for ${date} at ${time}.`);
  return appointment;
};

export const createRequest = async (req, res) => {
  const { preferredDate, preferredTime, preferredFormat, intakeNotes = '' } = req.body;
  if (!patientRoles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Only patients can create a care request.' });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(preferredDate || '') || !['Morning', 'Afternoon', 'Evening'].includes(preferredTime)) {
    return res.status(400).json({ message: 'A valid preferred date and time window are required.' });
  }
  if (!['Online Consultation', 'In-Person Consultation'].includes(preferredFormat)) {
    return res.status(400).json({ message: 'Choose an online or in-person session preference.' });
  }
  if (typeof intakeNotes !== 'string' || intakeNotes.length > 5000) {
    return res.status(400).json({ message: 'Intake notes must be under 5,000 characters.' });
  }

  const requestedDate = new Date(`${preferredDate}T12:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (Number.isNaN(requestedDate.getTime()) || requestedDate < today) {
    return res.status(400).json({ message: 'Choose today or a future preferred date.' });
  }

  try {
    const careRequest = await createAssignedCareRequest(req.user, {
      preferredDate, preferredTime, preferredFormat, intakeNotes,
    });

    res.status(201).json({ message: 'Session request received.', request: careRequest });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getRequests = async (req, res) => {
  try {
    const filter = req.user.role === 'admin'
      ? {}
      : patientRoles.includes(req.user.role)
        ? { patientId: req.user.id }
        : req.user.role === 'counselor'
          ? { $or: [{ assignedCounselorId: req.user.id }, { finalCounselorId: req.user.id }, { status: 'submitted', assignedCounselorId: '' }] }
          : null;
    if (!filter) return res.status(403).json({ message: 'Forbidden.' });

    const requests = await CareRequest.find(filter).sort({ updatedAt: -1, createdAt: -1 });
    res.json(requests.map(request => {
      const data = request.toObject();
      if (patientRoles.includes(req.user.role)) delete data.discoveryNotes;
      return data;
    }));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getRequestById = async (req, res) => {
  try {
    const careRequest = await CareRequest.findOne({ id: req.params.id });
    if (!careRequest) return res.status(404).json({ message: 'Care request not found.' });
    if (!canViewRequest(careRequest, req.user)) return res.status(403).json({ message: 'Forbidden.' });
    const data = careRequest.toObject();
    if (patientRoles.includes(req.user.role)) delete data.discoveryNotes;
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const assignCounselor = async (req, res) => {
  const { counselorId, reason = '' } = req.body;
  if (!['admin', 'counselor'].includes(req.user.role)) return res.status(403).json({ message: 'Staff access required.' });

  try {
    const careRequest = await CareRequest.findOne({ id: req.params.id });
    if (!careRequest) return res.status(404).json({ message: 'Care request not found.' });
    if (req.user.role === 'counselor' && req.user.id !== careRequest.assignedCounselorId) {
      return res.status(403).json({ message: 'Only the currently assigned counselor can reassign this request.' });
    }
    if (!['submitted', 'assigned', 'accepted', 'rejected'].includes(careRequest.status)) {
      return res.status(409).json({ message: 'This request can no longer be assigned.' });
    }
    const counselor = await User.findOne({ id: counselorId, role: 'counselor', approved: true, suspended: { $ne: true } });
    if (!counselor) return res.status(404).json({ message: 'Approved counselor not found.' });

    careRequest.assignedCounselorId = counselor.id;
    careRequest.assignedCounselorName = counselor.name;
    careRequest.assignedById = req.user.id;
    careRequest.rejectedReason = '';
    careRequest.assignmentHistory.push({
      counselorId: counselor.id,
      counselorName: counselor.name,
      assignedById: req.user.id,
      assignedByName: req.user.name,
      stage: 'review',
      reason: String(reason).slice(0, 1000),
      at: new Date()
    });
    addTimeline(careRequest, careRequest.status === 'accepted' ? 'accepted' : 'assigned', req.user, `Assigned to ${counselor.name}.`);
    await careRequest.save();

    await sendNotification(counselor.id, `A new intake request from ${careRequest.patientName} has been assigned to you.`);
    await sendNotification(careRequest.patientId, 'A counselor has been assigned to review your request.');
    res.json({ message: 'Counselor assigned.', request: careRequest });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const handleDecision = async (req, res) => {
  const { decision, reason = '' } = req.body;
  if (!['admin', 'counselor'].includes(req.user.role)) return res.status(403).json({ message: 'Staff access required.' });
  if (!['accepted', 'rejected'].includes(decision)) return res.status(400).json({ message: 'Choose approve or reject.' });
  if (typeof reason !== 'string' || reason.length > 1000 || (decision === 'rejected' && !reason.trim())) {
    return res.status(400).json({ message: 'Rejection requires a reason, up to 1,000 characters.' });
  }
  try {
    const careRequest = await CareRequest.findOne({ id: req.params.id });
    if (!careRequest) return res.status(404).json({ message: 'Care request not found.' });
    if (req.user.role === 'counselor' && careRequest.assignedCounselorId && careRequest.assignedCounselorId !== req.user.id) {
      return res.status(403).json({ message: 'This registration belongs to another counselor.' });
    }
    if (!['submitted', 'assigned', 'accepted', 'rejected'].includes(careRequest.status)) {
      return res.status(409).json({ message: 'Registration review is complete; discovery or ongoing care has begun.' });
    }
    const updates = { status: decision, rejectedReason: decision === 'rejected' ? reason.trim() : '' };
    if (req.user.role === 'counselor' && !careRequest.assignedCounselorId) {
      updates.assignedCounselorId = req.user.id;
      updates.assignedCounselorName = req.user.name;
    }
    const request = await CareRequest.findOneAndUpdate(
      { id: careRequest.id, status: careRequest.status, updatedAt: careRequest.updatedAt },
      { $set: updates, $push: {
        reviews: { actorId: req.user.id, actorName: req.user.name, actorRole: req.user.role, decision, reason: reason.trim(), at: new Date() },
        timeline: { status: decision, actorId: req.user.id, actorName: req.user.name, note: `${req.user.role} ${decision} registration. ${reason.trim()}`, at: new Date() },
      } }, { new: true }
    );
    if (!request) return res.status(409).json({ message: 'Another reviewer changed this registration. Refresh and review the latest decision.' });
    await sendNotification(careRequest.patientId, decision === 'accepted'
      ? 'Your BJS registration has been approved. The care team can arrange your discovery call.'
      : `Your BJS registration was rejected. Reason: ${reason.trim()}`);
    const admins = await User.find({ role: 'admin', suspended: { $ne: true } });
    const recipients = new Set([...admins.map(admin => admin.id), request.assignedCounselorId].filter(Boolean));
    await Promise.all([...recipients].filter(id => id !== req.user.id).map(id => sendNotification(id, `${req.user.name} ${decision} registration for ${careRequest.patientName}.`)));
    res.json({ message: `Registration ${decision === 'accepted' ? 'approved' : 'rejected'}.`, request });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const updateDiscoveryNotes = async (req, res) => {
  const { notes } = req.body;
  if (req.user.role !== 'counselor') return res.status(403).json({ message: 'Counselor access required.' });
  if (typeof notes !== 'string' || notes.length > 10000) return res.status(400).json({ message: 'Discovery notes must be under 10,000 characters.' });

  try {
    const careRequest = await CareRequest.findOne({ id: req.params.id, assignedCounselorId: req.user.id });
    if (!careRequest) return res.status(404).json({ message: 'Assigned care request not found.' });
    if (!['discovery_scheduled', 'discovery_completed', 'active'].includes(careRequest.status)) {
      return res.status(409).json({ message: 'Discovery notes can be recorded after the discovery call is scheduled.' });
    }

    careRequest.discoveryNotes = notes.trim();
    if (careRequest.discoveryAppointmentId) await Appointment.updateOne({ id: careRequest.discoveryAppointmentId }, { $set: { sessionNotes: notes.trim() } });
    careRequest.timeline.push({
      status: careRequest.status,
      actorId: req.user.id,
      actorName: req.user.name,
      note: 'Discovery call notes updated.',
      at: new Date(),
    });
    await careRequest.save();
    res.json({ message: 'Discovery notes saved.', request: careRequest });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const assignFinalCounselor = async (req, res) => {
  const { counselorId, reason = '' } = req.body;
  if (!['admin', 'counselor'].includes(req.user.role)) return res.status(403).json({ message: 'Staff access required.' });

  try {
    const careRequest = await CareRequest.findOne({ id: req.params.id });
    if (!careRequest) return res.status(404).json({ message: 'Care request not found.' });
    if (req.user.role === 'counselor' && ![careRequest.assignedCounselorId, careRequest.finalCounselorId].includes(req.user.id)) {
      return res.status(403).json({ message: 'Only the discovery counselor can make the final care assignment.' });
    }
    if (!['discovery_scheduled', 'discovery_completed', 'active'].includes(careRequest.status) || !careRequest.discoveryNotes.trim()) {
      return res.status(409).json({ message: 'Schedule the discovery call and save discovery notes before assigning ongoing care.' });
    }

    const counselor = await User.findOne({ id: counselorId, role: 'counselor', approved: true, suspended: { $ne: true } });
    if (!counselor) return res.status(404).json({ message: 'Approved counselor not found.' });
    careRequest.finalCounselorId = counselor.id;
    careRequest.finalCounselorName = counselor.name;
    careRequest.assignmentHistory.push({
      counselorId: counselor.id,
      counselorName: counselor.name,
      assignedById: req.user.id,
      assignedByName: req.user.name,
      stage: 'care',
      reason: String(reason).slice(0, 1000),
      at: new Date()
    });
    addTimeline(careRequest, careRequest.status, req.user, `Ongoing care assigned to ${counselor.name}.`);
    await careRequest.save();
    await sendNotification(counselor.id, `A care plan for ${careRequest.patientName} has been assigned to you.`);
    await sendNotification(careRequest.patientId, `Ongoing care has been assigned to ${counselor.name}.`);
    res.json({ message: 'Ongoing counselor assigned.', request: careRequest });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const scheduleDiscoveryCall = async (req, res) => {
  const { date, time, appointmentType = 'Audio Consultation', meetingLink = '' } = req.body;
  if (!validMeetingLink(meetingLink)) return res.status(400).json({ message: 'Use a valid HTTPS meeting link.' });
  if (!['admin', 'counselor'].includes(req.user.role)) return res.status(403).json({ message: 'Staff access required.' });

  try {
    const careRequest = await CareRequest.findOne({ id: req.params.id });
    if (!careRequest) return res.status(404).json({ message: 'Care request not found.' });
    if (req.user.role === 'counselor' && careRequest.assignedCounselorId !== req.user.id) return res.status(403).json({ message: 'This request is assigned to another counselor.' });
    if (careRequest.status !== 'accepted') return res.status(409).json({ message: 'The counselor must accept the request before scheduling a discovery call.' });

    const scheduleError = await validateSchedule(careRequest.assignedCounselorId, date, time, 20, '', careRequest.patientId);
    if (scheduleError) return res.status(400).json({ message: scheduleError });
    const appointment = await createAppointmentForRequest(careRequest, req.user, { date, time, appointmentType, meetingLink, kind: 'discovery' });
    addTimeline(careRequest, 'discovery_scheduled', req.user, `Discovery call scheduled for ${date} at ${time}.`);
    await careRequest.save();
    res.status(201).json({ message: 'Discovery call scheduled.', appointment, request: careRequest });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const scheduleSession = async (req, res) => {
  if (!['admin', 'counselor'].includes(req.user.role)) return res.status(403).json({ message: 'Staff access required.' });
  const sessions = req.body.sessions || [req.body];
  if (!Array.isArray(sessions) || sessions.length < 1 || sessions.length > 12) return res.status(400).json({ message: 'Propose between 1 and 12 sessions at a time.' });
  try {
    const careRequest = await CareRequest.findOne({ id: req.params.id });
    if (!careRequest) return res.status(404).json({ message: 'Care request not found.' });
    if (!careRequest.finalCounselorId || !['discovery_scheduled', 'discovery_completed', 'active'].includes(careRequest.status)) {
      return res.status(409).json({ message: 'Start discovery, save notes, and assign ongoing care before proposing sessions.' });
    }
    if (req.user.role === 'counselor' && ![careRequest.assignedCounselorId, careRequest.finalCounselorId].includes(req.user.id)) {
      return res.status(403).json({ message: 'Only an assigned counselor can propose sessions.' });
    }
    const counselor = await User.findOne({ id: careRequest.finalCounselorId, role: 'counselor', approved: true, suspended: { $ne: true } });
    if (!counselor) return res.status(409).json({ message: 'Choose an active ongoing counselor.' });
    const batchId = `plan_${crypto.randomUUID()}`;
    const proposals = [];
    const limits = await BookingLimit.findOne({ counselorId: counselor.id }) || { maxAppointmentsPerDay: 5 };
    for (const session of sessions) {
      const { date, time, duration = 60, appointmentType = 'Video Consultation', kind = 'session', meetingLink = '', purpose = '' } = session || {};
      if (!['session', 'follow_up'].includes(kind) || !['Video Consultation', 'Audio Consultation', 'In-Person Consultation'].includes(appointmentType) ||
          !validMeetingLink(meetingLink) || typeof purpose !== 'string' || purpose.length > 2000) {
        return res.status(400).json({ message: 'Choose a valid session type, HTTPS meeting link, and purpose (up to 2,000 characters).' });
      }
      const scheduleError = await validateSchedule(counselor.id, date, time, duration, '', careRequest.patientId);
      if (scheduleError) return res.status(400).json({ message: `${date || 'Session'}: ${scheduleError}` });
      if (proposals.some(other => overlaps({ date, time, duration }, other))) return res.status(400).json({ message: 'The proposed sessions overlap each other.' });
      const reserved = await Appointment.countDocuments({ counselorId: counselor.id, date, status: { $in: ['pending_admin', 'upcoming', 'completed'] } });
      if (reserved + proposals.filter(item => item.date === date).length >= limits.maxAppointmentsPerDay) return res.status(400).json({ message: `${date}: The proposal exceeds the daily appointment limit.` });
      proposals.push({ id: appointmentId(), careRequestId: careRequest.id, appointmentKind: kind,
        proposalBatchId: batchId, proposedById: req.user.id, proposedByName: req.user.name,
        patientId: careRequest.patientId, patientName: careRequest.patientName,
        counselorId: counselor.id, counselorName: counselor.name, counselorSpecialty: counselor.specialty,
        date, time, duration, appointmentType, meetingLink, purpose: purpose.trim(),
        status: 'pending_admin', amount: 0, intakeNotes: careRequest.intakeNotes, review: null });
    }
    const appointments = await Appointment.insertMany(proposals);
    careRequest.appointmentIds.push(...appointments.map(item => item.id));
    addTimeline(careRequest, careRequest.status, req.user, `${appointments.length} session(s) proposed for admin review.`);
    await careRequest.save();
    const admins = await User.find({ role: 'admin', suspended: { $ne: true } });
    await Promise.all(admins.map(admin => sendNotification(admin.id, `${req.user.name} proposed ${appointments.length} session(s) for ${careRequest.patientName}. Admin review required.`)));
    await sendNotification(careRequest.patientId, 'Your proposed BJS sessions are awaiting admin review. They are not confirmed yet.');
    res.status(201).json({ message: 'Sessions sent for admin review.', appointments, request: careRequest });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const reviewSession = async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Only admins can review session proposals.' });
  const { decision, reason = '' } = req.body;
  if (!['approved', 'rejected'].includes(decision) || typeof reason !== 'string' || reason.length > 1000 || (decision === 'rejected' && !reason.trim())) {
    return res.status(400).json({ message: 'Choose approve or reject and provide a reason for rejection (up to 1,000 characters).' });
  }
  try {
    const appointment = await Appointment.findOne({ id: req.params.appointmentId, careRequestId: req.params.id });
    const careRequest = await CareRequest.findOne({ id: req.params.id });
    if (!appointment || !careRequest) return res.status(404).json({ message: 'Session proposal not found.' });
    if (appointment.status !== 'pending_admin') return res.status(409).json({ message: 'This session has already been reviewed.' });
    if (decision === 'approved') {
      if (!['discovery_scheduled', 'discovery_completed', 'active'].includes(careRequest.status)) return res.status(409).json({ message: 'The care case is not ready for sessions.' });
      const error = await validateSchedule(appointment.counselorId, appointment.date, appointment.time, appointment.duration, appointment.id, appointment.patientId);
      if (error) return res.status(409).json({ message: error });
    }
    const updated = await Appointment.findOneAndUpdate({ id: appointment.id, status: 'pending_admin' }, { $set: {
      status: decision === 'approved' ? 'upcoming' : 'rejected', reviewedById: req.user.id, reviewedByName: req.user.name,
      reviewedAt: new Date(), reviewReason: reason.trim(),
    } }, { new: true });
    if (!updated) return res.status(409).json({ message: 'Another admin already reviewed this session.' });
    // Preserve discovery state until that call is completed.
    addTimeline(careRequest, decision === 'approved' && careRequest.status === 'discovery_completed' ? 'active' : careRequest.status,
      req.user, `Session ${appointment.date} ${appointment.time} ${decision}. ${reason.trim()}`);
    await careRequest.save();
    await Promise.all([appointment.patientId, appointment.counselorId, appointment.proposedById].filter((id, index, ids) => id && ids.indexOf(id) === index)
      .map(id => sendNotification(id, `Session for ${appointment.patientName} on ${appointment.date} at ${appointment.time} IST ${decision} by admin.${reason.trim() ? ` Reason: ${reason.trim()}` : ''}`)));
    res.json({ message: `Session ${decision}.`, appointment: updated, request: careRequest });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const closeCase = async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin access required to close a care case.' });

  try {
    const careRequest = await CareRequest.findOne({ id: req.params.id });
    if (!careRequest) return res.status(404).json({ message: 'Care request not found.' });
    if (careRequest.status !== 'active') return res.status(409).json({ message: 'Only active care cases can be closed.' });

    const linkedAppointments = await Appointment.find({ id: { $in: careRequest.appointmentIds } });
    const counselingSessions = linkedAppointments.filter((appointment) => ['session', 'follow_up'].includes(appointment.appointmentKind));
    if (!counselingSessions.some((appointment) => appointment.status === 'completed')) {
      return res.status(409).json({ message: 'Complete at least one counseling session before closing this case.' });
    }
    if (counselingSessions.some((appointment) => ['upcoming', 'pending_admin'].includes(appointment.status))) {
      return res.status(409).json({ message: 'This case still has scheduled sessions or sessions awaiting admin review.' });
    }

    addTimeline(careRequest, 'closed', req.user, 'Admin closed the care case after scheduled sessions were completed.');
    await careRequest.save();
    await sendNotification(careRequest.patientId, 'Your care case has been closed. You can still view your appointment history and feedback.');
    res.json({ message: 'Care case closed.', request: careRequest });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
