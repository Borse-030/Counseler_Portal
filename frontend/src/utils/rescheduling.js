import { sessionStatus } from './sessionOutcome.js';

export const missedStatuses = ['user_absent', 'counselor_absent', 'both_absent'];
export const canRequestReschedule = (appointment, now = Date.now()) => [...missedStatuses, 'awaiting_outcome'].includes(sessionStatus(appointment, now));
export const pendingReschedule = appointment => ['pending', 'scheduling'].includes(appointment.rescheduleRequest?.status);
export const mergeRescheduleResult = (appointments, result) => {
  const updated = appointments.map(a => a.id === result.appointment.id ? result.appointment : a);
  return result.replacement && !updated.some(a => a.id === result.replacement.id) ? [...updated, result.replacement] : updated;
};
