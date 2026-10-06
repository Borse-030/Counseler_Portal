export const sessionMode = appointmentType => appointmentType === 'In-Person Consultation' ? 'offline' : 'online';
export const slotSupportsMode = (slot, appointmentType) => !appointmentType || !slot.modes || slot.modes.includes(sessionMode(appointmentType));
export const modeLabel = appointmentType => sessionMode(appointmentType) === 'offline' ? 'Offline · In person' : 'Online';

// Weekly availability defines which modes can be booked. Custom appointment
// types add choices, but are not required to offer online or offline sessions.
export const sessionTypesForAvailability = (availability, configuredTypes = [], slots = []) => {
  const modes = new Set();
  const addMode = mode => {
    if (!mode || mode === 'both') { modes.add('online'); modes.add('offline'); }
    else if (['online', 'offline'].includes(mode)) modes.add(mode);
  };
  if (availability) {
    for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
      const day = availability.daysConfig?.find(item => item.dayIndex === dayIndex);
      const intervals = day ? day.active ? day.slots || [] : []
        : (availability.workingDays || [1, 2, 3, 4, 5]).includes(dayIndex) ? [availability] : [];
      intervals.forEach(interval => {
        if (interval.startHour && interval.endHour && interval.startHour < interval.endHour) addMode(interval.mode);
      });
    }
  } else {
    slots.forEach(slot => (slot.modes || []).forEach(addMode));
  }
  const types = new Map();
  configuredTypes.forEach(type => {
    if (type.name && modes.has(sessionMode(type.name))) types.set(type.name, type);
  });
  for (const [mode, name] of [['online', 'Video Consultation'], ['offline', 'In-Person Consultation']]) {
    if (modes.has(mode) && !types.has(name)) types.set(name, { id: `availability-${mode}`, name });
  }
  return [...types.values()];
};
