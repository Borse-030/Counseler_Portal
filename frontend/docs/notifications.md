# Notifications

The bell opens a responsive inbox with All/Unread filters, 25-item cursor pages, unread totals, individual read actions, and a mark-all-read action. Only the current page is held in memory. Mark-all uses the last page request's timestamp so later arrivals remain unread.

Authenticated `GET /api/notifications/stream` uses fetch-based server-sent events. Tokens stay in the Authorization header. New notifications and read changes refresh the current page, with bursts coalesced into one request. Reconnects and 30-second reconciliation recover missed events. While the stream is disconnected, visible tabs fall back to a bounded page request every 30 seconds. Streams close every five minutes to recheck the session and suspension state. Slow clients disconnect instead of accumulating buffers. Reverse proxies must disable buffering for this endpoint and allow long-lived responses.

`GET /api/notifications?limit=25&filter=all&cursor=...` returns `{ items, unreadCount, nextCursor, snapshotAt }`. The limit is capped at 50. Ordering uses date and ID, with compound indexes for normal and unread pages. `PUT /api/notifications/:id/read` and `PUT /api/notifications/read-all` are scoped to the signed-in user. The latter requires `{ before: snapshotAt }`.

Email jobs are stored inside each new notification in the same database write. Existing notifications are not emailed retroactively. The worker starts with the backend and atomically leases jobs, reclaims expired leases, retries with exponential backoff, and stops retrying after five delivery failures. Email fields are excluded from inbox responses. SMTP configuration failures remain queued without exhausting attempts. Notification creation does not wait for SMTP.

Configure these variables in `backend/.env`, then restart the backend:

```dotenv
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_ENCRYPTION=starttls
MAIL_USERNAME=your-smtp-user
MAIL_PASSWORD=your-smtp-password
MAIL_FROM_ADDRESS=notifications@example.com
MAIL_FROM_NAME=BJS Counselling
```

For implicit TLS use port 465 and `SMTP_ENCRYPTION=ssl`. Delivery uses pooled connections with timeouts. Email includes the notification message and an escaped HTML template. No live emails are sent by the tests.

Operational limits: SMTP is at-least-once delivery; a crash after acceptance but before recording success can duplicate an email. Inspect `email.status: failed` records when delivery exhausts retries, fix the provider issue, and explicitly requeue them by setting status to pending, attempts to zero, and nextAttemptAt to the current date. Ensure the declared MongoDB indexes are created by your deployment process if automatic indexing is disabled.

Immediate push is scoped to one API process. Multiple API instances recover updates through reconciliation within 30 seconds; add a shared pub/sub broker for immediate cross-instance push. The worker's database leases support multiple instances. Very high volumes should use a dedicated email worker and an email provider with the required rate allowance.

Validation: `node --test tests/notifications.test.mjs`, plus the existing frontend/backend tests and `npm run build`.
