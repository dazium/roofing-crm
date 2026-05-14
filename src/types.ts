export type LeadStatus = 'New Lead' | 'Contacted' | 'Inspection Scheduled' | 'Estimate Sent' | 'Won' | 'Lost'
export type JobStatus = 'Scheduled' | 'In Progress' | 'Awaiting Final Review' | 'Complete' | 'Invoiced' | 'Paid'
export type View = 'dashboard' | 'customers' | 'inspect' | 'jobs' | 'photos' | 'damages' | 'estimates' | 'invoices' | 'tasks' | 'calendar' | 'locations' | 'crews' | 'crew-mode' | 'settings'
export type DamageType = 'Leak' | 'Shingle Damage' | 'Flashing' | 'Ventilation' | 'Animal Damage' | 'Storm Damage'
export type Urgency = 'Low' | 'Medium' | 'High' | 'Emergency'
export type PhotoCategory = 'Before' | 'Damage' | 'Progress' | 'After'
export type MaterialUnit = 'bundle' | 'roll' | 'piece' | 'lf' | 'sq'
export type CrewStatus = 'Active' | 'Inactive'
export type AppointmentType = 'Estimate' | 'Inspection' | 'Consultation' | 'Job Start' | 'Follow-up' | 'Other'
export type AppointmentStatus = 'Scheduled' | 'Completed' | 'Cancelled' | 'No Show'
export type DamageCategory = 'Missing Shingles' | 'Flashing Damage' | 'Leaks' | 'Sagging' | 'Rot' | 'Moss/Algae' | 'Hail Damage' | 'Wind Damage' | 'Other'
export type DamageSeverity = 'Minor' | 'Moderate' | 'Severe'
export type CompanyProfile = {
  name: string
  shortName: string
  tagline: string
  city: string
  phone: string
  email: string
  website: string
}

export type Customer = { id: string; name: string; phone: string; email: string; address: string; notes: string; leadStatus: LeadStatus; source: string }
export type JobPriority = 'Low' | 'Normal' | 'High'
export type Job = { id: string; customerId: string; title: string; status: JobStatus; priority: JobPriority; scheduledFor: string; notes: string; crewId?: string; createdAt: string }
export type EstimateLineItem = { id: string; title: string; quantity: number; unit: string; unitPrice: number; total: number }
export type MaterialPriceSetting = { id: string; label: string; unit: MaterialUnit; price: number; supplier: string; updatedAt: string }
export type MaterialPriceHistoryEntry = {
  id: string;
  materialId: string;
  materialLabel: string;
  product: string;
  price: number;
  unit: string;
  store: string;
  scrapedAt: string;
  recordedAt: string;
}
export type RoofPlane = { id: string; label: string; length: number; width: number; pitch: string; facet: string }
export type Estimate = {
  id: string; jobId: string; squareFeet: number; squares: number; materialCost: number; laborCost: number; totalPrice: number; overheadCost: number; profitMargin: number; taxRate: number; depositRequired: number; scopeOfWork: string; warranty: string; timeline: string; lineItems: EstimateLineItem[]
}
export type InvoiceStatus = 'Draft' | 'Sent' | 'Partial' | 'Paid' | 'Overdue'
export type Invoice = { id: string; jobId: string; invoiceNumber: string; amount: number; paidAmount: number; balanceDue: number; status: InvoiceStatus; dueDate: string; issuedDate?: string; paidDate?: string; notes?: string }
export type InvoiceHistoryAction = 'Created' | 'Status Changed' | 'Payment Recorded' | 'Reminder Sent' | 'Auto Marked Overdue' | 'Deleted'
export type InvoiceHistoryEntry = {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  jobId: string;
  action: InvoiceHistoryAction;
  message: string;
  createdAt: string;
}
export type InspectionPhoto = { id: string; label: string; category: PhotoCategory; dataUrl: string; sizeBytes?: number; width?: number; height?: number }
export type Measurements = { squares: number; ridgeLength: number; valleyLength: number; eavesLength: number; rakeLength: number; wasteFactor: number }
export type Inspection = {
  id: string; customerId: string; roofType: string; roofAge: string; pitch: string; stories: string; damageType: DamageType; urgency: Urgency; leakActive: boolean; deckingConcern: boolean; flashingConcern: boolean; ventilationConcern: boolean; insuranceClaim: boolean; summary: string; recommendation: string; measurements: Measurements; roofPlanes: RoofPlane[]; photos: InspectionPhoto[]; createdAt: string
}
export type ChecklistItem = {
  id: string;
  label: string;
  done: boolean;
}
export type TaskPriority = 'Low' | 'Normal' | 'High';
export type TaskStatus = 'To Do' | 'In Progress' | 'Blocked' | 'Done';
export type ProjectTask = {
  id: string;
  customerId: string;
  jobId?: string;
  title: string;
  details: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate?: string;
  assignee?: string;
  checklist: ChecklistItem[];
  createdAt: string;
  updatedAt: string;
}
export type Crew = {
  id: string;
  name: string;
  crewLead?: string;
  phone?: string;
  email?: string;
  status: CrewStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
export type Appointment = {
  id: string;
  customerId?: string;
  jobId?: string;
  title: string;
  description?: string;
  type: AppointmentType;
  status: AppointmentStatus;
  startAt: string;
  endAt: string;
  location?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
export type DamageMaterialItem = {
  materialId: string;
  quantity: number;
}
export type DamageRecord = {
  id: string;
  customerId: string;
  jobId?: string;
  category: DamageCategory;
  severity: DamageSeverity;
  description: string;
  location?: string;
  estimatedCost?: number;
  linkedPhotoIds: string[];
  materials: DamageMaterialItem[];
  createdAt: string;
  updatedAt: string;
}
export type AppData = {
  companyProfile: CompanyProfile;
  customers: Customer[];
  jobs: Job[];
  estimates: Estimate[];
  invoices: Invoice[];
  invoiceHistory: InvoiceHistoryEntry[];
  inspections: Inspection[];
  materialPrices: MaterialPriceSetting[];
  materialPriceHistory: MaterialPriceHistoryEntry[];
  tasks: ProjectTask[];
  crews: Crew[];
  appointments: Appointment[];
  damages: DamageRecord[];
}
export type PlaneStats = { rawArea: number; slopeFactor: number; adjustedArea: number; squares: number }
