import crypto from 'crypto';
import { Appointment, AppointmentType, Availability, BookingLimit, CareRequest, Exception, User } from '../models/index.js';
import { sendNotification } from '../utils/notificationService.js';

const requestId = () => `care_${crypto.randomUUID()}`;
const appointmentId = () => `apt_${crypto.randomUUID()}`;
const patientRoles = ['patient', 'user'];

const canViewRequest = (request, user) => (
  user.role === 'admin' ||
  (patientRoles.includes(user.role) && request.patientId === user.id) ||
  (user.role === 'counselor' && (request.assignedCounselorId === user.id || request.finalCounselorId === user.id))
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

const validateSchedule = async (counselorId, date, time) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '') || !/^\d{2}:\d{2}$/.test(time || '')) {
    return 'Choose a valid date and time.';
  }

  const scheduled = new Date(`${date}T${time}:00`);
  if (Number.isNaN(scheduled.getTime()) || scheduled <= new Date()) {
    return 'The session must be scheduled for a future date and time.';
  }

  const counselor = await User.findOne({ id: counselorId, role: 'counselor', approved: true, suspended: { $ne: true } });
  if (!counselor) return 'The assigned counselor is not active.';

  const limits = await BookingLimit.findOne({ counselorId }) || {
    maxAppointmentsPerDay: 5,
    minNoticePeriodHours: 2,
    maxAdvanceBookingDays: 30,
  };
  const dateOnly = new Date(`${date}T12:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const latestDate = new Date();
  latestDate.setHours(23, 59, 59, 999);
  latestDate.setDate(latestDate.getDate() + limits.maxAdvanceBookingDays);
  if (dateOnly < today) return 'Sessions cannot be scheduled in the past.';
  if (dateOnly > latestDate) return `Sessions can only be scheduled ${limits.maxAdvanceBookingDays} days ahead.`;

  if (await Exception.findOne({ counselorId, date })) return 'The counselor is unavailable on this date.';

  const availability = await Availability.findOne({ counselorId }) || {
    workingDays: [1, 2, 3, 4, 5],
    startHour: '09:00',
    endHour: '17:00',
    slotDuration: 60,
    daysConfig: [],
  };
  const dayOfWeek = dateOnly.getDay();
  const dayConfig = availability.daysConfig?.find((day) => day.dayIndex === dayOfWeek);
  const isWorkingDay = dayConfig ? dayConfig.active : availability.workingDays.includes(dayOfWeek);
  if (!isWorkingDay) return 'The counselor does not work on this day.';
  const intervals = dayConfig?.active && dayConfig.slots?.length
    ? dayConfig.slots
    : [{ startHour: availability.startHour, endHour: availability.endHour }];
  const toMinutes = (value) => {
    const [hour, minute] = value.split(':').map(Number);
    return hour * 60 + minute;
  };
  const requestedMinutes = toMinutes(time);
  const slotDuration = Number(availability.slotDuration) || 60;
  const withinAvailability = intervals.some((interval) => {
    if (!interval.startHour || !interval.endHour) return false;
    const intervalStart = toMinutes(interval.startHour);
    const intervalEnd = toMinutes(interval.endHour);
    return requestedMinutes >= intervalStart && requestedMinutes < intervalEnd &&
      (requestedMinutes - intervalStart) % slotDuration === 0 && requestedMinutes + slotDuration <= intervalEnd;
  });
  if (!withinAvailability) return 'Choose a time within the counselor\'s published availability.';

  if (dateOnly.toDateString() === today.toDateString()) {
    const hoursUntilSession = (scheduled.getTime() - Date.now()) / (60 * 60 * 1000);
    if (hoursUntilSession < limits.minNoticePeriodHours) {
      return `This counselor requires ${limits.minNoticePeriodHours} hours of notice.`;
    }
  }

  const appointments = await Appointment.find({ counselorId, date, status: 'upcoming' });
  if (appointments.length >= limits.maxAppointmentsPerDay) return 'The counselor has reached the daily session limit.';
  const requestedEnd = requestedMinutes + slotDuration;
  const hasConflict = appointments.some((appointment) => {
    const existingStart = toMinutes(appointment.time);
    const existingEnd = existingStart + (Number(appointment.duration) || slotDuration);
    return requestedMinutes < existingEnd && requestedEnd > existingStart;
  });
  if (hasConflict) return 'That counselor already has a session at this time.';
  return '';
};

const createAppointmentForRequest = async (careRequest, actor, { date, time, appointmentType, kind }) => {
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
    clinicAddress: normalizedType === 'In-Person Consultation' ? 'MindEase Wellness Center' : '',
    meetingLink: '',
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
    const id = requestId();
    const careRequest = new CareRequest({
      id,
      patientId: req.user.id,
      patientName: req.user.name,
      status: 'submitted',
      preferredDate,
      preferredTime,
      preferredFormat,
      intakeNotes: intakeNotes.trim(),
      timeline: [{ status: 'submitted', actorId: req.user.id, actorName: req.user.name, note: 'Patient submitted an intake request.' }],
    });
    await careRequest.save();

    const admins = await User.find({ role: 'admin', suspended: { $ne: true } });
    await Promise.all(admins.map((admin) => sendNotification(admin.id, `New session request from ${req.user.name} is ready for review.`)));
    await sendNotification(req.user.id, 'Your session request has been received and is waiting for admin review.');
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
          ? { $or: [{ assignedCounselorId: req.user.id }, { finalCounselorId: req.user.id }] }
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
  if (!['admin', 'counselor'].includes(req.user.role)) return res.status(403).json({ message: 'Staff access required.' });

  try {
    const careRequest = await CareRequest.findOne({ id: req.params.id });
    if (!careRequest) return res.status(404).json({ message: 'Care request not found.' });
    if (req.user.role === 'counselor' && req.user.id !== careRequest.assignedCounselorId) {
      return res.status(403).json({ message: 'Only the currently assigned counselor can reassign this request.' });
    }
    if (!['submitted', 'assigned', 'rejected'].includes(careRequest.status)) {
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
    addTimeline(careRequest, 'assigned', req.user, `Assigned to ${counselor.name}.`);
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
  if (req.user.role !== 'counselor') return res.status(403).json({ message: 'Counselor access required.' });
  if (!['accepted', 'rejected'].includes(decision)) return res.status(400).json({ message: 'Choose accept or reject.' });

  try {
    const careRequest = await CareRequest.findOne({ id: req.params.id, assignedCounselorId: req.user.id });
    if (!careRequest) return res.status(404).json({ message: 'Assigned care request not found.' });
    if (careRequest.status !== 'assigned') return res.status(409).json({ message: 'This request has already been reviewed.' });
    if (decision === 'rejected' && !String(reason).trim()) return res.status(400).json({ message: 'Add a brief reason so the care team can reassign the request.' });

    careRequest.rejectedReason = decision === 'rejected' ? String(reason).trim().slice(0, 1000) : '';
    addTimeline(careRequest, decision, req.user, careRequest.rejectedReason || 'Counselor accepted the request.');
    await careRequest.save();
    await sendNotification(careRequest.patientId, decision === 'accepted'
      ? `${req.user.name} accepted your request. The discovery call can now be scheduled.`
      : 'The assigned counselor is unavailable for this request. The care team will review reassignment.');
    await sendNotification(careRequest.assignedById, `${req.user.name} ${decision} the request from ${careRequest.patientName}.`);
    res.json({ message: `Request ${decision}.`, request: careRequest });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateDiscoveryNotes = async (req, res) => {
  const { notes } = req.body;
  if (req.user.role !== 'counselor') return res.status(403).json({ message: 'Counselor access required.' });
  if (typeof notes !== 'string' || notes.length > 10000) return res.status(400).json({ message: 'Discovery notes must be under 10,000 characters.' });

  try {
    const careRequest = await CareRequest.findOne({ id: req.params.id, assignedCounselorId: req.user.id });
    if (!careRequest) return res.status(404).json({ message: 'Assigned care request not found.' });
    if (!['discovery_scheduled', 'discovery_completed'].includes(careRequest.status)) {
      return res.status(409).json({ message: 'Discovery notes can be recorded after the discovery call is scheduled.' });
    }

    careRequest.discoveryNotes = notes.trim();
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
    if (req.user.role === 'counselor' && careRequest.assignedCounselorId !== req.user.id) {
      return res.status(403).json({ message: 'Only the discovery counselor can make the final care assignment.' });
    }
    if (careRequest.status !== 'discovery_completed' || !careRequest.discoveryNotes.trim()) {
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
    addTimeline(careRequest, 'discovery_completed', req.user, `Ongoing care assigned to ${counselor.name}.`);
    await careRequest.save();
    await sendNotification(counselor.id, `A care plan for ${careRequest.patientName} has been assigned to you.`);
    await sendNotification(careRequest.patientId, `Your discovery call is complete. Ongoing care has been assigned to ${counselor.name}.`);
    res.json({ message: 'Ongoing counselor assigned.', request: careRequest });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const scheduleDiscoveryCall = async (req, res) => {
  const { date, time, appointmentType = 'Discovery Call' } = req.body;
  if (!['admin', 'counselor'].includes(req.user.role)) return res.status(403).json({ message: 'Staff access required.' });

  try {
    const careRequest = await CareRequest.findOne({ id: req.params.id });
    if (!careRequest) return res.status(404).json({ message: 'Care request not found.' });
    if (req.user.role === 'counselor' && careRequest.assignedCounselorId !== req.user.id) return res.status(403).json({ message: 'This request is assigned to another counselor.' });
    if (careRequest.status !== 'accepted') return res.status(409).json({ message: 'The counselor must accept the request before scheduling a discovery call.' });

    const scheduleError = await validateSchedule(careRequest.assignedCounselorId, date, time);
    if (scheduleError) return res.status(400).json({ message: scheduleError });
    const appointment = await createAppointmentForRequest(careRequest, req.user, { date, time, appointmentType, kind: 'discovery' });
    addTimeline(careRequest, 'discovery_scheduled', req.user, `Discovery call scheduled for ${date} at ${time}.`);
    await careRequest.save();
    res.status(201).json({ message: 'Discovery call scheduled.', appointment, request: careRequest });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const scheduleSession = async (req, res) => {
  const { date, time, appointmentType = 'Video Consultation' } = req.body;
  if (!['admin', 'counselor'].includes(req.user.role)) return res.status(403).json({ message: 'Staff access required.' });

  try {
    const careRequest = await CareRequest.findOne({ id: req.params.id });
    if (!careRequest) return res.status(404).json({ message: 'Care request not found.' });
    if (!careRequest.finalCounselorId) return res.status(409).json({ message: 'Assign an ongoing-care counselor before scheduling a session.' });
    if (req.user.role === 'counselor' && careRequest.finalCounselorId !== req.user.id) return res.status(403).json({ message: 'This care plan is assigned to another counselor.' });
    if (!['discovery_completed', 'active'].includes(careRequest.status)) return res.status(409).json({ message: 'Complete the discovery call before scheduling a counseling session.' });

    const scheduleError = await validateSchedule(careRequest.finalCounselorId, date, time);
    if (scheduleError) return res.status(400).json({ message: scheduleError });
    const appointment = await createAppointmentForRequest(careRequest, req.user, { date, time, appointmentType, kind: 'session' });
    res.status(201).json({ message: 'Session scheduled.', appointment, request: careRequest });
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
    const counselingSessions = linkedAppointments.filter((appointment) => appointment.appointmentKind === 'session');
    if (!counselingSessions.some((appointment) => appointment.status === 'completed')) {
      return res.status(409).json({ message: 'Complete at least one counseling session before closing this case.' });
    }
    if (counselingSessions.some((appointment) => appointment.status === 'upcoming')) {
      return res.status(409).json({ message: 'This case still has scheduled counseling sessions.' });
    }

    addTimeline(careRequest, 'closed', req.user, 'Admin closed the care case after scheduled sessions were completed.');
    await careRequest.save();
    await sendNotification(careRequest.patientId, 'Your care case has been closed. You can still view your appointment history and feedback.');
    res.json({ message: 'Care case closed.', request: careRequest });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
