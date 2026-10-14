import { createHash, randomUUID } from 'node:crypto';
import { User, Appointment, CareRequest } from '../models/index.js';
import { validateSchedule, overlaps, validOnlineMeetingLink } from './scheduling.js';
import { sendNotification, accountStatusNotification } from './notificationService.js';

const pendingStatuses = ['upcoming', 'pending_admin'];
const caseFilter = id => ({ status: { $nin: ['closed', 'completed', 'rejected'] }, $or: [{ finalCounselorId: id }, { assignedCounselorId: id }] });
const fail = (message, status = 409, details = {}) => { throw Object.assign(new Error(message), { status, details }); };

export const reviewCounselorDeactivation = async id => {
  const counselor = await User.findOne({ id, role: 'counselor' }).select('id name suspended').lean();
  if (!counselor) fail('Counselor not found.', 404);
  const [sessions, cases, replacements] = await Promise.all([
    Appointment.find({ counselorId: id, status: { $in: pendingStatuses } }).sort({ date: 1, time: 1 }).lean(),
    CareRequest.find(caseFilter(id)).lean(),
    User.find({ id: { $ne: id }, role: 'counselor', approved: true, suspended: { $ne: true } }).select('id name specialty languages').lean(),
  ]);
  const groups = new Map();
  const groupFor = (key, patientId, patientName, careRequestId = '') => {
    if (!groups.has(key)) groups.set(key, { key, patientId, patientName, careRequestId, sessions: [], hasActiveCase: false });
    return groups.get(key);
  };
  for (const careCase of cases) {
    const group = groupFor(`case:${careCase.id}`, careCase.patientId, careCase.patientName, careCase.id);
    group.hasActiveCase = true; group.preferredLanguage = careCase.preferredLanguage || '';
  }
  const blockers = [];
  for (const session of sessions) {
    const start = new Date(`${session.date}T${session.time}:00+05:30`).getTime();
    if (!Number.isFinite(start) || start <= Date.now()) {
      blockers.push({ id: session.id, patientName: session.patientName, date: session.date, time: session.time, status: session.status });
      continue;
    }
    const group = groupFor(session.careRequestId ? `case:${session.careRequestId}` : `patient:${session.patientId}`, session.patientId, session.patientName, session.careRequestId);
    group.sessions.push({ id: session.id, date: session.date, time: session.time, duration: session.duration || 60, appointmentType: session.appointmentType, meetingLink: session.meetingLink || '', status: session.status });
  }
  const version = createHash('sha256').update(JSON.stringify({
    sessions: sessions.map(item => [item.id, item.updatedAt, item.date, item.time, item.status]).sort(),
    cases: cases.map(item => [item.id, item.updatedAt, item.finalCounselorId, item.assignedCounselorId]).sort(),
    suspended: Boolean(counselor.suspended),
  })).digest('hex');
  return { counselor, groups: [...groups.values()], blockers, replacements, version, sessionCount: sessions.length, caseCount: cases.length };
};

const prepare = async (id, body) => {
  const review = await reviewCounselorDeactivation(id);
  if (review.counselor.suspended) fail('This counselor is already deactivated.');
  if (body.version !== review.version) fail('The counselor’s pending work changed. Refresh the review before continuing.');
  if (review.blockers.length) fail('Resolve running or past sessions awaiting outcomes before deactivating this counselor.');
  if (!Array.isArray(body.assignments) || body.assignments.length !== review.groups.length) fail('Choose a replacement for every active case and pending-session group.', 400);
  const choices = new Map();
  for (const choice of body.assignments) {
    if (!choice || choices.has(choice.key) || !review.groups.some(group => group.key === choice.key)) fail('Invalid or duplicate case assignment.', 400);
    if (!review.replacements.some(user => user.id === choice.counselorId)) fail('Choose an active, approved replacement counselor.', 400);
    choices.set(choice.key, choice.counselorId);
  }
  const changes = new Map();
  if (body.scheduleChanges !== undefined && !Array.isArray(body.scheduleChanges)) fail('Invalid session changes.', 400);
  for (const change of body.scheduleChanges || []) {
    if (!change || changes.has(change.id) || !review.groups.some(group => group.sessions.some(session => session.id === change.id))) fail('Invalid or duplicate session change.', 400);
    changes.set(change.id, change);
  }
  const plans = [], conflicts = [];
  for (const group of review.groups) {
    const counselorId = choices.get(group.key);
    for (const session of group.sessions) {
      const change = changes.get(session.id);
      const proposed = { ...session, patientId: group.patientId, counselorId, date: change?.date ?? session.date, time: change?.time ?? session.time, meetingLink: change?.meetingLink ?? session.meetingLink };
      if (typeof proposed.meetingLink !== 'string' || (session.appointmentType !== 'In-Person Consultation' && !validOnlineMeetingLink(proposed.meetingLink))) conflicts.push({ id: session.id, patientName: group.patientName, message: 'Add a valid HTTPS Zoom or Google Meet link for the replacement counselor.' });
      proposed.meetingLink = session.appointmentType === 'In-Person Consultation' ? '' : typeof proposed.meetingLink === 'string' ? proposed.meetingLink.trim() : '';
      const error = await validateSchedule(counselorId, proposed.date, proposed.time, proposed.duration, session.id, group.patientId, session.appointmentType);
      if (error) conflicts.push({ id: session.id, patientName: group.patientName, date: proposed.date, time: proposed.time, message: error });
      if (plans.some(previous => (previous.counselorId === counselorId || previous.patientId === group.patientId) && overlaps(previous, proposed))) conflicts.push({ id: session.id, patientName: group.patientName, message: 'Transferred sessions overlap each other.' });
      plans.push(proposed);
    }
  }
  return { review, choices, plans, conflicts };
};

export const checkCounselorTransfers = async (id, body) => {
  const { conflicts, plans } = await prepare(id, body);
  return { valid: !conflicts.length, conflicts, transferCount: plans.length };
};

export const transferAndDeactivateCounselor = async (id, body, actor) => {
  const { review, choices, plans, conflicts } = await prepare(id, body);
  if (conflicts.length) fail('Some sessions are unavailable. Change the replacement or proposed times and check again.', 400, { conflicts });
  const token = randomUUID();
  const now = new Date();
  const locked = await User.findOneAndUpdate({ id, role: 'counselor', suspended: { $ne: true }, $or: [{ deactivationLockUntil: null }, { deactivationLockUntil: { $lte: now } }] }, {
    $set: { deactivationLockToken: token, deactivationLockUntil: new Date(Date.now() + 600000) },
  }, { new: true });
  if (!locked) fail('A deactivation is already in progress. Refresh the review.');
  const transferred = [], movedCases = [];
  try {
    if ((await reviewCounselorDeactivation(id)).version !== review.version) fail('Pending work changed. Refresh the review.');
    for (const plan of plans) {
      const replacement = await User.findOne({ id: plan.counselorId, role: 'counselor', approved: true, suspended: { $ne: true } });
      if (!replacement) fail('A replacement counselor is no longer active.');
      const current = await Appointment.findOne({ id: plan.id, counselorId: id, status: { $in: pendingStatuses } });
      if (!current) fail('A session changed during transfer. Review the remaining work.');
      const error = await validateSchedule(replacement.id, plan.date, plan.time, plan.duration, current.id, current.patientId, current.appointmentType);
      if (error) fail(error);
      const updated = await Appointment.findOneAndUpdate({ id: current.id, counselorId: id, status: current.status, updatedAt: current.updatedAt }, {
        $set: { counselorId: replacement.id, counselorName: replacement.name, counselorSpecialty: replacement.specialty || '', date: plan.date, time: plan.time, meetingLink: plan.meetingLink },
        $push: { counselorTransferHistory: { fromCounselorId: id, fromCounselorName: review.counselor.name, toCounselorId: replacement.id, toCounselorName: replacement.name, previousDate: current.date, previousTime: current.time, date: plan.date, time: plan.time, previousMeetingLink: current.meetingLink || '', meetingLink: plan.meetingLink, actorId: actor.id, actorName: actor.name, at: new Date() } },
      }, { new: true });
      if (!updated) fail('A session changed during transfer. Review the remaining work.');
      transferred.push(updated);
      await Promise.allSettled([
        sendNotification(current.patientId, `Your session has been transferred to ${replacement.name} for ${plan.date} at ${plan.time} IST. Review the session details in your dashboard.`),
        sendNotification(replacement.id, `A session with ${current.patientName} has been transferred to you for ${plan.date} at ${plan.time} IST.`),
      ]);
    }
    for (const group of review.groups.filter(item => item.hasActiveCase)) {
      const careCase = await CareRequest.findOne({ id: group.careRequestId, ...caseFilter(id) });
      if (!careCase) fail('A case assignment changed. Review remaining work.');
      const replacement = await User.findOne({ id: choices.get(group.key), role: 'counselor', approved: true, suspended: { $ne: true } });
      if (!replacement) fail('A replacement counselor is no longer active.');
      const fields = {};
      if (careCase.finalCounselorId === id) { fields.finalCounselorId = replacement.id; fields.finalCounselorName = replacement.name; }
      if (careCase.assignedCounselorId === id) { fields.assignedCounselorId = replacement.id; fields.assignedCounselorName = replacement.name; fields.assignedById = actor.id; fields.assignedByName = actor.name; }
      const updated = await CareRequest.findOneAndUpdate({ id: careCase.id, updatedAt: careCase.updatedAt }, {
        $set: fields,
        $push: {
          assignmentHistory: { counselorId: replacement.id, counselorName: replacement.name, assignedById: actor.id, assignedByName: actor.name, stage: 'transfer', reason: `Transferred from ${review.counselor.name} before deactivation.`, at: new Date() },
          timeline: { status: careCase.status, actorId: actor.id, actorName: actor.name, note: `Care transferred from ${review.counselor.name} to ${replacement.name}.`, at: new Date() },
        },
      }, { new: true });
      if (!updated) fail('A case assignment changed. Review remaining work.');
      movedCases.push(updated.id);
      await Promise.allSettled([
        sendNotification(careCase.patientId, `${replacement.name} is now your assigned counselor.`),
        sendNotification(replacement.id, `The care case for ${careCase.patientName} has been assigned to you.`),
      ]);
    }
    if (await Appointment.exists({ counselorId: id, status: { $in: pendingStatuses } }) || await CareRequest.exists(caseFilter(id))) fail('New pending work was found. Review it before deactivation.');
    const user = await User.findOneAndUpdate({ id, deactivationLockToken: token, suspended: { $ne: true } }, { $set: { suspended: true } }, { new: true });
    if (!user) fail('The counselor’s status changed. Refresh the review.');
    const notification = accountStatusNotification(true);
    await sendNotification(id, notification.message, { user, subject: notification.subject });
    return { message: 'Pending work transferred and counselor deactivated.', transferredCount: transferred.length, caseCount: movedCases.length };
  } catch (error) {
    error.details = { ...error.details, transferredCount: transferred.length, caseCount: movedCases.length };
    if (transferred.length || movedCases.length) error.message = `Some work was transferred; the counselor remains active. Refresh the review to continue. ${error.message}`;
    throw error;
  } finally {
    try { await User.updateOne({ id, deactivationLockToken: token }, { $unset: { deactivationLockToken: 1, deactivationLockUntil: 1 } }); }
    catch (error) { console.error('Counselor transfer lock cleanup failed:', error.code || 'database_error'); }
  }
};
