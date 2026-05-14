import type { CompanyProfile, DamageRecord, Estimate, EstimateLineItem, Inspection, InspectionPhoto, Invoice, InvoiceStatus, LeadStatus, MaterialPriceSetting, Measurements, PlaneStats, RoofPlane } from './types'

export const STORAGE_KEY = 'roofingcrm.v8'

export function companyDisplayName(profile: CompanyProfile) {
  return profile.name.trim() || 'Your Roofing Company'
}

export function companyShortName(profile: CompanyProfile) {
  return profile.shortName.trim() || 'YRC'
}

export function companyTagline(profile: CompanyProfile) {
  return profile.tagline.trim() || 'Add your company details in Settings'
}

function companyContactLine(profile: CompanyProfile) {
  return [profile.city, profile.phone, profile.email].map((value) => value.trim()).filter(Boolean).join(' · ') || 'Company details available in Settings'
}

function companyFooterLine(profile: CompanyProfile) {
  return [companyDisplayName(profile), profile.website.trim()].filter(Boolean).join(' · ')
}

export function uid() { return Math.random().toString(36).slice(2, 10) }
export function money(n: number) { return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(n || 0) }
export function badgeTone(value: string) { if (['Won', 'Paid', 'Complete', 'In Progress'].includes(value)) return 'green'; if (['Estimate Sent', 'Inspection Scheduled', 'Partial', 'High'].includes(value)) return 'orange'; if (['Scheduled', 'Awaiting Final Review', 'Contacted', 'Sent', 'Medium'].includes(value)) return 'blue'; return 'red' }
export const DEFAULT_LABOUR_RATE_PER_SQ = 145
export const LEAD_STATUS_FLOW: LeadStatus[] = ['New Lead', 'Contacted', 'Inspection Scheduled', 'Estimate Sent', 'Won', 'Lost']

export type LeadWorkflowContext = {
  hasJob: boolean
  hasInspection: boolean
  hasEstimate: boolean
  hasInvoice: boolean
  hasPaidInvoice: boolean
}

export function allowedLeadStatusTransitions(current: LeadStatus): LeadStatus[] {
  switch (current) {
    case 'New Lead':
      return ['New Lead', 'Contacted', 'Lost']
    case 'Contacted':
      return ['Contacted', 'New Lead', 'Inspection Scheduled', 'Lost']
    case 'Inspection Scheduled':
      return ['Inspection Scheduled', 'Contacted', 'Estimate Sent', 'Lost']
    case 'Estimate Sent':
      return ['Estimate Sent', 'Inspection Scheduled', 'Contacted', 'Won', 'Lost']
    case 'Won':
      return ['Won']
    case 'Lost':
      return ['Lost', 'New Lead', 'Contacted']
    default:
      return LEAD_STATUS_FLOW
  }
}

export function canTransitionLeadStatus(current: LeadStatus, next: LeadStatus) {
  return allowedLeadStatusTransitions(current).includes(next)
}

export function recommendedLeadStatus(context: LeadWorkflowContext): LeadStatus {
  if (context.hasPaidInvoice) return 'Won'
  if (context.hasInvoice || context.hasEstimate) return 'Estimate Sent'
  if (context.hasInspection) return 'Inspection Scheduled'
  if (context.hasJob) return 'Contacted'
  return 'New Lead'
}

export function validateLeadWorkflowStatus(status: LeadStatus, context: LeadWorkflowContext): { valid: boolean; message?: string } {
  if (status === 'Lost') return { valid: true }
  if (status === 'Won' && !(context.hasEstimate || context.hasInvoice || context.hasPaidInvoice)) {
    return { valid: false, message: 'Marked as Won, but there is no estimate or invoice yet.' }
  }
  if (status === 'Estimate Sent' && !(context.hasEstimate || context.hasInvoice)) {
    return { valid: false, message: 'Marked as Estimate Sent, but no estimate/invoice record exists yet.' }
  }
  if (status === 'Inspection Scheduled' && !context.hasInspection) {
    return { valid: false, message: 'Marked as Inspection Scheduled, but no inspection record exists yet.' }
  }
  if (status === 'Contacted' && (context.hasEstimate || context.hasInvoice)) {
    return { valid: false, message: 'Customer has estimate/invoice records and should usually be Estimate Sent or Won.' }
  }
  if (status === 'New Lead' && (context.hasJob || context.hasInspection || context.hasEstimate || context.hasInvoice)) {
    return { valid: false, message: 'Customer has active workflow records and should not be New Lead.' }
  }
  return { valid: true }
}
export function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / 1024 ** index
  return `${value.toFixed(index === 0 ? 0 : 1)} ${units[index]}`
}

export function normalizeInvoiceStatus(invoice: Pick<Invoice, 'amount' | 'paidAmount' | 'dueDate' | 'status'>): InvoiceStatus {
  const amount = Math.max(0, Number(invoice.amount) || 0)
  const paidAmount = Math.min(amount, Math.max(0, Number(invoice.paidAmount) || 0))
  if (amount > 0 && paidAmount >= amount) return 'Paid'
  if (paidAmount > 0) return 'Partial'
  if (invoice.status === 'Draft') return 'Draft'
  if (invoice.dueDate && invoice.dueDate < new Date().toISOString().slice(0, 10)) return 'Overdue'
  return 'Sent'
}

export function reconcileInvoice(invoice: Invoice): Invoice {
  const amount = Math.max(0, Number(invoice.amount) || 0)
  const paidAmount = Math.min(amount, Math.max(0, Number(invoice.paidAmount) || 0))
  return {
    ...invoice,
    paidAmount,
    balanceDue: Math.max(0, amount - paidAmount),
    status: normalizeInvoiceStatus({ amount, paidAmount, dueDate: invoice.dueDate, status: invoice.status }),
    paidDate: paidAmount >= amount && amount > 0 ? (invoice.paidDate || new Date().toISOString().slice(0, 10)) : invoice.paidDate,
  }
}

export function readFileAsDataUrl(file: File) { return new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result ?? '')); reader.onerror = reject; reader.readAsDataURL(file) }) }

export async function optimizeInspectionPhoto(file: File, options?: { maxDimension?: number; quality?: number }): Promise<InspectionPhoto> {
  const maxDimension = options?.maxDimension ?? 1600
  const quality = options?.quality ?? 0.78
  const sourceDataUrl = await readFileAsDataUrl(file)
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = sourceDataUrl
  })

  const longestSide = Math.max(image.width, image.height)
  const scale = longestSide > maxDimension ? maxDimension / longestSide : 1
  const width = Math.max(1, Math.round(image.width * scale))
  const height = Math.max(1, Math.round(image.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')

  if (!context) {
    return { id: uid(), label: file.name, category: 'Damage', dataUrl: sourceDataUrl, sizeBytes: file.size, width: image.width, height: image.height }
  }

  context.drawImage(image, 0, 0, width, height)
  const targetType = file.type === 'image/png' ? 'image/png' : 'image/jpeg'
  const optimizedDataUrl = canvas.toDataURL(targetType, targetType === 'image/png' ? undefined : quality)
  const base64Payload = optimizedDataUrl.split(',')[1] ?? ''
  const sizeBytes = Math.round((base64Payload.length * 3) / 4)

  return {
    id: uid(),
    label: file.name,
    category: 'Damage',
    dataUrl: optimizedDataUrl,
    sizeBytes,
    width,
    height,
  }
}
export function buildGoogleMapsUrl(address: string) { return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address.trim())}` }
export function buildGoogleMapsEmbedUrl(address: string) { return `https://www.google.com/maps?q=${encodeURIComponent(address.trim())}&output=embed` }
export function buildGoogleMapsDirectionsUrl(addresses: string[]) {
  const stops = addresses.map((address) => address.trim()).filter(Boolean)
  if (!stops.length) return ''
  if (stops.length === 1) return buildGoogleMapsUrl(stops[0])
  const destination = stops.at(-1) ?? ''
  const waypoints = stops.slice(0, -1).join('|')
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}&waypoints=${encodeURIComponent(waypoints)}`
}
export function openExternalUrl(url: string) {
  window.open(url, '_blank', 'noopener,noreferrer')
}
export function openAddressInMaps(address: string) {
  const trimmed = address.trim()
  if (!trimmed) return
  openExternalUrl(buildGoogleMapsUrl(trimmed))
}
export function buildTelUrl(phone: string) {
  const digits = phone.replace(/[^\d+]/g, '')
  return `tel:${digits}`
}
export function openPhoneDialer(phone: string) {
  const trimmed = phone.trim()
  if (!trimmed) return
  openExternalUrl(buildTelUrl(trimmed))
}
export function buildMailtoUrl(email: string) {
  return `mailto:${email.trim()}`
}
export function openEmailClient(email: string) {
  const trimmed = email.trim()
  if (!trimmed) return
  openExternalUrl(buildMailtoUrl(trimmed))
}
export function defaultEstimate(jobId: string): Estimate { return { id: uid(), jobId, squareFeet: 0, squares: 0, materialCost: 0, laborCost: 0, totalPrice: 0, overheadCost: 0, profitMargin: 15, taxRate: 13, depositRequired: 25, scopeOfWork: 'Tear off existing roofing materials, inspect deck, install underlayment, shingles, flashing, and site cleanup.', warranty: '10 year workmanship warranty', timeline: '1-2 working days weather permitting', lineItems: [{ id: uid(), title: 'Shingles', quantity: 1, unit: 'lot', unitPrice: 0, total: 0 }, { id: uid(), title: 'Underlayment + accessories', quantity: 1, unit: 'lot', unitPrice: 0, total: 0 }, { id: uid(), title: 'Labour', quantity: 1, unit: 'job', unitPrice: 0, total: 0 }] } }

export function slopeFactorFromPitch(pitch: string) {
  const cleaned = pitch.trim()
  const match = cleaned.match(/^(\d+(?:\.\d+)?)\s*\/\s*12$/)
  if (!match) return 1
  const rise = Number(match[1])
  return Math.sqrt(12 * 12 + rise * rise) / 12
}

export function calcPlaneStats(plane: RoofPlane): PlaneStats {
  const rawArea = plane.length * plane.width
  const slopeFactor = slopeFactorFromPitch(plane.pitch)
  const adjustedArea = rawArea * slopeFactor
  const squares = adjustedArea / 100
  return { rawArea, slopeFactor, adjustedArea, squares }
}

export function calcMaterialPlan(measurements: Measurements, pitch = '') {
  const slopeFactor = slopeFactorFromPitch(pitch)
  const slopeAdjustedSquares = measurements.squares * slopeFactor
  const effectiveSquares = slopeAdjustedSquares * (1 + measurements.wasteFactor / 100)
  const starterCoverageFeetPerBundle = 100
  const dripEdgeFeetPerPiece = 10
  const perimeterStarterFeet = measurements.eavesLength + measurements.rakeLength
  const perimeterDripEdgeFeet = measurements.eavesLength + measurements.rakeLength

  return {
    slopeAdjustedSquares,
    effectiveSquares,
    bundles: Math.ceil(effectiveSquares * 3),
    perimeterStarterFeet,
    perimeterDripEdgeFeet,
    starterCoverageFeetPerBundle,
    dripEdgeFeetPerPiece,
    starter: Math.ceil(perimeterStarterFeet / starterCoverageFeetPerBundle),
    ridgeCapBundles: Math.ceil(measurements.ridgeLength / 20),
    underlaymentRolls: Math.max(1, Math.ceil(effectiveSquares / 10)),
    iceWaterShieldRolls: Math.max(0, Math.ceil(measurements.eavesLength / 65)),
    dripEdgePieces: Math.ceil(perimeterDripEdgeFeet / dripEdgeFeetPerPiece),
    valleyMetalPieces: Math.ceil(measurements.valleyLength / 10),
    capVentUnits: Math.max(0, Math.ceil(measurements.ridgeLength / 4)),
  }
}

export type RoofTemplate = {
  id: string
  label: string
  roofType: string
  pitch: string
  stories: string
  measurements: Measurements
}

export const ROOF_TEMPLATES: RoofTemplate[] = [
  {
    id: 'simple-ranch',
    label: 'Simple ranch',
    roofType: 'Asphalt shingle',
    pitch: '4/12',
    stories: '1 storey',
    measurements: { squares: 15, ridgeLength: 36, valleyLength: 0, eavesLength: 72, rakeLength: 48, wasteFactor: 10 },
  },
  {
    id: 'two-storey-replacement',
    label: 'Two-storey replacement',
    roofType: 'Asphalt shingle',
    pitch: '6/12',
    stories: '2 storey',
    measurements: { squares: 24, ridgeLength: 42, valleyLength: 18, eavesLength: 64, rakeLength: 40, wasteFactor: 12 },
  },
  {
    id: 'complex-steep',
    label: 'Complex steep roof',
    roofType: 'Asphalt shingle',
    pitch: '10/12',
    stories: '2 storey',
    measurements: { squares: 32, ridgeLength: 58, valleyLength: 44, eavesLength: 88, rakeLength: 70, wasteFactor: 15 },
  },
  {
    id: 'small-repair',
    label: 'Small repair',
    roofType: 'Asphalt shingle repair',
    pitch: '6/12',
    stories: '1 storey',
    measurements: { squares: 4, ridgeLength: 0, valleyLength: 0, eavesLength: 20, rakeLength: 12, wasteFactor: 8 },
  },
]

export function roofComplexityLabel(measurements: Measurements, pitch = '') {
  const rise = Number(pitch.trim().match(/^(\d+(?:\.\d+)?)\s*\/\s*12$/)?.[1] ?? 0)
  const featureScore = measurements.valleyLength / 20 + measurements.ridgeLength / 80 + rise / 8 + measurements.wasteFactor / 20
  if (featureScore >= 4) return 'Very Complex'
  if (featureScore >= 2.75) return 'Complex'
  if (featureScore >= 1.5) return 'Moderate'
  return 'Simple'
}

function materialPriceMap(materialPrices: MaterialPriceSetting[]) {
  return Object.fromEntries(materialPrices.map((item) => [item.id, item]))
}

export function buildEstimateLineItemsFromPlan(measurements: Measurements, pitch: string, materialPrices: MaterialPriceSetting[], uidFactory: () => string): {
  plan: ReturnType<typeof calcMaterialPlan>
  lineItems: EstimateLineItem[]
  materialCost: number
  laborCost: number
} {
  const plan = calcMaterialPlan(measurements, pitch)
  const prices = materialPriceMap(materialPrices)
  const labourUnitPrice = DEFAULT_LABOUR_RATE_PER_SQ
  const labourQuantity = Math.round(plan.effectiveSquares * 10) / 10
  const labourCost = Math.round(plan.effectiveSquares * labourUnitPrice)
  const lineItems: EstimateLineItem[] = [
    { id: uidFactory(), title: 'Architectural shingles', quantity: plan.bundles, unit: 'bundles', unitPrice: prices['mat-shingles']?.price ?? 0, total: plan.bundles * (prices['mat-shingles']?.price ?? 0) },
    { id: uidFactory(), title: 'Starter strip', quantity: plan.starter, unit: 'bundles', unitPrice: prices['mat-starter']?.price ?? 0, total: plan.starter * (prices['mat-starter']?.price ?? 0) },
    { id: uidFactory(), title: 'Ridge cap', quantity: plan.ridgeCapBundles, unit: 'bundles', unitPrice: prices['mat-ridge-cap']?.price ?? 0, total: plan.ridgeCapBundles * (prices['mat-ridge-cap']?.price ?? 0) },
    { id: uidFactory(), title: 'Underlayment', quantity: plan.underlaymentRolls, unit: 'rolls', unitPrice: prices['mat-underlayment']?.price ?? 0, total: plan.underlaymentRolls * (prices['mat-underlayment']?.price ?? 0) },
    { id: uidFactory(), title: 'Ice & water shield', quantity: plan.iceWaterShieldRolls, unit: 'rolls', unitPrice: prices['mat-ice-water']?.price ?? 0, total: plan.iceWaterShieldRolls * (prices['mat-ice-water']?.price ?? 0) },
    { id: uidFactory(), title: 'Drip edge', quantity: plan.dripEdgePieces, unit: 'pieces', unitPrice: prices['mat-drip-edge']?.price ?? 0, total: plan.dripEdgePieces * (prices['mat-drip-edge']?.price ?? 0) },
    { id: uidFactory(), title: 'Valley metal', quantity: plan.valleyMetalPieces, unit: 'pieces', unitPrice: prices['mat-valley-metal']?.price ?? 0, total: plan.valleyMetalPieces * (prices['mat-valley-metal']?.price ?? 0) },
    { id: uidFactory(), title: 'Cap vents', quantity: plan.capVentUnits, unit: 'units', unitPrice: prices['mat-cap-vent']?.price ?? 0, total: plan.capVentUnits * (prices['mat-cap-vent']?.price ?? 0) },
    { id: uidFactory(), title: 'Ridge vent', quantity: measurements.ridgeLength, unit: 'lf', unitPrice: prices['mat-ridge-vent']?.price ?? 0, total: measurements.ridgeLength * (prices['mat-ridge-vent']?.price ?? 0) },
    { id: uidFactory(), title: 'Labour', quantity: labourQuantity, unit: 'sq', unitPrice: labourUnitPrice, total: labourCost },
  ]
  const materialCost = lineItems
    .filter((item) => item.title.trim().toLowerCase() !== 'labour')
    .reduce((sum, item) => sum + item.total, 0)

  return { plan, lineItems, materialCost, laborCost: labourCost }
}

export function buildEstimateLineItemsFromDamages(damages: DamageRecord[], materialPrices: MaterialPriceSetting[], uidFactory: () => string): {
  lineItems: EstimateLineItem[]
  materialCost: number
} {
  const quantitiesByMaterial = new Map<string, number>()

  for (const damage of damages) {
    for (const item of damage.materials) {
      const quantity = Math.max(0, Number(item.quantity) || 0)
      if (!item.materialId || quantity <= 0) continue
      quantitiesByMaterial.set(item.materialId, (quantitiesByMaterial.get(item.materialId) ?? 0) + quantity)
    }
  }

  const lineItems = [...quantitiesByMaterial.entries()].map(([materialId, quantity]) => {
    const material = materialPrices.find((item) => item.id === materialId)
    const unitPrice = material?.price ?? 0
    return {
      id: uidFactory(),
      title: material?.label ?? materialId,
      quantity,
      unit: material?.unit ?? 'each',
      unitPrice,
      total: quantity * unitPrice,
    }
  })

  const materialCost = lineItems.reduce((sum, item) => sum + item.total, 0)
  return { lineItems, materialCost }
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

export function buildEstimatePdfHtml(args: {
  companyProfile: CompanyProfile
  customerName: string
  customerAddress: string
  customerPhone?: string
  customerEmail?: string
  jobTitle: string
  estimate: Estimate
  inspection: Inspection | null
  totals: {
    lineItemsSubtotal: number
    overhead: number
    subtotal: number
    marginAmount: number
    tax: number
    grand: number
    deposit: number
  }
}) {
  const { companyProfile, customerName, customerAddress, customerPhone, customerEmail, jobTitle, estimate, inspection, totals } = args
  const date = new Date().toLocaleDateString('en-CA')
  const lineItems = estimate.lineItems.map((item) => `
    <tr>
      <td>${escapeHtml(item.title || 'Item')}</td>
      <td>${item.quantity}</td>
      <td>${escapeHtml(item.unit)}</td>
      <td>${money(item.unitPrice)}</td>
      <td>${money(item.total)}</td>
    </tr>
  `).join('')

  const inspectionSummary = inspection ? `
    <div class="section">
      <h2>Inspection summary</h2>
      <div class="detail-grid">
        <div><span>Roof type</span><strong>${escapeHtml(inspection.roofType || 'N/A')}</strong></div>
        <div><span>Pitch</span><strong>${escapeHtml(inspection.pitch || 'N/A')}</strong></div>
        <div><span>Base plan squares</span><strong>${inspection.measurements.squares.toFixed(1)}</strong></div>
        <div><span>Urgency</span><strong>${escapeHtml(inspection.urgency)}</strong></div>
      </div>
      <p><strong>Summary:</strong> ${escapeHtml(inspection.summary || 'No inspection summary provided.')}</p>
      <p><strong>Recommended action:</strong> ${escapeHtml(inspection.recommendation || 'No recommendation entered.')}</p>
    </div>
  ` : ''

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(companyShortName(companyProfile))} Estimate</title>
    <style>
      body { font-family: Arial, Helvetica, sans-serif; margin: 32px; color: #122033; }
      .topbar { display:flex; justify-content:space-between; gap:24px; margin-bottom:24px; }
      .brand { max-width: 340px; }
      .brand-badge { display:inline-block; padding:8px 12px; background:#c01f36; color:#fff; border-radius:999px; font-weight:700; letter-spacing:.08em; }
      h1,h2,h3,p { margin:0; }
      h1 { font-size: 30px; margin-top: 12px; }
      h2 { font-size: 16px; margin-bottom: 10px; color: #7e1022; }
      .muted { color:#5f6d7f; }
      .grid { display:grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap:16px; margin-bottom: 20px; }
      .card, .section { border:1px solid #d6dde8; border-radius:16px; padding:16px; margin-bottom:18px; }
      .detail-grid { display:grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap:12px; }
      .detail-grid span { display:block; font-size:12px; text-transform:uppercase; letter-spacing:.08em; color:#627285; margin-bottom:4px; }
      table { width:100%; border-collapse:collapse; }
      th, td { border-bottom:1px solid #e3e9f0; padding:10px 8px; text-align:left; font-size: 13px; }
      th { color:#627285; text-transform:uppercase; letter-spacing:.08em; font-size:11px; }
      .totals { margin-top: 14px; margin-left:auto; width: 320px; }
      .totals-row { display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #e3e9f0; }
      .totals-row.total { font-size:18px; font-weight:700; color:#7e1022; }
      .footer { margin-top: 20px; font-size:12px; color:#627285; }
    </style>
  </head>
  <body>
    <div class="topbar">
      <div class="brand">
        <div class="brand-badge">${escapeHtml(companyShortName(companyProfile))} ESTIMATE</div>
        <h1>${escapeHtml(companyDisplayName(companyProfile))}</h1>
        <p class="muted">${escapeHtml(companyTagline(companyProfile))}</p>
        <p class="muted">${escapeHtml(companyContactLine(companyProfile))}</p>
      </div>
      <div class="card">
        <div class="detail-grid">
          <div><span>Date</span><strong>${date}</strong></div>
          <div><span>Job</span><strong>${escapeHtml(jobTitle)}</strong></div>
          <div><span>Customer</span><strong>${escapeHtml(customerName)}</strong></div>
          <div><span>Property</span><strong>${escapeHtml(customerAddress)}</strong></div>
          <div><span>Phone</span><strong>${escapeHtml(customerPhone || 'N/A')}</strong></div>
          <div><span>Email</span><strong>${escapeHtml(customerEmail || 'N/A')}</strong></div>
        </div>
      </div>
    </div>

    <div class="section">
      <h2>Scope of work</h2>
      <p>${escapeHtml(estimate.scopeOfWork)}</p>
      <div class="detail-grid" style="margin-top:14px;">
        <div><span>Timeline</span><strong>${escapeHtml(estimate.timeline)}</strong></div>
        <div><span>Warranty</span><strong>${escapeHtml(estimate.warranty)}</strong></div>
        <div><span>Roof area</span><strong>${estimate.squareFeet} sq ft / ${estimate.squares} sq</strong></div>
        <div><span>Deposit requested</span><strong>${estimate.depositRequired}%</strong></div>
      </div>
    </div>

    ${inspectionSummary}

    <div class="section">
      <h2>Line items</h2>
      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th>Qty</th>
            <th>Unit</th>
            <th>Unit price</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>${lineItems}</tbody>
      </table>
      <div class="totals">
        <div class="totals-row"><span>Line items</span><strong>${money(totals.lineItemsSubtotal)}</strong></div>
        <div class="totals-row"><span>Overhead</span><strong>${money(totals.overhead)}</strong></div>
        <div class="totals-row"><span>Markup</span><strong>${money(totals.marginAmount)}</strong></div>
        <div class="totals-row"><span>Tax</span><strong>${money(totals.tax)}</strong></div>
        <div class="totals-row total"><span>Total</span><strong>${money(totals.grand)}</strong></div>
        <div class="totals-row"><span>Deposit</span><strong>${money(totals.deposit)}</strong></div>
      </div>
    </div>

    <div class="footer">
      Prepared by ${escapeHtml(companyFooterLine(companyProfile))}
    </div>
  </body>
</html>`
}

export function buildInvoicePdfHtml(args: {
  companyProfile: CompanyProfile
  customerName: string
  customerAddress: string
  customerPhone?: string
  customerEmail?: string
  jobTitle: string
  invoice: Invoice
}) {
  const { companyProfile, customerName, customerAddress, customerPhone, customerEmail, jobTitle, invoice } = args
  const date = new Date().toLocaleDateString('en-CA')
  const notes = invoice.notes?.trim() ? escapeHtml(invoice.notes) : 'No additional billing notes.'

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(companyShortName(companyProfile))} Invoice ${escapeHtml(invoice.invoiceNumber)}</title>
    <style>
      body { font-family: 'Segoe UI', Arial, Helvetica, sans-serif; margin: 28px; color: #122033; background: #f7f9fc; }
      .topbar { display:flex; justify-content:space-between; gap:24px; margin-bottom:24px; }
      .brand { max-width: 340px; }
      .brand-badge { display:inline-block; padding:8px 12px; background:#16366f; color:#fff; border-radius:999px; font-weight:700; letter-spacing:.08em; }
      h1,h2,h3,p { margin:0; }
      h1 { font-size: 28px; margin-top: 12px; }
      h2 { font-size: 15px; margin-bottom: 10px; color: #1d3f77; text-transform: uppercase; letter-spacing: .05em; }
      .muted { color:#5f6d7f; }
      .card, .section { border:1px solid #d6dde8; border-radius:14px; padding:16px; margin-bottom:16px; background:#fff; box-shadow: 0 2px 6px rgba(15, 37, 69, 0.06); }
      .detail-grid { display:grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap:12px; }
      .detail-grid span { display:block; font-size:12px; text-transform:uppercase; letter-spacing:.08em; color:#627285; margin-bottom:4px; }
      .totals { margin-top: 14px; margin-left:auto; width: 320px; }
      .totals-row { display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #e3e9f0; }
      .totals-row.total { font-size:18px; font-weight:700; color:#1d3f77; }
      .status-pill { display:inline-block; border-radius:999px; padding:6px 10px; font-size:11px; font-weight:700; letter-spacing:.06em; text-transform:uppercase; }
      .status-draft { background:#e8edf5; color:#334e73; }
      .status-sent { background:#dfeeff; color:#184f98; }
      .status-partial { background:#fff4dc; color:#8a5a00; }
      .status-paid { background:#dcf5e9; color:#146c43; }
      .status-overdue { background:#fde3e3; color:#8b1e24; }
      .footer { margin-top: 20px; font-size:12px; color:#627285; }
    </style>
  </head>
  <body>
    <div class="topbar">
      <div class="brand">
        <div class="brand-badge">${escapeHtml(companyShortName(companyProfile))} INVOICE</div>
        <h1>${escapeHtml(companyDisplayName(companyProfile))}</h1>
        <p class="muted">${escapeHtml(companyTagline(companyProfile))}</p>
        <p class="muted">${escapeHtml(companyContactLine(companyProfile))}</p>
      </div>
      <div class="card">
        <div class="detail-grid">
          <div><span>Date</span><strong>${date}</strong></div>
          <div><span>Invoice #</span><strong>${escapeHtml(invoice.invoiceNumber)}</strong></div>
          <div><span>Status</span><strong><span class="status-pill status-${escapeHtml(invoice.status).toLowerCase()}">${escapeHtml(invoice.status)}</span></strong></div>
          <div><span>Job</span><strong>${escapeHtml(jobTitle)}</strong></div>
          <div><span>Customer</span><strong>${escapeHtml(customerName)}</strong></div>
          <div><span>Property</span><strong>${escapeHtml(customerAddress)}</strong></div>
          <div><span>Phone</span><strong>${escapeHtml(customerPhone || 'N/A')}</strong></div>
          <div><span>Email</span><strong>${escapeHtml(customerEmail || 'N/A')}</strong></div>
        </div>
      </div>
    </div>

    <div class="section">
      <h2>Billing summary</h2>
      <div class="detail-grid">
        <div><span>Issued date</span><strong>${escapeHtml(invoice.issuedDate || 'Not set')}</strong></div>
        <div><span>Due date</span><strong>${escapeHtml(invoice.dueDate || 'Not set')}</strong></div>
        <div><span>Paid date</span><strong>${escapeHtml(invoice.paidDate || 'Not paid')}</strong></div>
        <div><span>Amount received</span><strong>${money(invoice.paidAmount)}</strong></div>
      </div>
      <div class="totals">
        <div class="totals-row"><span>Invoice amount</span><strong>${money(invoice.amount)}</strong></div>
        <div class="totals-row"><span>Received</span><strong>${money(invoice.paidAmount)}</strong></div>
        <div class="totals-row total"><span>Balance due</span><strong>${money(invoice.balanceDue)}</strong></div>
      </div>
    </div>

    <div class="section">
      <h2>Notes</h2>
      <p>${notes}</p>
    </div>

    <div class="footer">
      Prepared by ${escapeHtml(companyFooterLine(companyProfile))}
    </div>
  </body>
</html>`
}
