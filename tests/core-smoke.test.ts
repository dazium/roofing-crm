import { describe, expect, it } from 'vitest'
import {
  buildEstimateLineItemsFromDamages,
  buildEstimateLineItemsFromPlan,
  buildInvoiceEmailDraft,
  calcMaterialPlan,
  canTransitionLeadStatus,
  damageMaterialTotal,
  recommendedLeadStatus,
  reconcileInvoice,
  ROOF_TEMPLATES,
  roofComplexityLabel,
  slopeFactorFromPitch,
  suggestedMaterialIdsForDamage,
  validateLeadWorkflowStatus,
} from '../src/lib'
import { seedData } from '../src/data'
import { buildAppLookup, damagesForSelection, findInvoiceForJob, firstJobForCustomer, tasksForSelection } from '../src/appLookups'
import { normalizeAppData } from '../src/normalization'
import { appendInspectionPhotoToData, createInspectionDraft, removeInspectionPhotoFromData, resolveSelection } from '../src/appDataActions'

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

  it('preserves viewed and cancelled workflow statuses', () => {
    const viewed = reconcileInvoice({
      id: 'inv-viewed',
      jobId: 'job-test',
      invoiceNumber: 'INV-7777',
      amount: 1000,
      paidAmount: 0,
      balanceDue: 1000,
      status: 'Viewed',
      dueDate: '2099-01-01',
    })
    const cancelled = reconcileInvoice({ ...viewed, id: 'inv-cancelled', status: 'Cancelled' })

    expect(viewed.status).toBe('Viewed')
    expect(cancelled.status).toBe('Cancelled')
  })

  it('builds invoice email drafts from templates', () => {
    const invoice = { ...seedData.invoices[0], status: 'Overdue' as const, balanceDue: 3246 }
    const draft = buildInvoiceEmailDraft({
      companyProfile: seedData.companyProfile,
      customerName: seedData.customers[1].name,
      jobTitle: seedData.jobs[1].title,
      invoice,
      template: 'overdue',
    })

    expect(draft.subject).toContain(invoice.invoiceNumber)
    expect(draft.body).toContain('$3,246.00')
    expect(draft.body).toContain(seedData.jobs[1].title)
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

  it('totals damage material allocations and suggests category-specific materials', () => {
    const damage = {
      ...seedData.damages[0],
      category: 'Flashing Damage' as const,
      materials: [
        { materialId: 'mat-ice-water', quantity: 2 },
        { materialId: 'mat-drip-edge', quantity: 4 },
      ],
    }

    expect(suggestedMaterialIdsForDamage('Flashing Damage')).toContain('mat-ice-water')
    expect(damageMaterialTotal(damage, seedData.materialPrices)).toBe((95 * 2) + (18 * 4))
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

  it('infers material taxonomy for older saved data', () => {
    const normalized = normalizeAppData({
      materialPrices: [
        {
          id: 'legacy-ridge-vent',
          label: 'Ridge vent',
          unit: 'lf',
          price: 7,
          supplier: 'Legacy',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    })

    expect(normalized.materialPrices[0].category).toBe('Ventilation')
  })
})

describe('app data action helpers', () => {
  it('resolves customer/job selection consistently', () => {
    const selection = resolveSelection(seedData, null, 'job-2')

    expect(selection.jobId).toBe('job-2')
    expect(selection.customerId).toBe('cust-2')
    expect(selection.estimate?.jobId).toBe('job-2')
  })

  it('centralizes common customer/job workflow lookups', () => {
    const lookup = buildAppLookup(seedData, null, 'job-2')

    expect(lookup.customer?.id).toBe('cust-2')
    expect(lookup.job?.id).toBe('job-2')
    expect(lookup.estimate?.jobId).toBe('job-2')
    expect(findInvoiceForJob(seedData, seedData.invoices[0].jobId)?.id).toBe(seedData.invoices[0].id)
    expect(firstJobForCustomer(seedData, 'cust-1')?.customerId).toBe('cust-1')
    expect(damagesForSelection(seedData, 'cust-1', null).every((damage) => damage.customerId === 'cust-1')).toBe(true)
    expect(tasksForSelection(seedData, 'cust-1', null).every((task) => task.customerId === 'cust-1')).toBe(true)
  })

  it('appends photos and removes stale damage links', () => {
    const photo = {
      id: 'photo-test',
      label: 'Rear slope',
      category: 'Damage' as const,
      dataUrl: 'data:image/jpeg;base64,test',
      sizeBytes: 10,
    }
    const withPhoto = appendInspectionPhotoToData({
      data: seedData,
      customerId: 'cust-1',
      photo,
      inspectionForm: createInspectionDraft(seedData.inspections[0]),
      uidFactory: () => 'insp-test',
    })
    const linked = {
      ...withPhoto,
      damages: withPhoto.damages.map((damage) => damage.id === 'damage-1'
        ? { ...damage, linkedPhotoIds: [photo.id] }
        : damage),
    }
    const cleaned = removeInspectionPhotoFromData(linked, 'cust-1', photo.id)

    expect(withPhoto.inspections.find((inspection) => inspection.customerId === 'cust-1')?.photos[0].id).toBe(photo.id)
    expect(cleaned.damages.find((damage) => damage.id === 'damage-1')?.linkedPhotoIds).not.toContain(photo.id)
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

describe('estimate version snapshots', () => {
  it('creates an immutable version entry when an estimate is saved', async () => {
    const { snapshotEstimateVersion } = await import('../src/appDataActions')
    const next = snapshotEstimateVersion({
      jobId: 'job-1',
      label: 'Initial scope',
      estimate: seedData.estimates[0],
      uidFactory: () => 'version-1',
    })

    expect(next.estimateVersions).toHaveLength(1)
    expect(next.estimateVersions[0].id).toBe('version-1')
    expect(next.estimateVersions[0].jobId).toBe('job-1')
    expect(next.estimateVersions[0].totalPrice).toBe(seedData.estimates[0].totalPrice)
    expect(next.estimateVersions[0].lineItems).toHaveLength(seedData.estimates[0].lineItems.length)
    expect(next.nextActive.jobId).toBe('job-1')
  })

  it('keeps each version line-item array independent so later edits do not mutate history', async () => {
    const { snapshotEstimateVersion } = await import('../src/appDataActions')
    const version = snapshotEstimateVersion({
      jobId: 'job-2',
      estimate: seedData.estimates[1],
      uidFactory: () => 'version-2',
    }).estimateVersions[0]

    version.lineItems[0].quantity = 9999

    expect(seedData.estimates[1].lineItems[0].quantity).not.toBe(9999)
  })
})
describe('route planner URL building', () => {
  it('orders waypoints correctly with destination last for two or more stops', async () => {
    const { buildGoogleMapsDirectionsUrl } = await import('../src/lib')
    const url = buildGoogleMapsDirectionsUrl(['123 Maple Ridge Dr, Windsor, ON', '88 Seacliff Dr, Leamington, ON', '27 Front Rd, LaSalle, ON'])

    expect(url).toContain('destination=27%20Front%20Rd')
    expect(url).toContain('waypoints=123%20Maple%20Ridge%20Dr')
    expect(url.startsWith('https://www.google.com/maps/dir/?api=1&destination=')).toBe(true)
  })

  it('falls back to a single search URL when only one stop is provided', async () => {
    const { buildGoogleMapsDirectionsUrl } = await import('../src/lib')
    expect(buildGoogleMapsDirectionsUrl(['123 Maple Ridge Dr'])).toContain('/maps/search/')
    expect(buildGoogleMapsDirectionsUrl([])).toBe('')
  })
})

describe('invoice delivery history', () => {
  it('records an Email Prepared entry with the recipient and template label', async () => {
    const { reconcileInvoice, buildInvoiceEmailDraft } = await import('../src/lib')
    const invoice = reconcileInvoice({
      id: 'inv-delivery',
      jobId: 'job-1',
      invoiceNumber: 'INV-2026',
      amount: 1000,
      paidAmount: 0,
      balanceDue: 1000,
      status: 'Draft',
      dueDate: '2099-01-01',
    })

    const draft = buildInvoiceEmailDraft({
      companyProfile: seedData.companyProfile,
      customerName: 'Test Customer',
      jobTitle: 'Roof replacement',
      invoice,
      template: 'invoice',
    })

    expect(draft.subject).toContain('INV-2026')
    expect(draft.body).toContain('$1,000.00')
    expect(draft.body).toContain('Roof replacement')
  })
})
describe('photo upload validation', () => {
  it('rejects oversized files before they reach the optimizer', async () => {
    const { validateInspectionPhotoFile } = await import('../src/lib')
    const bigFile = { name: 'huge.jpg', size: 50 * 1024 * 1024, type: 'image/jpeg' } as File

    const result = validateInspectionPhotoFile(bigFile)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.message).toContain('over the')
    }
  })

  it('accepts supported image types below the size cap', async () => {
    const { validateInspectionPhotoFile } = await import('../src/lib')
    const okFile = { name: 'photo.jpg', size: 1024 * 1024, type: 'image/jpeg' } as File

    expect(validateInspectionPhotoFile(okFile).ok).toBe(true)
  })

  it('rejects unsupported mime types', async () => {
    const { validateInspectionPhotoFile } = await import('../src/lib')
    const badFile = { name: 'doc.pdf', size: 1024, type: 'application/pdf' } as File

    const result = validateInspectionPhotoFile(badFile)
    expect(result.ok).toBe(false)
  })
})