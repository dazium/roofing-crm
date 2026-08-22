import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

/**
 * Customers table
 */
export const customers = sqliteTable("customers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email"),
  phone: text("phone").notNull(),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  zipCode: text("zip_code"),
  latitude: real("latitude"),
  longitude: real("longitude"),
  status: text("status", { enum: ["lead", "contacted", "qualified", "proposal_sent", "won", "lost"] }).default("lead").notNull(),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

/**
 * Crews table
 */
export const crews = sqliteTable("crews", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description"),
  crewLead: text("crew_lead"),
  phone: text("phone"),
  email: text("email"),
  status: text("status", { enum: ["active", "inactive"] }).default("active").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

/**
 * Projects table
 */
export const projects = sqliteTable("projects", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  customerId: integer("customer_id").notNull().references(() => customers.id),
  crewId: integer("crew_id").references(() => crews.id),
  title: text("title").notNull(),
  description: text("description"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  zipCode: text("zip_code"),
  latitude: real("latitude"),
  longitude: real("longitude"),
  status: text("status", { enum: ["lead", "scheduled", "in_progress", "completed", "on_hold", "cancelled"] }).default("lead").notNull(),
  startDate: text("start_date"), // SQLite date as text
  endDate: text("end_date"),
  estimatedValue: real("estimated_value"),
  actualValue: real("actual_value"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

/**
 * Estimates table
 */
export const estimates = sqliteTable("estimates", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: integer("project_id").notNull().references(() => projects.id),
  customerId: integer("customer_id").notNull().references(() => customers.id),
  estimateNumber: text("estimate_number").notNull().unique(),
  title: text("title").notNull(),
  description: text("description"),
  subtotal: real("subtotal").notNull(),
  tax: real("tax").default(0),
  total: real("total").notNull(),
  status: text("status", { enum: ["draft", "sent", "accepted", "rejected", "expired"] }).default("draft").notNull(),
  validUntil: text("valid_until"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

/**
 * Estimate Line Items
 */
export const estimateLineItems = sqliteTable("estimate_line_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  estimateId: integer("estimate_id").notNull().references(() => estimates.id),
  materialId: integer("material_id").references(() => materials.id),
  description: text("description").notNull(),
  quantity: real("quantity").notNull(),
  unitPrice: real("unit_price").notNull(),
  total: real("total").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

/**
 * Materials table
 */
export const materials = sqliteTable("materials", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  category: text("category", { enum: ["shingles", "underlayment", "ice_water_shield", "plywood", "flashing", "pipe_flange", "ridge_caps", "gutters", "fascia_soffit", "other"] }).default("other").notNull(),
  unit: text("unit").default("piece").notNull(),
  unitPrice: real("unit_price").notNull(),
  description: text("description"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

/**
 * Roof Specifications (Advanced Business Logic)
 */
export const roofSpecifications = sqliteTable("roof_specifications", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  estimateId: integer("estimate_id").notNull().references(() => estimates.id),
  roofArea: real("roof_area").notNull(),
  roofPitch: text("roof_pitch").notNull(),
  numberOfValleys: integer("number_of_valleys").default(0).notNull(),
  numberOfDormers: integer("number_of_dormers").default(0).notNull(),
  numberOfChimneys: integer("number_of_chimneys").default(0).notNull(),
  numberOfSkyLights: integer("number_of_sky_lights").default(0).notNull(),
  hasRidgeVent: integer("has_ridge_vent", { mode: "boolean" }).default(false).notNull(),
  tearOffRequired: integer("tear_off_required", { mode: "boolean" }).default(true).notNull(),
  roofType: text("roof_type", { enum: ["asphalt_shingles", "metal", "tile", "slate", "wood", "flat", "other"] }).default("asphalt_shingles").notNull(),
  estimatedSquares: real("estimated_squares").notNull(),
  estimatedLaborHours: real("estimated_labor_hours").notNull(),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

/**
 * Invoices table
 */
export const invoices = sqliteTable("invoices", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  estimateId: integer("estimate_id").references(() => estimates.id),
  projectId: integer("project_id").notNull().references(() => projects.id),
  customerId: integer("customer_id").notNull().references(() => customers.id),
  invoiceNumber: text("invoice_number").notNull().unique(),
  issueDate: text("issue_date").notNull(),
  dueDate: text("due_date").notNull(),
  subtotal: real("subtotal").notNull(),
  tax: real("tax").default(0).notNull(),
  total: real("total").notNull(),
  amountPaid: real("amount_paid").default(0).notNull(),
  status: text("status", { enum: ["draft", "sent", "viewed", "paid", "overdue", "cancelled"] }).default("draft").notNull(),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

/**
 * Photos table
 */
export const photos = sqliteTable("photos", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: integer("project_id").references(() => projects.id),
  customerId: integer("customer_id").references(() => customers.id),
  fileName: text("file_name").notNull(),
  fileUrl: text("file_url").notNull(),
  fileKey: text("file_key").notNull(),
  mimeType: text("mime_type"),
  caption: text("caption"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

/**
 * Damages table
 */
export const damages = sqliteTable("damages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: integer("project_id").notNull().references(() => projects.id),
  customerId: integer("customer_id").notNull().references(() => customers.id),
  category: text("category", { enum: ["missing_shingles", "flashing_damage", "leaks", "sagging", "rot", "moss_algae", "hail_damage", "wind_damage", "other"] }).notNull(),
  description: text("description").notNull(),
  severity: text("severity", { enum: ["minor", "moderate", "severe"] }).default("moderate").notNull(),
  location: text("location"),
  estimatedCost: real("estimated_cost"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

/**
 * Relations
 */
export const customersRelations = relations(customers, ({ many }) => ({
  projects: many(projects),
  estimates: many(estimates),
  invoices: many(invoices),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  customer: one(customers, { fields: [projects.customerId], references: [customers.id] }),
  crew: one(crews, { fields: [projects.crewId], references: [crews.id] }),
  photos: many(photos),
  damages: many(damages),
}));

export const estimatesRelations = relations(estimates, ({ one, many }) => ({
  project: one(projects, { fields: [estimates.projectId], references: [projects.id] }),
  customer: one(customers, { fields: [estimates.customerId], references: [customers.id] }),
  lineItems: many(estimateLineItems),
  specifications: one(roofSpecifications, { fields: [estimates.id], references: [roofSpecifications.estimateId] }),
}));

export const invoiceRelations = relations(invoices, ({ one }) => ({
  project: one(projects, { fields: [invoices.projectId], references: [projects.id] }),
  customer: one(customers, { fields: [invoices.customerId], references: [customers.id] }),
  estimate: one(estimates, { fields: [invoices.estimateId], references: [estimates.id] }),
}));
