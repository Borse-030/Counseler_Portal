import { validateSchedule, validOnlineMeetingLink } from '../utils/scheduling.js';
import crypto from 'crypto';
import { Appointment, AppointmentType, CareRequest, User } from '../models/index.js';
import { sendNotification } from '../utils/notificationService.js';

import { createCareRequest } from '../utils/careRequestService.js';
const appointmentId = () => `apt_${crypto.randomUUID()}`;
const patientRoles = ['patient', 'user'];

const canViewRequest = (request, user) => (
  user.role === 'admin' ||
  (patientRoles.includes(user.role) && request.patientId === user.id) ||
  (user.role === 'counselor' && user.approved === true && (
    request.assignedCounselorId === user.id ||
    request.finalCounselorId === user.id
  ))
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

const createAppointmentForRequest = async (careRequest, actor, { date, time, appointmentType, kind, status = 'upcoming', purpose = '', duration: requestedDuration, meetingLink = '' }) => {
  const appointmentCounselorId = kind === 'discovery' ? careRequest.assignedCounselorId : careRequest.finalCounselorId;
  const counselor = await User.findOne({ id: appointmentCounselorId, role: 'counselor', approved: true, suspended: { $ne: true } });
  if (!counselor) throw new Error('The assigned counselor is not active.');
  const normalizedType = appointmentType === 'Online Consultation' ? 'Video Consultation' : appointmentType;
  const type = await AppointmentType.findOne({ counselorId: counselor.id, name: normalizedType });
  const duration = kind === 'discovery' ? 20 : (Number(requestedDuration) || type?.duration || 60);
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
    status,
    purpose: String(purpose).slice(0, 1000),
    clinicAddress: normalizedType === 'In-Person Consultation' ? 'HO' : '',
    meetingLink: normalizedType === 'In-Person Consultation' ? '' : meetingLink.trim(),
    intakeNotes: kind === 'session' ? careRequest.intakeNotes : '',
    sessionNotes: '',
    review: null,
  });

  await appointment.save();
  careRequest.appointmentIds.push(id);
  if (kind === 'discovery') careRequest.discoveryAppointmentId = id;
  if (kind === 'session' && status === 'upcoming') addTimeline(careRequest, 'active', actor, `Session scheduled for ${date} at ${time}.`);
  await careRequest.save();

  const activityName = kind === 'discovery' ? 'Discovery call' : kind === 'follow_up' ? 'Follow-up session' : 'Counseling session';
  const scheduleState = status === 'pending_admin' ? 'proposed and awaiting admin review' : 'scheduled';
  await sendNotification(careRequest.patientId, `${activityName} ${scheduleState} with ${counselor.name} for ${date} at ${time}.`);
  await sendNotification(counselor.id, `${activityName} ${scheduleState} with ${careRequest.patientName} for ${date} at ${time}.`);
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
    const careRequest = await createCareRequest(req.user, {
      preferredDate, preferredTime, preferredFormat, intakeNotes,
    });

    res.status(201).json({ message: 'Session request received.', request: careRequest });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getRequests = async (req, res) => {
  try {
    if (req.user.role === 'counselor' && req.user.approved !== true) {
      return res.status(403).json({ message: 'Counselor approval is required to view intake requests.' });
    }
    const filter = req.user.role === 'admin'
      ? {}
      : patientRoles.includes(req.user.role)
        ? { patientId: req.user.id }
        : req.user.role === 'counselor'
          ? {
            $or: [
              { assignedCounselorId: req.user.id },
              { finalCounselorId: req.user.id },
            ]
          }
          : null;
    if (!filter) return res.status(403).json({ message: 'Forbidden.' });

    const requests = await CareRequest.find(filter).sort({ updatedAt: -1, createdAt: -1 });
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getRequestById = async (req, res) => {
  try {
    const careRequest = await CareRequest.findOne({ id: req.params.id });
    if (!careRequest) return res.status(404).json({ message: 'Care request not found.' });
    if (!canViewRequest(careRequest, req.user)) return res.status(403).json({ message: 'Forbidden.' });
    res.json(careRequest);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const assignCounselor = async (req, res) => {
  const { counselorId, reason = '' } = req.body;
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin access required.' });

  try {
    const careRequest = await CareRequest.findOne({ id: req.params.id });
    if (!careRequest) return res.status(404).json({ message: 'Care request not found.' });
    if (!['discovery_completed', 'matched', 'active'].includes(careRequest.status)) {
      return res.status(409).json({ message: 'Approve registration and record discovery observations before assigning a counselor.' });
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
      stage: 'care',
      reason: String(reason).slice(0, 1000),
      at: new Date()
    });
    careRequest.finalCounselorId = counselor.id;
    careRequest.finalCounselorName = counselor.name;
    addTimeline(careRequest, 'matched', req.user, `Admin assigned ongoing counselor ${counselor.name}.`);
    await careRequest.save();

    await sendNotification(counselor.id, `You have been assigned as the counselor for ${careRequest.patientName}.`);
    await sendNotification(careRequest.patientId, `${counselor.name} has been assigned as your counselor.`);
    res.json({ message: 'Counselor assigned.', request: careRequest });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const handleDecision = async (req, res) => {
  const { decision, reason = '' } = req.body;
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin access required.' });
  if (!['accepted', 'rejected'].includes(decision)) return res.status(400).json({ message: 'Choose accept or reject.' });

  try {
    const careRequest = await CareRequest.findOne({ id: req.params.id });
    if (!careRequest) return res.status(404).json({ message: 'Care request not found.' });
    if (!['submitted', 'assigned', 'rejected'].includes(careRequest.status)) return res.status(409).json({ message: 'This request has already moved past registration review.' });
    if (decision === 'rejected' && !String(reason).trim()) return res.status(400).json({ message: 'Add a brief reason so the care team can reassign the request.' });

    careRequest.rejectedReason = decision === 'rejected' ? String(reason).trim().slice(0, 1000) : '';
    const nextStatus = decision === 'accepted' ? 'accepted' : 'rejected';
    addTimeline(careRequest, nextStatus, req.user, careRequest.rejectedReason || 'Registration approved.');
    if (!Array.isArray(careRequest.reviews)) careRequest.reviews = [];
    careRequest.reviews.push({
      actorId: req.user.id,
      actorName: req.user.name,
      actorRole: req.user.role,
      decision,
      reason: String(reason).trim().slice(0, 1000),
      at: new Date(),
    });
    await careRequest.save();
    const patient = await User.findOne({ id: careRequest.patientId });
    if (patient) {
      patient.approved = decision === 'accepted';
      await patient.save();
    }
    await sendNotification(careRequest.patientId, decision === 'accepted'
      ? `${req.user.name} approved your registration. You can now have a discovery conversation and your counselor will record observations.`
      : 'Your registration request was declined. Please contact the care team if you need help.');
    if (careRequest.assignedById && careRequest.assignedById !== 'system' && careRequest.assignedById !== req.user.id) {
      await sendNotification(careRequest.assignedById, `${req.user.name} ${decision} the request from ${careRequest.patientName}.`);
    }
    res.json({ message: `Request ${decision}.`, request: careRequest });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateDiscoveryNotes = async (req, res) => {
  const { notes } = req.body;
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin access required.' });
  if (typeof notes !== 'string' || notes.length > 10000) return res.status(400).json({ message: 'Discovery notes must be under 10,000 characters.' });
  if (!notes.trim()) return res.status(400).json({ message: 'Add observations before marking discovery complete.' });

  try {
    const careRequest = await CareRequest.findOne({ id: req.params.id });
    if (!careRequest) return res.status(404).json({ message: 'Assigned care request not found.' });
    if (!['accepted', 'discovery_scheduled', 'discovery_completed', 'matched', 'active'].includes(careRequest.status)) {
      return res.status(409).json({ message: 'Approve the registration before recording discovery observations.' });
    }

    careRequest.discoveryNotes = notes.trim();
    if (!Array.isArray(careRequest.discoveryNotesHistory)) careRequest.discoveryNotesHistory = [];
    careRequest.discoveryNotesHistory.push({ notes: notes.trim(), actorId: req.user.id, actorName: req.user.name, at: new Date() });
    const completedDiscovery = ['accepted', 'discovery_scheduled'].includes(careRequest.status) && Boolean(careRequest.discoveryNotes);
    const timelineStatus = completedDiscovery ? 'discovery_completed' : careRequest.status;
    if (completedDiscovery) careRequest.status = 'discovery_completed';
    careRequest.timeline.push({
      status: timelineStatus,
      actorId: req.user.id,
      actorName: req.user.name,
      note: completedDiscovery
        ? 'Discovery conversation completed and observations recorded.'
        : 'Discovery observations updated.',
      at: new Date(),
    });
    await careRequest.save();
    res.json({
      message: completedDiscovery ? 'Discovery observations saved. You can now assign a counselor.' : 'Discovery observations saved.',
      request: careRequest,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const assignFinalCounselor = async (req, res) => {
  const { counselorId, reason = '' } = req.body;
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin access required.' });

  try {
    const careRequest = await CareRequest.findOne({ id: req.params.id });
    if (!careRequest) return res.status(404).json({ message: 'Care request not found.' });
    if (!['discovery_completed', 'matched', 'active'].includes(careRequest.status) || !careRequest.discoveryNotes.trim()) {
      return res.status(409).json({ message: 'Complete the discovery call and record its notes before assigning ongoing care.' });
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
    addTimeline(careRequest, 'matched', req.user, `Admin assigned ongoing counselor ${counselor.name}.`);
    await careRequest.save();
    await sendNotification(careRequest.patientId, `Your counselor, ${counselor.name}, has been assigned.`);
    await sendNotification(counselor.id, `You have been assigned as the counselor for ${careRequest.patientName}.`);
    res.json({ message: 'Counselor assigned.', request: careRequest });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const scheduleSession = async (req, res) => {
  const { sessions: submittedSessions, date, time, appointmentType = 'Video Consultation', purpose = '', kind = 'session' } = req.body;
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Only an admin can schedule sessions or follow-ups.' });

  try {
    const careRequest = await CareRequest.findOne({ id: req.params.id });
    if (!careRequest) return res.status(404).json({ message: 'Care request not found.' });
    if (!careRequest.finalCounselorId) return res.status(409).json({ message: 'Assign an ongoing-care counselor before scheduling a session.' });
    if (req.user.role === 'counselor' && careRequest.finalCounselorId !== req.user.id) return res.status(403).json({ message: 'This care plan is assigned to another counselor.' });
    if (!['matched', 'active'].includes(careRequest.status)) return res.status(409).json({ message: 'The care case is not ready for sessions.' });

    const proposed = Array.isArray(submittedSessions) ? submittedSessions : [{ date, time, appointmentType, purpose, kind }];
    if (!proposed.length || proposed.length > 12) return res.status(400).json({ message: 'Propose between one and twelve sessions at a time.' });
    const normalized = proposed.map(item => ({
      ...item,
      appointmentType: item.appointmentType || 'Video Consultation',
      kind: item.kind === 'follow_up' ? 'follow_up' : 'session',
    }));
    const requestedMode = careRequest.preferredFormat === 'In-Person Consultation' ? 'offline'
      : careRequest.preferredFormat === 'Online Consultation' ? 'online' : null;
    for (const item of normalized) {
      const scheduledMode = item.appointmentType === 'In-Person Consultation' ? 'offline'
        : ['Video Consultation', 'Online Consultation'].includes(item.appointmentType) ? 'online' : null;
      if (!requestedMode || scheduledMode !== requestedMode) {
        return res.status(400).json({ message: 'Session mode must match the user requested mode: online or offline.' });
      }
      if (scheduledMode === 'online' && !validOnlineMeetingLink(item.meetingLink)) {
        return res.status(400).json({ message: 'Add a valid HTTPS Zoom or Google Meet link for every online session.' });
      }
      item.meetingLink = scheduledMode === 'online' ? item.meetingLink.trim() : '';
      if (item.duration !== undefined && (!Number.isInteger(Number(item.duration)) || Number(item.duration) < 10 || Number(item.duration) > 180)) {
        return res.status(400).json({ message: 'Session duration must be between 10 and 180 minutes.' });
      }
      if (item.duration === undefined) {
        const type = await AppointmentType.findOne({ counselorId: careRequest.finalCounselorId, name: item.appointmentType === 'Online Consultation' ? 'Video Consultation' : item.appointmentType });
        item.duration = Number(type?.duration) || 60;
      }
      const scheduleError = await validateSchedule(careRequest.finalCounselorId, item.date, item.time, Number(item.duration) || 60, '', careRequest.patientId, item.appointmentType);
      if (scheduleError) return res.status(400).json({ message: scheduleError });
    }
    for (let i = 0; i < normalized.length; i += 1) {
      const current = normalized[i];
      const type = await AppointmentType.findOne({ counselorId: careRequest.finalCounselorId, name: current.appointmentType });
      const start = Number(current.time.slice(0, 2)) * 60 + Number(current.time.slice(3, 5));
      const end = start + (Number(current.duration) || type?.duration || 60);
      const overlaps = normalized.slice(0, i).some(previous => {
        if (previous.date !== current.date) return false;
        const previousType = previous.appointmentType;
        const previousDuration = Number(previous.duration) || (previousType === 'Audio Consultation' ? 45 : previousType === 'Chat Consultation' ? 30 : 60);
        const previousStart = Number(previous.time.slice(0, 2)) * 60 + Number(previous.time.slice(3, 5));
        return start < previousStart + previousDuration && end > previousStart;
      });
      if (overlaps) return res.status(400).json({ message: 'Proposed sessions cannot overlap on the same date.' });
    }

    const appointments = [];
    for (const item of normalized) {
      appointments.push(await createAppointmentForRequest(careRequest, req.user, {
        ...item,
        kind: item.kind,
        status: 'upcoming',
      }));
    }
    await sendNotification(careRequest.patientId, `${appointments.length} counseling session(s) have been scheduled.`);
    res.status(201).json({ message: 'Session(s) scheduled.', appointments, request: careRequest });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
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
      return res.status(409).json({ message: 'This case still has scheduled or proposed counseling sessions.' });
    }

    addTimeline(careRequest, 'closed', req.user, 'Admin closed the care case after scheduled sessions were completed.');
    await careRequest.save();
    await sendNotification(careRequest.patientId, 'Your care case has been closed. You can still view your appointment history and feedback.');
    res.json({ message: 'Care case closed.', request: careRequest });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
