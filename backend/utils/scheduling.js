import { Appointment, Availability, BookingLimit, Exception, User } from '../models/index.js';
import { appointmentMode, dayIntervals, modesAtTime } from './availabilityModes.js';

export const toMinutes = (time) => {
  const [hour, minute] = time.split(':').map(Number);
  return hour * 60 + minute;
};
export const overlaps = (a, b) => a.date === b.date &&
  toMinutes(a.time) < toMinutes(b.time) + (Number(b.duration) || 60) &&
  toMinutes(b.time) < toMinutes(a.time) + (Number(a.duration) || 60);

// BJS schedules are expressed in India Standard Time, independent of the server timezone.
export const validateSchedule = async (counselorId, date, time, duration = 60, excludeId = '', patientId = '', appointmentType = '') => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '') || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time || '') ||
      !Number.isInteger(duration) || duration < 10 || duration > 180) return 'Choose a valid date, time, and duration (10–180 minutes).';
  const day = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(day.getTime()) || day.toISOString().slice(0, 10) !== date) return 'Choose a valid calendar date.';
  const scheduled = new Date(`${date}T${time}:00+05:30`);
  const hoursAhead = (scheduled - new Date()) / 3600000;
  if (hoursAhead <= 0) return 'The call or session must be in the future.';
  const counselor = await User.findOne({ id: counselorId, role: 'counselor', approved: true, suspended: { $ne: true } });
  if (!counselor) return 'The counselor is not active.';
  const limits = await BookingLimit.findOne({ counselorId }) || { maxAppointmentsPerDay: 5, minNoticePeriodHours: 2, maxAdvanceBookingDays: 30 };
  if (hoursAhead < limits.minNoticePeriodHours) return `This counselor requires ${limits.minNoticePeriodHours} hours of notice.`;
  if (hoursAhead > limits.maxAdvanceBookingDays * 24) return `Choose a date within ${limits.maxAdvanceBookingDays} days.`;
  if (await Exception.findOne({ counselorId, date })) return 'The counselor is unavailable on this date.';
  const availability = await Availability.findOne({ counselorId }) || { workingDays: [1, 2, 3, 4, 5], startHour: '09:00', endHour: '17:00', slotDuration: 60 };
  const intervals = dayIntervals(availability, date);
  if (!intervals.length) return 'The counselor does not work on this day.';
  const step = Math.max(1, Number(availability.slotDuration) || 60);
  const supportedModes = modesAtTime(intervals, time, duration, step);
  if (!supportedModes.length) return 'Choose a time and duration within the counselor’s published availability.';
  if (appointmentType && !supportedModes.includes(appointmentMode(appointmentType))) return 'The counselor does not offer this session mode at the selected time.';
  const reserved = await Appointment.find({ counselorId, date, status: { $in: ['pending_admin', 'upcoming', 'completed'] }, id: { $ne: excludeId } });
  if (reserved.length >= limits.maxAppointmentsPerDay) return 'The counselor has reached the daily session limit.';
  const proposed = { date, time, duration };
  if (reserved.some(item => overlaps(proposed, item))) return 'This time overlaps another session or request awaiting admin review.';
  if (patientId) {
    const patientBookings = await Appointment.find({ patientId, date, status: { $in: ['pending_admin', 'upcoming'] }, id: { $ne: excludeId } });
    if (patientBookings.some(item => overlaps(proposed, item))) return 'The user already has a call or session at this time.';
  }
  return '';
};

export const validMeetingLink = (value) => {
  if (!value) return true;
  try { return new URL(value).protocol === 'https:'; } catch { return false; }
};
