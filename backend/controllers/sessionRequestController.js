import crypto from 'crypto';
import { Appointment, AppointmentType, Availability, BookingLimit, CareRequest, Exception, User } from '../models/index.js';
import { sendNotification } from '../utils/notificationService.js';

import { createCareRequest } from '../utils/careRequestService.js';
const appointmentId = () => `apt_${crypto.randomUUID()}`;
const patientRoles = ['patient', 'user'];

const canViewRequest = (request, user) => (
  user.role === 'admin' ||
  (patientRoles.includes(user.role) && request.patientId === user.id) ||
  (user.role === 'counselor' && user.approved === true && (
    request.assignedCounselorId === user.id ||
    request.finalCounselorId === user.id ||
    ((request.status === 'submitted' && !request.assignedCounselorId) ||
      (request.status === 'assigned' && request.assignedById === 'system'))
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

const validateSchedule = async (counselorId, date, time, requestedDuration = 0) => {
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
    const occupiedDuration = Number(requestedDuration) || slotDuration;
    return requestedMinutes >= intervalStart && requestedMinutes < intervalEnd &&
      (requestedMinutes - intervalStart) % slotDuration === 0 && requestedMinutes + occupiedDuration <= intervalEnd;
  });
  if (!withinAvailability) return 'Choose a time within the counselor\'s published availability.';

  if (dateOnly.toDateString() === today.toDateString()) {
    const hoursUntilSession = (scheduled.getTime() - Date.now()) / (60 * 60 * 1000);
    if (hoursUntilSession < limits.minNoticePeriodHours) {
      return `This counselor requires ${limits.minNoticePeriodHours} hours of notice.`;
    }
  }

  const appointments = await Appointment.find({ counselorId, date, status: { $in: ['upcoming', 'pending_admin'] } });
  if (appointments.length >= limits.maxAppointmentsPerDay) return 'The counselor has reached the daily session limit.';
  const requestedEnd = requestedMinutes + (Number(requestedDuration) || slotDuration);
  const hasConflict = appointments.some((appointment) => {
    const existingStart = toMinutes(appointment.time);
    const existingEnd = existingStart + (Number(appointment.duration) || slotDuration);
    return requestedMinutes < existingEnd && requestedEnd > existingStart;
  });
  if (hasConflict) return 'That counselor already has a session at this time.';
  return '';
};

const createAppointmentForRequest = async (careRequest, actor, { date, time, appointmentType, kind, status = 'upcoming', purpose = '', duration: requestedDuration }) => {
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
    clinicAddress: normalizedType === 'In-Person Consultation' ? 'MindEase Wellness Center' : '',
    meetingLink: '',
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
          ? { $or: [
            { assignedCounselorId: req.user.id },
            { finalCounselorId: req.user.id },
            { status: 'submitted', assignedCounselorId: { $in: ['', null] } },
            { status: 'assigned', assignedById: 'system' },
          ] }
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
  if (req.user.role === 'counselor' && req.user.approved !== true) return res.status(403).json({ message: 'Counselor approval is required.' });

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

export const claimRequest = async (req, res) => {
  if (req.user.role !== 'counselor' || req.user.approved !== true) {
    return res.status(403).json({ message: 'Only an approved counselor can claim an intake request.' });
  }

  try {
    const now = new Date();
    const request = await CareRequest.findOneAndUpdate(
      {
        id: req.params.id,
        $or: [
          { status: 'submitted', assignedCounselorId: { $in: ['', null] } },
          { status: 'assigned', assignedById: 'system' },
        ],
      },
      {
        $set: {
          assignedCounselorId: req.user.id,
          assignedCounselorName: req.user.name,
          assignedById: req.user.id,
          assignedByName: req.user.name,
          status: 'assigned',
          rejectedReason: '',
        },
        $push: {
          assignmentHistory: {
            counselorId: req.user.id,
            counselorName: req.user.name,
            assignedById: req.user.id,
            assignedByName: req.user.name,
            stage: 'review',
            reason: 'Claimed from the unassigned registration queue.',
            at: now,
          },
          timeline: {
            status: 'assigned',
            actorId: req.user.id,
            actorName: req.user.name,
            note: `${req.user.name} claimed this registration for review.`,
            at: now,
          },
        },
      },
      { new: true, runValidators: true },
    );
    if (!request) {
      return res.status(409).json({ message: 'This request has already been claimed or is no longer awaiting review.' });
    }

    await sendNotification(request.patientId, `${req.user.name} has claimed your registration request and will review it shortly.`);
    res.json({ message: 'Registration request claimed.', request });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const handleDecision = async (req, res) => {
  const { decision, reason = '' } = req.body;
  if (!['counselor', 'admin'].includes(req.user.role)) return res.status(403).json({ message: 'Staff access required.' });
  if (req.user.role === 'counselor' && req.user.approved !== true) return res.status(403).json({ message: 'Counselor approval is required.' });
  if (!['accepted', 'rejected'].includes(decision)) return res.status(400).json({ message: 'Choose accept or reject.' });

  try {
    const careRequest = await CareRequest.findOne({ id: req.params.id });
    if (!careRequest) return res.status(404).json({ message: 'Care request not found.' });
    if (req.user.role === 'counselor' && careRequest.assignedCounselorId !== req.user.id) {
      return res.status(403).json({ message: 'Only the assigned counselor can review this registration.' });
    }
    if (req.user.role === 'counselor' && careRequest.assignedById === 'system') {
      return res.status(409).json({ message: 'Claim this request from the unassigned queue before reviewing it.' });
    }
    if (decision === 'accepted' && (!careRequest.assignedCounselorId || careRequest.assignedById === 'system')) {
      return res.status(409).json({ message: 'Assign or claim a counselor before approving this registration.' });
    }
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
      : 'The assigned counselor is unavailable for this request. The care team will review reassignment.');
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
  if (req.user.role !== 'counselor' || req.user.approved !== true) return res.status(403).json({ message: 'Approved counselor access required.' });
  if (typeof notes !== 'string' || notes.length > 10000) return res.status(400).json({ message: 'Discovery notes must be under 10,000 characters.' });
  if (!notes.trim()) return res.status(400).json({ message: 'Add observations before marking discovery complete.' });

  try {
    const careRequest = await CareRequest.findOne({ id: req.params.id, assignedCounselorId: req.user.id });
    if (!careRequest) return res.status(404).json({ message: 'Assigned care request not found.' });
    if (!['accepted', 'discovery_scheduled', 'discovery_completed'].includes(careRequest.status)) {
      return res.status(409).json({ message: 'Approve the registration before recording discovery observations.' });
    }

    careRequest.discoveryNotes = notes.trim();
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
      message: completedDiscovery ? 'Discovery observations saved. You can now propose an ongoing counselor match.' : 'Discovery observations saved.',
      request: careRequest,
    });
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
    addTimeline(careRequest, 'assignment_pending', req.user, `Ongoing counselor assignment proposed: ${counselor.name}. Awaiting admin review.`);
    await careRequest.save();
    await sendNotification(careRequest.patientId, 'Your counselor has proposed an ongoing-care match. It is awaiting care-team review.');
    await sendNotification(counselor.id, `You have been proposed as the ongoing counselor for ${careRequest.patientName}. Assignment is awaiting admin review.`);
    const admins = await User.find({ role: 'admin', suspended: { $ne: true } });
    await Promise.allSettled(admins.map(admin => sendNotification(admin.id, `Ongoing counselor assignment for ${careRequest.patientName} needs review.`)));
    res.json({ message: 'Ongoing counselor assignment sent for admin review.', request: careRequest });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const reviewFinalAssignment = async (req, res) => {
  const { decision, reason = '' } = req.body;
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin access required.' });
  if (!['approved', 'rejected'].includes(decision)) return res.status(400).json({ message: 'Choose approve or reject.' });
  if (decision === 'rejected' && !String(reason).trim()) return res.status(400).json({ message: 'Add a reason for rework.' });

  try {
    const careRequest = await CareRequest.findOne({ id: req.params.id });
    if (!careRequest) return res.status(404).json({ message: 'Care request not found.' });
    if (careRequest.status !== 'assignment_pending' || !careRequest.finalCounselorId) {
      return res.status(409).json({ message: 'There is no ongoing counselor assignment awaiting review.' });
    }

    const proposedCounselorId = careRequest.finalCounselorId;
    const proposedCounselorName = careRequest.finalCounselorName;
    if (decision === 'rejected') {
      careRequest.finalCounselorId = '';
      careRequest.finalCounselorName = '';
      addTimeline(careRequest, 'discovery_completed', req.user, `Assignment returned for rework: ${String(reason).trim().slice(0, 1000)}`);
    } else {
      addTimeline(careRequest, 'matched', req.user, `Ongoing counselor assignment approved: ${proposedCounselorName}.`);
    }
    await careRequest.save();
    const notifications = [
      sendNotification(careRequest.patientId, decision === 'approved'
        ? `Your ongoing counselor, ${proposedCounselorName}, has been approved.`
        : 'Your care team is reviewing another counselor match.'),
      sendNotification(proposedCounselorId, decision === 'approved'
        ? `Admin approved your ongoing counselor assignment for ${careRequest.patientName}.`
        : `Admin returned your ongoing counselor assignment for ${careRequest.patientName}: ${String(reason).trim().slice(0, 1000)}`),
    ];
    if (careRequest.assignedCounselorId !== proposedCounselorId) {
      notifications.push(sendNotification(careRequest.assignedCounselorId, decision === 'approved'
        ? `Admin approved the ongoing care match for ${careRequest.patientName}.`
        : `Admin returned the ongoing care match for ${careRequest.patientName}: ${String(reason).trim().slice(0, 1000)}`));
    }
    await Promise.allSettled(notifications);
    res.json({ message: decision === 'approved' ? 'Ongoing counselor assignment approved.' : 'Assignment returned for rework.', request: careRequest });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const reviewRequestSession = async (req, res) => {
  const { decision, reason = '' } = req.body;
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin access required.' });
  if (!['approved', 'rejected'].includes(decision)) return res.status(400).json({ message: 'Choose approve or reject.' });
  if (decision === 'rejected' && !String(reason).trim()) return res.status(400).json({ message: 'Add a reason for session rework.' });

  try {
    const [careRequest, appointment] = await Promise.all([
      CareRequest.findOne({ id: req.params.id }),
      Appointment.findOne({ id: req.params.appointmentId, careRequestId: req.params.id }),
    ]);
    if (!careRequest || !appointment) return res.status(404).json({ message: 'Care request or proposed session not found.' });
    if (appointment.status !== 'pending_admin') return res.status(409).json({ message: 'This session proposal has already been reviewed.' });

    appointment.status = decision === 'approved' ? 'upcoming' : 'rejected';
    appointment.reviewReason = String(reason).trim().slice(0, 1000);
    appointment.reviewedById = req.user.id;
    appointment.reviewedByName = req.user.name;
    appointment.reviewedAt = new Date();
    await appointment.save();
    if (decision === 'approved') {
      if (careRequest.status === 'matched' || careRequest.status === 'discovery_completed') {
        careRequest.status = 'active';
      }
      careRequest.timeline.push({
        status: careRequest.status,
        actorId: req.user.id,
        actorName: req.user.name,
        note: `Session proposal for ${appointment.date} at ${appointment.time} approved.`,
        at: new Date(),
      });
    } else {
      careRequest.timeline.push({
        status: careRequest.status,
        actorId: req.user.id,
        actorName: req.user.name,
        note: `Session proposal returned for rework: ${appointment.reviewReason}`,
        at: new Date(),
      });
    }
    await careRequest.save();
    await sendNotification(careRequest.patientId, decision === 'approved'
      ? `Your counseling session for ${appointment.date} at ${appointment.time} is confirmed.`
      : `A proposed session for ${appointment.date} at ${appointment.time} needs to be rescheduled: ${appointment.reviewReason}`);
    await sendNotification(appointment.counselorId, decision === 'approved'
      ? `Admin approved your session with ${careRequest.patientName} for ${appointment.date} at ${appointment.time}.`
      : `Admin returned your session proposal with ${careRequest.patientName} for rework: ${appointment.reviewReason}`);
    res.json({ message: decision === 'approved' ? 'Session approved and confirmed.' : 'Session returned for rework.', appointment, request: careRequest });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/*
 * Session proposals are staged and reviewed by an administrator before they
 * become visible as confirmed appointments.
 */
export const scheduleSession = async (req, res) => {
  const { sessions: submittedSessions, date, time, appointmentType = 'Video Consultation', purpose = '', kind = 'session' } = req.body;
  if (!['admin', 'counselor'].includes(req.user.role)) return res.status(403).json({ message: 'Staff access required.' });

  try {
    const careRequest = await CareRequest.findOne({ id: req.params.id });
    if (!careRequest) return res.status(404).json({ message: 'Care request not found.' });
    if (!careRequest.finalCounselorId) return res.status(409).json({ message: 'Assign an ongoing-care counselor before scheduling a session.' });
    if (req.user.role === 'counselor' && careRequest.finalCounselorId !== req.user.id) return res.status(403).json({ message: 'This care plan is assigned to another counselor.' });
    if (!['matched', 'active'].includes(careRequest.status)) return res.status(409).json({ message: 'Admin approval of the ongoing counselor assignment is required before proposing sessions.' });

    const proposed = Array.isArray(submittedSessions) ? submittedSessions : [{ date, time, appointmentType, purpose, kind }];
    if (!proposed.length || proposed.length > 12) return res.status(400).json({ message: 'Propose between one and twelve sessions at a time.' });
    const normalized = proposed.map(item => ({
      ...item,
      kind: item.kind === 'follow_up' ? 'follow_up' : 'session',
    }));
    for (const item of normalized) {
      if (item.duration !== undefined && (!Number.isInteger(Number(item.duration)) || Number(item.duration) < 10 || Number(item.duration) > 180)) {
        return res.status(400).json({ message: 'Session duration must be between 10 and 180 minutes.' });
      }
      const scheduleError = await validateSchedule(careRequest.finalCounselorId, item.date, item.time, item.duration);
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
        status: 'pending_admin',
      }));
    }
    await sendNotification(careRequest.patientId, `${appointments.length} counseling session proposal(s) are awaiting admin review.`);
    const admins = await User.find({ role: 'admin', suspended: { $ne: true } });
    await Promise.allSettled(admins.map(admin => sendNotification(admin.id, `${appointments.length} session proposal(s) for ${careRequest.patientName} need review.`)));
    res.status(201).json({ message: 'Session proposal(s) sent for admin review.', appointments, request: careRequest });
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
