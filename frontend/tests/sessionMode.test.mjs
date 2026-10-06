import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sessionTypesForAvailability, slotSupportsMode } from '../src/utils/sessionMode.js';

const availability = mode => ({ workingDays: [3], daysConfig: [{ dayIndex: 3, active: true, slots: [{ startHour: '13:00', endHour: '18:00', mode }] }] });
const names = types => types.map(type => type.name);

test('Elena can offer both modes from saved availability with no custom appointment types', () => {
  assert.deepEqual(names(sessionTypesForAvailability(availability('both'), [])), ['Video Consultation', 'In-Person Consultation']);
});
test('offline-only and online-only availability expose only their supported mode', () => {
  assert.deepEqual(names(sessionTypesForAvailability(availability('offline'), [])), ['In-Person Consultation']);
  assert.deepEqual(names(sessionTypesForAvailability(availability('online'), [])), ['Video Consultation']);
});
test('custom types supplement availability and do not enable an unsupported mode', () => {
  assert.deepEqual(names(sessionTypesForAvailability(availability('online'), [{ name: 'Audio Consultation' }, { name: 'In-Person Consultation' }])), ['Audio Consultation', 'Video Consultation']);
});
test('legacy hours remain bookable without custom types', () => {
  assert.deepEqual(names(sessionTypesForAvailability({ workingDays: [1, 2], startHour: '09:00', endHour: '17:00' })), ['Video Consultation', 'In-Person Consultation']);
});
test('inactive days do not invent modes, even when custom types exist', () => {
  assert.deepEqual(sessionTypesForAvailability({ workingDays: [3], daysConfig: [{ dayIndex: 3, active: false, slots: availability('online').daysConfig[0].slots }] }, [{ name: 'Video Consultation' }]), []);
});
test('published slot modes can supply choices if the weekly availability request fails', () => {
  assert.deepEqual(names(sessionTypesForAvailability(null, [], [{ time: '13:00', modes: ['offline'] }])), ['In-Person Consultation']);
  assert.deepEqual(sessionTypesForAvailability(null, [], []), []);
});
test('time filtering still restricts sessions to the slot mode', () => {
  const slot = { time: '13:00', available: true, modes: ['offline'] };
  assert.equal(slotSupportsMode(slot, 'Video Consultation'), false);
  assert.equal(slotSupportsMode(slot, 'In-Person Consultation'), true);
});
