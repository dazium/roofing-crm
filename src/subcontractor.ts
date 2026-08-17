import type { AppData, InvoiceStatus, SubcontractorAccount, SubcontractorContact, WorkOrder, WorkOrderStatus } from './types'

export const WORK_ORDER_STATUS_FLOW: WorkOrderStatus[] = [
  'New',
  'Reviewed',
  'Accepted',
  'Scheduled',
  'Assigned',
  'In Progress',
  'Waiting',
  'Completed',
  'Ready for Invoice',
  'Invoiced',
  'Partially Paid',
  'Paid',
  'Closed',
]

export function createSubcontractorAccount(overrides: Partial<SubcontractorAccount> = {}): SubcontractorAccount {
  const now = new Date().toISOString()
  return {
    id: overrides.id ?? crypto.randomUUID(),
    accountType: overrides.accountType ?? 'Subcontractor / Partner',
    name: overrides.name ?? '',
    legalName: overrides.legalName,
    shortName: overrides.shortName,
    address: overrides.address ?? '',
    phone: overrides.phone ?? '',
    email: overrides.email ?? '',
    website: overrides.website ?? '',
    status: overrides.status ?? 'Active',
    areasServed: overrides.areasServed ?? [],
    typicalWork: overrides.typicalWork ?? [],
    paymentTerms: overrides.paymentTerms ?? 'Net 30',
    standardLabourRate: overrides.standardLabourRate,
    insuranceRequirements: overrides.insuranceRequirements ?? '',
    wsibRequirements: overrides.wsibRequirements ?? '',
    safetyRequirements: overrides.safetyRequirements ?? '',
    specialInstructions: overrides.specialInstructions ?? '',
    notes: overrides.notes ?? '',
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
  }
}

export function createSubcontractorContact(accountId: string, overrides: Partial<SubcontractorContact> = {}): SubcontractorContact {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    accountId,
    name: overrides.name ?? '',
    role: overrides.role ?? 'Other',
    phone: overrides.phone ?? '',
    mobile: overrides.mobile ?? '',
    email: overrides.email ?? '',
    preferredContactMethod: overrides.preferredContactMethod,
    notes: overrides.notes ?? '',
    active: overrides.active ?? true,
  }
}

export function getSubcontractAccounts(data: AppData): SubcontractorAccount[] {
  return data.subcontractAccounts ?? []
}

export function getSubcontractContacts(data: AppData, accountId: string): SubcontractorContact[] {
  return (data.subcontractContacts ?? []).filter((contact) => contact.accountId === accountId)
}

export function getWorkOrdersForAccount(data: AppData, accountId: string): WorkOrder[] {
  return (data.workOrders ?? []).filter((workOrder) => workOrder.accountId === accountId)
}

export function getSubcontractFinancialSummary(data: AppData, accountId: string) {
  const workOrders = getWorkOrdersForAccount(data, accountId)
  const jobIds = new Set(workOrders.map((workOrder) => workOrder.jobId).filter(Boolean) as string[])
  const invoices = data.invoices.filter((invoice) => jobIds.has(invoice.jobId))
  const billed = invoices.reduce((sum, invoice) => sum + invoice.amount, 0)
  const paid = invoices.reduce((sum, invoice) => sum + invoice.paidAmount, 0)
  const outstanding = invoices.reduce((sum, invoice) => sum + invoice.balanceDue, 0)
  const overdue = invoices.filter((invoice) => invoice.status === 'Overdue').reduce((sum, invoice) => sum + invoice.balanceDue, 0)
  const completed = workOrders.filter((workOrder) => ['Completed', 'Ready for Invoice', 'Invoiced', 'Partially Paid', 'Paid', 'Closed'].includes(workOrder.status)).length

  return {
    workOrders: workOrders.length,
    activeWorkOrders: workOrders.filter((workOrder) => !['Completed', 'Closed', 'Cancelled', 'Paid'].includes(workOrder.status)).length,
    completedWorkOrders: completed,
    billed,
    paid,
    outstanding,
    overdue,
    invoices: invoices.length,
  }
}

export function getSubcontractDashboardSummary(data: AppData) {
  const workOrders = data.workOrders ?? []
  const readyForInvoice = workOrders.filter((workOrder) => workOrder.status === 'Ready for Invoice').length
  const active = workOrders.filter((workOrder) => !['Completed', 'Closed', 'Cancelled', 'Paid'].includes(workOrder.status)).length
  const callbacks = workOrders.filter((workOrder) => workOrder.status === 'Callback Required' || workOrder.callbackRequired).length
  const accountIds = new Set(workOrders.map((workOrder) => workOrder.accountId))
  const invoices = data.invoices
  const outstanding = invoices.reduce((sum, invoice) => sum + invoice.balanceDue, 0)
  const overdue = invoices.filter((invoice) => invoice.status === 'Overdue').reduce((sum, invoice) => sum + invoice.balanceDue, 0)

  return {
    accounts: getSubcontractAccounts(data).filter((account) => account.status === 'Active').length,
    activeWorkOrders: active,
    readyForInvoice,
    callbacks,
    outstanding,
    overdue,
    companiesWithWork: accountIds.size,
  }
}

export function isInvoiceOutstanding(status: InvoiceStatus): boolean {
  return !['Paid', 'Cancelled'].includes(status)
}

export function canAdvanceWorkOrderStatus(current: WorkOrderStatus, next: WorkOrderStatus): boolean {
  if (current === next) return true
  if (['Cancelled', 'Disputed'].includes(current)) return false
  if (['Callback Required'].includes(next)) return true
  const currentIndex = WORK_ORDER_STATUS_FLOW.indexOf(current)
  const nextIndex = WORK_ORDER_STATUS_FLOW.indexOf(next)
  if (currentIndex < 0 || nextIndex < 0) return false
  return nextIndex === currentIndex + 1
}
