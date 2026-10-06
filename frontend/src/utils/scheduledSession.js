// A case stays active throughout care, so its status alone cannot tell whether
// another session needs booking. Use the appointments that are still scheduled.
export const getScheduledSession = (request, appointments = []) => {
  if (!request) return null;
  return appointments.filter(appointment => {
    if (appointment.patientId !== request.patientId || appointment.status !== 'upcoming' || appointment.appointmentKind === 'discovery') return false;
    // Older consultations may not have a care-request link.
    return !appointment.careRequestId || appointment.careRequestId === request.id;
  }).sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`))[0] || null;
};
