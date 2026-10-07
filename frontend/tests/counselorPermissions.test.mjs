import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { isOnlineMeetingLink } from '../src/utils/sessionAttendance.js';

const load = (file, bindings, expression) => {
  const source = fs.readFileSync(new URL(`../../backend/controllers/${file}`, import.meta.url), 'utf8')
    .replace(/import[\s\S]*?from ['"][^'"]+['"];\s*/g, '')
    .replaceAll('export const ', 'const ');
  return vm.runInNewContext(`${source}\n${expression}`, bindings);
};
const response = () => ({ code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } });
const setup = (role = 'counselor', status = 'upcoming', actorId = 'c') => {
  let saves = 0;
  const appointment = { id: 'session', counselorId: 'c', status, sessionNotes: 'Original', sessionNoteHistory: [], async save() { saves++; } };
  const actor = { id: actorId, role };
  const actions = load('appointmentController.js', {
    User: { findOne: async () => actor }, Appointment: { findOne: async () => appointment },
    validOnlineMeetingLink: isOnlineMeetingLink,
  }, '({updateAppointment, rescheduleAppointment, cancelAppointment})');
  const invoke = async (action, body) => {
    const res = response();
    await actions[action]({ userId: actorId, params: { id: appointment.id }, body }, res);
    return res;
  };
  return { invoke, appointment, saves: () => saves };
};

test('counselors cannot schedule new sessions or follow-ups', async () => {
  const schedule = load('sessionRequestController.js', {}, 'scheduleSession');
  const res = response();
  await schedule({ user: { id: 'c', role: 'counselor', approved: true }, body: {} }, res);
  assert.equal(res.code, 403);
});

test('counselors cannot change status, links or scheduling fields, including mixed note updates', async () => {
  for (const body of [{ status: 'completed' }, { status: 'cancelled' }, { meetingLink: 'https://example.com' }, { date: '2026-10-08' }, { sessionNotes: 'New', status: 'completed' }]) {
    const h = setup();
    assert.equal((await h.invoke('updateAppointment', body)).code, 403);
    assert.equal(h.saves(), 0);
    assert.equal(h.appointment.sessionNotes, 'Original');
    assert.equal(h.appointment.status, 'upcoming');
  }
});

test('dedicated reschedule and cancel endpoints also deny counselors', async () => {
  for (const action of ['rescheduleAppointment', 'cancelAppointment']) {
    const h = setup();
    assert.equal((await h.invoke(action, { date: '2026-10-08', time: '14:00' })).code, 403);
    assert.equal(h.saves(), 0);
  }
});

test('assigned counselors can save notes on upcoming and completed sessions with history', async () => {
  for (const status of ['upcoming', 'completed']) {
    const h = setup('counselor', status);
    assert.equal((await h.invoke('updateAppointment', { sessionNotes: 'New notes' })).code, 200);
    assert.equal(h.saves(), 1);
    assert.equal(h.appointment.sessionNotes, 'New notes');
    assert.equal(h.appointment.sessionNoteHistory[0].notes, 'Original');
    assert.equal(h.appointment.status, status);
  }
});

test('unassigned counselors and admins cannot edit clinical notes', async () => {
  for (const [role, actorId] of [['counselor', 'other'], ['admin', 'admin']]) {
    const h = setup(role, 'upcoming', actorId);
    assert.equal((await h.invoke('updateAppointment', { sessionNotes: 'New' })).code, 403);
    assert.equal(h.saves(), 0);
  }
});

test('notes cannot be added to cancelled or unconfirmed sessions', async () => {
  for (const status of ['cancelled', 'pending_admin', 'rejected']) {
    const h = setup('counselor', status);
    assert.equal((await h.invoke('updateAppointment', { sessionNotes: 'New' })).code, 409);
    assert.equal(h.saves(), 0);
  }
});

test('admins retain completion, cancellation and meeting-link updates', async () => {
  for (const status of ['completed', 'cancelled']) {
    const h = setup('admin');
    assert.equal((await h.invoke('updateAppointment', { status })).code, 200);
    assert.equal(h.appointment.status, status);
  }
  const h = setup('admin');
  assert.equal((await h.invoke('updateAppointment', { meetingLink: 'https://meet.google.com/abc-defg-hij' })).code, 200);
  assert.equal(h.appointment.meetingLink, 'https://meet.google.com/abc-defg-hij');
});
