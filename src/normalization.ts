import { seedData } from './data'
import { inferMaterialCategory } from './lib'
import type { AppData } from './types'

export function normalizeAppData(partial?: Partial<AppData> | null): AppData {
  const normalized: AppData = {
    companyProfile: partial?.companyProfile ?? seedData.companyProfile,
    customers: partial?.customers ?? seedData.customers,
    jobs: partial?.jobs ?? seedData.jobs,
    estimates: partial?.estimates ?? seedData.estimates,
    invoices: (partial?.invoices ?? seedData.invoices).map((invoice) => {
      const amount = Number(invoice.amount) || 0
      const paidAmount = Math.min(amount, Math.max(0, Number(invoice.paidAmount ?? (invoice.status === 'Paid' ? amount : 0)) || 0))
      return {
        ...invoice,
        paidAmount,
        balanceDue: Math.max(0, amount - paidAmount),
      }
    }),
    invoiceHistory: partial?.invoiceHistory ?? [],
    inspections: partial?.inspections ?? seedData.inspections,
    materialPrices: (partial?.materialPrices ?? seedData.materialPrices).map((material) => ({
      ...material,
      category: material.category ?? inferMaterialCategory(`${material.id} ${material.label}`),
    })),
    materialPriceHistory: partial?.materialPriceHistory ?? [],
    tasks: partial?.tasks ?? seedData.tasks,
    crews: (partial?.crews ?? seedData.crews).map((crew) => ({
      ...crew,
      members: Array.isArray(crew.members) ? crew.members : [],
    })),
    appointments: partial?.appointments ?? seedData.appointments,
    communications: partial?.communications ?? seedData.communications,
    attachments: partial?.attachments ?? seedData.attachments,
    damages: partial?.damages ?? seedData.damages,
    estimateVersions: partial?.estimateVersions ?? seedData.estimateVersions ?? [],
    timeLogs: partial?.timeLogs ?? seedData.timeLogs,
  }

  const hasCustomerOne = normalized.customers.some((customer) => customer.id === 'cust-1')
  const hasInspectionForCustomerOne = normalized.inspections.some((inspection) => inspection.customerId === 'cust-1')

  if (hasCustomerOne && !hasInspectionForCustomerOne) {
    const fallbackInspection = seedData.inspections.find((inspection) => inspection.customerId === 'cust-1')
    if (fallbackInspection) {
      normalized.inspections = [fallbackInspection, ...normalized.inspections]
    }
  }

  return normalized
}

export type AppDataValidationIssue = {
  section: keyof AppData | 'root'
  message: string
}

const REQUIRED_COLLECTIONS: Array<{ key: keyof AppData; label: string; allowEmpty: boolean }> = [
  { key: 'companyProfile', label: 'companyProfile', allowEmpty: false },
  { key: 'customers', label: 'customers', allowEmpty: false },
  { key: 'jobs', label: 'jobs', allowEmpty: true },
  { key: 'estimates', label: 'estimates', allowEmpty: true },
  { key: 'invoices', label: 'invoices', allowEmpty: true },
  { key: 'invoiceHistory', label: 'invoiceHistory', allowEmpty: true },
  { key: 'inspections', label: 'inspections', allowEmpty: true },
  { key: 'materialPrices', label: 'materialPrices', allowEmpty: true },
  { key: 'materialPriceHistory', label: 'materialPriceHistory', allowEmpty: true },
  { key: 'tasks', label: 'tasks', allowEmpty: true },
  { key: 'crews', label: 'crews', allowEmpty: true },
  { key: 'appointments', label: 'appointments', allowEmpty: true },
  { key: 'communications', label: 'communications', allowEmpty: true },
  { key: 'attachments', label: 'attachments', allowEmpty: true },
  { key: 'damages', label: 'damages', allowEmpty: true },
  { key: 'estimateVersions', label: 'estimateVersions', allowEmpty: true },
  { key: 'timeLogs', label: 'timeLogs', allowEmpty: true },
]

export function validateAppDataImport(input: unknown): { ok: true } | { ok: false; issues: AppDataValidationIssue[] } {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { ok: false, issues: [{ section: 'root', message: 'Backup root must be a JSON object.' }] }
  }

  const record = input as Record<string, unknown>
  const issues: AppDataValidationIssue[] = []

  for (const collection of REQUIRED_COLLECTIONS) {
    const value = record[collection.key]
    if (collection.key === 'companyProfile') {
      if (!value || typeof value !== 'object') {
        issues.push({ section: collection.key, message: 'Company profile is missing or not an object.' })
      }
      continue
    }
    if (value !== undefined && !Array.isArray(value)) {
      issues.push({ section: collection.key, message: `${collection.label} must be an array if present.` })
    }
    if (value === undefined && !collection.allowEmpty) {
      issues.push({ section: collection.key, message: `${collection.label} is required in a backup.` })
    }
  }

  return issues.length ? { ok: false, issues } : { ok: true }
}
