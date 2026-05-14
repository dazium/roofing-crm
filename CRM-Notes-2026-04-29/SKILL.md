---
name: contractor-crm-builder
description: Build professional contractor/service business CRM applications with customer management, project tracking, damage assessment, photo uploads, and estimates. Use when creating CRM systems for roofing, HVAC, plumbing, or similar service businesses that need lead tracking, project management, and damage documentation.
---

# Contractor CRM Builder

## Overview

This skill provides a complete workflow for building production-ready CRM applications tailored to contractor and service businesses. It includes database schema design, tRPC API procedures, React UI components, materials tracking, photo integration, and professional blueprint aesthetic styling. The skill is designed to help you rapidly scaffold a fully functional CRM with all core features working and tested.

## Core Capabilities

### 1. Database Schema & Data Model
Design a comprehensive database schema with customers, projects, damages, estimates, appointments, photos, and materials tables. The schema supports the complete workflow from lead capture through project completion.

### 2. Customer & Lead Management
Build customer management pages with lead status tracking (lead → won/lost), contact details, search/filter capabilities, and customer creation forms with validation.

### 3. Project Tracking
Create project pages linked to customers with status management (lead → scheduled → in_progress → completed), timeline visualization, and project filtering.

### 4. Damage Assessment
Build damage tracking forms with predefined categories, severity levels, cost estimation, and materials selection. Forms auto-populate with selected materials for quick documentation.

### 5. Photo Integration
Implement S3 photo uploads with drag-and-drop functionality, photo galleries, captions, and linking to damage records for complete job site documentation.

### 6. Estimates Generation
Create estimate pages with material-based line items, auto-calculating totals, and text export functionality for client proposals.

### 7. Calendar & Scheduling
Build calendar views with appointment scheduling, appointment types (estimate, inspection, job start), and status tracking for job coordination.

### 8. Professional UI Design
Apply blueprint aesthetic with deep royal blue backgrounds, grid patterns, white CAD-style design elements, and bold sans-serif typography for a professional, technical appearance.

## Workflow: Building a Contractor CRM

Follow these steps in order to build a complete, working CRM:

### Step 1: Initialize the Project

Create a new web project with database and user authentication:

```bash
# This creates a React + Express + tRPC + MySQL stack
webdev_init_project project_name="contractor-name-crm"
# Select features: db, server, user
```

### Step 2: Design the Database Schema

Copy the database schema from `references/database-schema.md` into `drizzle/schema.ts`. This includes:
- `users` - Authentication (auto-created)
- `customers` - Lead/customer records with contact info
- `projects` - Projects linked to customers with status
- `damages` - Damage assessments with categories and severity
- `estimates` - Estimates with line items and pricing
- `appointments` - Calendar events and scheduling
- `photos` - Photo uploads with captions and damage linking
- `materials` - Roofing materials (drip edge, vents, ice and water, etc.)

Generate migrations: `pnpm drizzle-kit generate` then apply via `webdev_execute_sql`.

### Step 3: Create Database Query Helpers

Add database query functions to `server/db.ts` for each table:
- `createCustomer()`, `listCustomers()`, `updateCustomer()`
- `createProject()`, `listProjects()`, `updateProject()`
- `createDamage()`, `listDamages()`
- `createEstimate()`, `listEstimates()`
- `createAppointment()`, `listAppointments()`
- `uploadPhoto()`, `listPhotos()`, `deletePhoto()`

### Step 4: Build tRPC Procedures

Add tRPC routers to `server/routers.ts` for each feature:
- `customers.list`, `customers.create`, `customers.update`
- `projects.list`, `projects.create`, `projects.update`
- `damages.list`, `damages.create`
- `estimates.list`, `estimates.create`
- `appointments.list`, `appointments.create`
- `photos.list`, `photos.create`, `photos.delete`

Use `protectedProcedure` to ensure only authenticated users can access their own data.

### Step 5: Build UI Pages

Create React pages in `client/src/pages/`:

**Customers.tsx** - Customer list with add/edit forms, status filtering, search
**Projects.tsx** - Project list with creation form, status tracking, customer linking
**Damages.tsx** - Damage assessment form with materials checklist, cost estimation
**Photos.tsx** - Photo gallery with drag-and-drop upload, captions, damage linking
**Estimates.tsx** - Estimate creation with material dropdowns, auto-calculating totals
**Calendar.tsx** - Calendar view with appointment scheduling and management

Wrap all pages with `DashboardLayout` component for consistent sidebar navigation.

### Step 6: Apply Blueprint Aesthetic

Update `client/src/index.css` with:
- Deep royal blue background (`#0a1628` or similar)
- Grid pattern using CSS (subtle, repeating)
- White text and CAD-style line elements
- Bold sans-serif typography (Google Fonts: Roboto, Inter, or similar)
- Professional spacing and shadows

### Step 7: Implement Materials Checklist

Create `MaterialsChecklist.tsx` component with predefined materials:
- Drip Edge, Vents, Ice and Water, Synthetic Underlay
- Starter Shingle, Ridge Cap, Flashing Kit, Roof Cement
- Roofing Nails, Nails by the Box, Underlayment

Each material has a quantity input and is displayed in a summary box.

### Step 8: Integrate Photo Uploads

Use S3 storage (pre-configured in template) for photo uploads:
- Create `PhotoUpload.tsx` component with drag-and-drop
- Create `PhotoGallery.tsx` component for displaying photos
- Link photos to damage records via `damage_photos` junction table
- Use `storagePut()` helper to upload to S3

### Step 9: Write Tests

Create comprehensive vitest tests in `server/features.test.ts`:
- Test CRUD operations for each feature
- Test authentication and authorization
- Test data validation
- Test integration workflows (customer → project → damage → estimate)

Run `pnpm test` to verify all features work correctly.

### Step 10: Deploy & Iterate

Save a checkpoint: `webdev_save_checkpoint` with descriptive message
Click "Publish" in the Management UI to deploy the app
Collect user feedback and iterate on features

## Materials List Reference

Standard roofing materials included in the CRM:

| Material | Category | Typical Unit Price |
|----------|----------|-------------------|
| Drip Edge | Flashing | $15 |
| Vents | Vents | $45 |
| Ice and Water | Underlayment | $35 |
| Synthetic Underlay | Underlayment | $50 |
| Starter Shingle | Fasteners | $25 |
| Ridge Cap | Fasteners | $30 |
| Flashing Kit | Flashing | $65 |
| Roof Cement | Sealants | $20 |
| Roofing Nails | Fasteners | $8 |
| Nails by the Box | Fasteners | $40 |
| Underlayment | Underlayment | $55 |

Customize unit prices based on your supplier costs.

## Key Design Decisions

**Authentication**: Uses Manus OAuth (built-in, no setup required)
**Database**: MySQL/TiDB (pre-configured in template)
**API**: tRPC for type-safe client-server communication
**UI Framework**: React 19 + Tailwind CSS 4 + shadcn/ui components
**File Storage**: S3 (pre-configured, no API keys needed)
**Styling**: Blueprint aesthetic with CSS Grid patterns and CAD-style elements

## Common Customizations

**Change company name**: Update `VITE_APP_TITLE` in secrets
**Add custom materials**: Edit `MaterialsChecklist.tsx` and `Estimates.tsx` MATERIALS array
**Adjust material prices**: Update unit prices in `Estimates.tsx` MATERIALS array
**Change color scheme**: Modify CSS variables in `client/src/index.css`
**Add custom fields**: Extend database schema in `drizzle/schema.ts`, generate migrations, update tRPC procedures

## Resources

### references/
- `database-schema.md` - Complete database schema with all tables and relationships
- `materials-list.md` - Predefined roofing materials with categories and pricing
- `crm-features.md` - Detailed feature specifications and workflows

### templates/
- `blueprint-aesthetic.css` - Blueprint styling template with grid patterns and colors
- `materials-checklist-template.tsx` - Reusable materials checklist component
- `photo-upload-template.tsx` - Drag-and-drop photo upload component

### scripts/
- `generate-schema.py` - Helper script to generate database schema from template
- `seed-materials.py` - Script to populate materials table with standard roofing materials

## Troubleshooting

**Pages get stuck without sidebar**: Ensure all page components are wrapped with `DashboardLayout`
**Photos not uploading**: Verify S3 storage is configured (should be automatic in template)
**Materials not showing in estimates**: Check that `MATERIALS` array is imported correctly in Estimates.tsx
**Tests failing**: Run `pnpm test` to see detailed error messages; check that all tRPC procedures match the schema

## Next Steps After Building

1. **Add Google Maps** - Visualize customer locations and plan routes between jobs
2. **Generate PDF estimates** - Create professional PDF exports with company branding
3. **Add email integration** - Send estimates and appointment reminders to customers
4. **Implement notifications** - Real-time alerts for new leads and job updates
5. **Add team collaboration** - Multiple user roles (admin, technician, office staff)
