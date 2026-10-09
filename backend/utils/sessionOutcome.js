export const resolvedStatuses = ['completed', 'user_absent', 'counselor_absent', 'both_absent'];
export const sessionEndTime = appointment => Date.parse(appointment.date + 'T' + appointment.time + ':00+05:30') + (Number(appointment.duration) || 60) * 60000;
export const sessionStatus = (appointment, now = Date.now()) => ['upcoming', 'awaiting_outcome'].includes(appointment.status)
  ? (sessionEndTime(appointment) <= now ? 'awaiting_outcome' : 'upcoming') : appointment.status;
export const hasFeedback = appointment => Boolean(appointment?.review?.date || appointment?.review?.reviewText?.trim());
// Session feedback belongs to the submitting user and the admin care team.
export const presentAppointment = (appointment, actor) => {
  const data = appointment.toObject ? appointment.toObject() : { ...appointment };
  const canReadFeedback = actor?.role === 'admin' || (['patient', 'user'].includes(actor?.role) && actor.id === data.patientId);
  if (!canReadFeedback) {
    delete data.review;
    delete data.feedbackRequestedAt;
  } else if (data.review) {
    data.review = { reviewText: data.review.reviewText || '', date: data.review.date };
  }
  if (data.rescheduleRequest) {
    data.rescheduleRequest = { ...data.rescheduleRequest };
    delete data.rescheduleRequest.lockToken;
    delete data.rescheduleRequest.leaseUntil;
    delete data.rescheduleRequest.plannedDate;
    delete data.rescheduleRequest.plannedTime;
    delete data.rescheduleRequest.plannedMeetingLink;
  }
  return { ...data, status: sessionStatus(data) };
};
