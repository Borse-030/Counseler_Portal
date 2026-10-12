import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { consumeNotificationStream } from '../src/utils/notificationStream.js';
import { subscribeNotifications, publishNotificationEvent } from '../../backend/utils/notificationEvents.js';

const load = (path, bindings, names) => {
  const source = fs.readFileSync(new URL(`../../backend/${path}`, import.meta.url), 'utf8')
    .replace(/import[\s\S]*?from ['"][^'"]+['"];\s*/g, '')
    .replaceAll('export const ', 'const ');
  return vm.runInNewContext(`${source}\n({ ${names.join(', ')} })`, { Buffer, Date, console, process, ...bindings });
};
const response = () => ({ statusCode: 200, status(code) { this.statusCode = code; return this; }, json(data) { this.data = data; return this; } });

test('cursor pagination is user-scoped, bounded, and handles equal timestamps', () => {
  const { parseNotificationQuery } = load('controllers/notificationController.js', {}, ['parseNotificationQuery']);
  const cursor = Buffer.from(JSON.stringify({ date: '2026-10-12T00:00:00Z', id: 'n2' })).toString('base64url');
  const query = parseNotificationQuery({ cursor, limit: '10000', filter: 'unread' }, 'alice');
  assert.equal(query.limit, 50);
  assert.equal(query.filter.userId, 'alice');
  assert.equal(query.filter.read, false);
  assert.equal(query.filter.$or[1].id.$lt, 'n2');
  assert.throws(() => parseNotificationQuery({ cursor: 'invalid' }, 'alice'), /Invalid cursor/);
  assert.throws(() => parseNotificationQuery({ filter: 'anything' }, 'alice'), /Invalid filter/);
});

test('list returns only a page, a separate unread total, and a continuation cursor', async () => {
  let requestedLimit;
  const rows = Array.from({ length: 26 }, (_, i) => ({ id: `n${i}`, date: new Date(2026, 0, 1), read: false }));
  const chain = { select() { return this; }, sort() { return this; }, limit(n) { requestedLimit = n; return this; }, lean: async () => rows };
  const { getNotifications } = load('controllers/notificationController.js', { Notification: {
    find: filter => { assert.equal(filter.userId, 'alice'); return chain; },
    countDocuments: async filter => { assert.equal(filter.userId, 'alice'); assert.equal(filter.read, false); return 100000; },
  } }, ['getNotifications']);
  const res = response();
  await getNotifications({ query: {}, userId: 'alice' }, res);
  assert.equal(requestedLimit, 26);
  assert.equal(res.data.items.length, 25);
  assert.equal(res.data.unreadCount, 100000);
  assert.equal(JSON.parse(Buffer.from(res.data.nextCursor, 'base64url')).id, 'n24');
});

test('read operations cannot mark another user’s notifications or newer arrivals', async () => {
  let updated = false;
  const { markAsRead, markAllAsRead } = load('controllers/notificationController.js', {
    Notification: {
      findOneAndUpdate: filter => { assert.equal(filter.userId, 'alice'); return { select() { return this; }, lean: async () => null }; },
      updateMany: async filter => { updated = true; assert.equal(filter.userId, 'alice'); assert.equal(filter.read, false); assert.equal(filter.date.$lte.toISOString(), '2026-10-12T00:00:00.000Z'); return { modifiedCount: 50 }; },
    }, publishNotificationEvent: () => {},
  }, ['markAsRead', 'markAllAsRead']);
  const missing = response();
  await markAsRead({ params: { id: 'bob-notification' }, userId: 'alice' }, missing);
  assert.equal(missing.statusCode, 404);
  const invalid = response();
  await markAllAsRead({ body: {}, userId: 'alice' }, invalid);
  assert.equal(invalid.statusCode, 400);
  assert.equal(updated, false);
  const res = response();
  await markAllAsRead({ body: { before: '2026-10-12T00:00:00Z' }, userId: 'alice' }, res);
  assert.equal(res.data.modifiedCount, 50);
});

test('live events stay within the recipient and unsubscribe cleanly', () => {
  const alice = [], bob = [];
  const stopAlice = subscribeNotifications('alice', event => alice.push(event));
  const stopBob = subscribeNotifications('bob', event => bob.push(event));
  publishNotificationEvent('alice', { type: 'notification' });
  assert.equal(alice.length, 1); assert.equal(bob.length, 0);
  stopAlice(); publishNotificationEvent('alice', { type: 'read' });
  assert.equal(alice.length, 1); stopBob();
});

test('SSE parser supports split UTF-8 characters, split CRLF, comments, and malformed events', async () => {
  const bytes = new TextEncoder().encode(': heartbeat\r\n\r\ndata: {"type":"notification","message":"नमस्ते"}\r\n\r\ndata: invalid\n\ndata: {"type":"read"}\n\n');
  const body = new ReadableStream({ start(controller) { for (const byte of bytes) controller.enqueue(new Uint8Array([byte])); controller.close(); } });
  const events = [];
  await consumeNotificationStream(body, event => events.push(event));
  assert.deepEqual(events, [{ type: 'notification', message: 'नमस्ते' }, { type: 'read' }]);
});

test('notification creation persists the email job before push and never sends SMTP inline', async () => {
  const actions = [];
  class Notification { constructor(data) { Object.assign(this, data); } async save() { actions.push('saved'); } }
  const { sendNotification } = load('utils/notificationService.js', {
    Notification, User: { findOne: async () => ({ name: '<User>', email: 'test@example.invalid' }) },
    randomUUID: () => 'test', publishNotificationEvent: () => actions.push('push'),
    nodemailer: { createTransport: () => { throw new Error('SMTP must not run inline'); } },
  }, ['sendNotification']);
  const result = await sendNotification('alice', '<script>bad</script>');
  assert.deepEqual(actions, ['saved', 'push']);
  assert.equal(result.email.status, 'pending');
  assert.match(result.email.html, /&lt;script&gt;/);
  assert.ok(!result.email.html.includes('<script>'));
});

for (const scenario of ['sent', 'retry', 'failed', 'unconfigured']) {
  test(`email worker handles ${scenario} with an atomic claim and lease ownership`, async () => {
    let mutation;
    const attempts = scenario === 'failed' ? 5 : 1;
    const { deliverNextNotificationEmail } = load('utils/notificationEmailWorker.js', {
      Notification: {
        findOneAndUpdate: (query, update) => {
          assert.equal(query.$or[0]['email.status'], 'pending');
          assert.equal(query.$or[1]['email.status'], 'sending');
          assert.equal(update.$inc['email.attempts'], 1);
          return { select() { return this; }, lean: async () => ({ id: 'n1', email: { to: 'test@example.invalid', attempts } }) };
        },
        updateOne: async (query, update) => { assert.equal(query['email.attempts'], attempts); mutation = update; },
      },
      sendEmail: async () => {
        if (scenario === 'retry' || scenario === 'failed') throw Object.assign(new Error('temporary failure'), { code: 'ETIMEDOUT' });
        return scenario === 'unconfigured' ? { skipped: true, reason: 'smtp_not_configured' } : { accepted: ['test@example.invalid'] };
      },
    }, ['deliverNextNotificationEmail']);
    await deliverNextNotificationEmail();
    assert.equal(mutation.$set['email.status'], scenario === 'retry' || scenario === 'unconfigured' ? 'pending' : scenario);
    assert.equal(mutation.$unset['email.lockedUntil'], 1);
    if (scenario === 'unconfigured') assert.equal(mutation.$inc['email.attempts'], -1);
  });
}
