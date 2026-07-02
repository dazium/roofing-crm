import type { AppData, Customer, DamageRecord, Estimate, Inspection, Invoice, Job, ProjectTask } from './types'

export type AppLookupResult = {
  customer: Customer | null
  job: Job | null
  inspection: Inspection | null
  estimate: Estimate | null
  invoice: Invoice | null
}

export function findCustomer(data: AppData, customerId: string | null | undefined) {
  return customerId ? data.customers.find((customer) => customer.id === customerId) ?? null : null
}

export function findJob(data: AppData, jobId: string | null | undefined) {
  return jobId ? data.jobs.find((job) => job.id === jobId) ?? null : null
}

export function jobsForCustomer(data: AppData, customerId: string | null | undefined): Job[] {
  return customerId ? data.jobs.filter((job) => job.customerId === customerId) : []
}

export function firstJobForCustomer(data: AppData, customerId: string | null | undefined) {
  return jobsForCustomer(data, customerId)[0] ?? null
}

export function findInspectionForCustomer(data: AppData, customerId: string | null | undefined) {
  return customerId ? data.inspections.find((inspection) => inspection.customerId === customerId) ?? null : null
}

export function findEstimateForJob(data: AppData, jobId: string | null | undefined) {
  return jobId ? data.estimates.find((estimate) => estimate.jobId === jobId) ?? null : null
}

export function findInvoiceForJob(data: AppData, jobId: string | null | undefined) {
  return jobId ? data.invoices.find((invoice) => invoice.jobId === jobId) ?? null : null
}

export function findInvoiceById(data: AppData, invoiceId: string | null | undefined) {
  return invoiceId ? data.invoices.find((invoice) => invoice.id === invoiceId) ?? null : null
}

export function findCrewById(data: AppData, crewId: string | null | undefined) {
  return crewId ? data.crews.find((crew) => crew.id === crewId) ?? null : null
}

export function buildAppLookup(data: AppData, customerId: string | null | undefined, jobId: string | null | undefined): AppLookupResult {
  const job = findJob(data, jobId)
  const resolvedCustomerId = job?.customerId ?? customerId ?? null

  return {
    customer: findCustomer(data, resolvedCustomerId),
    job,
    inspection: findInspectionForCustomer(data, resolvedCustomerId),
    estimate: findEstimateForJob(data, job?.id ?? jobId),
    invoice: findInvoiceForJob(data, job?.id ?? jobId),
  }
}

export function damagesForSelection(data: AppData, customerId: string | null | undefined, jobId: string | null | undefined): DamageRecord[] {
  return data.damages.filter((damage) => damage.jobId === jobId || (!jobId && damage.customerId === customerId))
}

export function tasksForSelection(data: AppData, customerId: string | null | undefined, jobId: string | null | undefined): ProjectTask[] {
  return data.tasks.filter((task) => task.jobId === jobId || (!jobId && task.customerId === customerId))
}

export type DashboardActivityItem = {
  id: string
  title: string
  detail: string
  meta: string
  type: 'customer' | 'job' | 'inspection' | 'estimate' | 'invoice'
  when: string
  customerId?: string
  jobId?: string
}

function formatMoney(value: number): string {
  return `$${value.toFixed(2)}`
}

export function buildDashboardActivity(data: AppData, limit = 8): DashboardActivityItem[] {
  const customerEvents: DashboardActivityItem[] = data.customers.map((customer) => ({
    id: `customer-${customer.id}`,
    title: `Lead: ${customer.name}`,
    detail: customer.address,
    meta: `${customer.leadStatus} \u00b7 ${customer.source}`,
    type: 'customer',
    when: customer.id,
    customerId: customer.id,
  }))

  const jobEvents: DashboardActivityItem[] = data.jobs.map((job) => {
    const customer = findCustomer(data, job.customerId)
    return {
      id: `job-${job.id}`,
      title: `Project: ${job.title}`,
      detail: `${customer?.name ?? 'Unknown customer'} \u00b7 ${job.status}`,
      meta: `${job.scheduledFor || 'No date set'} \u00b7 ${job.priority} priority`,
      type: 'job',
      when: job.createdAt,
      jobId: job.id,
    }
  })

  const inspectionEvents: DashboardActivityItem[] = data.inspections.map((inspection) => {
    const customer = findCustomer(data, inspection.customerId)
    const job = data.jobs.find((entry) => entry.customerId === inspection.customerId)
    return {
      id: `inspection-${inspection.id}`,
      title: 'Inspection saved',
      detail: `${customer?.name ?? 'Unknown customer'} \u00b7 ${inspection.damageType}`,
      meta: `${inspection.urgency} urgency \u00b7 ${inspection.measurements.squares} squares`,
      type: 'inspection',
      when: inspection.createdAt,
      customerId: inspection.customerId,
      jobId: job?.id,
    }
  })

  const estimateEvents: DashboardActivityItem[] = data.estimates.map((estimate) => {
    const job = findJob(data, estimate.jobId)
    const customer = findCustomer(data, job?.customerId)
    return {
      id: `estimate-${estimate.id}`,
      title: 'Estimate ready',
      detail: `${customer?.name ?? 'Unknown customer'} \u00b7 ${job?.title ?? 'Unknown project'}`,
      meta: `${formatMoney(estimate.totalPrice)} \u00b7 ${estimate.lineItems.length} line items`,
      type: 'estimate',
      when: estimate.id,
      customerId: customer?.id,
      jobId: estimate.jobId,
    }
  })

  const invoiceEvents: DashboardActivityItem[] = data.invoices.map((invoice) => {
    const job = findJob(data, invoice.jobId)
    const customer = findCustomer(data, job?.customerId)
    return {
      id: `invoice-${invoice.id}`,
      title: `Invoice ${invoice.invoiceNumber}`,
      detail: `${customer?.name ?? 'Unknown customer'} \u00b7 ${invoice.status}`,
      meta: `${formatMoney(invoice.balanceDue)} balance \u00b7 due ${invoice.dueDate || 'not set'}`,
      type: 'invoice',
      when: invoice.issuedDate ?? invoice.id,
      customerId: customer?.id,
      jobId: invoice.jobId,
    }
  })

  return [...jobEvents, ...inspectionEvents, ...invoiceEvents, ...estimateEvents, ...customerEvents]
    .sort((a, b) => b.when.localeCompare(a.when))
    .slice(0, limit)
}