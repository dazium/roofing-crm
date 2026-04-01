insert into profiles (id, full_name, email, role, phone) values
  ('00000000-0000-0000-0000-000000000001', 'Matt Admin', 'matt@rtr.local', 'admin', '519-555-0100'),
  ('00000000-0000-0000-0000-000000000002', 'Sales Rep One', 'sales@rtr.local', 'sales', '519-555-0101'),
  ('00000000-0000-0000-0000-000000000003', 'Crew Lead One', 'crew@rtr.local', 'crew_lead', '519-555-0102');

insert into leads (full_name, phone, email, address, city, source, notes, status, assigned_to) values
  ('Jennifer Mullins', '519-555-1001', 'jennifer@example.com', '123 Maple Ridge Dr', 'Windsor', 'Facebook', 'Possible full replacement. Wants quote this week.', 'inspection_scheduled', '00000000-0000-0000-0000-000000000002'),
  ('Mark Pitre', '519-555-1002', 'mark@example.com', '88 Seacliff Dr', 'Leamington', 'Referral', 'Leak around vent stack. Insurance question.', 'estimate_sent', '00000000-0000-0000-0000-000000000002'),
  ('Arianna Lopes', '519-555-1003', 'arianna@example.com', '27 Front Rd', 'LaSalle', 'Website', 'Storm damage inspection requested.', 'new', '00000000-0000-0000-0000-000000000002');

insert into customers (id, display_name, phone, email) values
  ('10000000-0000-0000-0000-000000000001', 'Jennifer Mullins', '519-555-1001', 'jennifer@example.com'),
  ('10000000-0000-0000-0000-000000000002', 'Mark Pitre', '519-555-1002', 'mark@example.com');

insert into properties (id, customer_id, address, city, province, postal_code, roof_type, insurance_claim, notes) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '123 Maple Ridge Dr', 'Windsor', 'ON', 'N8X 1X1', 'Asphalt shingle', false, 'Two-storey detached'),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', '88 Seacliff Dr', 'Leamington', 'ON', 'N8H 2L2', 'Asphalt shingle', true, 'Low slope addition on rear');

insert into estimates (id, customer_id, property_id, estimate_number, subtotal, tax, total, status, valid_until) values
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'RTR-EST-1001', 12400.00, 1612.00, 14012.00, 'sent', '2026-04-15'),
  ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 'RTR-EST-1002', 4200.00, 546.00, 4746.00, 'approved', '2026-04-01');

insert into estimate_items (estimate_id, title, description, quantity, unit_price, line_total) values
  ('30000000-0000-0000-0000-000000000001', 'Roof tear-off and disposal', 'Remove and dispose existing shingles', 1, 2500.00, 2500.00),
  ('30000000-0000-0000-0000-000000000001', 'Architectural shingles', 'Supply and install premium shingles', 1, 8200.00, 8200.00),
  ('30000000-0000-0000-0000-000000000001', 'Flashing and ventilation', 'Replace flashing, vents, and pipe boots', 1, 1700.00, 1700.00),
  ('30000000-0000-0000-0000-000000000002', 'Leak repair', 'Repair vent stack and surrounding field shingles', 1, 4200.00, 4200.00);

insert into crews (id, name, foreman, phone, active) values
  ('40000000-0000-0000-0000-000000000001', 'Crew Alpha', 'Crew Lead One', '519-555-3001', true);

insert into jobs (id, customer_id, property_id, estimate_id, title, status, scheduled_for, crew_id, notes) values
  ('50000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000002', 'Pitre leak repair', 'scheduled', '2026-03-20T13:30:00Z', '40000000-0000-0000-0000-000000000001', 'Bring sealant, matching shingles, vent materials');

insert into invoices (job_id, invoice_number, amount_due, amount_paid, due_date, status) values
  ('50000000-0000-0000-0000-000000000001', 'RTR-INV-2001', 4746.00, 1200.00, '2026-03-31', 'partial');
