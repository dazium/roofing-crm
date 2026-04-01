-- Initialize database with sample data

-- Create roles
INSERT INTO roles (name, permissions) VALUES
('admin', '{"projects": "all", "customers": "all", "materials": "all", "payroll": "all", "reports": "all"}'),
('manager', '{"projects": "read,write", "customers": "read,write", "materials": "read,write", "payroll": "read,write", "reports": "read"}'),
('technician', '{"projects": "read,write", "customers": "read", "materials": "read", "payroll": "read,write", "reports": "read"}');

-- Create admin user
INSERT INTO users (name, email, password_hash, role) VALUES
('Admin User', 'admin@roofingcrm.com', '$2b$10$examplehashedpassword', 'admin');

-- Insert sample materials
INSERT INTO materials (name, unit_cost, current_stock, unit, supplier) VALUES
('Asphalt Shingles', 85.00, 500, 'bundles', 'ABC Roofing Supply'),
('Underlayment', 12.50, 1000, 'rolls', 'ABC Roofing Supply'),
('Flashing', 8.75, 200, 'pieces', 'ABC Roofing Supply'),
('Nails', 5.00, 5000, 'lbs', 'ABC Roofing Supply'),
('Ridge Caps', 15.00, 300, 'pieces', 'ABC Roofing Supply'),
('Drip Edge', 3.50, 150, 'pieces', 'ABC Roofing Supply');

-- Insert sample employees
INSERT INTO employees (name, hourly_rate, role, phone) VALUES
('John Smith', 25.00, 'Roofer', '555-0101'),
('Mike Johnson', 22.00, 'Roofer', '555-0102'),
('Sarah Davis', 28.00, 'Foreman', '555-0103'),
('Tom Wilson', 20.00, 'Laborer', '555-0104'),
('Emily Brown', 24.00, 'Roofer', '555-0105');

-- Insert sample customers
INSERT INTO customers (name, address, phone, email, notes) VALUES
('ABC Construction', '456 Industrial Blvd', '555-0200', 'abc@construction.com', 'Large commercial projects'),
('John & Sarah Homeowner', '789 Oak Ave', '555-0201', 'john.sarah@email.com', 'Residential, prefers weekend work'),
('City Hall', '101 Main St', '555-0202', 'cityhall@city.gov', 'Government contracts, requires permits');

-- Insert sample projects
INSERT INTO projects (name, customer_id, status, start_date, end_date, estimated_cost, description) VALUES
('Roof Replacement - ABC Construction', 1, 'in_progress', '2024-03-15', '2024-03-20', 12500.00, 'Commercial building roof replacement'),
('Residential Roof Repair', 2, 'approved', '2024-03-18', '2024-03-19', 3500.00, 'Emergency repair after storm damage'),
('City Hall Maintenance', 3, 'planning', '2024-04-01', '2024-04-05', 8000.00, 'Scheduled maintenance and inspection');

-- Insert sample project materials
INSERT INTO project_materials (project_id, material_id, quantity_used, cost) VALUES
(1, 1, 150, 12750.00),  -- Asphalt Shingles
(1, 2, 200, 2500.00),   -- Underlayment
(1, 3, 100, 875.00),    -- Flashing
(2, 1, 50, 4250.00),    -- Asphalt Shingles
(2, 2, 60, 750.00),     -- Underlayment
(2, 4, 20, 100.00),     -- Nails
(3, 1, 100, 8500.00),   -- Asphalt Shingles
(3, 5, 50, 750.00),     -- Ridge Caps
(3, 6, 80, 280.00);     -- Drip Edge

-- Insert sample project payroll
INSERT INTO project_payroll (project_id, employee_id, hours_worked, total_pay, date_worked) VALUES
(1, 3, 40.0, 1120.00, '2024-03-15'),  -- Sarah Davis
(1, 1, 40.0, 1000.00, '2024-03-15'),  -- John Smith
(1, 2, 40.0, 880.00, '2024-03-15'),   -- Mike Johnson
(1, 4, 40.0, 800.00, '2024-03-15'),   -- Tom Wilson
(2, 1, 16.0, 400.00, '2024-03-18'),   -- John Smith
(2, 4, 16.0, 320.00, '2024-03-18'),   -- Tom Wilson
(3, 3, 40.0, 1120.00, '2024-04-01'),  -- Sarah Davis
(3, 5, 40.0, 960.00, '2024-04-01'),   -- Emily Brown
(3, 2, 40.0, 880.00, '2024-04-01');   -- Mike Johnson

-- Insert sample project tasks
INSERT INTO project_tasks (project_id, description, status, assigned_to, due_date, priority) VALUES
(1, 'Remove old shingles', 'completed', 1, '2024-03-15', 'high'),
(1, 'Install underlayment', 'completed', 2, '2024-03-16', 'high'),
(1, 'Install new shingles', 'in_progress', 3, '2024-03-17', 'high'),
(1, 'Install flashing', 'pending', 1, '2024-03-18', 'medium'),
(1, 'Cleanup and inspection', 'pending', 4, '2024-03-19', 'low'),
(2, 'Assess storm damage', 'completed', 3, '2024-03-18', 'high'),
(2, 'Repair damaged areas', 'in_progress', 1, '2024-03-18', 'high'),
(2, 'Final inspection', 'pending', 3, '2024-03-19', 'medium'),
(3, 'Schedule permit inspection', 'pending', 3, '2024-03-25', 'high'),
(3, 'Order materials', 'pending', 3, '2024-03-26', 'medium');

-- Insert sample invoices
INSERT INTO invoices (project_id, amount, due_date, status, invoice_number) VALUES
(1, 12500.00, '2024-03-25', 'draft', 'INV-2024-001'),
(2, 3500.00, '2024-03-25', 'sent', 'INV-2024-002'),
(3, 8000.00, '2024-04-10', 'draft', 'INV-2024-003');