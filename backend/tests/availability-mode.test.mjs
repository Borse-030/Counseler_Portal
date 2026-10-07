import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { appointmentMode, dayIntervals, modesAtTime, validateDayConfigs, validDate, toMinutes } from '../utils/availabilityModes.js';

const evaluate = (path, bindings, expression) => {
  const source = fs.readFileSync(new URL(path, import.meta.url), 'utf8').replace(/import[\s\S]*?from ['"][^'"]+['"];\s*/g, '').replaceAll('export const ', 'const ').replace(/export default[^;]+;/g, '');
  return vm.runInNewContext(`${source}\n${expression}`, { console, ...bindings });
};
const fixedNow = Date.parse('2026-10-06T04:00:00Z');
class FixedDate extends Date { constructor(...args) { super(...(args.length ? args : [fixedNow])); } static now() { return fixedNow; } }
const day = { dayIndex: 3, active: true, slots: [{ startHour: '09:00', endHour: '12:00', mode: 'online' }, { startHour: '13:00', endHour: '17:00', mode: 'offline' }] };
const setup = ({ slots = day.slots, booked = [], leave = false } = {}) => {
  const availability = { slotDuration: 60, workingDays: [3], daysConfig: [{ ...day, slots }] };
  const bindings = {
    Date: FixedDate, appointmentMode, dayIntervals, modesAtTime,
    User: { findOne: async () => ({ id: 'c', role: 'counselor', approved: true }) },
    BookingLimit: { findOne: async () => ({ minNoticePeriodHours: 2, maxAdvanceBookingDays: 30, maxAppointmentsPerDay: 5 }) },
    Exception: { findOne: async () => leave ? {} : null },
    Availability: { findOne: async () => availability },
    Appointment: { find: async query => query.patientId ? [] : booked.filter(a => a.id !== query.id.$ne) },
  };
  const validate = evaluate('../utils/scheduling.js', bindings, 'validateSchedule');
  return { validate, bindings, availability };
};
const response = () => ({ code: 200, status(value) { this.code = value; return this; }, json(data) { this.data = data; return this; } });

test('availability schema persists explicit modes and rejects both', () => {
  const stagedBackend = new URL('../../../../backend/package.json', import.meta.url);
  const require = createRequire(fs.existsSync(stagedBackend) ? stagedBackend : new URL('../package.json', import.meta.url));
  const mongoose = require('mongoose');
  const Model = evaluate('../models/Availability.js', { mongoose }, 'Availability');
  const document = new Model({ counselorId: 'c', daysConfig: [day] });
  assert.equal(document.daysConfig[0].slots[0].mode, 'online');
  assert.equal(document.daysConfig[0].slots[1].mode, 'offline');
  document.daysConfig[0].slots.push({ startHour: '18:00', endHour: '19:00' });
  assert.equal(document.daysConfig[0].slots[2].mode, undefined);
  document.daysConfig[0].slots[2].mode = 'both';
  assert(document.validateSync().errors['daysConfig.0.slots.2.mode']);
  document.daysConfig[0].slots[0].mode = 'invalid';
  assert(document.validateSync().errors['daysConfig.0.slots.0.mode']);
});
test('online and offline sessions are restricted to the matching time blocks', async () => {
  const { validate } = setup();
  assert.equal(await validate('c', '2026-10-07', '09:00', 60, '', '', 'Video Consultation'), '');
  assert.equal(await validate('c', '2026-10-07', '13:00', 60, '', '', 'In-Person Consultation'), '');
  assert.match(await validate('c', '2026-10-07', '09:00', 60, '', '', 'In-Person Consultation'), /session mode/);
  assert.match(await validate('c', '2026-10-07', '13:00', 60, '', '', 'Audio Consultation'), /session mode/);
});
test('legacy availability requires an explicit mode before matching', async () => {
  const { validate } = setup({ slots: [{ startHour: '09:00', endHour: '17:00' }] });
  for (const type of ['Video Consultation', 'In-Person Consultation']) assert.match(await validate('c', '2026-10-07', '09:00', 60, '', '', type), /published availability/);
  assert.deepEqual(modesAtTime([{ startHour: '09:00', endHour: '17:00', mode: 'both' }], '09:00', 60), []);
  assert.match(validateDayConfigs([{ ...day, slots: [{ startHour: '09:00', endHour: '17:00', mode: 'both' }] }]), /online or offline/);
});
test('a session must fit within a single block and cannot straddle an online/offline transition', async () => {
  const { validate } = setup();
  assert.match(await validate('c', '2026-10-07', '11:00', 90, '', '', 'Video Consultation'), /published availability/);
  assert.deepEqual(modesAtTime(day.slots, '11:00', 90, 60), []);
});
test('booking conflicts apply regardless of mode, and rescheduling excludes the existing booking', async () => {
  const { validate } = setup({ booked: [{ id: 'booked', date: '2026-10-07', time: '09:00', duration: 90 }] });
  assert.match(await validate('c', '2026-10-07', '10:00', 60, '', '', 'Video Consultation'), /overlaps/);
  assert.equal(await validate('c', '2026-10-07', '10:00', 60, 'booked', '', 'Video Consultation'), '');
});
test('leave blocks booking and invalid dates and modes are rejected', async () => {
  const { validate } = setup({ leave: true });
  assert.match(await validate('c', '2026-10-07', '09:00', 60), /unavailable/);
  assert.equal(validDate('2026-02-30'), false);
  assert.match(validateDayConfigs([{ ...day, slots: [{ startHour: '09:00', endHour: '10:00', mode: 'invalid' }] }]), /mode/);
  assert.match(validateDayConfigs([{ ...day, slots: [{ startHour: '09:00', endHour: '11:00', mode: 'online' }, { startHour: '10:00', endHour: '12:00', mode: 'offline' }] }]), /overlap/);
});
test('saving weekly availability keeps modes in the persistence payload', async () => {
  let payload;
  const update = evaluate('../controllers/counselorController.js', {
    validateDayConfigs,
    Availability: { findOneAndUpdate: async (_query, data) => { payload = data; return data; } },
    AuditLog: class { async save() {} },
  }, 'updateAvailability');
  const res = response();
  await update({ userId: 'c', headers: {}, body: { daysConfig: [day], slotDuration: 60 } }, res);
  assert.equal(res.code, 200);
  assert.equal(payload.daysConfig[0].slots[0].mode, 'online');
  assert.equal(payload.daysConfig[0].slots[1].mode, 'offline');
});
test('available-slot API returns modes and filters in-person and video slots', async () => {
  const { bindings, validate } = setup();
  const getSlots = evaluate('../controllers/counselorController.js', { ...bindings, validateSchedule: validate, toMinutes, validDate }, 'getSlots');
  for (const [type, times, mode] of [
    ['Video Consultation', ['09:00', '10:00', '11:00'], 'online'],
    ['In-Person Consultation', ['13:00', '14:00', '15:00', '16:00'], 'offline'],
  ]) {
    const res = response();
    await getSlots({ params: { id: 'c' }, query: { date: '2026-10-07', duration: '60', appointmentType: type } }, res);
    assert.equal(res.code, 200, res.data?.message);
    assert.deepEqual(Array.from(res.data.slots, slot => slot.time), times);
    assert(res.data.slots.every(slot => slot.available && slot.modes.includes(mode)));
  }
});
