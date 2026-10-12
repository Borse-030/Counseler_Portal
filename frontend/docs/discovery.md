# Discovery call details

The admin discovery editor saves observations, a single-session or package choice, a preferred session date and exact time in IST, and one or more counselling clusters with their sub-concerns. Packages require a whole number of at least two sessions. A single-session choice always stores a count of one. For a package, the proposed date/time is the first session preference. All 15 clusters and 45 sub-concerns come from the supplied BJS framework slides. Each cluster can be selected once; multiple sub-concerns can be checked. These categories describe presenting concerns, not diagnoses.

The API accepts `{ notes, discoveryPlan: { sessionType: 'single' | 'package', sessionCount, preferredDate, preferredTime, concerns: [{ clusterCode, subConcerns }] } }` at the existing discovery-notes endpoint. The frontend and backend share validation and taxonomy in `shared/counsellingFramework.mjs`; include that directory when deploying either application. Existing notes-only records continue to load without assuming a session choice, and older API callers preserve any saved package selection and count.

New or changed proposed times must be in the future. An unchanged historical preference is retained when editing notes or classification. Saving preserves the plan both on the case and as a snapshot in discovery history. It completes an accepted/discovery-scheduled case without changing the status of active or matched cases. Only admins can save it.

The proposal is a preference. Scheduling shows it and defaults to the proposed date when that date is current, but still requires choosing a counselor and an available slot before booking.

Run `node --test tests/discoveryPlan.test.mjs` to check classification, IST validation, legacy records, history snapshots, permissions, and state transitions without changing live cases.
