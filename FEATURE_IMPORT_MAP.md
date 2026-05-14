# Feature Import Map: RoofingCRM vs Rooftop Renovators Donor App
**Date:** 2026-05-06
**Goal:** Systematically compare features from the `rooftop-renovators-crm` (Donor) app against the live, local-first architecture of `RoofingCRM` (Source of Truth).
**Principle:** Only import concepts/patterns that fit the existing stack. Never adopt speculative backend patterns (tRPC, Express, S3, etc.).

---

## 🛠️ Legend
*   ✅ **KEEP:** Already exists in `RoofingCRM`. No action needed unless improvement is required.
*   💡 **ADAPT:** Concept is good but requires modification to fit the local-first architecture of `RoofingCRM` (e.g., change API endpoint, update component logic). This is our primary target for merging.
*   🗑️ **IGNORE:** Pattern or feature assumed in the donor app that conflicts with core principles, is too complex/speculative, or doesn't add value to the current scope.

---

## 🧭 Feature Categories & Status

### 1. Core Business Flows (Must Match)
*   **Customer Management:** (Contact details, addresses, job history). *Status: ✅ KEEP.*
*   **Job/Estimate Generation:** Flow from inspection $\rightarrow$ estimate creation $\rightarrow$ invoice. *Status: ✅ KEEP.*
*   **Task Tracking/Scheduling:** Linking tasks to crews and locations. *Status: ✅ KEEP.*
*   **Invoicing/Payments:** Generating, tracking status. *Status: ✅ KEEP.*

### 2. Data & Architecture Patterns (Critical Check)
*   **Data Model:** Must remain local-first / relational within the app context.
    *   Donor App Concept: [List speculative concepts here] $\rightarrow$ **Action:** Determine which data points can be cleanly modeled in `src/data.ts` or persisted locally without an external backend dependency.
*   **API Interaction:** All interaction must simulate a single-app state manager, not client-server calls.

### 3. Specific Donor App Features (To Be Reviewed)

| Feature Area | Description / Assumption (from donor app) | Compatibility Check | Status | Notes / Next Action |
| :--- | :--- | :--- | :--- | :--- |
| **Damage Capture** | Detailed photo/damage logging, structured reports. | Use inspection-stored compressed data URLs; avoid external image hosting for v1. | ✅ KEEP / 💡 ADAPT | Dedicated `Photos` route added. Damages can link inspection photos, and photo deletion now clears stale damage links. Next: richer before/after comparison or report output. |
| **Materials Pricing** | Dynamic pricing feeds/catalogs. | Keep local material price table plus desktop scraper refresh; no central pricing service. | ✅ KEEP / 💡 ADAPT | Damage material allocations now aggregate into estimate line items. Next: richer material catalog categories if needed. |
| **Crew Mobile App** | Mobile-first crew job list, job detail, customer contact, damages, photos. | Reuse local crews/jobs/tasks/photos; no auth-scoped crew endpoint for v1. | ✅ KEEP / 💡 ADAPT | `Crew Mode` route added with crew picker, assigned jobs, field packet, contact/map actions, tasks, damages, photos, and progress photo capture. |
| **Roof Specifications** | Templates, pitch/feature-driven estimating, complexity guidance. | Reuse current inspection measurements and Roof Math instead of adding donor DB tables. | ✅ KEEP / 💡 ADAPT | Inspection now has quick roof templates and a lightweight complexity label. |
| **Calendar View** | Advanced resource scheduling/overlap detection. | Is the logic compatible with our current Crew model? | TBD | Compare logic against `src/sections/Calendar.tsx` and `src/sections/Crews.tsx`. (Focus on time-slot management.) |
| **Reporting** | Complex, multi-format reporting beyond PDF export. | What is the absolute minimum needed? Can we fake advanced reports with local data aggregation first? | TBD | Focus on enhancing current PDF capabilities rather than building a new report engine. |

---
***Remember: This map guides our selective import process. No feature is considered merged until it has been placed into code and verified by running tests/building the app.***
