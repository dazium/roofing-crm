# Munro & Sons Roofing CRM — Subcontractor Implementation Status

This file tracks implementation against the subcontractor-centric operations scope approved on 2026-08-16.

## Phase 1 — Foundation

- [x] Define subcontractor/partner account type.
- [x] Define subcontractor company/account record.
- [x] Define multiple company contacts and contact roles.
- [x] Define reusable job-site record.
- [x] Define work-order record.
- [x] Define subcontract work-order status lifecycle.
- [x] Define subcontract account documents and document categories.
- [x] Add optional subcontract data collections to `AppData` so existing saved CRM data remains compatible.
- [x] Add reusable helper functions for account creation, account history queries, financial summaries, dashboard summaries, and work-order status validation.
- [x] Add unit tests for the new workflow helpers.
- [ ] Add the Companies & Accounts navigation section.
- [ ] Add the subcontractor dashboard UI.
- [ ] Add company/contact CRUD UI.
- [ ] Add work-order CRUD UI.

## Phase 2 — Operations

- [ ] Connect work orders to existing Jobs.
- [ ] Add scheduling workflow for subcontract work orders.
- [ ] Add crew assignment directly from a work order.
- [ ] Add job completion workflow.
- [ ] Add completion photos and documentation.
- [ ] Add callback workflow.
- [ ] Add blueprint/specification document handling.

## Phase 3 — Financial

- [ ] Connect completed work orders to invoice creation.
- [ ] Prevent duplicate invoicing.
- [ ] Add subcontract account receivables view.
- [ ] Add payment recording against subcontract invoices.
- [ ] Add aging buckets.
- [ ] Add company financial summary UI.

## Phase 4 — Reporting

- [ ] Revenue by subcontractor.
- [ ] Jobs by subcontractor.
- [ ] Jobs by type.
- [ ] Crew production reporting.
- [ ] Callback reporting.
- [ ] Average payment-time reporting.
- [ ] Account profitability reporting.

## Phase 5 — Advanced

- [ ] AI work-order extraction.
- [ ] AI blueprint/specification extraction.
- [ ] Email-to-work-order drafting.
- [ ] Natural-language historical job search.
- [ ] Automated account/payment alerts.
- [ ] Advanced subcontractor analytics.

## Implementation Rules

1. Preserve existing homeowner/customer functionality.
2. Do not delete or invalidate existing saved data while introducing subcontract functionality.
3. Keep subcontractor data separate from direct-customer data while allowing shared jobs, invoices, crews, documents, and reporting where appropriate.
4. Treat the subcontractor workflow as the primary operational path because subcontract work is the majority of Munro & Sons work.
5. Update this checklist as implementation progresses; only mark an item complete after the corresponding functionality exists and has been tested.
