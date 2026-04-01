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

## 2026-03-30
- What changed: Cleaned up edit-state handling in `Customers.tsx` and `Jobs.tsx` so lint passes without effect-driven state resets. Replaced the stray `src/api/material-prices.ts` Express stub with a documentation/status module that matches the real app architecture (Electron/Capacitor + SQLite, no live Express backend).
- Current state: `npm run build` passes. Frontend sections are wired for lead → inspection → estimate → invoice flow, desktop storage uses Electron + native SQLite with automatic JSON backups, and material scraping is exposed through desktop IPC. A load-time normalization safeguard now heals older persisted data that is missing the primary seeded inspection record for the default customer.
- Blockers: App still needs runtime/manual UX verification in the desktop shell for flows like PDF export, scraper execution, and data persistence. There is no standalone server backend in the current codebase, so any future API/server work needs deliberate architecture decisions.
- Next resume step: Run the desktop app, click through the full workflow, fix any runtime/UI bugs that appear, and decide whether material pricing should stay desktop-only or be promoted to a real shared backend/API.

## 2026-03-28
- What changed: Created `WORKLOG.md` for in-project continuity and seeded it from reconstructed 2026-03-27 app activity.
- Current state: Recent RoofingCRM work appears to include desktop/Electron storage bridge updates, material pricing/scraper integration, Roof Math cost/pricing work, invoice/settings changes, and dashboard/customers/jobs/app shell styling updates. Build output was regenerated on 2026-03-27 around 10:14 PM.
- Blockers: No exact end-of-day note exists for 2026-03-27 yet, so intent and unfinished items are partly inferred from file timestamps/code only.
- Next resume step: Review the touched files from 2026-03-27, confirm intended features/unfinished work, then replace this inferred summary with a precise feature-by-feature note.
