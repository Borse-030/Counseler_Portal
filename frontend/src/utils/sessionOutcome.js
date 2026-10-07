export const outcomeOptions = [
  { value: 'completed', label: 'Completed — both attended' },
  { value: 'user_absent', label: 'User absent' },
  { value: 'counselor_absent', label: 'Counselor absent' },
  { value: 'both_absent', label: 'Both absent' },
];

export const resolvedStatuses = outcomeOptions.map(option => option.value);
export const sessionEndTime = appointment => {
  const start = Date.parse(`${appointment?.date}T${appointment?.time}:00+05:30`);
  return start + (Number(appointment?.duration) || 60) * 60000;
};
export const sessionStatus = (appointment, now = Date.now()) =>
  ['upcoming', 'awaiting_outcome'].includes(appointment?.status)
    ? (sessionEndTime(appointment) <= now ? 'awaiting_outcome' : 'upcoming')
    : appointment?.status;
export const statusLabel = status => ({
  upcoming: 'Scheduled', awaiting_outcome: 'Awaiting outcome', completed: 'Completed',
  user_absent: 'User absent', counselor_absent: 'Counselor absent', both_absent: 'Both absent',
  pending_admin: 'Awaiting admin', cancelled: 'Cancelled', rejected: 'Rejected',
}[status] || status);
export const feedbackEligible = appointment => appointment?.status === 'completed' && appointment.appointmentKind !== 'discovery';
export const hasFeedback = appointment => Boolean(appointment?.review?.date || appointment?.review?.reviewText?.trim());
export const feedbackLabel = appointment => !feedbackEligible(appointment)
  ? 'Not applicable' : hasFeedback(appointment) ? 'Feedback received' : 'Feedback pending';
