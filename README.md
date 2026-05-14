# RoofingCRM

Single-user roofing CRM for desktop and Android.

RoofingCRM is a practical field-to-office app for small roofing operations. It tracks leads, inspections, jobs, estimates, invoices, tasks, and material pricing in one local-first app, with a desktop build powered by Electron and a mobile build powered by Capacitor.

## TL;DR

- Built with React, TypeScript, and Vite
- Runs as a desktop app through Electron
- Targets Android through Capacitor
- Stores app data locally, prefers SQLite when available
- Covers the workflow: customer -> inspection -> project -> estimate -> invoice -> tasks
- Includes crew management, scheduling, and structured damage tracking
- Supports desktop PDF export for estimates and invoices
- Supports desktop material-price scraping into SQLite
- Still in strong prototype / early product stage, not finished production software

## What the app does

RoofingCRM is designed around the actual flow of a roofing job.

### 1. Customers
- Create and edit homeowner/customer records
- Track address, phone, email, notes, lead source, and lead status
- Keep the active workspace focused on one customer at a time

### 2. Inspections
- Record roof type, age, pitch, stories, urgency, and damage type
- Enter field notes and recommendations
- Capture roof measurements such as:
  - base plan squares
  - ridge length
  - valley length
  - eaves length
  - rake length
  - waste factor
- Upload and compress field photos before saving
- Store saved inspections per customer

### 3. Roof math
- Converts plan measurements into estimating quantities
- Applies pitch factor and waste
- Estimates quantities for common roofing materials like:
  - shingles
  - starter
  - ridge cap
  - underlayment
  - ice and water shield
  - drip edge
  - ridge vent
- Produces a live material total from the current pricing table

### 4. Jobs / projects
- Create job records tied to a customer
- Track status, priority, scheduled date, and job notes
- Show connected inspection, estimate, invoice, and customer info in one place

### 5. Estimates
- Build proposal line items manually or generate a first pass from roof measurements
- Track material, labour, overhead, markup, tax, and deposit
- Set scope of work, warranty, and timeline
- Preview the proposal in-app
- Export estimate PDFs from the desktop build

### 6. Invoices
- Create invoices against jobs
- Pull invoice values from the related estimate
- Create deposit invoices
- Track amount received, balance due, and invoice status
- Export invoice PDFs from the desktop build
- Record payments and update billing state

### 7. Tasks
- Create customer- or job-scoped follow-up tasks
- Track due dates, assignees, priorities, and status
- Include small checklists for common office/crew follow-up work

### 8. Calendar and scheduling
- Create and manage appointments for inspections, estimates, consultations, and job starts
- Link appointments to customers and projects
- Track appointment status (scheduled/completed/cancelled/no-show)

### 9. Crews
- Create and manage crew records
- Track crew leads, contact info, status, and notes
- Assign crews to project records

### 10. Damages
- Create structured damage records scoped to customer/project
- Track category, severity, location, and estimated cost
- Link damage records to inspection photos
- Allocate expected materials per damage item

### 11. Settings and data safety
- Edit company profile used in proposals and exports
- Adjust manual material pricing
- Export JSON backups
- Import JSON backups
- View storage metadata in desktop mode
- Refresh material prices from the desktop scraper

## Current architecture

### Frontend
- React 19
- TypeScript
- Vite

### Desktop runtime
- Electron
- Electron preload bridge for safe IPC calls
- Desktop-only features include:
  - SQLite-backed local persistence
  - automatic JSON backups
  - estimate/invoice PDF export
  - material scraping trigger and retrieval

### Android runtime
- Capacitor
- Native SQLite support through `@capacitor-community/sqlite`

### Storage model
RoofingCRM is local-first.

Depending on runtime, it stores data in one of these modes:

1. **Desktop bridge -> SQLite**
   - Electron stores the full serialized app state in a local SQLite file
   - JSON backups are written automatically on save
2. **Capacitor native -> SQLite**
   - On supported native runtimes, the app uses Capacitor SQLite
3. **Browser fallback -> localStorage**
   - If native persistence is unavailable, the app falls back to browser storage

### Data model
The app stores a single `AppData` object containing:
- company profile
- customers
- jobs
- estimates
- invoices
- inspections
- material prices
- tasks
- crews
- appointments
- damages

This is intentionally simple right now. There is no multi-user backend, auth system, or sync server in the current codebase.

## Project structure

```text
RoofingCRM/
├─ src/
│  ├─ sections/        # Main workflow screens
│  ├─ components/      # Shared UI components like RoofMathPanel
│  ├─ data.ts          # Seed/demo data
│  ├─ lib.ts           # Shared helpers, roof math, PDF HTML generation
│  ├─ storage.ts       # Persistence logic
│  ├─ types.ts         # App types
│  └─ App.tsx          # Main shell and state orchestration
├─ electron/
│  ├─ main.cjs         # Desktop app main process
│  └─ preload.cjs      # Safe desktop bridge
├─ scripts/
│  ├─ android-debug.cmd
│  ├─ android-release.cmd
│  └─ scrape-prices.js # Desktop price scraper
├─ android/            # Capacitor Android project
├─ README.md
└─ worklog.MD
```

## Main workflow screens

### Dashboard
Acts as the operator workspace.

It shows:
- current customer and current job
- next action guidance
- open jobs
- outstanding balance
- open tasks
- recent activity
- shortcuts into the rest of the workflow

### Customers
Use this for lead intake and customer management.

Key features:
- add/edit/delete customers
- quick contact and address actions
- summary of jobs, estimates, invoices, and inspections for the selected customer

### Inspect
Use this during or after a field inspection.

Key features:
- customer selection
- roof detail capture
- base plan calculator
- roof measurement entry
- inspection notes and flags
- photo upload/capture
- live Roof Math panel

### Jobs
Use this to track project execution.

Key features:
- project creation and editing
- filtering by selected customer
- summary view of the selected project
- links to estimate, billing, and inspection state

### Estimates
Use this to turn measurements into a real proposal.

Key features:
- proposal pricing controls
- measurement-based line item generation
- proposal preview
- desktop PDF export

### Invoices
Use this to convert approved work into money tracking.

Key features:
- invoice creation
- deposit invoice support
- payment recording
- invoice status management
- money summary view

### Tasks
Use this for follow-ups and operational loose ends.

Key features:
- customer/project scoped tasks
- checklists
- simple kanban-style status control through task buttons

### Calendar
Use this to schedule inspections, estimates, consultations, and job starts.

Key features:
- appointment creation and editing
- customer/project-linked scheduling
- appointment status tracking

### Crews
Use this to manage roofing crews and assignment readiness.

Key features:
- crew roster management
- crew status and contact details
- project crew assignment support

### Damages
Use this to log structured roof damage findings and repair requirements.

Key features:
- categorized/severity-based damage records
- material allocation per damage item
- linked inspection photo references

### Settings
Use this for company info, data safety, and pricing control.

Key features:
- company profile editing
- backup import/export
- storage metadata
- material price table
- desktop price scraper refresh button

## Development scripts

### Install dependencies
```bash
npm install
```

### Run the web dev server
```bash
npm run dev
```

### Run desktop-oriented dev server
```bash
npm run dev:desktop
```

### Attach Electron to the desktop dev server
```bash
npm run desktop:attach
```

### Run desktop dev mode end-to-end
```bash
npm run desktop:dev
```

This starts the Vite dev server on `127.0.0.1:4173` and then launches Electron attached to it.

### Build the web app
```bash
npm run build
```

### Build the Windows desktop installer
```bash
npm run desktop:build
```

### Run smoke tests
```bash
npm run test
```

### Android debug build
```bash
npm run android:debug
```

### Android release build
```bash
npm run android:release
```

## Desktop-specific behavior

### SQLite app state
Desktop mode stores the full serialized app state in a SQLite file.

The main process maintains:
- an `app_state` table for the current serialized app payload
- a `material_prices` table for scraped material data

### Automatic JSON backups
Every desktop save also writes a JSON backup file and keeps a rolling backup history.

### PDF export
Estimate and invoice PDFs are generated on desktop by rendering HTML to a hidden Electron window and printing to PDF.

### Material scraping
The desktop main process can run `scripts/scrape-prices.js`.

That scraper:
- uses Puppeteer
- scrapes selected product pricing from Home Depot search/product pages
- writes results to the desktop SQLite database
- can now be triggered from the Settings screen
- logs visible scrape history entries in Settings
- currently maps multiple shingle scrape products into one editable shingles slot (`mat-shingles`) for pricing simplicity

## Electron packaging notes

1. Confirm production build passes:
   - `npm run lint`
   - `npm run build`
2. Build installer:
   - `npm run desktop:build`
3. Output location:
   - `release/` (NSIS installer artifacts)
4. Current signing behavior:
   - Windows code signing is currently disabled in `package.json` build config (`signAndEditExecutable: false`, `verifyUpdateCodeSignature: false`)
5. Before external distribution:
   - add a real code-signing certificate flow
   - set version/release notes discipline
   - run clean install + upgrade path tests on a non-dev machine

## Android notes

The Android build scripts:
- try to use Android Studio's bundled JBR if `JAVA_HOME` is not already set
- stop Gradle daemons first
- clear previous build folders
- run `assembleDebug` or `assembleRelease`

Android currently shares the same general app flow as desktop, but desktop still has a few extra conveniences like PDF export and the scraper bridge.

### Android signing/release notes

1. Generate or provide keystore:
   - `keytool -genkeypair -v -keystore roofingcrm-release.keystore -alias roofingcrm -keyalg RSA -keysize 2048 -validity 10000`
2. Configure Gradle signing secrets in `android/gradle.properties` (do not commit real secrets):
   - `MYAPP_UPLOAD_STORE_FILE=...`
   - `MYAPP_UPLOAD_KEY_ALIAS=...`
   - `MYAPP_UPLOAD_STORE_PASSWORD=...`
   - `MYAPP_UPLOAD_KEY_PASSWORD=...`
3. Wire signing config in `android/app/build.gradle` release block.
4. Build release artifacts:
   - `npm run android:release`
5. Validate release output:
   - install on physical device
   - verify local persistence and backup/import behavior
   - verify camera/gallery flow in inspection
6. If publishing:
   - produce AAB/APK as required by store
   - run Play Console pre-launch report before rollout

## Seed data and first-run behavior

The app ships with seed/demo data so the workflow is visible immediately.

Seed content includes:
- example customers
- example jobs
- example estimates
- an example invoice
- an example inspection
- example tasks
- example material prices

There is also a normalization safeguard during load so older saved data missing the primary seeded inspection can be healed automatically.

## Known limitations

This is the honest part.

### Product limitations
- Single-user app, not multi-user
- No accounts, auth, or permissions
- No cloud sync
- No shared backend/API
- No messaging/email history inside the app
- No supplier ordering workflow
- No production-grade reporting yet

### Technical limitations
- State is largely managed at the top app-shell level, so the app is still fairly monolithic
- Test coverage is currently smoke-level only (not full UI/integration coverage)
- Some pricing/material assumptions are still hardcoded
- Scraped material data is only lightly normalized into the app's editable price table
- Manual runtime verification is still needed for some flows

## Current status

The project is beyond "empty prototype".

It already has:
- a coherent workflow shell
- durable local persistence
- desktop packaging path
- Android build path
- proposal and billing workflows
- pricing and roof math integration

But it is not done.

A fair description today is:

> strong functional prototype with real workflow value, still needing cleanup, validation, and refinement before it feels production-ready.

## Suggested next priorities

1. Runtime verification of the full desktop flow
2. Better documentation of setup and packaging
3. Material pricing cleanup and scrape/history UX
4. Stronger export/reporting flow
5. Refactoring and tests for critical logic

## Notes for future contributors

If you are resuming work later:
- read `worklog.MD` first
- read `DECISIONS.md` for current product/technical decisions
- check the desktop storage path and backup metadata in Settings
- verify that estimate export and material scraping still work in Electron
- treat the current codebase as local-first and client-heavy unless you intentionally choose a backend architecture

## License / ownership

No explicit license file is included in this repo right now.
Add one if this project is going to be shared or published.
