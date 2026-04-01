import type { AppData } from './types'

export const seedData: AppData = {
  companyProfile: {
    name: 'Your Roofing Company',
    shortName: 'YRC',
    tagline: 'Add your company details in Settings',
    city: '',
    phone: '',
    email: '',
    website: '',
  },
  customers: [
    { id: 'cust-1', name: 'Jennifer Mullins', phone: '519-555-1001', email: 'jennifer@example.com', address: '123 Maple Ridge Dr, Windsor, ON', notes: 'Possible full replacement. Wants quote this week.', leadStatus: 'Inspection Scheduled', source: 'Facebook' },
    { id: 'cust-2', name: 'Mark Pitre', phone: '519-555-1002', email: 'mark@example.com', address: '88 Seacliff Dr, Leamington, ON', notes: 'Leak around vent stack. Asked about insurance.', leadStatus: 'Estimate Sent', source: 'Referral' },
    { id: 'cust-3', name: 'Arianna Lopes', phone: '519-555-1003', email: 'arianna@example.com', address: '27 Front Rd, LaSalle, ON', notes: 'Storm damage inspection request.', leadStatus: 'New Lead', source: 'Website' },
  ],
  jobs: [
    { id: 'job-1', customerId: 'cust-1', title: 'Full replacement — asphalt shingles', status: 'In Progress', priority: 'High', scheduledFor: '2026-03-24', notes: 'Two-storey detached home. Crew Alpha assigned.', createdAt: new Date().toISOString() },
    { id: 'job-2', customerId: 'cust-2', title: 'Leak repair + flashing review', status: 'Scheduled', priority: 'Normal', scheduledFor: '2026-03-23', notes: 'Bring matching shingles and vent materials.', createdAt: new Date().toISOString() },
  ],
  estimates: [
    { id: 'est-1', jobId: 'job-1', squareFeet: 2400, squares: 24, materialCost: 8200, laborCost: 3400, totalPrice: 14012, overheadCost: 1200, profitMargin: 18, taxRate: 13, depositRequired: 30, scopeOfWork: 'Complete roof replacement including tear-off, disposal, underlayment, shingles, flashing, ventilation review, and cleanup.', warranty: '10 year workmanship warranty', timeline: '2 working days weather permitting', lineItems: [{ id: 'li-1', title: 'Architectural shingles', quantity: 24, unit: 'sq', unitPrice: 220, total: 5280 }, { id: 'li-2', title: 'Accessories + flashing', quantity: 1, unit: 'lot', unitPrice: 1600, total: 1600 }, { id: 'li-3', title: 'Labour + disposal', quantity: 1, unit: 'job', unitPrice: 4720, total: 4720 }] },
    { id: 'est-2', jobId: 'job-2', squareFeet: 680, squares: 7, materialCost: 2100, laborCost: 1100, totalPrice: 4746, overheadCost: 400, profitMargin: 15, taxRate: 13, depositRequired: 25, scopeOfWork: 'Repair vent stack leak area, replace damaged shingles, reseal penetrations, and inspect adjacent decking.', warranty: '2 year workmanship warranty', timeline: 'Half day to 1 day', lineItems: [{ id: 'li-4', title: 'Repair materials', quantity: 1, unit: 'lot', unitPrice: 2100, total: 2100 }, { id: 'li-5', title: 'Labour', quantity: 1, unit: 'job', unitPrice: 1100, total: 1100 }] },
  ],
  invoices: [{ id: 'inv-1', jobId: 'job-2', invoiceNumber: 'INV-2001', amount: 4746, paidAmount: 1500, balanceDue: 3246, status: 'Partial', dueDate: '2026-03-31', issuedDate: '2026-03-24', notes: 'Deposit received. Balance due on completion.' }],
  inspections: [{ id: 'insp-1', customerId: 'cust-1', roofType: 'Asphalt shingle', roofAge: '14 years', pitch: '6/12', stories: '2 storey', damageType: 'Shingle Damage', urgency: 'High', leakActive: false, deckingConcern: false, flashingConcern: true, ventilationConcern: true, insuranceClaim: false, summary: 'Rear slope showing granule loss, lifted tabs, and flashing wear around the chimney line.', recommendation: 'Proceed with full replacement quote, replace flashing details, and review attic ventilation during install.', measurements: { squares: 24, ridgeLength: 42, valleyLength: 18, eavesLength: 64, rakeLength: 40, wasteFactor: 10 }, roofPlanes: [{ id: 'plane-1', label: 'Front Main', length: 34, width: 14, pitch: '6/12', facet: 'Main slope' }, { id: 'plane-2', label: 'Rear Main', length: 34, width: 14, pitch: '6/12', facet: 'Main slope' }], photos: [], createdAt: new Date().toISOString() }],
  materialPrices: [
    { id: 'mat-shingles', label: 'Architectural shingles', unit: 'bundle', price: 48, supplier: 'Manual', updatedAt: new Date().toISOString() },
    { id: 'mat-starter', label: 'Starter strip', unit: 'bundle', price: 55, supplier: 'Manual', updatedAt: new Date().toISOString() },
    { id: 'mat-ridge-cap', label: 'Ridge cap', unit: 'bundle', price: 65, supplier: 'Manual', updatedAt: new Date().toISOString() },
    { id: 'mat-underlayment', label: 'Underlayment', unit: 'roll', price: 120, supplier: 'Manual', updatedAt: new Date().toISOString() },
    { id: 'mat-ice-water', label: 'Ice & water shield', unit: 'roll', price: 95, supplier: 'Manual', updatedAt: new Date().toISOString() },
    { id: 'mat-drip-edge', label: 'Drip edge', unit: 'piece', price: 18, supplier: 'Manual', updatedAt: new Date().toISOString() },
    { id: 'mat-valley-metal', label: 'Valley metal', unit: 'piece', price: 32, supplier: 'Manual', updatedAt: new Date().toISOString() },
    { id: 'mat-cap-vent', label: 'Cap vents', unit: 'piece', price: 45, supplier: 'Manual', updatedAt: new Date().toISOString() },
    { id: 'mat-ridge-vent', label: 'Ridge vent', unit: 'lf', price: 7.25, supplier: 'Manual', updatedAt: new Date().toISOString() },
  ],
}
