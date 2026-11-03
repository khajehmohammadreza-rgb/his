# Bastiyan HIS R86 — Clinical Care Path (staging specification)

> **Do not deploy to production.** The repository default branch is documented as not matching the live R85/Chabokan application. This feature branch is a safe design and QA handoff, not an installed HIS release.

## Purpose
One center-scoped patient encounter, one authoritative state machine and one persistent billing ledger from first registration to final discharge.

## Required path
1. Search by stable identity; register new patient once; enqueue a single welcome SMS for the first registration (a queued message is not delivered).
2. Block duplicate open encounters for the same patient and center; route “continue” to the actual stage.
3. Add services/goods from the R85 shared catalog, with quick creation only for authorized roles. Price is calculated/snapshotted server-side. Goods require an atomic stock movement.
4. Route visit lines to **active doctor-role accounts**; route direct outpatient services to **active nurse-role accounts**; simple or zero-charge encounters may go to discharge.
5. Doctor may add services, record prescription/lab/imaging tracking codes, schedule future procedures and specify configurable pre-op checklists. Prescription and same-day surgery can coexist.
6. Current-day surgical cases normally move to the assigned nurse. Exceptional service routing must be explicitly configured by a manager, not inferred from a name.
7. Future appointments are separate from today's encounter. Render dates in Jalali but persist unambiguous ISO instants; reject overlapping doctor and operating-room intervals atomically.
8. Nurse confirms procedure, logs services and scanned consumables, checks appropriate consent template, signed form and pre-operative checklist; then moves patient to discharge.
9. Store versioned consent documents (template version, document hash, signature/witness record). An optional SMS OTP is supplementary evidence, not a substitute for informed consent. Keep SMS status, expiry and attempts server-side.
10. Cashier reviews all invoice lines, insurance shares, advance receipts, authorized discounts, credit and verified POS receipts. **Zero invoice must discharge without a synthetic payment.**
11. Final invoice is an immutable snapshot. Void/refund/discount adjustments create audited records, never silent rewrites.
12. Keep unfinished encounter alerts visible to reception and stage-owner panels.

## Non-negotiable technical controls
- No client-only “save succeeded” indications; server acknowledgement required.
- Transactions/idempotency: one request ID per write, matching payload on retries.
- Stock deduction and patient charge commit together; rollback together.
- One active encounter per patient/center; do not auto-close old medical encounters.
- Conflict-free appointment reservation via database lock and overlap check; simple unique start time is insufficient.
- Only server-verified PSP result can confirm card settlement; uncertain payments must not auto-retry.
- Consent and SMS content must avoid leaking sensitive medical details.
- Every state transition authorized by center, role and assigned clinician; all changes auditable.

## Local staging verification (not production evidence)
A separate, locally generated R86 reference prototype passed **40 deterministic domain assertions** in Node.js 22: role gates, repeat prevention, combined doctor paths, no double booking, zero discharge, stock, consent, billing and payment proof. The browser UI could not be tested in this environment because a local browser navigation was blocked by administrator policy.

## Required integration
Rebase onto the **actual, currently deployed** R85+ source snapshot before integration. Build server-side transaction handlers; implement Kavenegar delivery/OTP, Chabokan storage migrations, FIN/POS reconciliation and real role-based E2E tests (especially the user “دشتی”). No production migration or patient data mutation has been performed.

## Standards
- HL7 FHIR R5 Appointment: https://hl7.org/fhir/R5/appointment.html
- WHO Surgical Safety Checklist: https://www.who.int/teams/integrated-health-services/quality-of-care-and-patient-safety/patient-safety-guidance-and-tools/safe-surgery/tool-and-resources
