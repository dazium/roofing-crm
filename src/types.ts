export type LeadStatus = 'New Lead' | 'Contacted' | 'Inspection Scheduled' | 'Estimate Sent' | 'Won' | 'Lost'
export type JobStatus = 'Scheduled' | 'In Progress' | 'Awaiting Final Review' | 'Complete' | 'Invoiced' | 'Paid'
export type View = 'dashboard' | 'customers' | 'companies' | 'work-orders' | 'inspect' | 'jobs' | 'photos' | 'damages' | 'estimates' | 'invoices' | 'tasks' | 'calendar' | 'locations' | 'crews' | 'crew-mode' | 'materials' | 'settings' | 'reports' | 'timesheets' | 'change-orders' | 'production' | 'fulfillment' | 'approvals' | 'profitability'
export type DamageType = 'Leak' | 'Shingle Damage' | 'Flashing' | 'Ventilation' | 'Animal Damage' | 'Storm Damage'
export type Urgency = 'Low' | 'Medium' | 'High' | 'Emergency'
export type PhotoCategory = 'Before' | 'Damage' | 'Progress' | 'After'
export type MaterialUnit = 'bundle' | 'roll' | 'piece' | 'lf' | 'sq'
export type MaterialCategory = 'Shingles' | 'Underlayment' | 'Ice & Water' | 'Flashing' | 'Ventilation' | 'Ridge' | 'Edge Metal' | 'Decking' | 'Repair'
export type CrewStatus = 'Active' | 'Inactive'
export type AppointmentType = 'Estimate' | 'Inspection' | 'Consultation' | 'Job Start' | 'Follow-up' | 'Other'
export type AppointmentStatus = 'Scheduled' | 'Completed' | 'Cancelled' | 'No Show'
export type DamageCategory = 'Missing Shingles' | 'Flashing Damage' | 'Leaks' | 'Sagging' | 'Rot' | 'Moss/Algae' | 'Hail Damage' | 'Wind Damage' | 'Other'
export type DamageSeverity = 'Cosmetic' | 'Minor' | 'Moderate' | 'Functional' | 'Severe' | 'Structural'
export type CompanyProfile = {
  name: string
  shortName: string
  tagline: string
  city: string
  phone: string
  email: string
  website: string
}

export type AccountType = 'Subcontractor / Partner' | 'Direct Customer'
export type SubcontractorAccountStatus = 'Active' | 'Inactive' | 'On Hold'
export type SubcontractorContactRole = 'Owner' | 'Project Manager' | 'Site Supervisor' | 'Dispatcher' | 'Estimator' | 'Accounts Payable' | 'Accounts Receivable' | 'Safety Coordinator' | 'Other'
export type SubcontractorContact = {
  id: string
  accountId: string
  name: string
  role: SubcontractorContactRole
  phone: string
  mobile: string
  email: string
  preferredContactMethod?: 'Phone' | 'Text' | 'Email'
  notes: string
  active: boolean
}
export type SubcontractorAccount = {
  id: string
  accountType: AccountType
  name: string
  legalName?: string
  shortName?: string
  address: string
  phone: string
  email: string
  website: string
  status: SubcontractorAccountStatus
  areasServed: string[]
  typicalWork: string[]
  paymentTerms: string
  standardLabourRate?: number
  insuranceRequirements: string
  wsibRequirements: string
  safetyRequirements: string
  specialInstructions: string
  notes: string
  createdAt: string
  updatedAt: string
}
export type JobSite = {
  id: string
  accountId?: string
  customerId?: string
  address: string
  propertyType: string
  siteContact: string
  sitePhone: string
  accessInstructions: string
  parkingInformation: string
  roofInformation: string
  safetyHazards: string
  requiredEquipment: string
  notes: string
  createdAt: string
  updatedAt: string
}
export type WorkOrderStatus = 'New' | 'Reviewed' | 'Accepted' | 'Scheduled' | 'Assigned' | 'In Progress' | 'Waiting' | 'Completed' | 'Ready for Invoice' | 'Invoiced' | 'Partially Paid' | 'Paid' | 'Closed' | 'Cancelled' | 'On Hold' | 'Disputed' | 'Callback Required'
export type WorkOrder = {
  id: string
  accountId: string
  jobId?: string
  jobSiteId?: string
  workOrderNumber: string
  purchaseOrderNumber?: string
  contactId?: string
  dateReceived: string
  requestedStartDate?: string
  deadline?: string
  jobType: string
  scopeOfWork: string
  materials: string
  labourRequirements: string
  crewRequirements: string
  specialInstructions: string
  estimatedValue: number
  agreedPrice: number
  status: WorkOrderStatus
  completionDate?: string
  completionNotes?: string
  deficiencyNotes?: string
  callbackRequired?: boolean
  createdAt: string
  updatedAt: string
}
export type SubcontractAccountDocument = {
  id: string
  accountId: string
  name: string
  fileName: string
  mimeType: string
  sizeBytes: number
  category: 'Contract' | 'Insurance' | 'WSIB/WCB' | 'Safety' | 'Blueprint' | 'Specification' | 'Other'
  dataUrl: string
  expiresAt?: string
  createdAt: string
}

export type Customer = { id: string; name: string; phone: string; email: string; address: string; notes: string; leadStatus: LeadStatus; source: string }
export type JobPriority = 'Low' | 'Normal' | 'High'
export type Job = { id: string; customerId: string; title: string; status: JobStatus; priority: JobPriority; scheduledFor: string; notes: string; crewId?: string; productionChecklist?: Record<string, boolean>; approvals?: { estimate?: string; contract?: string; completion?: string }; createdAt: string }
export type EstimateLineItem = { id: string; title: string; quantity: number; unit: string; unitPrice: number; total: number }
export type MaterialPriceSetting = { id: string; label: string; category: MaterialCategory; unit: MaterialUnit; price: number; supplier: string; updatedAt: string }
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

export type EstimateVersion = {
  id: string
  jobId: string
  label: string
  squareFeet: number
  squares: number
  materialCost: number
  laborCost: number
  totalPrice: number
  overheadCost: number
  profitMargin: number
  taxRate: number
  depositRequired: number
  scopeOfWork: string
  warranty: string
  timeline: string
  lineItems: EstimateLineItem[]
  createdAt: string
  createdBy?: string
  notes?: string
}
export type InvoiceStatus = 'Draft' | 'Sent' | 'Viewed' | 'Partial' | 'Paid' | 'Overdue' | 'Cancelled'
export type Invoice = { id: string; jobId: string; invoiceNumber: string; amount: number; paidAmount: number; balanceDue: number; status: InvoiceStatus; dueDate: string; issuedDate?: string; paidDate?: string; notes?: string }
export type InvoiceHistoryAction = 'Created' | 'Status Changed' | 'Payment Recorded' | 'Email Prepared' | 'Reminder Sent' | 'Auto Marked Overdue' | 'Deleted'
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
export type CommunicationType = 'Call' | 'Text' | 'Email' | 'Site Visit' | 'Note'
export type CommunicationEntry = {
  id: string
  customerId: string
  jobId?: string
  type: CommunicationType
  subject: string
  message: string
  createdAt: string
}
export type AttachmentType = 'Contract' | 'Warranty' | 'Permit' | 'Receipt' | 'Photo' | 'Other'
export type AttachmentEntry = {
  id: string
  customerId: string
  jobId?: string
  type: AttachmentType
  name: string
  fileName: string
  mimeType: string
  sizeBytes: number
  dataUrl: string
  createdAt: string
}
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
  members: CrewMember[];
  phone?: string;
  email?: string;
  status: CrewStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
export type CrewMember = {
  id: string;
  name: string;
  role?: string;
  phone?: string;
  email?: string;
  notes?: string;
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
  severity: DamageSeverity
  description: string
  location?: string
  estimatedCost?: number
  linkedPhotoIds: string[]
  materials: DamageMaterialItem[]
  createdAt: string
  updatedAt: string
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
  crewMembers?: CrewMember[];
  appointments: Appointment[];
  communications: CommunicationEntry[];
  attachments: AttachmentEntry[];
  damages: DamageRecord[];
  estimateVersions: EstimateVersion[];
  timeLogs: TimeLog[];
  changeOrders?: ChangeOrder[];
  materialOrders?: MaterialOrder[];
  subcontractAccounts?: SubcontractorAccount[];
  subcontractContacts?: SubcontractorContact[];
  jobSites?: JobSite[];
  workOrders?: WorkOrder[];
  subcontractDocuments?: SubcontractAccountDocument[];
}
export type MaterialOrderStatus = 'Requested' | 'Ordered' | 'Delivered' | 'Staged'
export type MaterialOrder = { id: string; jobId: string; material: string; quantity: number; unit: string; supplier: string; deliveryDate?: string; status: MaterialOrderStatus; createdAt: string }
export type ChangeOrderStatus = 'Draft' | 'Pending Approval' | 'Approved' | 'Rejected'
export type ChangeOrder = { id: string; jobId: string; title: string; reason: string; amount: number; status: ChangeOrderStatus; createdAt: string; notes?: string }
export type TimeEntry = {
  id: string;
  crewId: string;
  memberId?: string;
  date: string;
  punchInTime: string;
  punchOutTime?: string;
  durationMinutes?: number;
  breakMinutes?: number;
  breakStartTime?: string;
  approved?: boolean;
  notes?: string;
}

export type TimeLog = {
  id: string;
  crewId: string;
  date: string;
  entries: TimeEntry[];
  totalMinutes: number;
  dayStartedAt?: string;
  dayStoppedAt?: string;
  dayActive?: boolean;
}

export type PlaneStats = { rawArea: number; slopeFactor: number; adjustedArea: number; squares: number }
