import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';

// Evaluate controller logic with isolated persistence and delivery doubles: no live DB or messages.
const load = (file, bindings, exported) => {
  const staged = new URL(file, import.meta.url);
  const installed = new URL(file.includes('Service') ? `../utils/${file}` : `../controllers/${file}`, import.meta.url);
  const source = fs.readFileSync(fs.existsSync(staged) ? staged : installed, 'utf8')
    .replace(/import[\s\S]*?from ['"][^'"]+['"];\s*/g, '')
    .replaceAll('export const ', 'const ');
  return vm.runInNewContext(`${source}\n${exported}`, { process, console, ...bindings });
};
const setup = ({ counselors = [], failSave = false } = {}) => {
  const saved = [], notifications = [];
  class CareRequest {
    constructor(data) { Object.assign(this, { assignmentHistory: [] }, data); }
    async save() {
      if (failSave) throw new Error('Request save failed');
      saved.push(this);
    }
    static async countDocuments({ assignedCounselorId }) { return assignedCounselorId === 'busy' ? 5 : 0; }
  }
  const create = load('./careRequestService.js', {
    crypto, CareRequest,
    User: { find: async query => {
      assert.equal(query.suspended.$ne, true);
      if (query.role === 'counselor') { assert.equal(query.approved, true); return counselors; }
      return [{ id: 'admin' }];
    } },
    sendNotification: async (id, message) => { notifications.push({ id, message }); },
  }, 'createAssignedCareRequest');
  return { create, saved, notifications };
};
const patient = { id: 'user1', name: 'Patient' };

test('registration intake enters the least-loaded counselor review queue', async () => {
  const { create, saved, notifications } = setup({ counselors: [
    { id: 'busy', name: 'Busy', rating: 5 }, { id: 'available', name: 'Available', rating: 4 },
  ] });
  const request = await create(patient, { preferredFormat: 'In-Person Consultation', intakeNotes: ' Support ' });
  assert.equal(request.status, 'assigned');
  assert.equal(request.assignedCounselorId, 'available');
  assert.equal(request.intakeNotes, 'Support');
  assert.equal(request.preferredDate, '');
  assert.equal(request.assignmentHistory[0].stage, 'review');
  assert.equal(saved.length, 1);
  assert.deepEqual(notifications.map(n => n.id).sort(), ['admin', 'available', 'user1']);
});

test('no active counselor preserves intake in the admin queue', async () => {
  const { create, saved, notifications } = setup();
  const request = await create(patient);
  assert.equal(request.status, 'submitted');
  assert.equal(saved.length, 1);
  assert.deepEqual(notifications.map(n => n.id).sort(), ['admin', 'user1']);
});

test('explicit session requests retain schedule preferences', async () => {
  const { create } = setup();
  const request = await create(patient, { preferredDate: '2026-12-01', preferredTime: 'Morning', preferredFormat: 'Online Consultation' });
  assert.equal(request.preferredDate, '2026-12-01');
  assert.equal(request.preferredTime, 'Morning');
});

for (const role of ['user', 'patient', undefined, 'admin']) {
  test(`registration creates intake only for patient roles (${role || 'default'})`, async () => {
    const calls = [];
    class User {
      constructor(data) { Object.assign(this, data); }
      async save() {}
      static async findOne() { return null; }
    }
    const register = load('./authController.js', {
      User, isValidMobile: () => true, normalizeMobile: value => value,
      compareOtp: async () => true,
      OtpVerification: {
        findOne: async () => ({ expiresAt: new Date(Date.now() + 60000), attempts: 0, maxAttempts: 3 }),
        deleteOne: async () => {},
      },
      AuditLog: class { async save() {} },
      issueAuthTokens: () => ({ token: 'test' }),
      createAssignedCareRequest: async (user, preferences) => { calls.push(preferences); return { id: 'care1', assignedCounselorId: 'c1' }; },
    }, 'register');
    const res = { status(code) { this.code = code; return this; }, json(data) { this.data = data; } };
    await register({ body: { ...patient, role, mobile: '9876543210', otp: '123456', preferredCounselingMode: 'Offline', counselingRequirements: 'Support' }, headers: {} }, res);
    assert.equal(res.code, 201, res.data?.message);
    assert.equal(calls.length, role === 'admin' ? 0 : 1);
    if (calls.length) {
      assert.equal(calls[0].preferredFormat, 'In-Person Consultation');
      assert.equal(calls[0].intakeNotes, 'Support');
      assert.equal(res.data.request.assignedCounselorId, 'c1');
    }
  });
}

test('failed persistence sends no assignment notifications', async () => {
  const { create, notifications } = setup({ failSave: true });
  await assert.rejects(create(patient), /Request save failed/);
  assert.equal(notifications.length, 0);
});
