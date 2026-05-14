import { useEffect, useRef, useState } from 'react';
import './App.css';
import { Dashboard } from './sections/Dashboard';
import { Customers } from './sections/Customers';
import { Inspect } from './sections/Inspect';
import { Jobs } from './sections/Jobs';
import { Estimates } from './sections/Estimates';
import { Invoices } from './sections/Invoices';
import { Settings } from './sections/Settings';
import { Tasks } from './sections/Tasks';
import { Calendar } from './sections/Calendar';
import { Crews } from './sections/Crews';
import { Damages } from './sections/Damages';
import { Photos } from './sections/Photos';
import { CrewMode } from './sections/CrewMode';
import { Locations } from './sections/Locations';
import { seedData } from './data';
import { defaultEstimate, optimizeInspectionPhoto, uid } from './lib';
import { getStorageMeta, loadAppData, saveAppData, type StorageDriver, type StorageMeta } from './storage';
import type { AppData, DamageType, Estimate, Inspection, InspectionPhoto, PhotoCategory, Urgency, View } from './types';

type InspectionForm = {
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

const DEFAULT_INSPECTION_FORM: InspectionForm = {
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
};

function createEstimateDraft(jobId: string | null, estimate?: Estimate | null): Estimate {
  if (!estimate) {
    return defaultEstimate(jobId ?? '')
  }

  return {
    ...estimate,
    lineItems: estimate.lineItems.map((item) => ({ ...item })),
  }
}

function createInspectionDraft(inspection?: Inspection | null): InspectionForm {
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

function storageMessageFor(driver: StorageDriver, storageMeta?: StorageMeta, migrated?: boolean) {
  const backupNote = storageMeta?.backupDir
    ? ` Automatic backups are being written to ${storageMeta.backupDir}.`
    : ''

  if (driver === 'sqlite-native') {
    return `${migrated ? 'Existing desktop data was migrated into native SQLite.' : 'Saving to native SQLite storage.'}${backupNote}`
  }

  return 'Saving to browser storage. Export backups before moving devices.'
}

export default function App() {
  const [view, setView] = useState<View>('dashboard');
  const [data, setData] = useState<AppData>(seedData);
  const [search, setSearch] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(seedData.customers[0]?.id ?? null);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(seedData.jobs[0]?.id ?? null);
  const [photoCategory, setPhotoCategory] = useState<PhotoCategory>('Damage');
  const [photoLabel, setPhotoLabel] = useState('');

  const [jobSearch, setJobSearch] = useState('');
  const [estimateForm, setEstimateForm] = useState<Estimate>(() => createEstimateDraft(seedData.jobs[0]?.id ?? '', seedData.estimates.find((estimate) => estimate.jobId === seedData.jobs[0]?.id) ?? null));
  const [inspectionForm, setInspectionForm] = useState<InspectionForm>(() => createInspectionDraft(seedData.inspections.find((inspection) => inspection.customerId === seedData.customers[0]?.id) ?? null));
  const [storageMode, setStorageMode] = useState<StorageDriver>('localstorage-browser');
  const [storageMeta, setStorageMeta] = useState<StorageMeta>({});
  const [storageMessage, setStorageMessage] = useState('Loading saved data...');
  const [isHydrated, setIsHydrated] = useState(false);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  const selectedInspection = data.inspections.find((i) => i.customerId === selectedCustomerId) || null;
  const selectedCustomer = data.customers.find((customer) => customer.id === selectedCustomerId) ?? null;
  const selectedJob = data.jobs.find((job) => job.id === selectedJobId) ?? null;

  async function refreshStorageMeta(driver: StorageDriver, migrated?: boolean) {
    const meta = await getStorageMeta();
    setStorageMeta(meta);
    setStorageMessage(storageMessageFor(driver, meta, migrated));
  }

  function applySelection(nextData: AppData, customerId: string | null, jobId: string | null) {
    let nextCustomerId = customerId && nextData.customers.some((customer) => customer.id === customerId) ? customerId : null;
    let nextJobId = jobId && nextData.jobs.some((job) => job.id === jobId) ? jobId : null;

    if (nextJobId) {
      const selectedJobRecord = nextData.jobs.find((job) => job.id === nextJobId);
      nextCustomerId = selectedJobRecord?.customerId ?? nextCustomerId;
    }

    if (!nextCustomerId && nextData.customers.length) {
      nextCustomerId = nextData.customers[0].id;
    }

    if (!nextJobId && nextCustomerId) {
      nextJobId = nextData.jobs.find((job) => job.customerId === nextCustomerId)?.id ?? null;
    }

    if (!nextJobId && nextData.jobs.length) {
      nextJobId = nextData.jobs[0].id;
    }

    if (!nextCustomerId && nextJobId) {
      nextCustomerId = nextData.jobs.find((job) => job.id === nextJobId)?.customerId ?? null;
    }

    const nextEstimate = nextJobId ? nextData.estimates.find((estimate) => estimate.jobId === nextJobId) ?? null : null;
    const nextInspection = nextCustomerId ? nextData.inspections.find((inspection) => inspection.customerId === nextCustomerId) ?? null : null;

    setSelectedCustomerId(nextCustomerId);
    setSelectedJobId(nextJobId);
    setEstimateForm(createEstimateDraft(nextJobId, nextEstimate));
    setInspectionForm(createInspectionDraft(nextInspection));
  }

  function selectCustomer(customerId: string | null, nextData: AppData = data) {
    applySelection(nextData, customerId, null);
  }

  function selectJob(jobId: string | null, nextData: AppData = data) {
    const customerId = jobId ? nextData.jobs.find((job) => job.id === jobId)?.customerId ?? null : selectedCustomerId;
    applySelection(nextData, customerId, jobId);
  }

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      const result = await loadAppData();
      if (cancelled) return;

      setData(result.data);
      setStorageMode(result.driver);
      applySelection(result.data, result.data.customers[0]?.id ?? null, null);
      await refreshStorageMeta(result.driver, result.migrated);
      if (cancelled) return;
      setIsHydrated(true);
    }

    void hydrate();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    let cancelled = false;

    async function persist() {
      const driver = await saveAppData(data);
      if (cancelled) return;
      setStorageMode(driver);
      await refreshStorageMeta(driver);
    }

    void persist();

    return () => {
      cancelled = true;
    };
  }, [data, isHydrated]);

  function exportBackup() {
    const backupName = `roofingcrm-backup-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = backupName;
    link.click();
    URL.revokeObjectURL(url);
    setStorageMessage(`Backup downloaded: ${backupName}`);
  }

  async function importBackup(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const parsed = JSON.parse(await file.text()) as Partial<AppData>;

      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('Backup root must be an object.');
      }

      const importedData: AppData = {
        companyProfile: parsed.companyProfile && typeof parsed.companyProfile === 'object' && !Array.isArray(parsed.companyProfile)
          ? { ...seedData.companyProfile, ...parsed.companyProfile }
          : seedData.companyProfile,
        customers: Array.isArray(parsed.customers) ? parsed.customers : seedData.customers,
        jobs: Array.isArray(parsed.jobs) ? parsed.jobs : seedData.jobs,
        estimates: Array.isArray(parsed.estimates) ? parsed.estimates : seedData.estimates,
        invoices: Array.isArray(parsed.invoices) ? parsed.invoices : seedData.invoices,
        invoiceHistory: Array.isArray(parsed.invoiceHistory) ? parsed.invoiceHistory : seedData.invoiceHistory,
        inspections: Array.isArray(parsed.inspections) ? parsed.inspections : seedData.inspections,
        materialPrices: Array.isArray(parsed.materialPrices) ? parsed.materialPrices : seedData.materialPrices,
        materialPriceHistory: Array.isArray(parsed.materialPriceHistory) ? parsed.materialPriceHistory : seedData.materialPriceHistory,
        tasks: Array.isArray(parsed.tasks) ? parsed.tasks : seedData.tasks,
        crews: Array.isArray(parsed.crews) ? parsed.crews : seedData.crews,
        appointments: Array.isArray(parsed.appointments) ? parsed.appointments : seedData.appointments,
        damages: Array.isArray(parsed.damages) ? parsed.damages : seedData.damages,
      };

      setData(importedData);
      applySelection(importedData, importedData.customers[0]?.id ?? null, null);
      setView('dashboard');
      setStorageMessage(`Imported backup: ${file.name}`);
    } catch {
      setStorageMessage('Backup import failed. Choose a valid RoofingCRM JSON backup.');
    }

    event.target.value = '';
  }

  async function appendPhoto(file: File) {
    if (!selectedCustomerId) return;
    const optimizedPhoto = await optimizeInspectionPhoto(file);
    const newPhoto: InspectionPhoto = {
      ...optimizedPhoto,
      id: uid(),
      label: photoLabel.trim() || file.name,
      category: photoCategory,
    };
    setData((prev) => {
      const existing = prev.inspections.find((inspection) => inspection.customerId === selectedCustomerId);
      if (existing) {
        return {
          ...prev,
          inspections: prev.inspections.map((inspection) => inspection.customerId === selectedCustomerId ? { ...inspection, photos: [newPhoto, ...inspection.photos] } : inspection)
        };
      }
      const fallback: Inspection = {
        id: uid(),
        customerId: selectedCustomerId,
        roofType: inspectionForm.roofType,
        roofAge: inspectionForm.roofAge,
        pitch: inspectionForm.pitch,
        stories: inspectionForm.stories,
        damageType: inspectionForm.damageType,
        urgency: inspectionForm.urgency,
        leakActive: inspectionForm.leakActive,
        deckingConcern: inspectionForm.deckingConcern,
        flashingConcern: inspectionForm.flashingConcern,
        ventilationConcern: inspectionForm.ventilationConcern,
        insuranceClaim: inspectionForm.insuranceClaim,
        summary: inspectionForm.summary,
        recommendation: inspectionForm.recommendation,
        measurements: {
          squares: Number(inspectionForm.squares) || 0,
          ridgeLength: Number(inspectionForm.ridgeLength) || 0,
          valleyLength: Number(inspectionForm.valleyLength) || 0,
          eavesLength: Number(inspectionForm.eavesLength) || 0,
          rakeLength: Number(inspectionForm.rakeLength) || 0,
          wasteFactor: Number(inspectionForm.wasteFactor) || 0
        },
        roofPlanes: [],
        photos: [newPhoto],
        createdAt: new Date().toISOString()
      };
      return { ...prev, inspections: [fallback, ...prev.inspections] };
    });
    setPhotoLabel('');
  }

  async function handlePhotoUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    await appendPhoto(file);
    event.target.value = '';
  }

  function removeInspectionPhoto(photoId: string) {
    if (!selectedCustomerId) return;
    setData((prev) => ({
      ...prev,
      inspections: prev.inspections.map((inspection) => inspection.customerId === selectedCustomerId
        ? { ...inspection, photos: inspection.photos.filter((photo) => photo.id !== photoId) }
        : inspection),
      damages: prev.damages.map((damage) => damage.customerId === selectedCustomerId
        ? { ...damage, linkedPhotoIds: damage.linkedPhotoIds.filter((id) => id !== photoId) }
        : damage),
    }));
  }

  function saveInspection() {
    if (!selectedCustomerId) return;
    const existingPlanes = selectedInspection?.roofPlanes ?? [];
    const record: Inspection = {
      id: selectedInspection?.id || uid(),
      customerId: selectedCustomerId,
      roofType: inspectionForm.roofType,
      roofAge: inspectionForm.roofAge,
      pitch: inspectionForm.pitch,
      stories: inspectionForm.stories,
      damageType: inspectionForm.damageType,
      urgency: inspectionForm.urgency,
      leakActive: inspectionForm.leakActive,
      deckingConcern: inspectionForm.deckingConcern,
      flashingConcern: inspectionForm.flashingConcern,
      ventilationConcern: inspectionForm.ventilationConcern,
      insuranceClaim: inspectionForm.insuranceClaim,
      summary: inspectionForm.summary,
      recommendation: inspectionForm.recommendation,
      measurements: {
        squares: Number(inspectionForm.squares) || 0,
        ridgeLength: Number(inspectionForm.ridgeLength) || 0,
        valleyLength: Number(inspectionForm.valleyLength) || 0,
        eavesLength: Number(inspectionForm.eavesLength) || 0,
        rakeLength: Number(inspectionForm.rakeLength) || 0,
        wasteFactor: Number(inspectionForm.wasteFactor) || 0
      },
      roofPlanes: existingPlanes,
      photos: selectedInspection?.photos ?? [],
      createdAt: selectedInspection?.createdAt || new Date().toISOString()
    };
    const nextData = { ...data, inspections: [...data.inspections.filter((inspection) => inspection.customerId !== selectedCustomerId), record] };
    setData(nextData);
    selectCustomer(selectedCustomerId, nextData);
  }

  const totalPhotos = data.inspections.reduce((sum, inspection) => sum + inspection.photos.length, 0);
  const totalSquares = data.inspections.reduce((sum, inspection) => sum + inspection.measurements.squares, 0);

  const navItems: { key: View; label: string; count?: number }[] = [
    { key: 'dashboard', label: 'Workspace' },
    { key: 'customers', label: 'Customers', count: data.customers.length },
    { key: 'inspect', label: 'Inspection', count: data.inspections.length },
    { key: 'photos', label: 'Photos', count: totalPhotos },
    { key: 'estimates', label: 'Estimates', count: data.estimates.length },
    { key: 'jobs', label: 'Projects', count: data.jobs.length },
    { key: 'damages', label: 'Damages', count: data.damages.length },
    { key: 'invoices', label: 'Invoices', count: data.invoices.length },
    { key: 'tasks', label: 'Tasks', count: data.tasks.length },
    { key: 'calendar', label: 'Calendar', count: data.appointments.length },
    { key: 'locations', label: 'Locations', count: data.customers.filter((customer) => customer.address.trim()).length },
    { key: 'crews', label: 'Crews', count: data.crews.length },
    { key: 'crew-mode', label: 'Crew Mode', count: data.jobs.filter((job) => job.crewId).length },
    { key: 'settings', label: 'Settings' }
  ];
  const activeView = navItems.find((item) => item.key === view);
  const activeViewDetail: Record<View, string> = {
    dashboard: 'Focused workspace for the selected customer and project.',
    customers: 'Manage homeowners, lead details, and property information.',
    jobs: 'Track projects from scheduled work to close-out.',
    photos: 'Capture before, damage, progress, and after photo documentation.',
    damages: 'Track roof damage findings and material allocations.',
    inspect: 'Measure the roof, note the problem, and capture field photos.',
    estimates: 'Build customer estimates from inspection measurements and pricing.',
    invoices: 'Track invoices, payments, and outstanding balances.',
    tasks: 'Track follow-ups, office prep, and project action items.',
    calendar: 'Schedule inspections, estimates, and job starts.',
    locations: 'Map job sites, customer addresses, and active route stops.',
    crews: 'Manage roofing crews and dispatch readiness.',
    'crew-mode': 'Field-focused view for assigned crew jobs.',
    settings: 'Backups, storage mode, and delivery controls.',
  };
  const showWorkspaceChrome = view !== 'settings';
  const workflowSteps: { key: View; label: string; caption: string }[] = [
    { key: 'customers', label: '1. Customer', caption: selectedCustomer?.name ?? 'Choose homeowner' },
    { key: 'inspect', label: '2. Inspection', caption: selectedInspection ? `${selectedInspection.damageType} ready` : 'Capture roof data' },
    { key: 'photos', label: '3. Photos', caption: selectedInspection?.photos.length ? `${selectedInspection.photos.length} photo(s)` : 'Document the job' },
    { key: 'jobs', label: '4. Project', caption: selectedJob?.title ?? 'Create or pick project' },
    { key: 'damages', label: '5. Damages', caption: data.damages.find((damage) => damage.jobId === selectedJobId || (!selectedJobId && damage.customerId === selectedCustomerId)) ? 'Damage records saved' : 'Log damages + materials' },
    { key: 'estimates', label: '6. Estimate', caption: data.estimates.find((estimate) => estimate.jobId === selectedJobId) ? 'Proposal drafted' : 'Price the work' },
    { key: 'invoices', label: '7. Invoice', caption: data.invoices.find((invoice) => invoice.jobId === selectedJobId) ? 'Billing started' : 'Create billing' },
    { key: 'tasks', label: '8. Tasks', caption: data.tasks.find((task) => task.jobId === selectedJobId || (!selectedJobId && task.customerId === selectedCustomerId)) ? 'Follow-ups tracked' : 'Add follow-up tasks' },
    { key: 'locations', label: '9. Locations', caption: selectedCustomer?.address ?? 'Map the route' },
    { key: 'settings', label: 'Settings', caption: data.companyProfile.name.trim() || 'Set company profile' },
  ];
  return (
    <div className="page-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <div className="brand-mark">CRM</div>
          <div>
            <h1>Roofing CRM</h1>
            <p>Built for roofing workflow, customers, and crews</p>
          </div>
        </div>
        <div className="sidebar-section">
          <span className="sidebar-label">Workspace</span>
          {navItems.map((item) => (
            <button
              key={item.key}
              className={`nav-item nav-button ${view === item.key ? 'active' : ''}`}
              onClick={() => setView(item.key)}
            >
              <span>{item.label}</span>
              {typeof item.count === 'number' ? <strong>{item.count}</strong> : <strong>•</strong>}
            </button>
          ))}
        </div>
        <div className="sidebar-section">
          <span className="sidebar-label">Today</span>
          <div className="nav-item">
            <span>Open jobs</span>
            <strong>{data.jobs.filter((job) => job.status !== 'Complete' && job.status !== 'Paid').length}</strong>
          </div>
          <div className="nav-item">
            <span>Photo uploads</span>
            <strong>{totalPhotos}</strong>
          </div>
          <div className="nav-item">
            <span>Base plan squares</span>
            <strong>{totalSquares}</strong>
          </div>
        </div>
      </aside>
      <main className="main-pane">
        <div className="page-header-shell">
          <div className="page-header">
            <div>
              <span className="eyebrow">Roofing CRM</span>
              <h2>{activeView?.label}</h2>
              <p>{activeViewDetail[view]}</p>
            </div>
            <div className="header-summary">
              <div className="header-chip">
                <span>Open jobs</span>
                <strong>{data.jobs.filter((job) => job.status !== 'Complete' && job.status !== 'Paid').length}</strong>
              </div>
              <div className="header-chip">
                <span>Inspections</span>
                <strong>{data.inspections.length}</strong>
              </div>
              <div className="header-chip">
                <span>Storage</span>
                <strong>{storageMode === 'sqlite-native' ? 'SQLite' : 'Browser'}</strong>
              </div>
            </div>
          </div>
          <div className="main-nav mobile-nav">
            {navItems.map((item) => (
              <button
                key={`mobile-${item.key}`}
                className={`main-nav-button ${view === item.key ? 'active' : ''}`}
                onClick={() => setView(item.key)}
              >
                <span>{item.label}</span>
                {typeof item.count === 'number' ? <strong>{item.count}</strong> : <strong>•</strong>}
              </button>
            ))}
          </div>
        </div>
        <div className="page-content">
          {showWorkspaceChrome && (
            <>
              <div className="context-strip">
                <div className="context-card">
                  <span>Current customer</span>
                  <label className="field context-select-field">
                    <select value={selectedCustomerId ?? ''} onChange={(event) => selectCustomer(event.target.value || null)}>
                      <option value="">Select a customer</option>
                      {data.customers.map((customer) => (
                        <option key={customer.id} value={customer.id}>
                          {customer.name} - {customer.address}
                        </option>
                      ))}
                    </select>
                  </label>
                  <small>{selectedCustomer?.address ?? 'Select a customer to keep jobs, inspections, and estimates in sync.'}</small>
                </div>
                <div className="context-card">
                  <span>Current job</span>
                  <label className="field context-select-field">
                    <select value={selectedJobId ?? ''} onChange={(event) => selectJob(event.target.value || null)}>
                      <option value="">Select a job</option>
                      {data.jobs.filter((job) => !selectedCustomerId || job.customerId === selectedCustomerId).map((job) => (
                        <option key={job.id} value={job.id}>
                          {job.title}
                        </option>
                      ))}
                    </select>
                  </label>
                  <small>{selectedJob ? `${selectedJob.status} · ${selectedJob.scheduledFor || 'No date set'}` : 'Pick a job to build estimates and invoices.'}</small>
                </div>
              </div>
              <div className="workflow-strip">
                {workflowSteps.map((step) => (
                  <button
                    key={step.key}
                    className={`workflow-step ${view === step.key ? 'active' : ''}`}
                    onClick={() => setView(step.key)}
                  >
                    <span>{step.label}</span>
                    <strong>{step.caption}</strong>
                  </button>
                ))}
              </div>
            </>
          )}

          {view === 'dashboard' && (
            <Dashboard
              data={data}
              selectedCustomerId={selectedCustomerId}
              selectedJobId={selectedJobId}
              setView={setView}
              onOpenCustomer={(customerId) => {
                setView('customers');
                selectCustomer(customerId);
              }}
              onOpenJob={(jobId) => {
                setView('jobs');
                selectJob(jobId);
              }}
              onOpenInspect={() => setView('inspect')}
              onOpenDamages={() => setView('damages')}
              onOpenEstimates={() => setView('estimates')}
              onOpenInvoices={() => setView('invoices')}
              onOpenTasks={() => setView('tasks')}
            />
          )}

          {view === 'customers' && (
            <Customers
              data={data}
              setData={setData}
              selectedCustomerId={selectedCustomerId}
              selectCustomer={selectCustomer}
              selectJob={selectJob}
              search={search}
              setSearch={setSearch}
              setView={setView}
            />
          )}

          {view === 'inspect' && (
            <Inspect
              key={selectedCustomerId ?? 'no-customer'}
              data={data}
              selectedCustomerId={selectedCustomerId}
              selectCustomer={selectCustomer}
              photoCategory={photoCategory}
              setPhotoCategory={setPhotoCategory}
              photoLabel={photoLabel}
              setPhotoLabel={setPhotoLabel}
              inspectionForm={inspectionForm}
              setInspectionForm={setInspectionForm}
              handlePhotoUpload={handlePhotoUpload}
              removeInspectionPhoto={removeInspectionPhoto}
              saveInspection={saveInspection}
              goToProposal={() => setView('estimates')}
              galleryInputRef={galleryInputRef}
              cameraInputRef={cameraInputRef}
            />
          )}

          {view === 'jobs' && (
            <Jobs
              data={data}
              setData={setData}
              selectedCustomerId={selectedCustomerId}
              selectCustomer={selectCustomer}
              selectedJobId={selectedJobId}
              selectJob={selectJob}
              jobSearch={jobSearch}
              setJobSearch={setJobSearch}
              setView={setView}
            />
          )}

          {view === 'photos' && (
            <Photos
              data={data}
              selectedCustomerId={selectedCustomerId}
              selectCustomer={selectCustomer}
              selectedJobId={selectedJobId}
              selectJob={selectJob}
              photoCategory={photoCategory}
              setPhotoCategory={setPhotoCategory}
              photoLabel={photoLabel}
              setPhotoLabel={setPhotoLabel}
              handlePhotoUpload={handlePhotoUpload}
              removeInspectionPhoto={removeInspectionPhoto}
              galleryInputRef={galleryInputRef}
              cameraInputRef={cameraInputRef}
              setView={setView}
            />
          )}

          {view === 'damages' && (
            <Damages
              data={data}
              setData={setData}
              selectedCustomerId={selectedCustomerId}
              selectCustomer={selectCustomer}
              selectedJobId={selectedJobId}
              selectJob={selectJob}
            />
          )}

          {view === 'estimates' && (
            <Estimates
              data={data}
              setData={setData}
              selectedCustomerId={selectedCustomerId}
              selectCustomer={selectCustomer}
              selectedJobId={selectedJobId}
              selectJob={selectJob}
              estimateForm={estimateForm}
              setEstimateForm={setEstimateForm}
              selectedInspection={selectedInspection}
              goToJobs={() => setView('jobs')}
              goToBilling={() => setView('invoices')}
            />
          )}

          {view === 'invoices' && (
            <Invoices
              data={data}
              setData={setData}
              selectedCustomerId={selectedCustomerId}
              selectCustomer={selectCustomer}
              selectedJobId={selectedJobId}
              selectJob={selectJob}
            />
          )}

          {view === 'tasks' && (
            <Tasks
              data={data}
              setData={setData}
              selectedCustomerId={selectedCustomerId}
              selectCustomer={selectCustomer}
              selectedJobId={selectedJobId}
              selectJob={selectJob}
              setView={setView}
            />
          )}

          {view === 'settings' && (
            <Settings
              data={data}
              setData={setData}
              companyProfile={data.companyProfile}
              storageMode={storageMode}
              storageMessage={storageMessage}
              storageMeta={storageMeta}
              exportBackup={exportBackup}
              importInputRef={importInputRef}
              handleImport={importBackup}
            />
          )}

          {view === 'calendar' && (
            <Calendar
              data={data}
              setData={setData}
              selectedCustomerId={selectedCustomerId}
              selectCustomer={selectCustomer}
              selectedJobId={selectedJobId}
              selectJob={selectJob}
            />
          )}

          {view === 'locations' && (
            <Locations
              data={data}
              selectedCustomerId={selectedCustomerId}
              selectCustomer={selectCustomer}
              selectedJobId={selectedJobId}
              selectJob={selectJob}
              setView={setView}
            />
          )}

          {view === 'crews' && (
            <Crews
              data={data}
              setData={setData}
            />
          )}

          {view === 'crew-mode' && (
            <CrewMode
              data={data}
              selectedJobId={selectedJobId}
              selectJob={selectJob}
              setView={setView}
              setPhotoCategory={setPhotoCategory}
              setPhotoLabel={setPhotoLabel}
              cameraInputRef={cameraInputRef}
              handlePhotoUpload={handlePhotoUpload}
            />
          )}
        </div>
      </main>
    </div>
  );
}
