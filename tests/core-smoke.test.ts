import { describe, expect, it } from 'vitest'
import { buildEstimateLineItemsFromDamages, buildEstimateLineItemsFromPlan, calcMaterialPlan, canTransitionLeadStatus, recommendedLeadStatus, reconcileInvoice, ROOF_TEMPLATES, roofComplexityLabel, slopeFactorFromPitch, validateLeadWorkflowStatus } from '../src/lib'
import { seedData } from '../src/data'
import { normalizeAppData } from '../src/normalization'

describe('invoice reconciliation smoke', () => {
  it('clamps paid amount and computes balance/status', () => {
    const invoice = reconcileInvoice({
      id: 'inv-test',
      jobId: 'job-test',
      invoiceNumber: 'INV-9999',
      amount: 1000,
      paidAmount: 1300,
      balanceDue: 0,
      status: 'Sent',
      dueDate: '2099-01-01',
    })

    expect(invoice.paidAmount).toBe(1000)
    expect(invoice.balanceDue).toBe(0)
    expect(invoice.status).toBe('Paid')
  })
})

describe('roof math smoke', () => {
  it('parses pitch and computes practical material plan numbers', () => {
    const factor = slopeFactorFromPitch('6/12')
    expect(factor).toBeGreaterThan(1)

    const plan = calcMaterialPlan({
      squares: 24,
      ridgeLength: 42,
      valleyLength: 18,
      eavesLength: 64,
      rakeLength: 40,
      wasteFactor: 10,
    }, '6/12')

    expect(plan.effectiveSquares).toBeGreaterThan(24)
    expect(plan.bundles).toBeGreaterThan(0)
    expect(plan.starter).toBeGreaterThan(0)
    expect(plan.dripEdgePieces).toBeGreaterThan(0)
  })

  it('provides roof templates and complexity labels', () => {
    expect(ROOF_TEMPLATES.length).toBeGreaterThan(2)
    expect(roofComplexityLabel(ROOF_TEMPLATES[2].measurements, ROOF_TEMPLATES[2].pitch)).toBe('Very Complex')
  })
})

describe('estimate generation smoke', () => {
  it('creates line items and splits labour vs material costs', () => {
    const { lineItems, materialCost, laborCost } = buildEstimateLineItemsFromPlan(
      {
        squares: 24,
        ridgeLength: 42,
        valleyLength: 18,
        eavesLength: 64,
        rakeLength: 40,
        wasteFactor: 10,
      },
      '6/12',
      seedData.materialPrices,
      () => 'id-' + Math.random().toString(36).slice(2, 8),
    )

    expect(lineItems.length).toBeGreaterThan(5)
    expect(materialCost).toBeGreaterThan(0)
    expect(laborCost).toBeGreaterThan(0)
    expect(lineItems.some((item) => item.title === 'Labour')).toBe(true)
  })

  it('aggregates damage material allocations into estimate line items', () => {
    const { lineItems, materialCost } = buildEstimateLineItemsFromDamages([
      {
        ...seedData.damages[0],
        materials: [
          { materialId: 'mat-shingles', quantity: 2 },
          { materialId: 'mat-shingles', quantity: 3 },
          { materialId: 'mat-ridge-cap', quantity: 1 },
        ],
      },
    ], seedData.materialPrices, () => 'id-test')

    const shingles = lineItems.find((item) => item.title === 'Architectural shingles')
    expect(shingles?.quantity).toBe(5)
    expect(lineItems.length).toBe(2)
    expect(materialCost).toBeGreaterThan(0)
  })
})

describe('storage normalization smoke', () => {
  it('heals missing fields and enforces numeric invoice bounds', () => {
    const normalized = normalizeAppData({
      customers: [{ ...seedData.customers[0] }],
      inspections: [],
      invoices: [{
        ...seedData.invoices[0],
        amount: 500,
        paidAmount: 700,
      }],
    })

    expect(normalized.materialPriceHistory).toEqual([])
    expect(normalized.invoiceHistory).toEqual([])
    expect(normalized.inspections.length).toBeGreaterThan(0)
    expect(normalized.invoices[0].paidAmount).toBe(500)
    expect(normalized.invoices[0].balanceDue).toBe(0)
  })
})

describe('lead workflow status smoke', () => {
  it('blocks direct jump from New Lead to Won and recommends a better stage', () => {
    expect(canTransitionLeadStatus('New Lead', 'Won')).toBe(false)
    const recommendation = recommendedLeadStatus({
      hasJob: true,
      hasInspection: true,
      hasEstimate: true,
      hasInvoice: false,
      hasPaidInvoice: false,
    })
    expect(recommendation).toBe('Estimate Sent')

    const validation = validateLeadWorkflowStatus('Won', {
      hasJob: false,
      hasInspection: false,
      hasEstimate: false,
      hasInvoice: false,
      hasPaidInvoice: false,
    })
    expect(validation.valid).toBe(false)
  })
})

describe('overdue status smoke', () => {
  it('marks sent invoice as overdue when due date is in the past', () => {
    const invoice = reconcileInvoice({
      id: 'inv-overdue',
      jobId: 'job-test',
      invoiceNumber: 'INV-8888',
      amount: 1000,
      paidAmount: 0,
      balanceDue: 1000,
      status: 'Sent',
      dueDate: '2000-01-01',
    })

    expect(invoice.status).toBe('Overdue')
  })
})
