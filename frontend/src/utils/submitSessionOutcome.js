import { missedStatuses, pendingReschedule } from './rescheduling.js';

// Retain a saved outcome if the separate rescheduling request needs to be retried.
export async function submitSessionOutcome({ appointment, recordedAppointment, outcome, reason, reschedule, preferredDate, preferredTime }, api, onRecorded) {
  let updated = recordedAppointment;
  if (!updated) {
    const result = await api.recordSessionOutcome(appointment.id, {
      outcome, reason: reason.trim(), expectedStatus: appointment.status,
      expectedRecordedAt: appointment.outcomeRecordedAt || null,
    });
    updated = result.appointment;
    onRecorded(updated);
  }
  if (reschedule && missedStatuses.includes(updated.status) && !pendingReschedule(updated) && updated.rescheduleRequest?.status !== 'scheduled') {
    const result = await api.requestReschedule(updated.id, { reason: reason.trim(), preferredDate, preferredTime: preferredTime.trim() });
    updated = result.appointment;
  }
  return updated;
}
