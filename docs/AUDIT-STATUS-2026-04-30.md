# RoofingCRM Audit Status

Date: 2026-05-04

Primary app decision: `RoofingCRM` is the main app.

## Reality check summary

The live repo is a **local-first React + TypeScript + Vite app** with:
- Electron desktop runtime
- Capacitor Android target
- desktop/native SQLite persistence paths
- localStorage fallback

It is **not** the backend architecture described by the imported `CRM-Notes-2026-04-29` spec files.

Spec-only or overclaimed items in the imported notes include:
- Express backend
- tRPC routers/procedures
- Drizzle/MySQL schema + migrations
- S3 uploads
- Stripe/Twilio/SendGrid integrations
- broad "comprehensive" test coverage claims

## Verified on 2026-05-04

- `npm run test` passes
- `npm run build` passes
- `npm run lint` passes
- `npm run desktop:dev` launches successfully
- Electron attaches to the local Vite dev server successfully

## Actually implemented in the live app

- Customers
- Inspect
- Jobs
- Estimates
- Invoices
- Tasks
- Calendar
- Crews
- Damages
- Settings
- local persistence + backup import/export
- desktop PDF export
- desktop material scraper wiring

## Still open (highest impact)

1. Manual runtime QA in desktop shell:
   - click through full customer -> inspection -> estimate -> invoice -> task flow
   - confirm persistence after restart
   - confirm backup creation/import behavior
   - confirm real PDF export from UI actions
   - confirm scraper refresh changes estimate math as expected
2. Android runtime checks:
   - camera/gallery behavior
   - mobile workflow usability
3. Checklist cleanup:
   - separate real implementation from spec/reference notes in `CRM-Notes-2026-04-29`

## Notes

- Treat `CRM-Notes-2026-04-29` as a spec/reference donor folder, not as proof of implementation.
- `NEXT-STEPS.md` remains the better in-repo execution list for the actual app.
