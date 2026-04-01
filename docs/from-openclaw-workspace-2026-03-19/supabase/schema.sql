create extension if not exists pgcrypto;

create type lead_status as enum (
  'new',
  'contacted',
  'inspection_scheduled',
  'inspection_complete',
  'estimate_sent',
  'won',
  'lost'
);

create type job_status as enum (
  'not_scheduled',
  'scheduled',
  'in_progress',
  'awaiting_final_review',
  'complete',
  'invoiced',
  'paid'
);

create table profiles (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text unique not null,
  role text not null check (role in ('admin', 'office', 'sales', 'crew_lead', 'crew')),
  phone text,
  created_at timestamptz not null default now()
);

create table leads (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text,
  email text,
  address text,
  city text,
  source text,
  notes text,
  status lead_status not null default 'new',
  assigned_to uuid references profiles(id),
  created_at timestamptz not null default now()
);

create table customers (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  phone text,
  email text,
  created_at timestamptz not null default now()
);

create table properties (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  address text not null,
  city text,
  province text default 'ON',
  postal_code text,
  roof_type text,
  insurance_claim boolean default false,
  notes text,
  created_at timestamptz not null default now()
);

create table estimates (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  estimate_number text not null unique,
  subtotal numeric(12,2) not null default 0,
  tax numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  status text not null check (status in ('draft', 'sent', 'approved', 'rejected')) default 'draft',
  valid_until date,
  created_at timestamptz not null default now()
);

create table estimate_items (
  id uuid primary key default gen_random_uuid(),
  estimate_id uuid not null references estimates(id) on delete cascade,
  title text not null,
  description text,
  quantity numeric(10,2) not null default 1,
  unit_price numeric(12,2) not null default 0,
  line_total numeric(12,2) not null default 0
);

create table crews (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  foreman text,
  phone text,
  active boolean not null default true
);

create table jobs (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  estimate_id uuid references estimates(id),
  title text not null,
  status job_status not null default 'not_scheduled',
  scheduled_for timestamptz,
  crew_id uuid references crews(id),
  notes text,
  created_at timestamptz not null default now()
);

create table photos (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references jobs(id) on delete cascade,
  lead_id uuid references leads(id) on delete cascade,
  url text not null,
  category text not null check (category in ('before', 'damage', 'progress', 'after', 'document')),
  caption text,
  uploaded_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create table invoices (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs(id) on delete cascade,
  invoice_number text not null unique,
  amount_due numeric(12,2) not null,
  amount_paid numeric(12,2) not null default 0,
  due_date date,
  status text not null check (status in ('draft', 'sent', 'partial', 'paid', 'overdue')) default 'draft',
  created_at timestamptz not null default now()
);
