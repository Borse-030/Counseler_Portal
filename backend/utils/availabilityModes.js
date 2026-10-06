export const toMinutes = time => {
  const [hours, minutes] = String(time).split(':').map(Number);
  return hours * 60 + minutes;
};
export const appointmentMode = type => type === 'In-Person Consultation' ? 'offline' : 'online';
export const validTime = value => /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value || '');
export const validDate = value => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};
export const dayIntervals = (availability, date) => {
  const dayIndex = new Date(`${date}T00:00:00Z`).getUTCDay();
  const day = availability.daysConfig?.find(item => item.dayIndex === dayIndex);
  if (day) return day.active ? day.slots || [] : [];
  return (availability.workingDays || []).includes(dayIndex) ? [availability] : [];
};
export const modesAtTime = (intervals, time, duration, step = 60) => {
  const start = toMinutes(time);
  const modes = new Set();
  for (const interval of intervals) {
    if (!validTime(interval.startHour) || !validTime(interval.endHour)) continue;
    const begin = toMinutes(interval.startHour), end = toMinutes(interval.endHour);
    if (start < begin || start + duration > end || (start - begin) % step !== 0) continue;
    if (!interval.mode || interval.mode === 'both') { modes.add('online'); modes.add('offline'); }
    else if (['online', 'offline'].includes(interval.mode)) modes.add(interval.mode);
  }
  return [...modes];
};
export const validateDayConfigs = days => {
  if (!Array.isArray(days) || days.length > 7) return 'Provide up to seven weekly day configurations.';
  const indexes = new Set();
  for (const day of days) {
    if (!Number.isInteger(day.dayIndex) || day.dayIndex < 0 || day.dayIndex > 6 || indexes.has(day.dayIndex)) return 'Each weekday must have a unique day index from 0 to 6.';
    indexes.add(day.dayIndex);
    if (typeof day.active !== 'boolean' || !Array.isArray(day.slots)) return 'Each day needs an active flag and time blocks.';
    if (day.active && !day.slots.length) return 'Add at least one time block for every active day.';
    const sorted = [...day.slots].sort((a, b) => String(a.startHour).localeCompare(String(b.startHour)));
    for (let i = 0; i < sorted.length; i++) {
      const slot = sorted[i];
      if (!validTime(slot.startHour) || !validTime(slot.endHour) || slot.startHour >= slot.endHour) return 'Each block needs valid start and end times, with the end after the start.';
      if (slot.mode !== undefined && !['online', 'offline', 'both'].includes(slot.mode)) return 'Session mode must be online, offline, or both.';
      if (i && slot.startHour < sorted[i - 1].endHour) return 'Availability blocks must not overlap, even when their session modes differ.';
    }
  }
  return '';
};
