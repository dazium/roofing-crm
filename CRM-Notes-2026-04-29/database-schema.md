# Contractor CRM Database Schema

Copy this schema into `drizzle/schema.ts` to create all required tables for the CRM.

```typescript
import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal } from "drizzle-orm/mysql-core";

// Users table (auto-created by template)
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

// Customers table
export const customers = mysqlTable("customers", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 20 }),
  address: text("address"),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 50 }),
  zipCode: varchar("zipCode", { length: 10 }),
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  status: mysqlEnum("status", ["lead", "won", "lost"]).default("lead").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// Projects table
export const projects = mysqlTable("projects", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  customerId: int("customerId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  status: mysqlEnum("status", ["lead", "scheduled", "in_progress", "completed", "on_hold", "cancelled"]).default("lead").notNull(),
  startDate: timestamp("startDate"),
  endDate: timestamp("endDate"),
  estimatedValue: decimal("estimatedValue", { precision: 12, scale: 2 }),
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// Damages table
export const damages = mysqlTable("damages", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  projectId: int("projectId").notNull(),
  customerId: int("customerId").notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  description: text("description").notNull(),
  severity: mysqlEnum("severity", ["minor", "moderate", "severe"]).notNull(),
  location: varchar("location", { length: 255 }),
  estimatedCost: decimal("estimatedCost", { precision: 12, scale: 2 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// Photos table
export const photos = mysqlTable("photos", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  projectId: int("projectId").notNull(),
  damageId: int("damageId"),
  url: varchar("url", { length: 500 }).notNull(),
  caption: text("caption"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// Estimates table
export const estimates = mysqlTable("estimates", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  customerId: int("customerId").notNull(),
  projectId: int("projectId").notNull(),
  estimateNumber: varchar("estimateNumber", { length: 50 }).notNull().unique(),
  title: varchar("title", { length: 255 }).notNull(),
  subtotal: decimal("subtotal", { precision: 12, scale: 2 }).notNull(),
  total: decimal("total", { precision: 12, scale: 2 }).notNull(),
  status: mysqlEnum("status", ["draft", "sent", "accepted", "rejected"]).default("draft").notNull(),
  validUntil: timestamp("validUntil"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// Appointments table
export const appointments = mysqlTable("appointments", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  projectId: int("projectId").notNull(),
  customerId: int("customerId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  type: mysqlEnum("type", ["estimate", "inspection", "job_start", "job_end", "follow_up"]).notNull(),
  scheduledDate: timestamp("scheduledDate").notNull(),
  status: mysqlEnum("status", ["scheduled", "completed", "cancelled", "rescheduled"]).default("scheduled").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// Materials table
export const materials = mysqlTable("materials", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  unitPrice: decimal("unitPrice", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// Type exports
export type User = typeof users.$inferSelect;
export type Customer = typeof customers.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type Damage = typeof damages.$inferSelect;
export type Photo = typeof photos.$inferSelect;
export type Estimate = typeof estimates.$inferSelect;
export type Appointment = typeof appointments.$inferSelect;
export type Material = typeof materials.$inferSelect;
```

## Key Relationships

- **Customers** ← **Projects** (one customer can have many projects)
- **Projects** ← **Damages** (one project can have many damages)
- **Damages** ← **Photos** (one damage can have many photos)
- **Projects** ← **Estimates** (one project can have many estimates)
- **Projects** ← **Appointments** (one project can have many appointments)

## After Creating Schema

1. Run `pnpm drizzle-kit generate` to create migration SQL
2. Review the generated `.sql` file in `drizzle/`
3. Apply migration via `webdev_execute_sql` tool
4. Verify all tables are created in the database
