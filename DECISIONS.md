# RoofingCRM Decisions

Date: 2026-04-29

## Product direction

1. Local-first and single-user remains the official v1 direction.
2. Material pricing remains desktop-first for scraper refresh; Android continues to use saved pricing values from app data.
3. Target user remains owner-operator/small staff workflow, not a full multi-office platform.

## Workflow decisions

1. Multiple scraped shingle products map to one editable `mat-shingles` slot for now.
2. Task workflow includes create/edit/status/checklist with sorting, and is considered sufficient for this phase.
3. Invoice PDF export is in scope and implemented for desktop workflows.

## Technical decisions

1. Labour pricing stays on a single shared default constant (`DEFAULT_LABOUR_RATE_PER_SQ`) until field validation data justifies moving it to Settings.
2. Roof planes remain stored with inspection data; first-class roof-plane editing UI is deferred.
3. Storage/test strategy now includes smoke-level coverage for:
   - invoice reconciliation
   - roof math calculations
   - estimate line-item generation
   - app-data normalization
