# RoofingCRM WORKLOG

Use this as the in-repo handoff note.
Keep it short and current.

## Update template
- Date:
- What changed:
- Current state:
- Blockers:
- Next resume step:

---

## 2026-05-09
- What changed: Added a `Locations` workspace route that maps customer/job/appointment addresses, shows an embedded map preview for the selected stop, lists active route stops, and opens Google Maps search or route directions without adding a backend/API dependency. Registered the route in desktop/mobile navigation and the workflow strip, and added small map/route helpers in `lib.ts`. Follow-up fix: Crew Mode now syncs the visible crew job into the app-level selected job before progress-photo capture so uploads attach to the displayed job/customer.
- Current state: `npm run lint`, `npm run test`, and `npm run build` pass. The app remains local-first and uses existing customer, job, appointment, and crew records for location context.
- Blockers: Manual desktop QA is still needed for real map embed behavior, external map opening from Electron, full click-through, persistence after restart, PDF export, scraper refresh propagation, and Android camera/gallery behavior. In this Codex session, Browser Use failed with a local `EPERM` startup error under `AppData`, and Playwright failed to launch Chrome with `EACCES`, so browser-driven QA could not be completed here.
- Next resume step: Launch the desktop app and run the manual workflow verification, including the new Locations route and Crew Mode at a mobile-sized viewport.

---

## 2026-05-06
- What changed: Continued the controlled merge from `rooftop-renovators-crm` into the local-first `RoofingCRM` app. Added a dedicated `Photos` workspace route that reuses inspection-stored photos as the project/customer gallery, supports camera/gallery upload, shows category coverage, surfaces damage-link status, and removes stale damage photo links when a photo is deleted. Added a damage-material-to-estimate path so Estimates can build line items from logged damage material allocations, alongside the existing measurement-based estimator. Added `Crew Mode`, a field-focused route adapted from the donor `CrewApp`, with crew selection, assigned job cards, customer call/email/map actions, job packet details, damages, tasks, photos, and progress-photo capture through the existing local photo pipeline. Added inspection roof templates and a lightweight complexity label for faster estimate setup.
- Current state: `npm run test`, `npm run build`, and `npm run lint` pass. The merge remains local-first; no tRPC/Drizzle/MySQL/S3 donor architecture was imported.
- Blockers: Manual desktop QA is still needed for real photo upload/camera behavior, PDF export, persistence after restart, backup creation/import, scraper refresh propagation, and Android camera/gallery behavior.
- Next resume step: Continue donor import with a basic map/location view, then run a desktop click-through to catch runtime-only issues.

## 2026-05-04
- What changed: Ran a repo reality-check against the new `CRM-Notes-2026-04-29` spec folder, verified the live app architecture, and confirmed the current app is a local-first React/Vite + Electron/Capacitor build, not the tRPC/Drizzle/MySQL/S3 stack described by the imported notes. Verified `npm run test`, `npm run build`, and `npm run lint` all pass. Launched the live desktop app successfully with `npm run desktop:dev` and confirmed Electron attached to the Vite dev server.
- Current state: The real app has working Customers, Inspect, Jobs, Estimates, Invoices, Tasks, Calendar, Crews, Damages, Settings, local persistence, JSON backup/import, desktop PDF export, and desktop scraper wiring. The imported markdown docs still overclaim backend/API/integration work that does not exist in this repo.
- Blockers: Manual click-through QA is still open for persistence after restart, backup verification, PDF export through real UI actions, scraper-to-estimate propagation, and Android camera/gallery behavior. The imported CRM note checklists need cleanup because they currently mix real implementation with aspirational/spec-only items.
- Next resume step: Convert the stale imported checklist into a truth-based implementation status file, then continue knocking out runtime verification and high-confidence UI/product tasks from `NEXT-STEPS.md`.

## 2026-04-30
- What changed: Executed the next-step workflow pass focused on customer/invoice consistency. Added lead-status transition guardrails and workflow validation in `Customers` (blocked invalid jumps, recommended status prompts, and consistency callout). Implemented invoice history tracking in app state (`invoiceHistory`) and surfaced it in the invoice detail panel. Added stronger overdue handling via auto-reconciliation to overdue status plus a reminders queue and reminder action from billing. Applied a customer-facing invoice PDF style refresh for cleaner output. Updated normalization/import wiring for the new history field and expanded smoke tests for lead transition and overdue behavior.
- Current state: `npm run test`, `npm run build`, and `npm run lint` pass after changes. NEXT-STEPS now marks lead-transition confirmation, invoice history, overdue reminders, and invoice PDF polish as completed.
- Blockers: Manual desktop runtime verification items remain open (full click-through, restart persistence verification, backup checks, scraper-to-estimate propagation, and Android camera/gallery behavior).
- Next resume step: Run desktop manual QA checklist in Electron shell and close any runtime-only items left in `NEXT-STEPS.md`.

## 2026-04-29
- What changed: Implemented invoice PDF export using the existing desktop PDF bridge and a new invoice HTML template, including a browser-print fallback. Added stronger invoice safety/validation in the billing flow (non-negative amount guards and delete confirmation). Expanded Tasks into a fuller workflow with inline task editing plus sortable board views (due date, priority, status, updated). Improved scraper failure handling end-to-end by returning structured scraper process failures from Electron and surfacing clearer UI messages in Settings. Added visible scrape history in Settings, including logged price snapshots from scraper refreshes. Added customer-flow UX guidance for lead-to-job conversion and stronger empty-state messaging for first-time users. Added smoke-level test coverage with Vitest for invoice reconciliation, roof math, estimate line-item generation, and app-data normalization. Added `DECISIONS.md` and README updates for Electron packaging and Android signing/release notes. Started secondary-to-main import from `rooftop-renovators-crm` by adding first-class `crews` and `appointments` domains into RoofingCRM data model, persistence, backup import, and UI with new `Crews` and `Calendar` sections.
- Current state: Most non-manual NEXT-STEPS items are now completed and documented, including pricing behavior decisions, scrape history visibility, numeric input hardening, and smoke tests. RoofingCRM now includes foundational crew/scheduling capabilities pulled from the secondary app while staying local-first. `npm run lint`, `npm run build`, and `npm run test` pass in the current workspace.
- Blockers: Manual runtime verification in the Electron shell is still pending for the full customer -> inspection -> estimate -> invoice -> tasks journey, plus persistence/backups/scraper/PDF validation on live desktop clicks. Android camera/gallery behavior still requires device verification. Additional secondary-app domains (damages/photos/material allocations/map routing) still need staged import.
- Next resume step: Continue secondary-to-main import with damages + photo linking + material allocation flows, then run full manual desktop QA and Android runtime checks.

## 2026-04-24
- What changed: Replaced the placeholder README with a real project document covering purpose, architecture, workflow, scripts, storage, desktop/Android behavior, limitations, and current status. Added `NEXT-STEPS.md` as the concrete cleanup/corrections list. Wired desktop material scraping further into the app so the Settings screen can trigger a scrape and pull latest scraped prices back into the editable material price table. Added desktop IPC and type updates for fetching latest scraped material prices.
- Current state: RoofingCRM is a solid local-first functional prototype with working screens for customers, inspections, jobs, estimates, invoices, tasks, and settings. Desktop mode now has SQLite-backed app state, automatic JSON backups, PDF export for estimates, and a UI path for refreshing material prices from the scraper. Repo continuity is better now because README and next-step notes are finally explicit.
- Blockers: Runtime/manual verification is still needed for the full Electron workflow, especially scraper execution, PDF export, persistence, and whether scraped prices behave well in the live UI. Build/test verification from this session was limited by command execution restrictions in the assistant runtime.
- Next resume step: Launch the desktop app, click through the full workflow, validate the scraper-backed material refresh feature, then start knocking items out of `NEXT-STEPS.md` in priority order.
- Additional cleanup in this session: Swapped repeated local `uid()` helpers in section components over to the shared utility, added delete confirmations for customers, jobs, and tasks, and hardened JSON backup import so malformed or wrongly shaped root values fall back more safely instead of being trusted blindly.
- Material pricing UX pass: made scraper-managed vs manual pricing clearer in `Settings.tsx`, added per-row status/source/timestamp cues, added overwrite confirmation before scraper refresh replaces manual mapped prices, and mark hand-edited scraped rows as `Manual override` so the UI does not misrepresent them.
- Continuing update: Verified `npm run build` and `npm run lint` both pass in the current workspace. Tightened the Settings material pricing table so it uses a dedicated four-column layout instead of the estimate table grid, and added visible per-row source/timestamp metadata so scraped pricing provenance is clearer in the UI.

## 2026-03-30
- What changed: Cleaned up edit-state handling in `Customers.tsx` and `Jobs.tsx` so lint passes without effect-driven state resets. Replaced the stray `src/api/material-prices.ts` Express stub with a documentation/status module that matches the real app architecture (Electron/Capacitor + SQLite, no live Express backend).
- Current state: `npm run build` passes. Frontend sections are wired for lead -> inspection -> estimate -> invoice flow, desktop storage uses Electron + native SQLite with automatic JSON backups, and material scraping is exposed through desktop IPC. A load-time normalization safeguard now heals older persisted data that is missing the primary seeded inspection record for the default customer.
- Blockers: App still needs runtime/manual UX verification in the desktop shell for flows like PDF export, scraper execution, and data persistence. There is no standalone server backend in the current codebase, so any future API/server work needs deliberate architecture decisions.
- Next resume step: Run the desktop app, click through the full workflow, fix any runtime/UI bugs that appear, and decide whether material pricing should stay desktop-only or be promoted to a real shared backend/API.

## 2026-03-28
- What changed: Created `WORKLOG.md` for in-project continuity and seeded it from reconstructed 2026-03-27 app activity.
- Current state: Recent RoofingCRM work appears to include desktop/Electron storage bridge updates, material pricing/scraper integration, Roof Math cost/pricing work, invoice/settings changes, and dashboard/customers/jobs/app shell styling updates. Build output was regenerated on 2026-03-27 around 10:14 PM.
- Blockers: No exact end-of-day note exists for 2026-03-27 yet, so intent and unfinished items are partly inferred from file timestamps/code only.
- Next resume step: Review the touched files from 2026-03-27, confirm intended features/unfinished work, then replace this inferred summary with a precise feature-by-feature note.
