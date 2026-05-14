import { seedData } from './data'
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
    materialPrices: partial?.materialPrices ?? seedData.materialPrices,
    materialPriceHistory: partial?.materialPriceHistory ?? [],
    tasks: partial?.tasks ?? seedData.tasks,
    crews: partial?.crews ?? seedData.crews,
    appointments: partial?.appointments ?? seedData.appointments,
    damages: partial?.damages ?? seedData.damages,
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
