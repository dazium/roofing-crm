export type LeadStatus = 'New Lead' | 'Contacted' | 'Inspection Scheduled' | 'Estimate Sent' | 'Won' | 'Lost'
export type JobStatus = 'Scheduled' | 'In Progress' | 'Awaiting Final Review' | 'Complete' | 'Invoiced' | 'Paid'
export type View = 'dashboard' | 'customers' | 'inspect' | 'jobs' | 'estimates' | 'invoices' | 'settings'
export type DamageType = 'Leak' | 'Shingle Damage' | 'Flashing' | 'Ventilation' | 'Animal Damage' | 'Storm Damage'
export type Urgency = 'Low' | 'Medium' | 'High' | 'Emergency'
export type PhotoCategory = 'Before' | 'Damage' | 'Progress' | 'After'
export type MaterialUnit = 'bundle' | 'roll' | 'piece' | 'lf' | 'sq'

export type Customer = { id: string; name: string; phone: string; email: string; address: string; notes: string; leadStatus: LeadStatus; source: string }
export type JobPriority = 'Low' | 'Normal' | 'High'
export type Job = { id: string; customerId: string; title: string; status: JobStatus; priority: JobPriority; scheduledFor: string; notes: string; createdAt: string }
export type EstimateLineItem = { id: string; title: string; quantity: number; unit: string; unitPrice: number; total: number }
export type MaterialPriceSetting = { id: string; label: string; unit: MaterialUnit; price: number; supplier: string; updatedAt: string }
export type RoofPlane = { id: string; label: string; length: number; width: number; pitch: string; facet: string }
export type Estimate = {
  id: string; jobId: string; squareFeet: number; squares: number; materialCost: number; laborCost: number; totalPrice: number; overheadCost: number; profitMargin: number; taxRate: number; depositRequired: number; scopeOfWork: string; warranty: string; timeline: string; lineItems: EstimateLineItem[]
}
export type InvoiceStatus = 'Draft' | 'Sent' | 'Partial' | 'Paid' | 'Overdue'
export type Invoice = { id: string; jobId: string; invoiceNumber: string; amount: number; paidAmount: number; balanceDue: number; status: InvoiceStatus; dueDate: string; issuedDate?: string; paidDate?: string; notes?: string }
export type InspectionPhoto = { id: string; label: string; category: PhotoCategory; dataUrl: string; sizeBytes?: number; width?: number; height?: number }
export type Measurements = { squares: number; ridgeLength: number; valleyLength: number; eavesLength: number; rakeLength: number; wasteFactor: number }
export type Inspection = {
  id: string; customerId: string; roofType: string; roofAge: string; pitch: string; stories: string; damageType: DamageType; urgency: Urgency; leakActive: boolean; deckingConcern: boolean; flashingConcern: boolean; ventilationConcern: boolean; insuranceClaim: boolean; summary: string; recommendation: string; measurements: Measurements; roofPlanes: RoofPlane[]; photos: InspectionPhoto[]; createdAt: string
}
export type AppData = { customers: Customer[]; jobs: Job[]; estimates: Estimate[]; invoices: Invoice[]; inspections: Inspection[]; materialPrices: MaterialPriceSetting[] }
export type PlaneStats = { rawArea: number; slopeFactor: number; adjustedArea: number; squares: number }
