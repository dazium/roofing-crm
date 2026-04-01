# Roofing CRM

Single-company roofing CRM for **Rooftop Renovators (RTR)**.

## What this starter includes
- **Web app** scaffold in Next.js for office/admin/sales
- **Mobile app** scaffold in Expo for field reps and crews
- **Supabase-ready** SQL schema + seed data
- Dark premium design direction inspired by the reference site, but structured as a usable CRM

## Product direction
RTR combines:
- a premium dark contractor brand
- fast lead + estimate + scheduling workflows
- mobile-first field updates, photos, and job checklists

## Current MVP scope
- Dashboard
- Leads pipeline
- Customers / properties
- Estimates
- Jobs board
- Invoices overview
- Mobile field home / leads / jobs / photos shell

## Apps
- `apps/web` — Next.js CRM web interface
- `apps/mobile` — Expo mobile shell for field crews
- `supabase/schema.sql` — database schema
- `supabase/seed.sql` — demo data
- `docs/` — archived planning/API/schema notes from the earlier split folder

## Notes on company info
I did not automatically pull exact company details from Facebook because public search access was limited in-session. Branding and copy are set up so you can quickly swap in:
- official phone
- service area
- Facebook/about copy
- logo assets
- real project photos

## Suggested next build steps
1. connect Supabase project
2. wire auth + role-based access
3. replace mock dashboard data with live queries
4. add estimate builder
5. add photo uploads from mobile
6. add customer portal / quote approval
