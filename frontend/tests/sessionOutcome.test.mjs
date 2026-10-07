import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { feedbackEligible, feedbackLabel, hasFeedback, resolvedStatuses, sessionEndTime, sessionStatus } from '../src/utils/sessionOutcome.js';
import * as backend from '../../backend/utils/sessionOutcome.js';
import { Appointment } from '../../backend/models/Appointment.js';

const NOW = Date.parse('2026-10-07T15:00:00+05:30');
class FixedDate extends Date {
  constructor(...args) { super(...(args.length ? args : [NOW])); }
  static now() { return NOW; }
}
const response = () => ({ code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } });
const setup = ({ role = 'counselor', actorId = 'c', overrides = {}, collision = false } = {}) => {
  const store = { id: 'apt', date: '2026-10-07', time: '14:00', duration: 60, status: 'upcoming', patientId: 'p', patientName: 'User', counselorId: 'c', counselorName: 'Counselor', appointmentKind: 'session', outcomeHistory: [], ...overrides };
  const notifications = [];
  const updates = [];
  const actor = { id: actorId, role, name: role === 'admin' ? 'Admin' : 'Counselor' };
  const source = fs.readFileSync(new URL('../../backend/controllers/appointmentController.js', import.meta.url), 'utf8').replace(/import[\s\S]*?from ['"][^'"]+['"];\s*/g, '').replaceAll('export const ', 'const ');
  const actions = vm.runInNewContext(`${source}\n({recordSessionOutcome, submitReview, getAppointments, getAppointmentById, updateAppointment, rescheduleAppointment})`, {
    Date: FixedDate, console, resolvedStatuses, sessionEndTime, hasFeedback: backend.hasFeedback,
    presentAppointment: (apt, actor) => ({ ...backend.presentAppointment(apt, actor), status: sessionStatus(apt, NOW) }),
    User: { findOne: async () => actor, updateOne: async () => {} },
    Appointment: {
      findOne: async () => { const doc = structuredClone(store); doc.save = async () => { const { save: ignored, ...data } = doc; void ignored; Object.assign(store, data); }; return doc; },
      find: async () => [structuredClone(store)],
      findOneAndUpdate: async (query, changes) => {
        if (collision || query.status !== store.status || (query.outcomeRecordedAt !== undefined && String(query.outcomeRecordedAt || '') !== String(store.outcomeRecordedAt || '')) || (query['review.date'] && backend.hasFeedback(store))) return null;
        updates.push({ query, changes });
        Object.assign(store, changes.$set);
        if (changes.$push?.outcomeHistory) store.outcomeHistory.push(changes.$push.outcomeHistory);
        return structuredClone(store);
      },
    },
    AuditLog: class { async save() {} },
    CareRequest: { findOne: async () => null },
    sendNotification: async (id, message) => { notifications.push({ id, message }); },
  });
  const invoke = async (action, body = {}) => {
    const res = response();
    await actions[action]({ userId: actorId, params: { id: store.id }, body, headers: {} }, res);
    return res;
  };
  return { invoke, store, notifications, updates };
};

test('elapsed sessions become awaiting outcome exactly at their IST end, never auto-completed', () => {
  const apt = { status: 'upcoming', date: '2026-10-07', time: '14:00', duration: 60 };
  for (const helper of [sessionStatus, backend.sessionStatus]) {
    assert.equal(helper(apt, NOW - 1), 'upcoming');
    assert.equal(helper(apt, NOW), 'awaiting_outcome');
    assert.equal(helper(apt, NOW + 86400000), 'awaiting_outcome');
    assert.equal(helper({ ...apt, duration: 90 }, NOW), 'upcoming');
    assert.equal(helper({ ...apt, status: 'user_absent' }, NOW), 'user_absent');
  }
  assert.equal(apt.status, 'upcoming');
  assert.equal(sessionEndTime({ ...apt, date: '2026-10-07', time: '23:30', duration: 90 }), Date.parse('2026-10-08T01:00:00+05:30'));
});

test('appointment schema persists attendance outcomes, actor history and feedback request date', async () => {
  for (const status of resolvedStatuses) {
    const apt = new Appointment({ id: 'apt', patientId: 'p', patientName: 'User', counselorId: 'c', counselorName: 'Counselor', date: '2026-10-07', time: '14:00', status, outcomeRecordedAt: new Date(NOW), feedbackRequestedAt: new Date(NOW), outcomeHistory: [{ previousStatus: 'awaiting_outcome', outcome: status, actorId: 'c', actorName: 'Counselor', actorRole: 'counselor', at: new Date(NOW) }] });
    await apt.validate();
    assert.equal(apt.outcomeHistory[0].outcome, status);
    assert.equal(apt.feedbackRequestedAt.getTime(), NOW);
  }
});

test('reading appointments derives awaiting outcome without writes or notifications', async () => {
  const h = setup();
  const res = await h.invoke('getAppointments');
  assert.equal(res.body[0].status, 'awaiting_outcome');
  assert.equal(h.store.status, 'upcoming');
  assert.equal(h.updates.length, 0);
  assert.equal(h.notifications.length, 0);
});

test('cannot confirm a running or future session, including via the old admin completion route', async () => {
  for (const role of ['counselor', 'admin']) {
    const h = setup({ role, overrides: { duration: 90 } });
    assert.equal((await h.invoke('recordSessionOutcome', { outcome: 'completed' })).code, 409);
    assert.equal(h.updates.length, 0);
  }
  const h = setup({ role: 'admin', overrides: { time: '16:00' } });
  assert.equal((await h.invoke('updateAppointment', { status: 'completed' })).code, 409);
});

test('only assigned counselor or admin can confirm outcome', async () => {
  for (const options of [{ role: 'patient', actorId: 'p' }, { role: 'counselor', actorId: 'other' }]) {
    const h = setup(options);
    assert.equal((await h.invoke('recordSessionOutcome', { outcome: 'completed' })).code, 403);
    assert.equal(h.updates.length, 0);
  }
});

test('confirmed completion records actor/history and requests feedback once, even on retry', async () => {
  const h = setup();
  assert.equal((await h.invoke('recordSessionOutcome', { outcome: 'completed', expectedStatus: 'awaiting_outcome', expectedRecordedAt: null })).code, 200);
  assert.equal(h.store.status, 'completed');
  assert.equal(h.store.outcomeRecordedById, 'c');
  assert.equal(h.store.outcomeHistory[0].previousStatus, 'awaiting_outcome');
  assert.equal(h.updates[0].query.date, '2026-10-07');
  assert.equal(h.updates[0].query.time, '14:00');
  assert.equal(h.updates[0].query.duration, 60);
  assert.ok(h.store.feedbackRequestedAt);
  assert.equal(h.notifications.length, 1);
  assert.equal(h.notifications[0].id, 'p');
  assert.equal((await h.invoke('recordSessionOutcome', { outcome: 'completed' })).code, 200);
  assert.equal(h.notifications.length, 1);
  assert.equal(h.updates.length, 1);
});

test('all absence outcomes are distinct, never request feedback and cannot be reviewed', async () => {
  for (const outcome of ['user_absent', 'counselor_absent', 'both_absent']) {
    const h = setup();
    assert.equal((await h.invoke('recordSessionOutcome', { outcome })).code, 200);
    assert.equal(h.store.status, outcome);
    assert.equal(h.notifications.length, 0);
    assert.equal(feedbackEligible(h.store), false);
    assert.equal(feedbackLabel(h.store), 'Not applicable');
    const patient = setup({ role: 'patient', actorId: 'p', overrides: { status: outcome } });
    assert.equal((await patient.invoke('submitReview', { reviewText: 'Helpful session.' })).code, 400);
  }
});

test('cancelled, rejected, unconfirmed and malformed dates cannot be resolved', async () => {
  for (const overrides of [{ status: 'cancelled' }, { status: 'rejected' }, { status: 'pending_admin' }, { date: 'invalid' }]) {
    const h = setup({ overrides });
    assert.equal((await h.invoke('recordSessionOutcome', { outcome: 'completed' })).code, 409);
    assert.equal(h.updates.length, 0);
  }
});

test('invalid outcomes and oversized/non-text reasons never write', async () => {
  for (const body of [{ outcome: 'cancelled' }, { outcome: 'completed', reason: 2 }, { outcome: 'completed', reason: 'x'.repeat(1001) }]) {
    const h = setup();
    assert.equal((await h.invoke('recordSessionOutcome', body)).code, 400);
    assert.equal(h.updates.length, 0);
  }
});

test('only admin can correct an outcome, with required reason and preserved history', async () => {
  const denied = setup({ overrides: { status: 'user_absent' } });
  assert.equal((await denied.invoke('recordSessionOutcome', { outcome: 'completed', reason: 'Both did attend.' })).code, 403);
  const h = setup({ role: 'admin', overrides: { status: 'user_absent', outcomeHistory: [{ outcome: 'user_absent' }] } });
  assert.equal((await h.invoke('recordSessionOutcome', { outcome: 'completed' })).code, 400);
  assert.equal((await h.invoke('recordSessionOutcome', { outcome: 'completed', reason: 'Both did attend.' })).code, 200);
  assert.equal(h.store.outcomeHistory.length, 2);
  assert.equal(h.store.outcomeHistory[1].actorRole, 'admin');
  assert.equal(h.notifications.length, 1);
  await h.invoke('recordSessionOutcome', { outcome: 'user_absent', reason: 'Corrected attendance.' });
  await h.invoke('recordSessionOutcome', { outcome: 'completed', reason: 'Final correction.' });
  assert.equal(h.notifications.length, 1);
});

test('stale or concurrent outcome submissions fail without duplicate writes or notifications', async () => {
  const stale = setup({ role: 'admin', overrides: { status: 'user_absent', outcomeRecordedAt: new Date(NOW - 1000) } });
  assert.equal((await stale.invoke('recordSessionOutcome', { outcome: 'completed', reason: 'Correction', expectedStatus: 'awaiting_outcome', expectedRecordedAt: null })).code, 409);
  const h = setup({ collision: true });
  assert.equal((await h.invoke('recordSessionOutcome', { outcome: 'completed' })).code, 409);
  assert.equal(h.notifications.length, 0);
});

test('discovery completion is excluded from feedback', async () => {
  const h = setup({ overrides: { appointmentKind: 'discovery' } });
  await h.invoke('recordSessionOutcome', { outcome: 'completed' });
  assert.equal(h.notifications.length, 0);
  assert.equal(feedbackEligible(h.store), false);
  const patient = setup({ role: 'patient', actorId: 'p', overrides: { status: 'completed', appointmentKind: 'discovery' } });
  assert.equal((await patient.invoke('submitReview', { reviewText: 'Helpful session.' })).code, 400);
});

test('feedback requires the session user and rejects all blank, missing or non-text submissions', async () => {
  const foreign = setup({ role: 'patient', actorId: 'other', overrides: { status: 'completed' } });
  assert.equal((await foreign.invoke('submitReview', { reviewText: 'Helpful.' })).code, 403);
  for (const reviewText of [undefined, null, '', '   ', 5, { text: 'Helpful' }, 'x'.repeat(2001)]) {
    const h = setup({ role: 'patient', actorId: 'p', overrides: { status: 'completed' } });
    assert.equal((await h.invoke('submitReview', { reviewText })).code, 400);
    assert.equal(h.updates.length, 0);
  }
});

test('written feedback is stored once, trimmed, dated and associated with its session', async () => {
  const h = setup({ role: 'patient', actorId: 'p', overrides: { status: 'completed' } });
  assert.equal(feedbackLabel(h.store), 'Feedback pending');
  assert.equal((await h.invoke('submitReview', { reviewText: ' Good session ' })).code, 200);
  assert.equal(h.store.review.reviewText, 'Good session');
  assert.equal(h.store.review.date.getTime(), NOW);
  assert.equal('rating' in h.store.review, false);
  assert.equal(feedbackLabel(h.store), 'Feedback received');
  assert.equal((await h.invoke('submitReview', { reviewText: 'Second feedback' })).code, 409);
  assert.equal(h.updates.length, 1);
  const collision = setup({ role: 'patient', actorId: 'p', overrides: { status: 'completed' }, collision: true });
  assert.equal((await collision.invoke('submitReview', { reviewText: 'Helpful' })).code, 409);
});

test('ratings are neither accepted nor stored in the appointment feedback schema', async () => {
  const h = setup({ role: 'patient', actorId: 'p', overrides: { status: 'completed' } });
  assert.equal((await h.invoke('submitReview', { rating: 5, reviewText: 'Helpful' })).code, 400);
  assert.equal(h.updates.length, 0);
  assert.equal(Appointment.schema.path('review.rating'), undefined);
});

test('legacy text feedback and dated submissions remain received without displaying ratings', () => {
  for (const review of [{ reviewText: 'Old written feedback' }, { rating: 4, date: new Date(NOW) }]) {
    const apt = { patientId: 'p', status: 'completed', review };
    assert.equal(hasFeedback(apt), true);
    assert.equal(backend.hasFeedback(apt), true);
    assert.equal(feedbackLabel(apt), 'Feedback received');
    assert.equal('rating' in backend.presentAppointment(apt, { id: 'p', role: 'patient' }).review, false);
  }
});

test('only admins and the submitting user receive feedback; redaction never mutates the stored record', () => {
  const apt = { patientId: 'p', status: 'completed', feedbackRequestedAt: new Date(NOW), review: { reviewText: 'Private feedback', rating: 4, date: new Date(NOW) } };
  for (const actor of [undefined, { id: 'c', role: 'counselor' }, { id: 'other', role: 'patient' }, { id: 'p', role: 'counselor' }]) {
    const data = backend.presentAppointment(apt, actor);
    assert.equal('review' in data, false);
    assert.equal('feedbackRequestedAt' in data, false);
  }
  for (const actor of [{ id: 'p', role: 'patient' }, { id: 'p', role: 'user' }, { id: 'a', role: 'admin' }]) {
    assert.equal(backend.presentAppointment(apt, actor).review.reviewText, 'Private feedback');
  }
  assert.equal(apt.review.rating, 4);
  assert.equal(apt.review.reviewText, 'Private feedback');
});

test('counselor list, detail, notes update and idempotent outcome responses never expose feedback', async () => {
  const overrides = { status: 'completed', review: { reviewText: 'Private feedback', date: new Date(NOW) }, sessionNotes: 'Old notes', sessionNoteHistory: [] };
  const h = setup({ overrides });
  const list = await h.invoke('getAppointments');
  assert.equal('review' in list.body[0], false);
  for (const [action, body] of [['getAppointmentById', {}], ['updateAppointment', { sessionNotes: 'Updated' }], ['recordSessionOutcome', { outcome: 'completed' }]]) {
    const res = await h.invoke(action, body);
    assert.equal(res.code, 200);
    assert.equal('review' in (res.body.appointment || res.body), false);
  }
  for (const options of [{ role: 'patient', actorId: 'p' }, { role: 'admin', actorId: 'a' }]) {
    const reader = setup({ ...options, overrides });
    assert.equal((await reader.invoke('getAppointmentById')).body.review.reviewText, 'Private feedback');
  }
});

test('public counselor profile does not query or expose session feedback or ratings', async () => {
  const source = fs.readFileSync(new URL('../../backend/controllers/counselorController.js', import.meta.url), 'utf8').replace(/import[\s\S]*?from ['"][^'"]+['"];\s*/g, '').replaceAll('export const ', 'const ');
  const publicProfile = vm.runInNewContext(source + '\ngetCounselorById', {
    User: { findOne: async () => ({ toObject: () => ({ id: 'c', name: 'Counselor', rating: 4, reviewCount: 1, reviews: [{ reviewText: 'Private feedback' }] }) }) },
    Appointment: { find: async () => { throw new Error('Public profiles must not load session feedback'); } },
  });
  const res = response();
  await publicProfile({ params: { id: 'c' } }, res);
  assert.equal(res.code, 200);
  assert.equal(res.body.name, 'Counselor');
  for (const field of ['rating', 'reviewCount', 'reviews']) assert.equal(field in res.body, false);
});
