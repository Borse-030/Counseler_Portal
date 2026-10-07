export const isOnlineMeetingLink = value => {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && url.pathname !== '/' && (
      url.hostname === 'meet.google.com' || url.hostname === 'zoom.us' || url.hostname.endsWith('.zoom.us')
    );
  } catch { return false; }
};

export const attendanceLink = appointment => appointment?.status === 'upcoming'
  && appointment.appointmentType !== 'In-Person Consultation'
  && isOnlineMeetingLink(appointment.meetingLink) ? appointment.meetingLink.trim() : '';
