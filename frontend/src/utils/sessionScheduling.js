export const sessionsOverlap = (a, b) => {
  const minutes = value => Number(value.slice(0, 2)) * 60 + Number(value.slice(3, 5));
  return a.date === b.date && minutes(a.time) < minutes(b.time) + Number(b.duration || 60)
    && minutes(b.time) < minutes(a.time) + Number(a.duration || 60);
};
export const canEditScheduledSession = appointment => appointment?.status === 'upcoming'
  && new Date(`${appointment.date}T${appointment.time}:00+05:30`).getTime() > Date.now();
