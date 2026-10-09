import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { Appointment } from '../../backend/models/Appointment.js';
import { presentAppointment, sessionEndTime, sessionStatus } from '../../backend/utils/sessionOutcome.js';
import { isOnlineMeetingLink } from '../src/utils/sessionAttendance.js';
import { canRequestReschedule, mergeRescheduleResult } from '../src/utils/rescheduling.js';

const NOW = Date.parse('2026-10-08T10:00:00+05:30');
class FixedDate extends Date { constructor(...args) { super(...(args.length ? args : [NOW])); } static now() { return NOW; } }
const response = () => ({ code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } });
const get = (obj, path) => path.split('.').reduce((value, key) => value?.[key], obj);
const set = (obj, path, value) => { const keys = path.split('.'); const last = keys.pop(); let current = obj; for (const key of keys) current = current[key] ??= {}; current[last] = structuredClone(value); };
const equal = (a, b) => b == null ? a == null : String(a) === String(b);
const matches = (obj, query) => Object.entries(query).every(([path, expected]) => {
  const value = get(obj, path);
  if (expected && typeof expected === 'object' && !(expected instanceof Date)) return Object.entries(expected).every(([op, target]) => op === '$lte' ? new Date(value) <= new Date(target) : op === '$nin' ? !target.includes(value) : op === '$eq' ? equal(value, target) : op === '$ne' ? !equal(value, target) : true);
  return equal(value, expected);
});
const pendingRequest = () => ({ id: 'request1', status: 'pending', requesterId: 'p', requesterName: 'User', requesterRole: 'patient', reason: 'Could not attend', requestedAt: new Date(NOW - 1000) });

const setup = ({ overrides = {}, scheduleError = '', createFailure = false, careFailure = false, existingReplacement = null } = {}) => {
  const original = { id: 'original', patientId: 'p', patientName: 'User', counselorId: 'c', counselorName: 'Counselor', careRequestId: 'care', appointmentKind: 'session', appointmentType: 'Video Consultation', date: '2026-10-07', time: '14:00', duration: 60, status: 'user_absent', sessionNotes: 'Original notes', outcomeHistory: [], rescheduleHistory: [], ...overrides };
  const records = new Map([[original.id, original]]);
  if (existingReplacement) records.set(existingReplacement.id, existingReplacement);
  const notifications = [];
  const writes = [];
  const scheduleCalls = [];
  let creates = 0;
  let careWrites = 0;
  let sequence = 0;
  const source = fs.readFileSync(new URL('../../backend/controllers/rescheduleController.js', import.meta.url), 'utf8').replace(/import[\s\S]*?from ['"][^'"]+['"];\s*/g, '').replaceAll('export const ', 'const ');
  const actions = actor => vm.runInNewContext(`${source}\n({requestReschedule, reviewReschedule})`, {
    Date: FixedDate, randomUUID: () => 'generated' + (++sequence), sessionEndTime, sessionStatus: apt => sessionStatus(apt, NOW), presentAppointment,
    validOnlineMeetingLink: isOnlineMeetingLink,
    validateSchedule: async (...args) => { scheduleCalls.push(args); return scheduleError; },
    sendNotification: async (id, message) => { notifications.push({ id, message }); },
    User: { findOne: async q => q.id === actor.id ? actor : q.id === 'p' ? { id: 'p', role: 'patient', approved: true } : null, find: async () => [{ id: 'a', role: 'admin' }] },
    CareRequest: { updateOne: async () => { if (careFailure && careWrites++ === 0) throw new Error('Temporary care update failure'); } },
    Appointment: {
      findOne: async query => { const value = [...records.values()].find(record => matches(record, query)); return value ? structuredClone(value) : null; },
      findOneAndUpdate: async (query, change) => {
        const value = [...records.values()].find(record => matches(record, query));
        if (!value) return null;
        writes.push({ query: structuredClone(query), change: structuredClone(change) });
        for (const [path, data] of Object.entries(change.$set || {})) set(value, path, data);
        for (const [path, data] of Object.entries(change.$push || {})) { const list = get(value, path) || []; list.push(structuredClone(data)); set(value, path, list); }
        return structuredClone(value);
      },
      updateOne: async (query, change) => {
        const value = [...records.values()].find(record => matches(record, query));
        if (!value) return;
        for (const [path, data] of Object.entries(change.$set || {})) set(value, path, data);
        for (const path of Object.keys(change.$unset || {})) { const keys = path.split('.'); const last = keys.pop(); delete get(value, keys.join('.'))[last]; }
      },
      create: async data => { creates++; if (createFailure) throw new Error('Temporary create failure'); if (records.has(data.id)) throw new Error('Duplicate'); records.set(data.id, structuredClone(data)); return structuredClone(data); },
    },
  });
  const invoke = async (action, body = {}, role = 'patient', id = role === 'admin' ? 'a' : role === 'counselor' ? 'c' : 'p') => {
    const res = response();
    await actions({ id, role, name: role === 'admin' ? 'Admin' : role === 'counselor' ? 'Counselor' : 'User' })[action]({ userId: id, params: { id: original.id }, body }, res);
    return res;
  };
  return { original, records, invoke, notifications, writes, scheduleCalls, creates: () => creates };
};
const approval = overrides => ({ action: 'approve', requestId: 'request1', date: '2026-10-09', time: '14:00', meetingLink: 'https://meet.google.com/abc-defg-hij', ...overrides });

test('either the user or assigned counselor can request a missed session; only one pending request exists', async () => {
  for (const role of ['patient', 'user', 'counselor']) {
    const h = setup();
    assert.equal((await h.invoke('requestReschedule', { reason: ' Could not attend ', preferredDate: '2026-10-09', preferredTime: 'Afternoon' }, role)).code, 201);
    assert.equal(h.original.rescheduleRequest.requesterRole, role);
    assert.equal(h.original.rescheduleRequest.reason, 'Could not attend');
    assert.equal(h.original.status, 'user_absent');
    assert.equal((await h.invoke('requestReschedule', { reason: 'Retry' }, role === 'counselor' ? 'patient' : 'counselor')).code, 200);
    assert.equal(h.notifications.length, 1);
    assert.equal(h.original.rescheduleHistory.length, 1);
  }
});

test('a user can ask after elapsed time while attendance awaits confirmation, without changing the outcome', async () => {
  const h = setup({ overrides: { status: 'upcoming' } });
  assert.equal((await h.invoke('requestReschedule', { reason: 'Counselor did not join.' })).code, 201);
  assert.equal(h.original.status, 'upcoming');
  assert.equal(h.original.outcomeHistory.length, 0);
});

test('unrelated users, unrelated counselors and admins cannot impersonate a requester', async () => {
  for (const [role, id] of [['patient', 'other'], ['counselor', 'other'], ['admin', 'a']]) {
    const h = setup();
    assert.equal((await h.invoke('requestReschedule', { reason: 'Need another session' }, role, id)).code, 403);
    assert.equal(h.writes.length, 0);
  }
});

test('future, completed, cancelled and rejected sessions are not eligible', async () => {
  for (const overrides of [{ status: 'upcoming', date: '2026-10-09' }, { status: 'completed' }, { status: 'cancelled' }, { status: 'rejected' }]) {
    const h = setup({ overrides });
    assert.equal((await h.invoke('requestReschedule', { reason: 'Need another session' })).code, 409);
  }
});

test('invalid reasons and date preferences do not write', async () => {
  for (const body of [{ reason: '' }, { reason: '   ' }, { reason: 3 }, { reason: 'x'.repeat(1001) }, { reason: 'Help', preferredDate: '2026-02-30' }, { reason: 'Help', preferredDate: '2026-10-07' }, { reason: 'Help', preferredTime: 'x'.repeat(121) }]) {
    const h = setup();
    assert.equal((await h.invoke('requestReschedule', body)).code, 400);
    assert.equal(h.writes.length, 0);
  }
});

test('concurrent requests create one request and notify the admin once', async () => {
  const h = setup();
  const results = await Promise.all([h.invoke('requestReschedule', { reason: 'User asks' }), h.invoke('requestReschedule', { reason: 'Counselor asks' }, 'counselor')]);
  assert.deepEqual(results.map(r => r.code).sort(), [201, 409]);
  assert.equal(h.notifications.length, 1);
});

test('only admins can review; missing and stale request IDs fail gracefully', async () => {
  for (const role of ['patient', 'counselor']) {
    const h = setup({ overrides: { rescheduleRequest: pendingRequest() } });
    assert.equal((await h.invoke('reviewReschedule', approval(), role)).code, 403);
  }
  for (const overrides of [{}, { rescheduleRequest: { ...pendingRequest(), id: 'different' } }]) {
    const h = setup({ overrides });
    assert.equal((await h.invoke('reviewReschedule', approval(), 'admin')).code, 409);
  }
});

test('admin approval creates a linked replacement while preserving missed time, notes, outcome and feedback privacy', async () => {
  const h = setup({ overrides: { rescheduleRequest: pendingRequest(), review: { reviewText: 'Private', date: new Date(NOW) } } });
  const res = await h.invoke('reviewReschedule', approval(), 'admin');
  assert.equal(res.code, 200);
  assert.equal(h.original.status, 'user_absent');
  assert.equal(h.original.date, '2026-10-07');
  assert.equal(h.original.sessionNotes, 'Original notes');
  assert.equal(h.original.rescheduleRequest.status, 'scheduled');
  assert.equal(res.body.replacement.rescheduledFromId, 'original');
  assert.equal(res.body.replacement.status, 'upcoming');
  assert.equal(res.body.replacement.meetingLink, 'https://meet.google.com/abc-defg-hij');
  assert.equal(res.body.replacement.sessionNotes, '');
  assert.equal(res.body.replacement.review, null);
  assert.equal(h.notifications.length, 2);
  assert.equal((await h.invoke('reviewReschedule', approval(), 'admin')).code, 200);
  assert.equal(h.creates(), 1);
  assert.equal(h.notifications.length, 2);
  assert.equal((await h.invoke('requestReschedule', { reason: 'Again' })).code, 409);
});

test('offline replacements are at HO and discard supplied online links', async () => {
  const h = setup({ overrides: { appointmentType: 'In-Person Consultation', rescheduleRequest: pendingRequest() } });
  const res = await h.invoke('reviewReschedule', approval(), 'admin');
  assert.equal(res.code, 200);
  assert.equal(res.body.replacement.clinicAddress, 'HO');
  assert.equal(res.body.replacement.meetingLink, '');
});

test('available-time validation and valid online link are required before any write', async () => {
  for (const [options, body] of [[{}, approval({ meetingLink: '' })], [{ scheduleError: 'Counselor is unavailable.' }, approval()]]) {
    const h = setup({ ...options, overrides: { rescheduleRequest: pendingRequest() } });
    assert.equal((await h.invoke('reviewReschedule', body, 'admin')).code, 400);
    assert.equal(h.creates(), 0);
    assert.equal(h.writes.length, 0);
  }
});

test('pending attendance requires an explicit absence outcome before admin approval', async () => {
  const h = setup({ overrides: { status: 'upcoming', rescheduleRequest: pendingRequest() } });
  assert.equal((await h.invoke('reviewReschedule', approval(), 'admin')).code, 400);
  const res = await h.invoke('reviewReschedule', approval({ missedOutcome: 'counselor_absent' }), 'admin');
  assert.equal(res.code, 200);
  assert.equal(h.original.status, 'counselor_absent');
  assert.equal(h.original.outcomeHistory[0].actorRole, 'admin');
});

test('declining requires a response; both parties can see it and request again', async () => {
  const h = setup({ overrides: { rescheduleRequest: pendingRequest() } });
  assert.equal((await h.invoke('reviewReschedule', { action: 'decline', requestId: 'request1', response: '' }, 'admin')).code, 400);
  assert.equal((await h.invoke('reviewReschedule', { action: 'decline', requestId: 'request1', response: 'Please contact the care team first.' }, 'admin')).code, 200);
  assert.equal(h.original.rescheduleRequest.response, 'Please contact the care team first.');
  assert.equal(h.notifications.length, 2);
  assert.equal((await h.invoke('requestReschedule', { reason: 'Care team contacted.' })).code, 201);
  assert.notEqual(h.original.rescheduleRequest.id, 'request1');
  assert.equal(h.original.rescheduleHistory.length, 2);
});

test('concurrent approvals create a single replacement', async () => {
  const h = setup({ overrides: { rescheduleRequest: pendingRequest() } });
  const results = await Promise.all([h.invoke('reviewReschedule', approval(), 'admin'), h.invoke('reviewReschedule', approval({ time: '15:00' }), 'admin')]);
  assert.deepEqual(results.map(r => r.code).sort(), [200, 409]);
  assert.equal(h.creates(), 1);
  assert.equal(h.notifications.length, 2);
});

test('a failed create releases the claim so the request can be reviewed again', async () => {
  const h = setup({ createFailure: true, overrides: { rescheduleRequest: pendingRequest() } });
  assert.equal((await h.invoke('reviewReschedule', approval(), 'admin')).code, 500);
  assert.equal(h.original.rescheduleRequest.status, 'pending');
  assert.equal(h.notifications.length, 0);
});

test('partial approval retries recover the created replacement without creating or notifying twice', async () => {
  const h = setup({ careFailure: true, overrides: { rescheduleRequest: pendingRequest() } });
  assert.equal((await h.invoke('reviewReschedule', approval(), 'admin')).code, 500);
  assert.equal(h.original.rescheduleRequest.status, 'scheduling');
  assert.equal((await h.invoke('reviewReschedule', { action: 'approve', requestId: 'request1' }, 'admin')).code, 200);
  assert.equal(h.creates(), 1);
  assert.equal(h.notifications.length, 2);
});

test('expired interrupted claims recover the saved scheduling plan, while live claims reject competing reviews', async () => {
  for (const expired of [false, true]) {
    const request = { ...pendingRequest(), status: 'scheduling', leaseUntil: new Date(NOW + (expired ? -1000 : 1000)), plannedDate: '2026-10-09', plannedTime: '14:00', plannedMeetingLink: 'https://meet.google.com/abc-defg-hij' };
    const h = setup({ overrides: { rescheduleRequest: request } });
    const res = await h.invoke('reviewReschedule', { action: 'approve', requestId: 'request1' }, 'admin');
    assert.equal(res.code, expired ? 200 : 409);
    if (expired) assert.equal(res.body.replacement.date, '2026-10-09');
  }
});

test('schema stores links and history; responses hide internal scheduling locks and drafts', async () => {
  const apt = new Appointment({ id: 'a', patientId: 'p', patientName: 'User', counselorId: 'c', counselorName: 'Counselor', date: '2026-10-07', time: '14:00', rescheduledFromId: 'old', rescheduleRequest: { ...pendingRequest(), lockToken: 'private', leaseUntil: new Date(NOW), plannedMeetingLink: 'https://meet.google.com/private' }, rescheduleHistory: [pendingRequest()] });
  await apt.validate();
  const data = presentAppointment(apt, { id: 'p', role: 'patient' });
  assert.equal(data.rescheduledFromId, 'old');
  assert.equal(data.rescheduleHistory.length, 1);
  for (const key of ['lockToken', 'leaseUntil', 'plannedMeetingLink']) assert.equal(key in data.rescheduleRequest, false);
});

test('expired scheduling plans that are no longer available return to admin review', async () => {
  const h = setup({ scheduleError: 'The time is now in the past.', overrides: { rescheduleRequest: { ...pendingRequest(), status: 'scheduling', leaseUntil: new Date(NOW - 1000), plannedDate: '2026-10-07', plannedTime: '14:00', plannedMeetingLink: 'https://meet.google.com/abc-defg-hij' } } });
  assert.equal((await h.invoke('reviewReschedule', { action: 'approve', requestId: 'request1' }, 'admin')).code, 409);
  assert.equal(h.original.rescheduleRequest.status, 'pending');
  assert.equal(h.original.rescheduleRequest.plannedDate, undefined);
  assert.equal(h.creates(), 0);
});

test('frontend eligibility follows IST outcomes and replacement results update local state without duplicates', () => {
  assert.equal(canRequestReschedule({ status: 'upcoming', date: '2026-10-07', time: '14:00', duration: 60 }, NOW), true);
  assert.equal(canRequestReschedule({ status: 'completed' }, NOW), false);
  const result = { appointment: { id: 'original', status: 'user_absent' }, replacement: { id: 'replacement', status: 'upcoming' } };
  const list = mergeRescheduleResult([{ id: 'original' }], result);
  assert.equal(mergeRescheduleResult(list, result).length, 2);
});
