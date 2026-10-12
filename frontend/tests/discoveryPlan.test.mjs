import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { counsellingClusters, todayIST, validateDiscoveryPlan } from '../../shared/counsellingFramework.mjs';
import { CareRequest } from '../../backend/models/CareRequest.js';

const now = new Date('2026-10-12T06:00:00Z');
const plan = () => ({ preferredDate: '2099-10-13', preferredTime: '15:30', concerns: [
  { clusterCode: 'C01', subConcerns: ['Household friction', 'Silent treatment'] },
  { clusterCode: 'C13', subConcerns: ['Mental fatigue'] },
] });

test('the supplied framework contains all 15 clusters and their three sub-concerns', () => {
  assert.equal(counsellingClusters.length, 15);
  assert.equal(new Set(counsellingClusters.map(cluster => cluster.code)).size, 15);
  assert.ok(counsellingClusters.every(cluster => cluster.subConcerns.length === 3));
  assert.equal(counsellingClusters.find(cluster => cluster.code === 'C11').group, 'Financial & Career');
});

test('multiple clusters validate and normalize without mutating input', () => {
  const input = plan();
  const original = structuredClone(input);
  const output = validateDiscoveryPlan(input, null, now);
  assert.deepEqual(output, original);
  output.concerns[0].subConcerns.push('changed');
  assert.deepEqual(input, original);
});

test('reject unknown clusters, duplicate clusters, invalid sub-concerns and incomplete classification', () => {
  for (const concerns of [[], [{ clusterCode: 'C99', subConcerns: ['bad'] }], [{ clusterCode: 'C01', subConcerns: [] }], [{ clusterCode: 'C01', subConcerns: ['Exam pressure'] }], [plan().concerns[0], plan().concerns[0]]]) {
    assert.throws(() => validateDiscoveryPlan({ ...plan(), concerns }, null, now));
  }
});

test('validate calendar dates, time bounds and same-day preferences in IST', () => {
  for (const preferredDate of ['', '2099-02-30', '2099-13-01', 'not-a-date']) assert.throws(() => validateDiscoveryPlan({ ...plan(), preferredDate }, null, now), /valid preferred session date/);
  for (const preferredTime of ['', 'Morning', '24:00', '13:60']) assert.throws(() => validateDiscoveryPlan({ ...plan(), preferredTime }, null, now), /valid preferred session time/);
  assert.throws(() => validateDiscoveryPlan({ ...plan(), preferredDate: '2026-10-12', preferredTime: '11:00' }, null, now), /future/);
  assert.doesNotThrow(() => validateDiscoveryPlan({ ...plan(), preferredDate: '2026-10-12', preferredTime: '12:00' }, null, now));
  assert.equal(todayIST(new Date('2026-10-12T20:00:00Z')), '2026-10-13');
});

test('existing historical preferences remain editable, while changing them requires a future time', () => {
  const old = { ...plan(), preferredDate: '2026-10-01' };
  assert.doesNotThrow(() => validateDiscoveryPlan(old, old, now));
  assert.throws(() => validateDiscoveryPlan({ ...old, preferredTime: '16:00' }, old, now), /future/);
});

test('schema retains current plan and history snapshots, while accepting legacy records', async () => {
  const request = new CareRequest({ id: 'test', patientId: 'patient', patientName: 'Patient', discoveryPlan: plan(), discoveryNotesHistory: [{ notes: 'History', discoveryPlan: plan() }] });
  await request.validate();
  assert.equal(request.discoveryPlan.concerns[1].clusterCode, 'C13');
  assert.equal(request.discoveryNotesHistory[0].discoveryPlan.preferredTime, '15:30');
  request.discoveryPlan.preferredTime = '16:00';
  assert.equal(request.discoveryNotesHistory[0].discoveryPlan.preferredTime, '15:30');
  const legacy = new CareRequest({ id: 'legacy', patientId: 'patient', patientName: 'Patient', discoveryNotes: 'Existing notes' });
  await legacy.validate();
  assert.equal(legacy.discoveryPlan, undefined);
});

function controllerFixture(status = 'accepted', previousPlan) {
  let saves = 0;
  const request = { id: 'case', status, discoveryNotes: '', discoveryNotesHistory: [], discoveryPlan: previousPlan, timeline: [], save: async () => saves++ };
  const source = fs.readFileSync(new URL('../../backend/controllers/sessionRequestController.js', import.meta.url), 'utf8')
    .replace(/import[\s\S]*?from ['"][^'"]+['"];\s*/g, '').replaceAll('export const ', 'const ');
  const update = vm.runInNewContext(`${source}\nupdateDiscoveryNotes`, { validateDiscoveryPlan, CareRequest: { findOne: async () => request }, Date, console });
  const call = async (body, role = 'admin') => {
    const res = { code: 200, status(code) { this.code = code; return this; }, json(data) { this.data = data; } };
    await update({ params: { id: 'case' }, user: { id: 'admin', name: 'Admin', role }, body }, res);
    return res;
  };
  return { request, call, saves: () => saves };
}

test('admin saves notes and plan together and completes discovery with a historical snapshot', async () => {
  const fixture = controllerFixture();
  const res = await fixture.call({ notes: '  Observations  ', discoveryPlan: plan() });
  assert.equal(res.code, 200); assert.equal(fixture.saves(), 1);
  assert.equal(fixture.request.status, 'discovery_completed');
  assert.equal(fixture.request.discoveryNotes, 'Observations');
  assert.equal(fixture.request.discoveryNotesHistory[0].discoveryPlan.concerns[1].clusterCode, 'C13');
  fixture.request.discoveryPlan.preferredTime = '16:00';
  assert.equal(fixture.request.discoveryNotesHistory[0].discoveryPlan.preferredTime, '15:30');
});

test('invalid plans and unauthorized or unapproved cases do not write or mark complete', async () => {
  const fixture = controllerFixture();
  assert.equal((await fixture.call({ notes: 'Notes', discoveryPlan: { ...plan(), concerns: [] } })).code, 400);
  assert.equal((await fixture.call({ notes: 'Notes', discoveryPlan: plan() }, 'counselor')).code, 403);
  assert.equal(fixture.saves(), 0); assert.equal(fixture.request.discoveryNotes, '');
  assert.equal(fixture.request.status, 'accepted');
  const pending = controllerFixture('submitted');
  assert.equal((await pending.call({ notes: 'Notes', discoveryPlan: plan() })).code, 409);
  assert.equal(pending.saves(), 0);
});

test('legacy notes-only edits preserve plans and updates do not regress active case status', async () => {
  const fixture = controllerFixture('active', plan());
  assert.equal((await fixture.call({ notes: 'Updated notes' })).code, 200);
  assert.equal(fixture.request.status, 'active');
  assert.equal(fixture.request.discoveryPlan.preferredTime, '15:30');
  assert.equal(fixture.request.discoveryNotesHistory[0].discoveryPlan.preferredTime, '15:30');
});

test('single session normalizes to one and package requires a whole number of at least two', () => {
  assert.equal(validateDiscoveryPlan({ ...plan(), sessionType: 'single', sessionCount: 8 }, null, now).sessionCount, 1);
  assert.equal(validateDiscoveryPlan({ ...plan(), sessionType: 'package', sessionCount: 6 }, null, now).sessionCount, 6);
  for (const sessionCount of [undefined, '', '6', 0, 1, -2, 2.5, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => validateDiscoveryPlan({ ...plan(), sessionType: 'package', sessionCount }, null, now), /whole number/);
  }
  assert.throws(() => validateDiscoveryPlan({ ...plan(), sessionType: '' }, null, now), /single session/);
  assert.throws(() => validateDiscoveryPlan({ ...plan(), sessionType: 'other' }, null, now), /single session/);
});

test('older clients preserve the existing package, while changing to single clears the package count', () => {
  const previous = { ...plan(), sessionType: 'package', sessionCount: 6 };
  const unchanged = validateDiscoveryPlan(plan(), previous, now);
  assert.equal(unchanged.sessionType, 'package'); assert.equal(unchanged.sessionCount, 6);
  const single = validateDiscoveryPlan({ ...plan(), sessionType: 'single' }, previous, now);
  assert.equal(single.sessionCount, 1);
  assert.equal(validateDiscoveryPlan(plan(), null, now).sessionType, undefined);
});

test('package choice and count persist on the case and each independent discovery history snapshot', async () => {
  const packagePlan = { ...plan(), sessionType: 'package', sessionCount: 6 };
  const fixture = controllerFixture();
  assert.equal((await fixture.call({ notes: 'Package preference', discoveryPlan: packagePlan })).code, 200);
  assert.equal(fixture.request.discoveryPlan.sessionType, 'package');
  assert.equal(fixture.request.discoveryNotesHistory[0].discoveryPlan.sessionCount, 6);
  assert.equal((await fixture.call({ notes: 'Changed to single', discoveryPlan: { ...plan(), sessionType: 'single', sessionCount: 1 } })).code, 200);
  assert.equal(fixture.request.discoveryPlan.sessionCount, 1);
  assert.equal(fixture.request.discoveryNotesHistory[0].discoveryPlan.sessionCount, 6);
  const doc = new CareRequest({ id: 'package-test', patientId: 'patient', patientName: 'Patient', discoveryPlan: packagePlan });
  await doc.validate();
  assert.equal(doc.discoveryPlan.sessionCount, 6);
  doc.discoveryPlan.sessionCount = 1;
  await assert.rejects(doc.validate(), /at least 2/);
  doc.discoveryPlan.sessionCount = undefined;
  await assert.rejects(doc.validate(), /required/);
});

test('invalid package counts never save notes or complete discovery', async () => {
  const fixture = controllerFixture();
  const result = await fixture.call({ notes: 'Notes', discoveryPlan: { ...plan(), sessionType: 'package', sessionCount: 1 } });
  assert.equal(result.code, 400);
  assert.equal(fixture.saves(), 0);
  assert.equal(fixture.request.status, 'accepted');
});
