import fs from 'node:fs';
const path = '.bjs-workflow/backend/controllers/appointmentController.js';
let s = fs.readFileSync(path, 'utf8').replaceAll('\r\n', '\n');
const begin = s.indexOf('export const createAppointment');
const end = s.indexOf('export const rescheduleAppointment', begin);
s = s.slice(0, begin) + `export const createAppointment = async (req, res) => {
  return res.status(409).json({ message: 'BJS sessions must be proposed through the care plan and reviewed by an admin.' });
};

` + s.slice(end);
s = `import { validateSchedule, validMeetingLink } from '../utils/scheduling.js';\n` + s;
s = s.replace('    res.json(filtered);', `    res.json(filtered.map(appointment => {
      const data = appointment.toObject();
      if (['patient', 'user'].includes(currentUser.role)) delete data.sessionNotes;
      return data;
    }));`);
s = s.replace('    res.json(apt);', `    const actor = await User.findOne({ id: req.userId });
    const data = apt.toObject();
    if (['patient', 'user'].includes(actor?.role)) delete data.sessionNotes;
    else {
      const patient = await User.findOne({ id: apt.patientId });
      data.patientMobile = patient?.mobile || '';
    }
    res.json(data);`);
const reschedule = s.indexOf('export const rescheduleAppointment');
const rescheduleTry = s.indexOf('  try {', reschedule);
s = s.slice(0, rescheduleTry) + s.slice(rescheduleTry).replace('  try {', `  try {
    const actor = await User.findOne({ id: req.userId });
    if (!actor || !['admin', 'counselor'].includes(actor.role)) return res.status(403).json({ message: 'Contact the BJS care team to request a schedule change.' });`);
const assignment = s.indexOf('    const rescheduleNoticeHours', reschedule);
s = s.slice(0, assignment) + `    if (apt.status !== 'upcoming') return res.status(409).json({ message: 'Only confirmed sessions can be rescheduled.' });
    const scheduleError = await validateSchedule(apt.counselorId, date, time, apt.duration, apt.id, apt.patientId);
    if (scheduleError) return res.status(400).json({ message: scheduleError });
` + s.slice(assignment);
s = s.replace("    apt.status = 'upcoming';", "    apt.status = apt.appointmentKind === 'discovery' ? 'upcoming' : 'pending_admin';\n    apt.reviewedById = '';\n    apt.reviewedByName = '';\n    apt.reviewedAt = undefined;");
s = s.replace('Appointment rescheduled successfully', 'Schedule change saved. Counseling sessions require admin review again.');
s = s.replace("    if (apt.status === 'cancelled') {", "    if (!['upcoming', 'pending_admin'].includes(apt.status)) {");
s = s.replace('Appointment is already cancelled.', 'Only upcoming sessions or pending proposals can be cancelled.');
s = s.replace('`Appointment cancelled successfully. ${refundPercentage}% refund ($${refundAmt}) processed.`', "'Appointment cancelled successfully.'");
s = s.replace('  const { status, sessionNotes } = req.body;', '  const { status, sessionNotes, meetingLink } = req.body;');
s = s.replace('    if (sessionNotes !== undefined) {', `    if (meetingLink !== undefined) {
      if (!isAssignedCounselor && !isAdmin) return res.status(403).json({ message: 'Staff access required.' });
      if (!validMeetingLink(meetingLink)) return res.status(400).json({ message: 'Use a valid HTTPS meeting link.' });
      apt.meetingLink = meetingLink;
    }
    if (sessionNotes !== undefined) {
      if (typeof sessionNotes !== 'string' || sessionNotes.length > 10000) return res.status(400).json({ message: 'Notes must be under 10,000 characters.' });`);
const complete = s.indexOf("    if (apt.appointmentKind === 'discovery' && status === 'completed'");
const completeEnd = s.indexOf("    res.json({ message: 'Appointment updated", complete);
s = s.slice(0, complete) + `    if (apt.appointmentKind === 'discovery' && apt.careRequestId) {
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

` + s.slice(completeEnd);
s = s.replace('  const { rating, reviewText } = req.body;', `  const { rating, reviewText = '' } = req.body;
  if (!Number.isInteger(rating) || rating < 1 || rating > 5 || typeof reviewText !== 'string' || reviewText.length > 5000) {
    return res.status(400).json({ message: 'Choose a rating from 1 to 5 and keep feedback under 5,000 characters.' });
  }`);
fs.writeFileSync(path, s);
// Protect appointment operations with current account state (not only the token).
const routePath = '.bjs-workflow/backend/routes/appointments.js';
s = fs.readFileSync(routePath, 'utf8').replaceAll('\r\n', '\n');
s = "import { User } from '../models/index.js';\n" + s;
s = s.replace('const authenticate = (req, res, next)', 'const authenticate = async (req, res, next)');
s = s.replace('    req.userId = userId;', `    const user = await User.findOne({ id: userId, suspended: { $ne: true } });
    if (!user || (user.role === 'counselor' && !user.approved)) return res.status(403).json({ message: 'An active approved account is required.' });
    req.userId = userId;`);
fs.writeFileSync(routePath, s);
