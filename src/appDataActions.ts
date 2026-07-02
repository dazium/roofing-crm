import { defaultEstimate } from './lib'
import type { EstimateVersion } from './types'
import { findEstimateForJob, findInspectionForCustomer, findJob, firstJobForCustomer } from './appLookups'
import type { AppData, DamageType, Estimate, Inspection, InspectionPhoto, Urgency } from './types'

export type InspectionForm = {
  roofType: string
  roofAge: string
  pitch: string
  stories: string
  damageType: DamageType
  urgency: Urgency
  leakActive: boolean
  deckingConcern: boolean
  flashingConcern: boolean
  ventilationConcern: boolean
  insuranceClaim: boolean
  summary: string
  recommendation: string
  calculatorLength: number
  calculatorWidth: number
  squares: number
  ridgeLength: number
  valleyLength: number
  eavesLength: number
  rakeLength: number
  wasteFactor: number
}

export const DEFAULT_INSPECTION_FORM: InspectionForm = {
  roofType: 'Asphalt shingle',
  roofAge: '',
  pitch: '',
  stories: '',
  damageType: 'Leak',
  urgency: 'Medium',
  leakActive: false,
  deckingConcern: false,
  flashingConcern: false,
  ventilationConcern: false,
  insuranceClaim: false,
  summary: '',
  recommendation: '',
  calculatorLength: 0,
  calculatorWidth: 0,
  squares: 0,
  ridgeLength: 0,
  valleyLength: 0,
  eavesLength: 0,
  rakeLength: 0,
  wasteFactor: 10,
}

export type SelectionState = {
  customerId: string | null
  jobId: string | null
  estimate: Estimate | null
  inspection: Inspection | null
}

export function createEstimateDraft(jobId: string | null, estimate?: Estimate | null): Estimate {
  if (!estimate) {
    return defaultEstimate(jobId ?? '')
  }

  return {
    ...estimate,
    lineItems: estimate.lineItems.map((item) => ({ ...item })),
  }
}

export function createInspectionDraft(inspection?: Inspection | null): InspectionForm {
  if (!inspection) {
    return { ...DEFAULT_INSPECTION_FORM }
  }

  return {
    roofType: inspection.roofType,
    roofAge: inspection.roofAge,
    pitch: inspection.pitch,
    stories: inspection.stories,
    damageType: inspection.damageType,
    urgency: inspection.urgency,
    leakActive: inspection.leakActive,
    deckingConcern: inspection.deckingConcern,
    flashingConcern: inspection.flashingConcern,
    ventilationConcern: inspection.ventilationConcern,
    insuranceClaim: inspection.insuranceClaim,
    summary: inspection.summary,
    recommendation: inspection.recommendation,
    calculatorLength: 0,
    calculatorWidth: 0,
    squares: inspection.measurements.squares,
    ridgeLength: inspection.measurements.ridgeLength,
    valleyLength: inspection.measurements.valleyLength,
    eavesLength: inspection.measurements.eavesLength,
    rakeLength: inspection.measurements.rakeLength,
    wasteFactor: inspection.measurements.wasteFactor,
  }
}

export function resolveSelection(nextData: AppData, customerId: string | null, jobId: string | null): SelectionState {
  let nextCustomerId = customerId && nextData.customers.some((customer) => customer.id === customerId) ? customerId : null
  let nextJobId = jobId && nextData.jobs.some((job) => job.id === jobId) ? jobId : null

  if (nextJobId) {
    const selectedJobRecord = findJob(nextData, nextJobId)
    nextCustomerId = selectedJobRecord?.customerId ?? nextCustomerId
  }

  if (!nextCustomerId && nextData.customers.length) {
    nextCustomerId = nextData.customers[0].id
  }

  if (!nextJobId && nextCustomerId) {
    nextJobId = firstJobForCustomer(nextData, nextCustomerId)?.id ?? null
  }

  if (!nextJobId && nextData.jobs.length) {
    nextJobId = nextData.jobs[0].id
  }

  if (!nextCustomerId && nextJobId) {
    nextCustomerId = findJob(nextData, nextJobId)?.customerId ?? null
  }

  return {
    customerId: nextCustomerId,
    jobId: nextJobId,
    estimate: findEstimateForJob(nextData, nextJobId),
    inspection: findInspectionForCustomer(nextData, nextCustomerId),
  }
}

export function createInspectionFromForm(args: {
  id: string
  customerId: string
  form: InspectionForm
  existing?: Inspection | null
  photos?: InspectionPhoto[]
  createdAt?: string
}): Inspection {
  const { id, customerId, form, existing, photos, createdAt } = args

  return {
    id,
    customerId,
    roofType: form.roofType,
    roofAge: form.roofAge,
    pitch: form.pitch,
    stories: form.stories,
    damageType: form.damageType,
    urgency: form.urgency,
    leakActive: form.leakActive,
    deckingConcern: form.deckingConcern,
    flashingConcern: form.flashingConcern,
    ventilationConcern: form.ventilationConcern,
    insuranceClaim: form.insuranceClaim,
    summary: form.summary,
    recommendation: form.recommendation,
    measurements: {
      squares: Number(form.squares) || 0,
      ridgeLength: Number(form.ridgeLength) || 0,
      valleyLength: Number(form.valleyLength) || 0,
      eavesLength: Number(form.eavesLength) || 0,
      rakeLength: Number(form.rakeLength) || 0,
      wasteFactor: Number(form.wasteFactor) || 0,
    },
    roofPlanes: existing?.roofPlanes ?? [],
    photos: photos ?? existing?.photos ?? [],
    createdAt: createdAt ?? existing?.createdAt ?? new Date().toISOString(),
  }
}

export function appendInspectionPhotoToData(args: {
  data: AppData
  customerId: string
  photo: InspectionPhoto
  inspectionForm: InspectionForm
  uidFactory: () => string
}): AppData {
  const { data, customerId, photo, inspectionForm, uidFactory } = args
  const existing = data.inspections.find((inspection) => inspection.customerId === customerId)

  if (existing) {
    return {
      ...data,
      inspections: data.inspections.map((inspection) =>
        inspection.customerId === customerId ? { ...inspection, photos: [photo, ...inspection.photos] } : inspection,
      ),
    }
  }

  const fallback = createInspectionFromForm({
    id: uidFactory(),
    customerId,
    form: inspectionForm,
    photos: [photo],
    createdAt: new Date().toISOString(),
  })

  return { ...data, inspections: [fallback, ...data.inspections] }
}

export function removeInspectionPhotoFromData(data: AppData, customerId: string, photoId: string): AppData {
  return {
    ...data,
    inspections: data.inspections.map((inspection) =>
      inspection.customerId === customerId
        ? { ...inspection, photos: inspection.photos.filter((photo) => photo.id !== photoId) }
        : inspection,
    ),
    damages: data.damages.map((damage) =>
      damage.customerId === customerId
        ? { ...damage, linkedPhotoIds: damage.linkedPhotoIds.filter((id) => id !== photoId) }
        : damage,
    ),
  }
}

export function snapshotEstimateVersion(args: {
  jobId: string
  label?: string
  estimate: Estimate
  uidFactory: () => string
  createdBy?: string
  notes?: string
}): { estimateVersions: EstimateVersion[]; nextActive: Estimate } {
  const { jobId, label, estimate, uidFactory, createdBy, notes } = args
  const version: EstimateVersion = {
    ...estimate,
    id: uidFactory(),
    jobId,
    label: label || `Version saved ${new Date().toLocaleString()}`,
    lineItems: estimate.lineItems.map((item) => ({ ...item })),
    createdAt: new Date().toISOString(),
    createdBy,
    notes,
  }
  return {
    estimateVersions: [version],
    nextActive: { ...estimate, jobId },
  }
}