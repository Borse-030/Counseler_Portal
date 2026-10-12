import { Notification } from '../models/index.js';
import { publishNotificationEvent, subscribeNotifications } from '../utils/notificationEvents.js';

const fields = 'id message date read';
export const parseNotificationQuery = (query, userId) => {
  const limit = Math.min(50, Math.max(1, Number.parseInt(query.limit, 10) || 25));
  const filter = { userId };
  if (query.filter && !['all', 'unread'].includes(query.filter)) throw new Error('Invalid filter');
  if (query.filter === 'unread') filter.read = false;
  if (query.cursor) {
    let cursor;
    try { cursor = JSON.parse(Buffer.from(query.cursor, 'base64url').toString()); } catch { throw new Error('Invalid cursor'); }
    if (!cursor || typeof cursor.id !== 'string' || !cursor.id || !cursor.date || !Number.isFinite(Date.parse(cursor.date))) throw new Error('Invalid cursor');
    const date = new Date(cursor.date);
    filter.$or = [{ date: { $lt: date } }, { date, id: { $lt: cursor.id } }];
  }
  return { filter, limit };
};

export const getNotifications = async (req, res) => {
  const snapshotAt = new Date().toISOString();
  let parsed;
  try { parsed = parseNotificationQuery(req.query, req.userId); }
  catch (error) { return res.status(400).json({ message: error.message }); }
  try {
    const { filter, limit } = parsed;
    const [rows, unreadCount] = await Promise.all([
      Notification.find(filter).select(fields).sort({ date: -1, id: -1 }).limit(limit + 1).lean(),
      Notification.countDocuments({ userId: req.userId, read: false }),
    ]);
    const hasMore = rows.length > limit;
    const items = rows.slice(0, limit);
    const last = items.at(-1);
    const nextCursor = hasMore ? Buffer.from(JSON.stringify({ date: last.date, id: last.id })).toString('base64url') : null;
    res.json({ items, unreadCount, nextCursor, snapshotAt });
  } catch { res.status(500).json({ message: 'Could not load notifications.' }); }
};

export const markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { id: req.params.id, userId: req.userId }, { $set: { read: true } }, { returnDocument: 'after' },
    ).select(fields).lean();
    if (!notification) return res.status(404).json({ message: 'Notification not found.' });
    publishNotificationEvent(req.userId, { type: 'read', id: notification.id });
    res.json({ success: true });
  } catch { res.status(500).json({ message: 'Could not mark notification as read.' }); }
};

export const markAllAsRead = async (req, res) => {
  const before = req.body.before;
  if (!before || !Number.isFinite(Date.parse(before))) return res.status(400).json({ message: 'A valid cutoff date is required.' });
  try {
    const result = await Notification.updateMany(
      { userId: req.userId, read: false, date: { $lte: new Date(before) } }, { $set: { read: true } },
    );
    publishNotificationEvent(req.userId, { type: 'read-all' });
    res.json({ success: true, modifiedCount: result.modifiedCount });
  } catch { res.status(500).json({ message: 'Could not mark notifications as read.' }); }
};

export const streamNotifications = (req, res) => {
  res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
  res.flushHeaders();
  const send = (event) => {
    if (res.destroyed || res.writableEnded) return;
    // Disconnect slow clients instead of accumulating an unbounded write buffer.
    if (!res.write(`data: ${JSON.stringify(event)}\n\n`)) res.end();
  };
  const unsubscribe = subscribeNotifications(req.userId, send);
  send({ type: 'connected' });
  // Reconciliation catches missed pushes and writes from another API instance.
  const heartbeat = setInterval(() => send({ type: 'reconcile' }), 30000);
  // Re-authenticate periodically, including suspension and token expiration.
  const expiry = setTimeout(() => res.end(), 5 * 60 * 1000);
  res.on('close', () => { unsubscribe(); clearInterval(heartbeat); clearTimeout(expiry); });
};
