import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getScheduledSession } from '../src/utils/scheduledSession.js';

const request = { id: 'shlok-case', patientId: 'shlok', status: 'active' };
const booked = { id: 'session', careRequestId: request.id, patientId: request.patientId, appointmentKind: 'session', status: 'upcoming', date: '2026-10-07', time: '13:00' };

test('Shlok has a scheduled session even though the case remains active', () => {
  assert.equal(getScheduledSession(request, [booked]), booked);
});
test('completed, cancelled, rejected and proposed sessions allow scheduling again', () => {
  for (const status of ['completed', 'cancelled', 'rejected', 'pending_admin']) {
    assert.equal(getScheduledSession(request, [{ ...booked, status }]), null);
  }
});
test('discovery appointments do not count as booked counseling sessions', () => {
  assert.equal(getScheduledSession(request, [{ ...booked, appointmentKind: 'discovery' }]), null);
});
test('another patient or explicitly linked case does not change this case', () => {
  assert.equal(getScheduledSession(request, [{ ...booked, patientId: 'jane' }, { ...booked, careRequestId: 'another-case' }]), null);
});
test('legacy consultations without a case link and follow-ups count as booked', () => {
  const legacy = { ...booked, careRequestId: '', appointmentKind: '' };
  assert.equal(getScheduledSession(request, [legacy]), legacy);
  const followUp = { ...booked, appointmentKind: 'follow_up' };
  assert.equal(getScheduledSession(request, [followUp]), followUp);
});
test('the earliest scheduled session is shown without mutating appointments', () => {
  const later = { ...booked, id: 'later', date: '2026-10-09' };
  const appointments = [later, booked];
  assert.equal(getScheduledSession(request, appointments), booked);
  assert.deepEqual(appointments, [later, booked]);
  assert.equal(getScheduledSession(null, appointments), null);
});
