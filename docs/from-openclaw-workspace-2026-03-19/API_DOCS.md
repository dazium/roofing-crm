# API Documentation

## Overview

RESTful API for the Roofing CRM with comprehensive endpoints for project management, financial tracking, and reporting.

## Authentication

All endpoints require JWT token except for authentication endpoints.

```http
Authorization: Bearer <jwt_token>
```

## Base URL

```
https://your-domain.com/api/v1
```

## Endpoints

### Authentication

#### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}

Response (200):
{
  "token": "<jwt_token>",
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "user@example.com",
    "role": "admin"
  }
}
```

#### Register
```http
POST /auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "user@example.com",
  "password": "password123",
  "role": "technician"
}
```

### Projects

#### Get All Projects
```http
GET /projects

Query Parameters:
- status: filter by project status
- customer_id: filter by customer
- page: pagination (default: 1)
- limit: items per page (default: 20)

Response (200):
{
  "projects": [...],
  "total": 100,
  "page": 1,
  "limit": 20
}
```

#### Get Project by ID
```http
GET /projects/:id

Response (200):
{
  "id": 1,
  "name": "Roof Replacement - 123 Main St",
  "customer_id": 1,
  "status": "in_progress",
  "start_date": "2024-03-15",
  "end_date": "2024-03-20",
  "estimated_cost": 8500.00,
  "actual_cost": 7200.00,
  "description": "Full roof replacement",
  "customer": {...},
  "materials": [...],
  "payroll": [...],
  "tasks": [...],
  "photos": [...]
}
```

#### Create Project
```http
POST /projects
Content-Type: application/json

{
  "name": "Roof Replacement - 123 Main St",
  "customer_id": 1,
  "status": "planning",
  "start_date": "2024-03-15",
  "end_date": "2024-03-20",
  "estimated_cost": 8500.00,
  "description": "Full roof replacement"
}
```

#### Update Project
```http
PUT /projects/:id
Content-Type: application/json

{
  "name": "Updated Project Name",
  "status": "in_progress",
  "end_date": "2024-03-25"
}
```

#### Delete Project
```http
DELETE /projects/:id
```

### Customers

#### Get All Customers
```http
GET /customers

Response (200):
{
  "customers": [...],
  "total": 50
}
```

#### Get Customer by ID
```http
GET /customers/:id

Response (200):
{
  "id": 1,
  "name": "John Smith",
  "address": "123 Main St",
  "phone": "555-1234",
  "email": "john@example.com",
  "notes": "Prefers morning calls",
  "projects": [...]
}
```

#### Create Customer
```http
POST /customers
Content-Type: application/json

{
  "name": "John Smith",
  "address": "123 Main St",
  "phone": "555-1234",
  "email": "john@example.com",
  "notes": "Prefers morning calls"
}
```

### Materials

#### Get All Materials
```http
GET /materials

Response (200):
{
  "materials": [...],
  "total": 20
}
```

#### Get Material by ID
```http
GET /materials/:id

Response (200):
{
  "id": 1,
  "name": "Asphalt Shingles",
  "unit_cost": 85.00,
  "current_stock": 500,
  "unit": "bundles",
  "supplier": "ABC Roofing Supply"
}
```

#### Create Material
```http
POST /materials
Content-Type: application/json

{
  "name": "New Material",
  "unit_cost": 25.00,
  "current_stock": 100,
  "unit": "pieces",
  "supplier": "Supplier Name"
}
```

#### Update Material Stock
```http
PUT /materials/:id/stock
Content-Type: application/json

{
  "quantity": 50,
  "operation": "add"  // or "subtract"
}
```

### Payroll

#### Get Project Payroll
```http
GET /projects/:id/payroll

Response (200):
{
  "payroll": [...],
  "total_cost": 2500.00,
  "total_hours": 100.00
}
```

#### Add Payroll Entry
```http
POST /projects/:id/payroll
Content-Type: application/json

{
  "employee_id": 1,
  "hours_worked": 8.0,
  "date_worked": "2024-03-15"
}
```

### Invoices

#### Get Project Invoices
```http
GET /projects/:id/invoices

Response (200):
{
  "invoices": [...],
  "total_amount": 8500.00,
  "paid_amount": 4250.00
}
```

#### Create Invoice
```http
POST /projects/:id/invoices
Content-Type: application/json

{
  "amount": 8500.00,
  "due_date": "2024-03-25",
  "invoice_number": "INV-2024-001"
}
```

### Tasks

#### Get Project Tasks
```http
GET /projects/:id/tasks

Response (200):
{
  "tasks": [...],
  "total": 15
}
```

#### Create Task
```http
POST /projects/:id/tasks
Content-Type: application/json

{
  "description": "Remove old shingles",
  "status": "pending",
  "assigned_to": 1,
  "due_date": "2024-03-16",
  "priority": "high"
}
```

### Reports

#### Project Profitability Report
```http
GET /reports/profitability

Query Parameters:
- date_from: start date
- date_to: end date
- status: project status filter

Response (200):
{
  "report": [...],
  "total_profit": 15000.00,
  "total_revenue": 50000.00
}
```

#### Material Usage Report
```http
GET /reports/materials

Query Parameters:
- date_from: start date
- date_to: end date

Response (200):
{
  "report": [...],
  "total_cost": 3500.00
}
```

## Error Responses

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {}
}
```

## Rate Limiting

- Authenticated users: 1000 requests/hour
- Unauthenticated: 100 requests/hour

## CORS

CORS is enabled for all origins in development, restricted in production.