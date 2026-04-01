# Database Schema

## Overview

The database is designed to handle multi-project roofing operations with financial tracking and reporting capabilities.

## Core Tables

### Users and Authentication
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'technician',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    permissions JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Projects and Customers
```sql
CREATE TABLE customers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE projects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    customer_id INTEGER REFERENCES customers(id),
    status VARCHAR(50) NOT NULL DEFAULT 'planning',
    start_date DATE,
    end_date DATE,
    estimated_cost DECIMAL(10,2),
    actual_cost DECIMAL(10,2) DEFAULT 0.00,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TYPE project_status AS ENUM (
    'planning', 'quoted', 'approved', 'in_progress', 
    'on_hold', 'completed', 'cancelled'
);

ALTER TABLE projects ALTER COLUMN status TYPE project_status USING status::project_status;
```

### Materials and Inventory
```sql
CREATE TABLE materials (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    unit_cost DECIMAL(10,2) NOT NULL,
    current_stock INTEGER DEFAULT 0,
    unit VARCHAR(50) NOT NULL DEFAULT 'pieces',
    supplier VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE project_materials (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    material_id INTEGER REFERENCES materials(id),
    quantity_used INTEGER NOT NULL,
    cost DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Payroll and Labor
```sql
CREATE TABLE employees (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    hourly_rate DECIMAL(10,2) NOT NULL,
    role VARCHAR(100),
    phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE project_payroll (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    employee_id INTEGER REFERENCES employees(id),
    hours_worked DECIMAL(5,2) NOT NULL,
    total_pay DECIMAL(10,2) NOT NULL,
    date_worked DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Financials
```sql
CREATE TABLE invoices (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    due_date DATE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    invoice_number VARCHAR(100) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    invoice_id INTEGER REFERENCES invoices(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    payment_date DATE NOT NULL,
    method VARCHAR(50) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Progress Tracking
```sql
CREATE TABLE project_tasks (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    assigned_to INTEGER REFERENCES users(id),
    due_date DATE,
    priority VARCHAR(20) DEFAULT 'medium',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE project_photos (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    url VARCHAR(500) NOT NULL,
    description TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    uploaded_by INTEGER REFERENCES users(id)
);
```

## Indexes and Performance

```sql
-- Common query indexes
CREATE INDEX idx_projects_customer ON projects(customer_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_project_materials_project ON project_materials(project_id);
CREATE INDEX idx_project_payroll_project ON project_payroll(project_id);
CREATE INDEX idx_invoices_project ON invoices(project_id);
CREATE INDEX idx_tasks_project ON project_tasks(project_id);
CREATE INDEX idx_tasks_status ON project_tasks(status);
```

## Sample Data

```sql
-- Insert sample materials
INSERT INTO materials (name, unit_cost, current_stock, unit, supplier) VALUES
('Asphalt Shingles', 85.00, 500, 'bundles', 'ABC Roofing Supply'),
('Underlayment', 12.50, 1000, 'rolls', 'ABC Roofing Supply'),
('Flashing', 8.75, 200, 'pieces', 'ABC Roofing Supply'),
('Nails', 5.00, 5000, 'lbs', 'ABC Roofing Supply');

-- Insert sample employees
INSERT INTO employees (name, hourly_rate, role) VALUES
('John Smith', 25.00, 'Roofer'),
('Mike Johnson', 22.00, 'Roofer'),
('Sarah Davis', 28.00, 'Foreman'),
('Tom Wilson', 20.00, 'Laborer');
```

## Views for Reporting

```sql
-- Project Profitability View
CREATE VIEW project_profitability AS
SELECT 
    p.id,
    p.name,
    p.status,
    p.estimated_cost,
    COALESCE(SUM(pm.cost), 0) as material_cost,
    COALESCE(SUM(pp.total_pay), 0) as labor_cost,
    (p.estimated_cost - COALESCE(SUM(pm.cost), 0) - COALESCE(SUM(pp.total_pay), 0)) as profit,
    CASE 
        WHEN p.estimated_cost = 0 THEN 0
        ELSE ((p.estimated_cost - COALESCE(SUM(pm.cost), 0) - COALESCE(SUM(pp.total_pay), 0)) / p.estimated_cost) * 100
    END as profit_margin
FROM projects p
LEFT JOIN project_materials pm ON p.id = pm.project_id
LEFT JOIN project_payroll pp ON p.id = pp.project_id
GROUP BY p.id, p.name, p.status, p.estimated_cost;

-- Project Summary View
CREATE VIEW project_summary AS
SELECT 
    p.id,
    p.name,
    c.name as customer_name,
    p.status,
    p.start_date,
    p.end_date,
    p.estimated_cost,
    COALESCE(SUM(pm.cost), 0) as material_cost,
    COALESCE(SUM(pp.total_pay), 0) as labor_cost,
    (p.estimated_cost - COALESCE(SUM(pm.cost), 0) - COALESCE(SUM(pp.total_pay), 0)) as profit
FROM projects p
LEFT JOIN customers c ON p.customer_id = c.id
LEFT JOIN project_materials pm ON p.id = pm.project_id
LEFT JOIN project_payroll pp ON p.id = pp.project_id
GROUP BY p.id, p.name, c.name, p.status, p.start_date, p.end_date, p.estimated_cost;
```