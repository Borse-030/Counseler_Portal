import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildAdminOverview } from '../src/utils/adminOverview.js';

const now = Date.parse('2026-10-15T05:00:00Z');
const appointment = (id, overrides = {}) => ({ id, date: '2026-10-15', time: '11:00', duration: 60, appointmentKind: 'session', status: 'upcoming', ...overrides });

test('overview counts approved active accounts and excludes cancelled/discovery sessions from today', () => {
  const data = buildAdminOverview({ now,
    users: [
      { role: 'patient', approved: true }, { role: 'user', approved: true },
      { role: 'patient', approved: false }, { role: 'patient', approved: true, suspended: true },
      { role: 'counselor', approved: true }, { role: 'counselor', approved: true, suspended: true },
    ],
    appointments: [appointment('today'), appointment('cancelled', { status: 'cancelled' }), appointment('discovery', { appointmentKind: 'discovery' }), appointment('complete', { date: '2026-10-14', status: 'completed' })],
  });
  assert.equal(data.approvedUsers, 2); assert.equal(data.activeCounselors, 1);
  assert.equal(data.sessionsToday, 1); assert.equal(data.completedSessions, 1);
});

test('attention tasks count separate workflows and target their matching directory filters', () => {
  const data = buildAdminOverview({ now,
    requests: ['submitted', 'assigned', 'accepted', 'discovery_scheduled', 'discovery_completed', 'active', 'closed'].map(status => ({ status })),
    appointments: [appointment('ended', { time: '09:00', rescheduleRequest: { status: 'pending' } }), appointment('approval', { status: 'pending_admin' }), appointment('future')],
  });
  const tasks = Object.fromEntries(data.tasks.map(task => [task.key, task]));
  assert.equal(tasks.registrations.count, 2); assert.equal(tasks.discovery.count, 2); assert.equal(tasks.assignment.count, 1);
  assert.equal(tasks.reschedule.count, 1); assert.equal(tasks.outcomes.count, 1); assert.equal(tasks.approval.count, 1);
  assert.equal(tasks.reschedule.filter, 'reschedule'); assert.equal(tasks.outcomes.filter, 'awaiting_outcome');
  assert.equal(tasks.assignment.section, 3); assert.equal(tasks.assignment.filter, 'ready');
});

test('the program day uses IST when the UTC date is still the previous day', () => {
  const data = buildAdminOverview({ now: Date.parse('2026-10-14T20:00:00Z'), appointments: [appointment('ist-today'), appointment('utc-today', { date: '2026-10-14' })] });
  assert.equal(data.today, '2026-10-15'); assert.equal(data.sessionsToday, 1);
  assert.equal(data.schedule[0].id, 'ist-today');
});

test('schedule preview is ordered, limited to five, and does not mutate source records', () => {
  const appointments = Array.from({ length: 8 }, (_, i) => appointment(`a${i}`, { time: `${String(17 - i).padStart(2, '0')}:00` }));
  const original = structuredClone(appointments);
  const data = buildAdminOverview({ now, appointments });
  assert.equal(data.schedule.length, 5); assert.equal(data.schedule[0].time, '10:00');
  assert.deepEqual(appointments, original);
});

test('an empty today falls back to future scheduled sessions and omits resolved/cancelled records', () => {
  const data = buildAdminOverview({ now, appointments: [appointment('past', { date: '2026-10-14' }), appointment('future', { date: '2026-10-16' }), appointment('cancelled', { date: '2026-10-16', status: 'cancelled' }), appointment('done', { date: '2026-10-14', status: 'completed' })] });
  assert.equal(data.showingToday, false); assert.deepEqual(data.schedule.map(item => item.id), ['future']);
  assert.equal(data.tasks.find(item => item.key === 'outcomes').count, 1);
});

test('an empty program returns zero stats, no tasks, and no fabricated schedule', () => {
  const data = buildAdminOverview({ now });
  assert.equal(data.approvedUsers, 0); assert.equal(data.activeCounselors, 0);
  assert.equal(data.sessionsToday, 0); assert.equal(data.completedSessions, 0);
  assert.deepEqual(data.tasks, []); assert.deepEqual(data.schedule, []);
});
