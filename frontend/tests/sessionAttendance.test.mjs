import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { attendanceLink, isOnlineMeetingLink } from '../src/utils/sessionAttendance.js';

const load = (file, bindings, expression) => {
  const source = fs.readFileSync(new URL(`../../backend/${file}`, import.meta.url), 'utf8')
    .replace(/import[\s\S]*?from ['"][^'"]+['"];\s*/g, '').replaceAll('export const ', 'const ');
  return vm.runInNewContext(`${source}\n${expression}`, { URL, ...bindings });
};
const validOnlineMeetingLink = load('utils/scheduling.js', {}, 'validOnlineMeetingLink');

test('frontend and backend accept Zoom/Meet links and reject missing or unrelated destinations', () => {
  for (const value of ['https://meet.google.com/abc-defg-hij', 'https://zoom.us/j/123456789?pwd=test', 'https://us02web.zoom.us/j/123456789']) {
    assert.equal(isOnlineMeetingLink(value), true);
    assert.equal(validOnlineMeetingLink(value), true);
  }
  for (const value of ['', undefined, 'http://zoom.us/j/123', 'javascript:alert(1)', 'https://zoom.us.evil.test/j/123', 'https://evilzoom.us/j/123', 'https://example.com/meeting', 'https://zoom.us', 'https://user:pass@zoom.us/j/123']) {
    assert.equal(isOnlineMeetingLink(value), false);
    assert.equal(validOnlineMeetingLink(value), false);
  }
});

test('Attend session opens a meeting only for an upcoming online session', () => {
  const appointment = { status: 'upcoming', appointmentType: 'Video Consultation', meetingLink: 'https://meet.google.com/abc-defg-hij' };
  assert.equal(attendanceLink(appointment), appointment.meetingLink);
  assert.equal(attendanceLink({ ...appointment, appointmentType: 'In-Person Consultation' }), '');
  assert.equal(attendanceLink({ ...appointment, meetingLink: '' }), '');
  assert.equal(attendanceLink({ ...appointment, status: 'cancelled' }), '');
  assert.equal(attendanceLink({ ...appointment, status: 'completed' }), '');
});

const setup = preferredFormat => {
  const stored = [];
  let requestSaves = 0;
  const care = { id: 'case', status: 'matched', finalCounselorId: 'c', patientId: 'p', patientName: 'Patient', preferredFormat, appointmentIds: [], timeline: [], async save() { requestSaves++; } };
  class Appointment {
    constructor(data) { Object.assign(this, data); }
    async save() { stored.push(this); }
  }
  const schedule = load('controllers/sessionRequestController.js', {
    crypto, Appointment, validOnlineMeetingLink, validateSchedule: async () => '',
    CareRequest: { findOne: async () => care },
    User: { findOne: async () => ({ id: 'c', name: 'Counselor' }) },
    AppointmentType: { findOne: async () => null }, sendNotification: async () => {},
  }, 'scheduleSession');
  const submit = async sessions => {
    const res = { code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
    await schedule({ user: { id: 'admin', name: 'Admin', role: 'admin' }, params: { id: 'case' }, body: { sessions } }, res);
    return res;
  };
  return { submit, stored, requestSaves: () => requestSaves };
};
const session = { date: '2026-10-10', time: '14:00', duration: 60, kind: 'session', appointmentType: 'Video Consultation' };

test('admin cannot schedule online sessions without a valid meeting link', async () => {
  for (const meetingLink of ['', 'https://example.com/meeting']) {
    const h = setup('Online Consultation');
    assert.equal((await h.submit([{ ...session, meetingLink }])).code, 400);
    assert.equal(h.stored.length, 0);
    assert.equal(h.requestSaves(), 0);
  }
});

test('online scheduling persists the provided meeting link', async () => {
  const h = setup('Online Consultation');
  const meetingLink = 'https://meet.google.com/abc-defg-hij';
  assert.equal((await h.submit([{ ...session, meetingLink: ` ${meetingLink} ` }])).code, 201);
  assert.equal(h.stored[0].meetingLink, meetingLink);
  assert.equal(h.stored[0].clinicAddress, '');
});

test('offline sessions always persist HO and clear any supplied online link', async () => {
  const h = setup('In-Person Consultation');
  assert.equal((await h.submit([{ ...session, appointmentType: 'In-Person Consultation', meetingLink: 'https://meet.google.com/abc-defg-hij', clinicAddress: 'Elsewhere' }])).code, 201);
  assert.equal(h.stored[0].clinicAddress, 'HO');
  assert.equal(h.stored[0].meetingLink, '');
});

test('all proposed links are validated before any session is saved', async () => {
  const h = setup('Online Consultation');
  assert.equal((await h.submit([{ ...session, meetingLink: 'https://zoom.us/j/123456789' }, { ...session, time: '16:00', meetingLink: '' }])).code, 400);
  assert.equal(h.stored.length, 0);
});
