import { todayIST } from '../../../shared/counsellingFramework.mjs';
import { sessionStatus } from './sessionOutcome.js';
import { pendingReschedule } from './rescheduling.js';

export function buildAdminOverview({ users = [], appointments = [], requests = [], now = Date.now() }) {
  const today = todayIST(new Date(now));
  const sessions = appointments.filter(item => item.appointmentKind !== 'discovery');
  const byTime = (a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`);
  const todaysSessions = sessions.filter(item => item.date === today && !['cancelled', 'rejected'].includes(item.status)).sort(byTime);
  const nextSessions = sessions.filter(item => sessionStatus(item, now) === 'upcoming' && item.date >= today).sort(byTime);
  const tasks = [
    { key: 'registrations', label: 'Registration requests', detail: 'Approve new applications for care.', count: requests.filter(item => ['submitted', 'assigned'].includes(item.status)).length, section: 0 },
    { key: 'discovery', label: 'Discovery calls to complete', detail: 'Record observations and session preferences.', count: requests.filter(item => ['accepted', 'discovery_scheduled'].includes(item.status)).length, section: 3, filter: 'pending' },
    { key: 'assignment', label: 'Users ready for counselor matching', detail: 'Assign a counselor after discovery.', count: requests.filter(item => item.status === 'discovery_completed').length, section: 3, filter: 'ready' },
    { key: 'reschedule', label: 'Rescheduling requests', detail: 'Review requested session replacements.', count: appointments.filter(pendingReschedule).length, section: 5, filter: 'reschedule' },
    { key: 'outcomes', label: 'Sessions awaiting an outcome', detail: 'Confirm attendance for ended sessions.', count: sessions.filter(item => sessionStatus(item, now) === 'awaiting_outcome').length, section: 5, filter: 'awaiting_outcome' },
    { key: 'approval', label: 'Sessions awaiting approval', detail: 'Review proposed bookings.', count: sessions.filter(item => item.status === 'pending_admin').length, section: 5, filter: 'pending_admin' },
  ].filter(item => item.count > 0);
  return {
    today,
    approvedUsers: users.filter(item => ['user', 'patient'].includes(item.role) && item.approved && !item.suspended).length,
    activeCounselors: users.filter(item => item.role === 'counselor' && item.approved && !item.suspended).length,
    sessionsToday: todaysSessions.length,
    completedSessions: sessions.filter(item => item.status === 'completed').length,
    tasks,
    schedule: (todaysSessions.length ? todaysSessions : nextSessions).slice(0, 5),
    showingToday: todaysSessions.length > 0,
  };
}
