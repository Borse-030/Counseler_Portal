# Counselor deactivation and transfers

The counselor's **Deactivate** action opens a review of all upcoming/admin-pending sessions and cases still assigned to them. Select an active approved replacement per case or apply one replacement to all groups. Case ownership moves with the pending work so later sessions use the replacement. Legacy bookings without a case link are grouped by user.

Dates, times, and online meeting links can be changed before transfer. **Check transfers** validates the replacement's published availability, session mode, leave, existing bookings, the user's other sessions, overlaps within the proposal, and valid Zoom/Google Meet links. **Transfer work and deactivate** repeats validation, transfers pending sessions and active assignments, and then deactivates the source counselor. Patients and replacement counselors receive the existing in-app/email notifications. Transfer and assignment history record who made the change. Completed records, discovery observations, notes, and feedback are preserved.

Running and past sessions still awaiting outcomes must be resolved before deactivation. The review links to these sessions. No available replacement or a schedule conflict prevents continuation. Direct use of the old account-status endpoint also rejects counselor deactivation while pending work remains.

Admin-only endpoints:

- `GET /api/admin/users/:id/deactivation-review`
- `POST /api/admin/users/:id/deactivation-check`
- `POST /api/admin/users/:id/transfer-and-deactivate`

POST requests include the review `version`, `assignments: [{ key, counselorId }]`, and optional `scheduleChanges: [{ id, date, time, meetingLink }]`. A changed review is rejected. A leased source-counselor lock blocks overlapping transfers and normal new scheduling validations; document updates use optimistic concurrency, and pending work is checked again before deactivation. Expired locks can be reclaimed after ten minutes.

Standalone MongoDB does not support rollback across the transfer's documents. On a partial failure, successful transfers remain recorded and the original counselor stays active; refresh the review to finish remaining work. Never retry the original stale review blindly. In-flight bookings approved before the source lock and strict simultaneous reservations still require deployment-level transaction/reservation coordination for absolute cross-document guarantees.

Validation: `node --test tests/counselorDeactivation.test.mjs`. Tests use isolated persistence and notification doubles; they do not deactivate accounts, change live bookings, or send emails.
