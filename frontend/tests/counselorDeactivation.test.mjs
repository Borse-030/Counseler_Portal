import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createHash, randomUUID } from 'node:crypto';
import { sessionsOverlap } from '../src/utils/sessionScheduling.js';

const matches = (doc, query) => Object.entries(query).every(([key, value]) => {
  if (key === '$or') return value.some(item => matches(doc, item));
  const actual = doc[key];
  if (value instanceof Date) return new Date(actual).getTime() === value.getTime();
  if (value === null) return actual == null;
  if (value && typeof value === 'object') return Object.entries(value).every(([op, target]) => {
    if (op === '$in') return target.includes(actual);
    if (op === '$nin') return !target.includes(actual);
    if (op === '$ne') return actual !== target;
    if (op === '$lte') return actual != null && actual <= target;
    throw new Error(`Unsupported test matcher ${op}`);
  });
  return actual === value;
});
const queryResult = value => ({ select() { return this; }, sort() { return this; }, lean: async () => structuredClone(value), then(resolve, reject) { return Promise.resolve(value).then(resolve, reject); } });

function fixture({ conflict = false, failSecondTransfer = false, unexpectedWork = false } = {}) {
  const users = [
    { id: 'old', name: 'Original', role: 'counselor', approved: true, suspended: false },
    { id: 'new', name: 'Replacement', role: 'counselor', approved: true, suspended: false },
    { id: 'inactive', name: 'Inactive', role: 'counselor', approved: true, suspended: true },
  ];
  const appointments = [1, 2].map(i => ({ id: `a${i}`, counselorId: 'old', counselorName: 'Original', careRequestId: 'case', patientId: 'patient', patientName: 'Patient', date: `2099-10-${12 + i}`, time: '10:00', duration: 60, status: 'upcoming', appointmentType: 'Video Consultation', meetingLink: 'https://meet.google.com/abc-defg-hij', updatedAt: new Date('2026-10-14T00:00:00Z'), sessionNotes: 'Preserve notes' }));
  appointments.push({ ...appointments[0], id: 'history', status: 'completed', date: '2020-01-01' });
  const cases = [{ id: 'case', patientId: 'patient', patientName: 'Patient', status: 'active', finalCounselorId: 'old', assignedCounselorId: 'old', updatedAt: new Date('2026-10-14T00:00:00Z'), discoveryNotes: 'Preserve discovery' }];
  let transferWrites = 0, mutations = 0;
  const notify = [], checks = [];
  const model = (rows, type) => ({
    findOne: filter => queryResult(rows.find(row => matches(row, filter)) || null),
    find: filter => queryResult(rows.filter(row => matches(row, filter))),
    exists: async filter => rows.some(row => matches(row, filter)) || (type === 'appointments' && unexpectedWork),
    findOneAndUpdate: async (filter, update) => {
      if (type === 'appointments' && ++transferWrites === 2 && failSecondTransfer) throw new Error('Storage temporarily failed');
      const row = rows.find(item => matches(item, filter));
      if (!row) return null;
      mutations++;
      Object.assign(row, update.$set || {});
      for (const [key, value] of Object.entries(update.$push || {})) { row[key] ||= []; row[key].push(structuredClone(value)); }
      row.updatedAt = new Date(Date.now() + mutations);
      return row;
    },
    updateOne: async (filter, update) => {
      const row = rows.find(item => matches(item, filter));
      if (row) for (const key of Object.keys(update.$unset || {})) delete row[key];
      return { modifiedCount: row ? 1 : 0 };
    },
  });
  const source = fs.readFileSync(new URL('../../backend/utils/counselorDeactivationService.js', import.meta.url), 'utf8').replace(/import[\s\S]*?from ['"][^'"]+['"];\s*/g, '').replaceAll('export const ', 'const ');
  const service = vm.runInNewContext(`${source}\n({ reviewCounselorDeactivation, checkCounselorTransfers, transferAndDeactivateCounselor })`, {
    createHash, randomUUID, Date, console,
    User: model(users, 'users'), Appointment: model(appointments, 'appointments'), CareRequest: model(cases, 'cases'),
    overlaps: sessionsOverlap,
    validOnlineMeetingLink: value => typeof value === 'string' && value.startsWith('https://meet.google.com/'),
    validateSchedule: async (...args) => { checks.push(args); return conflict ? 'Replacement has another session at this time.' : ''; },
    sendNotification: async (...args) => notify.push(args),
    accountStatusNotification: () => ({ message: 'Account deactivated', subject: 'Account update' }),
  });
  const payload = async () => {
    const review = await service.reviewCounselorDeactivation('old');
    return { version: review.version, assignments: review.groups.map(group => ({ key: group.key, counselorId: 'new' })) };
  };
  const transfer = async body => service.transferAndDeactivateCounselor('old', body || await payload(), { id: 'admin', name: 'Admin' });
  return { users, appointments, cases, service, payload, transfer, notify, checks, mutations: () => mutations };
}

test('review groups pending sessions with active cases, excludes completed history and inactive replacements', async () => {
  const f = fixture(); const review = await f.service.reviewCounselorDeactivation('old');
  assert.equal(review.sessionCount, 2); assert.equal(review.caseCount, 1); assert.equal(review.groups.length, 1);
  assert.equal(review.groups[0].sessions.length, 2); assert.equal(review.groups[0].hasActiveCase, true);
  assert.deepEqual(Array.from(review.replacements, item => item.id), ['new']);
  assert.equal(review.blockers.length, 0);
});
test('availability preview is read-only and conflicts block all writes', async () => {
  const f = fixture({ conflict: true });
  const body = await f.payload();
  const check = await f.service.checkCounselorTransfers('old', body);
  assert.equal(check.valid, false); assert.equal(check.conflicts.length, 2); assert.equal(f.mutations(), 0);
  await assert.rejects(f.transfer(body), /unavailable/);
  assert.equal(f.mutations(), 0); assert.equal(f.users[0].suspended, false);
  assert.ok(f.checks.every(args => args[4].startsWith('a') && args[5] === 'patient'));
});
test('valid transfers preserve notes and history, move cases, notify recipients, then deactivate and release the lock', async () => {
  const f = fixture(); const result = await f.transfer();
  assert.equal(result.transferredCount, 2); assert.equal(result.caseCount, 1);
  assert.equal(f.users[0].suspended, true); assert.equal(f.users[0].deactivationLockToken, undefined);
  assert.ok(f.appointments.slice(0, 2).every(item => item.counselorId === 'new' && item.sessionNotes === 'Preserve notes'));
  assert.equal(f.appointments[0].counselorTransferHistory[0].fromCounselorId, 'old');
  assert.equal(f.appointments[2].counselorId, 'old');
  assert.equal(f.cases[0].finalCounselorId, 'new'); assert.equal(f.cases[0].assignedCounselorId, 'new');
  assert.equal(f.cases[0].discoveryNotes, 'Preserve discovery');
  assert.equal(f.cases[0].assignmentHistory[0].stage, 'transfer');
  assert.equal(f.notify.length, 7);
});
test('stale reviews, inactive replacements, missing choices and duplicate assignments reject before writing', async () => {
  for (const invalid of ['stale', 'inactive', 'missing', 'duplicate']) {
    const f = fixture(); const body = await f.payload();
    if (invalid === 'stale') body.version = 'outdated';
    if (invalid === 'inactive') body.assignments[0].counselorId = 'inactive';
    if (invalid === 'missing') body.assignments = [];
    if (invalid === 'duplicate') body.assignments.push(body.assignments[0]);
    await assert.rejects(f.transfer(body)); assert.equal(f.mutations(), 0); assert.equal(f.users[0].suspended, false);
  }
});
test('past unresolved sessions prevent transfer and deactivation', async () => {
  const f = fixture(); f.appointments[0].date = '2020-01-01';
  const review = await f.service.reviewCounselorDeactivation('old');
  assert.equal(review.blockers.length, 1);
  await assert.rejects(f.transfer(), /outcomes/); assert.equal(f.mutations(), 0);
});
test('date and time changes are validated and retained in transfer history', async () => {
  const f = fixture(); const body = await f.payload();
  body.scheduleChanges = [{ id: 'a1', date: '2099-11-01', time: '11:00', meetingLink: 'https://meet.google.com/new-link-url' }];
  await f.transfer(body);
  assert.equal(f.appointments[0].date, '2099-11-01'); assert.equal(f.appointments[0].time, '11:00');
  assert.equal(f.appointments[0].counselorTransferHistory[0].previousDate, '2099-10-13');
  assert.equal(f.appointments[0].meetingLink, 'https://meet.google.com/new-link-url');
  assert.equal(f.appointments[0].counselorTransferHistory[0].previousMeetingLink, 'https://meet.google.com/abc-defg-hij');
  assert.ok(f.checks.some(args => args[1] === '2099-11-01' && args[2] === '11:00'));
});
test('overlapping transfer proposals are rejected', async () => {
  const f = fixture(); const body = await f.payload();
  body.scheduleChanges = [{ id: 'a2', date: '2099-10-13', time: '10:30' }];
  await assert.rejects(f.transfer(body), /unavailable/); assert.equal(f.mutations(), 0);
});
test('partial transfer failure leaves source active and releases the lock for recovery', async () => {
  const f = fixture({ failSecondTransfer: true });
  await assert.rejects(f.transfer(), error => { assert.match(error.message, /remains active/); assert.equal(error.details.transferredCount, 1); return true; });
  assert.equal(f.users[0].suspended, false); assert.equal(f.users[0].deactivationLockToken, undefined);
  assert.equal(f.appointments[0].counselorId, 'new'); assert.equal(f.appointments[1].counselorId, 'old');
  const resumed = await f.transfer();
  assert.equal(resumed.transferredCount, 1); assert.equal(f.users[0].suspended, true);
  assert.equal(f.appointments[0].counselorTransferHistory.length, 1);
});
test('a final pending-work recheck prevents deactivation if new work appeared', async () => {
  const f = fixture({ unexpectedWork: true });
  await assert.rejects(f.transfer(), /New pending work/);
  assert.equal(f.users[0].suspended, false); assert.equal(f.users[0].deactivationLockToken, undefined);
});
test('an existing transfer lock prevents concurrent operations', async () => {
  const f = fixture(); f.users[0].deactivationLockUntil = new Date('2200-01-01');
  await assert.rejects(f.transfer(), /already in progress/); assert.equal(f.mutations(), 0);
});
test('active cases without bookings still transfer before deactivation', async () => {
  const f = fixture(); f.appointments.splice(0);
  const result = await f.transfer();
  assert.equal(result.transferredCount, 0); assert.equal(result.caseCount, 1);
  assert.equal(f.cases[0].finalCounselorId, 'new'); assert.equal(f.users[0].suspended, true);
});
test('direct status endpoint blocks deactivation with pending work and rejects string booleans', async () => {
  let saves = 0;
  const user = { id: 'old', role: 'counselor', suspended: false, save: async () => saves++ };
  const source = fs.readFileSync(new URL('../../backend/controllers/adminController.js', import.meta.url), 'utf8').replace(/import[\s\S]*?from ['"][^'"]+['"];\s*/g, '').replaceAll('export const ', 'const ');
  const update = vm.runInNewContext(`${source}\nupdateUserStatus`, { User: { findOne: async () => user }, Appointment: { exists: async () => true }, CareRequest: { exists: async () => false }, console });
  const call = async suspended => {
    const res = { code: 200, status(code) { this.code = code; return this; }, json(data) { this.data = data; } };
    await update({ userId: 'admin', params: { id: 'old' }, body: { suspended } }, res); return res;
  };
  assert.equal((await call(true)).code, 409); assert.equal((await call('true')).code, 400);
  assert.equal(saves, 0); assert.equal(user.suspended, false);
});
