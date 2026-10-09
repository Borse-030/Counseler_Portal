import { test } from 'node:test';
import assert from 'node:assert/strict';
import { submitSessionOutcome } from '../src/utils/submitSessionOutcome.js';

const appointment = { id: 'a', status: 'awaiting_outcome' };
const values = overrides => ({ appointment, outcome: 'user_absent', reason: ' User could not attend ', reschedule: true, preferredDate: '2026-10-09', preferredTime: ' Afternoon ', ...overrides });
const setup = ({ outcomeFailure = false, requestFailure = false, existing = undefined } = {}) => {
  const calls = [];
  let recorded;
  const api = {
    recordSessionOutcome: async (id, body) => { calls.push({ action: 'outcome', id, body }); if (outcomeFailure) throw Error('Outcome failed'); return { appointment: { ...appointment, status: body.outcome, rescheduleRequest: existing } }; },
    requestReschedule: async (id, body) => { calls.push({ action: 'reschedule', id, body }); if (requestFailure) throw Error('Request failed'); return { appointment: { ...recorded, rescheduleRequest: { status: 'pending' } } }; },
  };
  const onRecorded = value => { recorded = value; };
  return { api, calls, onRecorded, recorded: () => recorded };
};

test('each absence outcome is saved before the optional rescheduling request', async () => {
  for (const outcome of ['user_absent', 'counselor_absent', 'both_absent']) {
    const h = setup();
    const result = await submitSessionOutcome(values({ outcome }), h.api, h.onRecorded);
    assert.deepEqual(h.calls.map(c => c.action), ['outcome', 'reschedule']);
    assert.equal(h.recorded().status, outcome);
    assert.equal(result.rescheduleRequest.status, 'pending');
    assert.equal(h.calls[1].body.reason, 'User could not attend');
    assert.equal(h.calls[1].body.preferredTime, 'Afternoon');
  }
});

test('completed or no-rescheduling choices only call the outcome API', async () => {
  for (const overrides of [{ outcome: 'completed' }, { reschedule: false }]) {
    const h = setup();
    await submitSessionOutcome(values(overrides), h.api, h.onRecorded);
    assert.deepEqual(h.calls.map(c => c.action), ['outcome']);
  }
});

test('an unsuccessful outcome never sends a request', async () => {
  const h = setup({ outcomeFailure: true });
  await assert.rejects(submitSessionOutcome(values(), h.api, h.onRecorded), /Outcome failed/);
  assert.deepEqual(h.calls.map(c => c.action), ['outcome']);
  assert.equal(h.recorded(), undefined);
});

test('a failed request retains the saved outcome and retries without saving attendance again', async () => {
  const h = setup({ requestFailure: true });
  await assert.rejects(submitSessionOutcome(values(), h.api, h.onRecorded), /Request failed/);
  assert.equal(h.recorded().status, 'user_absent');
  const retry = setup();
  await submitSessionOutcome(values({ recordedAppointment: h.recorded() }), retry.api, retry.onRecorded);
  assert.deepEqual(retry.calls.map(c => c.action), ['reschedule']);
});

test('an existing pending or scheduled request is not submitted again', async () => {
  for (const status of ['pending', 'scheduling', 'scheduled']) {
    const h = setup({ existing: { status } });
    await submitSessionOutcome(values(), h.api, h.onRecorded);
    assert.deepEqual(h.calls.map(c => c.action), ['outcome']);
  }
});
