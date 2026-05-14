# Contractor CRM Features & Specifications

## Feature Overview

### 1. Customer Management

**Purpose**: Track leads and customer information

**Key Features**:
- Add new customers with name, email, phone, address
- Assign status: lead, won, lost
- Search and filter by name, email, phone
- View customer details and associated projects
- Edit customer information
- Track customer location with latitude/longitude

**Implementation**:
- `Customers.tsx` page component
- `customers.create`, `customers.list`, `customers.update` tRPC procedures
- Customer form with validation
- Status badges with color coding

### 2. Project Tracking

**Purpose**: Manage roofing projects from lead to completion

**Key Features**:
- Create projects linked to customers
- Track project status: lead, scheduled, in_progress, completed, on_hold, cancelled
- Set start and end dates
- Estimate project value
- Store project location (latitude/longitude)
- View all projects with filtering by status and customer

**Implementation**:
- `Projects.tsx` page component
- `projects.create`, `projects.list`, `projects.update` tRPC procedures
- Project form with customer dropdown
- Status badges with color coding
- Date range display

### 3. Damage Assessment

**Purpose**: Document roof damage with photos and materials needed

**Key Features**:
- Create damage records linked to projects
- Select damage category (missing shingles, flashing damage, etc.)
- Add damage description and location
- Assign severity: minor, moderate, severe
- Estimate repair cost
- Select materials needed (checklist with quantities)
- Attach photos to damage records

**Implementation**:
- `Damages.tsx` page component
- `damages.create`, `damages.list` tRPC procedures
- Damage form with category dropdown
- Severity selector
- Materials checklist component with quantity inputs
- Cost estimation field

### 4. Photo Upload & Management

**Purpose**: Document job sites with photos

**Key Features**:
- Drag-and-drop photo upload
- Upload multiple photos at once
- Add captions to photos
- Link photos to specific damage records
- View photo gallery for each project
- Delete photos
- S3 storage integration

**Implementation**:
- `PhotoUpload.tsx` component with drag-and-drop
- `PhotoGallery.tsx` component for display
- `Photos.tsx` page component
- `photos.create`, `photos.list`, `photos.delete` tRPC procedures
- S3 storage via `storagePut()` helper

### 5. Estimates Generation

**Purpose**: Create professional quotes for customers

**Key Features**:
- Create estimates linked to projects
- Add line items with material dropdowns
- Auto-calculate totals (quantity × unit price)
- Display subtotal and total
- Assign status: draft, sent, accepted, rejected
- Set expiration date for estimate
- Export estimates as text files

**Implementation**:
- `Estimates.tsx` page component
- `estimates.create`, `estimates.list` tRPC procedures
- Material dropdown with predefined unit prices
- Line item management (add/remove/edit)
- Auto-calculating totals
- Export functionality

### 6. Calendar & Scheduling

**Purpose**: Schedule appointments and manage job calendar

**Key Features**:
- Month view calendar
- Create appointments for estimates, inspections, job start/end, follow-ups
- Assign appointment to project and customer
- Track appointment status: scheduled, completed, cancelled, rescheduled
- View upcoming appointments on dashboard
- Filter by appointment type

**Implementation**:
- `Calendar.tsx` page component
- `appointments.create`, `appointments.list` tRPC procedures
- Calendar component (month view)
- Appointment form with type selector
- Status badges

## Data Flow

```
Customer Created
    ↓
Project Created (linked to Customer)
    ↓
Damage Assessment (linked to Project)
    ├─ Photos Uploaded (linked to Damage)
    └─ Materials Selected
        ↓
Estimate Generated (auto-populated from Damages)
    ├─ Line Items (from Materials)
    └─ Total Calculated
        ↓
Appointment Scheduled (linked to Project)
    ↓
Project Marked Complete
```

## UI Components

### DashboardLayout
- Sidebar navigation with links to all pages
- User profile in footer
- Responsive mobile menu
- Blueprint aesthetic styling

### Common Components
- `Button` - shadcn/ui button with variants
- `Card` - shadcn/ui card for content sections
- `Dialog` - shadcn/ui dialog for forms
- `Select` - shadcn/ui select for dropdowns
- `Input` - shadcn/ui input for text fields
- `Textarea` - shadcn/ui textarea for descriptions
- `Badge` - shadcn/ui badge for status indicators

### Page Components
- `Customers.tsx` - Customer list and management
- `Projects.tsx` - Project list and creation
- `Damages.tsx` - Damage assessment form
- `Photos.tsx` - Photo gallery and upload
- `Estimates.tsx` - Estimate creation and management
- `Calendar.tsx` - Calendar and appointment scheduling

## Authentication & Authorization

- **Authentication**: Manus OAuth (built-in)
- **Authorization**: All data scoped to logged-in user (userId)
- **Protected Routes**: All pages require authentication
- **Role-based Access**: Optional admin role for future features

## Search & Filter

### Customers
- Search by name, email, phone
- Filter by status (lead, won, lost)

### Projects
- Filter by status (lead, scheduled, in_progress, completed, on_hold, cancelled)
- Filter by customer
- Date range filtering

### Damages
- Filter by category
- Filter by severity (minor, moderate, severe)
- Filter by project

### Estimates
- Filter by status (draft, sent, accepted, rejected)
- Filter by project
- Filter by customer

## Performance Considerations

- Use `trpc.useUtils().invalidate()` for data refresh after mutations
- Implement optimistic updates for list operations
- Lazy load photos and large data sets
- Use pagination for large lists (future enhancement)

## Testing

Write vitest tests for:
- CRUD operations for each feature
- Authentication and authorization
- Data validation
- Integration workflows
- Concurrent operations

Example test structure:
```typescript
describe("customers", () => {
  it("should create a customer", async () => {
    // Test implementation
  });
  
  it("should list customers for current user", async () => {
    // Test implementation
  });
});
```
