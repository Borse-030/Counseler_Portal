import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const load = (path, bindings, expression) => {
  const source = fs.readFileSync(new URL(`../../backend/${path}`, import.meta.url), 'utf8')
    .replace(/import[\s\S]*?from ['"][^'"]+['"];\s*/g, '').replaceAll('export const ', 'const ');
  return vm.runInNewContext(`${source}\n${expression}`, bindings);
};
const modes = load('utils/availabilityModes.js', {}, '({appointmentMode, dayIntervals, modesAtTime, toMinutes, validDate})');
const now = Date.parse('2026-10-07T12:30:00+05:30');
class FixedDate extends Date { constructor(...args) { super(...(args.length ? args : [now])); } static now() { return now; } }
const setup = ({ mode = 'online', leave = false, booked = [] } = {}) => {
  const bindings = {
    ...modes, Date: FixedDate,
    User: { findOne: async () => ({ id: 'c', role: 'counselor', approved: true }) },
    BookingLimit: { findOne: async () => { throw Error('Scheduling must not query removed booking rules.'); } },
    Availability: { findOne: async () => ({ slotDuration: 60, daysConfig: [3, 4].map(dayIndex => ({ dayIndex, active: true, slots: [{ startHour: '13:00', endHour: '18:00', mode }] })) }) },
    Exception: { findOne: async () => leave ? {} : null },
    Appointment: { find: async () => booked },
  };
  const validateSchedule = load('utils/scheduling.js', bindings, 'validateSchedule');
  const getSlots = load('controllers/counselorController.js', { ...bindings, validateSchedule }, 'getSlots');
  return async (date = '2026-10-07', type = 'Video Consultation', duration = 60) => {
    const res = { status(code) { throw Error(`Unexpected status ${code}`); }, json(data) { this.data = data; } };
    await getSlots({ params: { id: 'c' }, query: { date, appointmentType: type, duration } }, res);
    return res.data;
  };
};

test('all future Wednesday online slots are bookable without a notice requirement', async () => {
  const data = await setup()();
  assert.deepEqual(Array.from(data.slots, slot => slot.time), ['13:00', '14:00', '15:00', '16:00', '17:00']);
  assert(data.slots.every(slot => slot.available && slot.reason === ''));
  assert.equal(data.message, '');
});

test('tomorrow remains bookable', async () => {
  const data = await setup()('2026-10-08');
  assert(data.slots.every(slot => slot.available && slot.reason === ''));
  assert.equal(data.message, '');
});

test('advance-booking and daily-session limits no longer restrict free times', async () => {
  const data = await setup({ booked: Array.from({ length: 10 }, () => ({ date: '2026-12-09', time: '00:00', duration: 30 })) })('2026-12-09');
  assert.equal(data.slots.length, 5);
  assert(data.slots.every(slot => slot.available));
  assert.equal(data.message, '');
});

test('slot starts follow session duration rather than a saved slot-interval rule', async () => {
  const data = await setup()('2026-10-07', 'Video Consultation', 45);
  assert.deepEqual(Array.from(data.slots, slot => slot.time), ['13:00', '13:45', '14:30', '15:15', '16:00', '16:45']);
  assert(data.slots.every(slot => slot.available));
});

test('past sessions are still excluded', async () => {
  const data = await setup()('2026-09-30');
  assert(data.slots.every(slot => !slot.available));
  assert.equal(data.message, 'The call or session must be in the future.');
});

test('mode mismatch and inactive days have distinct explanations', async () => {
  assert.equal((await setup()('2026-10-07', 'In-Person Consultation')).message, 'The counselor has no offline availability on this date.');
  assert.equal((await setup()('2026-10-09')).message, 'The counselor does not work on this day.');
});

test('leave and existing booking conflicts preserve their real reasons', async () => {
  const leave = await setup({ leave: true })('2026-10-08');
  assert.equal(leave.message, 'The counselor is unavailable on this date.');
  const data = await setup({ booked: [{ date: '2026-10-08', time: '13:00', duration: 300 }] })('2026-10-08');
  assert.equal(data.message, 'This time overlaps another session or request awaiting admin review.');
});

test('legacy both-mode blocks cannot produce bookable slots', async () => {
  const data = await setup({ mode: 'both' })();
  assert.equal(data.slots.length, 0);
  assert.match(data.message, /choose online or offline/);
});
