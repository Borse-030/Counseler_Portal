# Admin scheduling

In a case drawer, admins can use **Schedule more sessions** even when the user already has bookings. Select a counselor, date, available time, duration, and online meeting link, then use **Add session to list** for each proposal. Up to 12 sessions can be reviewed, edited, or removed before submitting the list. All sessions in one batch use the selected counselor. Queue edits must be updated in the list before submission. Slots that overlap another queued session or an existing user booking are hidden. The backend revalidates every proposal and detects overlaps before writing.

The existing single-session submission also remains available when the list is empty. A package preference remains planning information and does not automatically book dates or impose a booking limit.

Admins can use **Edit next session**, per-session **Edit session** actions in case history, or **Edit session** in Sessions & feedback. The editor supports date, time, duration, mode, and meeting-link changes for future upcoming sessions. It retains the assigned counselor, session notes, outcomes, and feedback. Availability excludes the appointment being edited but checks the user's other bookings. Completed, cancelled, past, or otherwise resolved records cannot be edited through this workflow.

`PUT /api/appointments/:id/schedule` is admin-only. Changes use optimistic concurrency checks and record previous/new schedule details in `scheduleHistory`; saving creates notifications for the user and counselor, including queued email delivery. Existing outcome and missed-session replacement workflows are retained.

The development MongoDB is standalone and does not support transactions. If storage fails during a multi-session save, the API reports persisted appointments alongside the error, and the UI removes those bookings from the queue while retaining remaining proposals. Database outages or a lost HTTP response may still require reloading the case to reconcile saved bookings before retrying. Cross-request conflict checks are not a database reservation lock; deployments needing strict simultaneous-booking guarantees should use a reservation constraint/locking scheme.

Validation: `node --test tests/sessionScheduling.test.mjs` covers permissions, availability, user conflicts, change history, stale edits, batch limits, and partial-save responses without making live bookings.
