import { describe, expect, it } from 'vitest'
import { canAdvanceWorkOrderStatus, createSubcontractorAccount, getSubcontractDashboardSummary, getSubcontractFinancialSummary } from './subcontractor'
import type { AppData } from './types'

const baseData = (): AppData => ({
  companyProfile: { name: 'Munro and Sons', shortName: 'M&S', tagline: '', city: 'Windsor', phone: '', email: '', website: '' },
  customers: [],
  jobs: [],
  estimates: [],
  invoices: [],
  invoiceHistory: [],
  inspections: [],
  materialPrices: [],
  materialPriceHistory: [],
  tasks: [],
  crews: [],
  appointments: [],
  communications: [],
  attachments: [],
  damages: [],
  estimateVersions: [],
  timeLogs: [],
  subcontractAccounts: [],
  subcontractContacts: [],
  jobSites: [],
  workOrders: [],
  subcontractDocuments: [],
})

describe('subcontractor workflow', () => {
  it('creates a partner account with safe defaults', () => {
    const account = createSubcontractorAccount({ name: 'ABC Roofing' })
    expect(account.accountType).toBe('Subcontractor / Partner')
    expect(account.status).toBe('Active')
    expect(account.paymentTerms).toBe('Net 30')
    expect(account.name).toBe('ABC Roofing')
  })

  it('calculates account financial totals from linked invoices', () => {
    const data = baseData()
    const account = createSubcontractorAccount({ id: 'acct-1', name: 'ABC Roofing' })
    data.subcontractAccounts = [account]
    data.workOrders = [{
      id: 'wo-1', accountId: 'acct-1', jobId: 'job-1', workOrderNumber: 'WO-1001', dateReceived: '2026-08-01',
      jobType: 'Shingles', scopeOfWork: 'Roof replacement', materials: '', labourRequirements: '', crewRequirements: '',
      specialInstructions: '', estimatedValue: 5000, agreedPrice: 4500, status: 'Invoiced', createdAt: '2026-08-01', updatedAt: '2026-08-01'
    }]
    data.invoices = [{ id: 'inv-1', jobId: 'job-1', invoiceNumber: 'INV-1001', amount: 4500, paidAmount: 3000, balanceDue: 1500, status: 'Sent', dueDate: '2026-08-31' }]

    expect(getSubcontractFinancialSummary(data, 'acct-1')).toMatchObject({ workOrders: 1, billed: 4500, paid: 3000, outstanding: 1500 })
  })

  it('exposes subcontract dashboard counts', () => {
    const data = baseData()
    data.subcontractAccounts = [createSubcontractorAccount({ id: 'acct-1', name: 'ABC Roofing' })]
    data.workOrders = [{
      id: 'wo-1', accountId: 'acct-1', workOrderNumber: 'WO-1001', dateReceived: '2026-08-01', jobType: 'Repair', scopeOfWork: 'Repair',
      materials: '', labourRequirements: '', crewRequirements: '', specialInstructions: '', estimatedValue: 1000, agreedPrice: 900,
      status: 'Ready for Invoice', createdAt: '2026-08-01', updatedAt: '2026-08-01'
    }]

    expect(getSubcontractDashboardSummary(data)).toMatchObject({ accounts: 1, activeWorkOrders: 1, readyForInvoice: 1, companiesWithWork: 1 })
  })

  it('only permits normal sequential status progression', () => {
    expect(canAdvanceWorkOrderStatus('New', 'Reviewed')).toBe(true)
    expect(canAdvanceWorkOrderStatus('New', 'In Progress')).toBe(false)
    expect(canAdvanceWorkOrderStatus('In Progress', 'Callback Required')).toBe(true)
  })
})
