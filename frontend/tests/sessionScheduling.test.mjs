import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { sessionsOverlap, canEditScheduledSession } from '../src/utils/sessionScheduling.js';

const load = (file, bindings, name) => {
  const source = fs.readFileSync(new URL(`../../backend/controllers/${file}`, import.meta.url), 'utf8')
    .replace(/import[\s\S]*?from ['"][^'"]+['"];\s*/g, '').replaceAll('export const ', 'const ');
  return vm.runInNewContext(`${source}\n${name}`, { Date, console, crypto, ...bindings });
};
const response = () => ({ code: 200, status(code) { this.code = code; return this; }, json(data) { this.data = data; return this; } });
const proposal = (date = '2099-10-13', time = '10:00') => ({ date, time, duration: 60, appointmentType: 'Video Consultation', meetingLink: 'https://meet.google.com/abc-defg-hij', kind: 'session' });

test('queue conflict checking catches overlaps and allows adjacent sessions and separate dates', () => {
  assert.equal(sessionsOverlap(proposal(), proposal('2099-10-13', '10:30')), true);
  assert.equal(sessionsOverlap(proposal(), proposal('2099-10-13', '11:00')), false);
  assert.equal(sessionsOverlap(proposal(), proposal('2099-10-14', '10:00')), false);
});
test('only upcoming future sessions expose edit actions', () => {
  assert.equal(canEditScheduledSession({ ...proposal(), status: 'upcoming' }), true);
  assert.equal(canEditScheduledSession({ ...proposal(), status: 'completed' }), false);
  assert.equal(canEditScheduledSession({ ...proposal('2020-01-01'), status: 'upcoming' }), false);
  assert.ok(!canEditScheduledSession(null));
});

function editFixture({ role = 'admin', status = 'upcoming', date = '2099-10-13', conflict = '', staleWrite = false } = {}) {
  const notificationCalls = [];
  let mutation, checked;
  const apt = { ...proposal(date), id: 'apt1', status, patientId: 'patient', counselorId: 'counselor', counselorName: 'Counselor', patientName: 'Patient', updatedAt: new Date('2026-10-12T00:00:00Z'), sessionNotes: 'Keep notes', outcomeHistory: [], review: null };
  const edit = load('appointmentController.js', {
    User: { findOne: async () => ({ id: 'admin', name: 'Admin', role }) },
    Appointment: { findOne: async () => apt, findOneAndUpdate: async (filter, update) => { mutation = { filter, update }; return staleWrite ? null : { ...apt, ...update.$set }; } },
    AuditLog: class { async save() {} },
    validateSchedule: async (...args) => { checked = args; return conflict; },
    validOnlineMeetingLink: value => value?.startsWith('https://meet.google.com/'),
    hasFeedback: value => Boolean(value.review), presentAppointment: value => value,
    sendNotification: async (...args) => notificationCalls.push(args),
  }, 'editAppointmentSchedule');
  const call = async (body = proposal('2099-10-14', '11:00')) => {
    const res = response();
    await edit({ userId: 'admin', params: { id: apt.id }, body, headers: {}, ip: '127.0.0.1' }, res);
    return res;
  };
  return { apt, call, mutation: () => mutation, checked: () => checked, notificationCalls };
}
test('admin editing validates excluding itself, preserves session records, logs previous schedule and notifies both parties', async () => {
  const fixture = editFixture();
  const result = await fixture.call();
  assert.equal(result.code, 200);
  assert.equal(fixture.checked()[4], 'apt1'); assert.equal(fixture.checked()[5], 'patient');
  assert.equal(fixture.mutation().filter.status, 'upcoming');
  assert.equal(fixture.mutation().update.$push.scheduleHistory.previous.date, '2099-10-13');
  assert.equal(result.data.appointment.sessionNotes, 'Keep notes');
  assert.equal(fixture.notificationCalls.length, 2);
});
test('unauthorized, past, resolved, conflicting and stale edits do not notify', async () => {
  for (const [options, expected] of [[{ role: 'counselor' }, 403], [{ status: 'completed' }, 409], [{ date: '2020-01-01' }, 409], [{ conflict: 'User already booked' }, 400], [{ staleWrite: true }, 409]]) {
    const fixture = editFixture(options);
    assert.equal((await fixture.call()).code, expected);
    assert.equal(fixture.notificationCalls.length, 0);
    if (!options.staleWrite) assert.equal(fixture.mutation(), undefined);
  }
  const stale = editFixture();
  assert.equal((await stale.call({ ...proposal(), expectedUpdatedAt: '2020-01-01' })).code, 409);
  assert.equal(stale.mutation(), undefined);
});
test('online links are required, while changing to in-person clears the link', async () => {
  const fixture = editFixture();
  assert.equal((await fixture.call({ ...proposal(), meetingLink: '' })).code, 400);
  const offline = await fixture.call({ ...proposal(), appointmentType: 'In-Person Consultation' });
  assert.equal(offline.code, 200);
  assert.equal(offline.data.appointment.meetingLink, '');
  assert.equal(offline.data.appointment.clinicAddress, 'HO');
});

function batchFixture({ failAt = 0, conflictAt = 0 } = {}) {
  let writes = 0, checks = 0;
  const persisted = [], notified = [];
  const careRequest = { id: 'case', patientId: 'patient', patientName: 'Patient', finalCounselorId: 'counselor', status: 'matched', preferredFormat: 'Online Consultation', appointmentIds: [], timeline: [], save: async () => {} };
  const schedule = load('sessionRequestController.js', {
    Appointment: class { constructor(data) { Object.assign(this, data); } async save() { writes++; if (writes === failAt) throw new Error('Storage unavailable'); persisted.push(this); } },
    CareRequest: { findOne: async () => careRequest, findOneAndUpdate: async () => careRequest },
    User: { findOne: async () => ({ id: 'counselor', name: 'Counselor' }) },
    AppointmentType: { findOne: async () => ({ duration: 60 }) },
    validateSchedule: async () => ++checks === conflictAt ? 'Slot was booked' : '',
    validOnlineMeetingLink: value => value?.startsWith('https://meet.google.com/'),
    sendNotification: async (...args) => notified.push(args),
  }, 'scheduleSession');
  const call = async (sessions, role = 'admin') => {
    const res = response();
    await schedule({ params: { id: 'case' }, user: { id: 'admin', name: 'Admin', role }, body: { sessions } }, res);
    return res;
  };
  return { call, persisted, notified, writes: () => writes };
}
test('one batch books multiple dates for one user and validates all before writing', async () => {
  const fixture = batchFixture();
  const result = await fixture.call([proposal(), proposal('2099-10-14')]);
  assert.equal(result.code, 201); assert.equal(result.data.appointments.length, 2);
  assert.ok(result.data.appointments.every(item => item.patientId === 'patient' && item.careRequestId === 'case'));
  const invalid = batchFixture({ conflictAt: 2 });
  assert.equal((await invalid.call([proposal(), proposal('2099-10-14')])).code, 400);
  assert.equal(invalid.writes(), 0); assert.equal(invalid.notified.length, 0);
});
test('batch rejects overlapping proposals, invalid entries, excessive batches and unauthorized actors', async () => {
  for (const sessions of [[proposal(), proposal('2099-10-13', '10:30')], [null], Array.from({ length: 13 }, () => proposal())]) {
    const fixture = batchFixture();
    assert.equal((await fixture.call(sessions)).code, 400); assert.equal(fixture.writes(), 0);
  }
  const fixture = batchFixture();
  assert.equal((await fixture.call([proposal()], 'counselor')).code, 403);
  assert.equal(fixture.writes(), 0);
});
test('partial persistence returns only saved appointments so retries can omit existing bookings', async () => {
  const fixture = batchFixture({ failAt: 2 });
  const result = await fixture.call([proposal(), proposal('2099-10-14')]);
  assert.equal(result.code, 500); assert.equal(result.data.appointments.length, 1);
  assert.equal(result.data.appointments[0].date, '2099-10-13');
  assert.match(result.data.message, /retry only the remaining/);
  assert.equal(fixture.persisted.length, 1);
});

test('edit availability excludes only the authorized admin’s selected session and still checks user conflicts', async () => {
  const checks = [];
  const getSlots = load('counselorController.js', {
    validDate: () => true,
    getUserIdFromToken: () => 'admin',
    User: { findOne: async query => { assert.equal(query.role, 'admin'); return { id: 'admin' }; } },
    Appointment: { findOne: async query => { assert.equal(query.counselorId, 'counselor'); return { id: 'apt1', patientId: 'patient' }; } },
    Availability: { findOne: async () => ({}) },
    dayIntervals: () => [{ startHour: '09:00', endHour: '12:00', mode: 'online' }],
    toMinutes: value => Number(value.slice(0, 2)) * 60 + Number(value.slice(3, 5)),
    modesAtTime: () => ['online'], appointmentMode: () => 'online',
    validateSchedule: async (...args) => { checks.push(args); return ''; },
  }, 'getSlots');
  const res = response();
  await getSlots({ params: { id: 'counselor' }, query: { date: '2099-10-13', duration: 60, appointmentType: 'Video Consultation', excludeId: 'apt1' }, headers: { authorization: 'Bearer test' } }, res);
  assert.equal(res.code, 200);
  assert.ok(checks.length > 0);
  assert.ok(checks.every(args => args[4] === 'apt1' && args[5] === 'patient'));
  assert.ok(res.data.slots.some(slot => slot.time === '10:00' && slot.available));
});
