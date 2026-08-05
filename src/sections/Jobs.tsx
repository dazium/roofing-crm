import { useEffect, useMemo, useState } from 'react';
import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { AppData, AttachmentType, JobStatus, JobPriority, Job, View } from '../types';
import { badgeTone, money, openAddressInMaps, openEmailClient, openPhoneDialer, uid } from '../lib';
import { fetchJobWeather, type JobWeatherSnapshot } from '../weather';
import { findCustomer, findCrewById, findEstimateForJob, findInspectionForCustomer, findInvoiceForJob, findJob } from '../appLookups';

const JOB_STAGES: JobStatus[] = ['Scheduled', 'In Progress', 'Awaiting Final Review', 'Complete', 'Invoiced', 'Paid'];
const COLUMN_PREFIX = 'job-stage:';

function columnDroppableId(status: JobStatus) {
  return `${COLUMN_PREFIX}${status}`;
}

function statusFromDroppableId(id: UniqueIdentifier): JobStatus | null {
  const value = String(id);
  if (!value.startsWith(COLUMN_PREFIX)) return null;
  const status = value.slice(COLUMN_PREFIX.length) as JobStatus;
  return JOB_STAGES.includes(status) ? status : null;
}

function shortAddress(address = '') {
  return address.split(',').slice(0, 2).join(', ').trim() || 'No address';
}

function initials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (parts[0]?.[0] ?? '?') + (parts[1]?.[0] ?? '');
}

type BoardJobCardProps = {
  job: Job;
  data: AppData;
  selected: boolean;
  showDetails: boolean;
  onOpen: () => void;
  dragAttributes?: React.HTMLAttributes<HTMLElement>;
  dragListeners?: Record<string, unknown>;
  setActivatorNodeRef?: (element: HTMLElement | null) => void;
  isDragging?: boolean;
};

function BoardJobCard({
  job,
  data,
  selected,
  showDetails,
  onOpen,
  dragAttributes,
  dragListeners,
  setActivatorNodeRef,
  isDragging,
}: BoardJobCardProps) {
  const customer = data.customers.find((entry) => entry.id === job.customerId);
  const crew = data.crews.find((entry) => entry.id === job.crewId);
  const estimate = data.estimates.find((entry) => entry.jobId === job.id);
  const invoice = data.invoices.find((entry) => entry.jobId === job.id);
  const tasks = data.tasks.filter((task) => task.jobId === job.id);
  const doneTasks = tasks.filter((task) => task.status === 'Done').length;
  const taskProgress = tasks.length ? Math.round((doneTasks / tasks.length) * 100) : 0;
  const dueDate = job.scheduledFor ? new Date(`${job.scheduledFor}T00:00:00`) : null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysUntilDue = dueDate ? Math.ceil((dueDate.getTime() - today.getTime()) / 86400000) : null;
  const dueTone = daysUntilDue == null ? 'neutral' : daysUntilDue < 0 ? 'stalled' : daysUntilDue <= 2 ? 'needs-attention' : 'on-track';

  return (
    <article
      className={`roofing-board-job ${selected ? 'active' : ''} ${isDragging ? 'dragging' : ''}`}
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpen();
        }
      }}
    >
      <div className="roofing-board-job-top">
        <button
          type="button"
          className="drag-handle"
          aria-label={`Drag ${job.title}`}
          ref={setActivatorNodeRef as React.Ref<HTMLButtonElement>}
          {...dragAttributes}
          {...dragListeners}
          onClick={(event) => event.stopPropagation()}
        >
          ::
        </button>
        <div>
          <strong>{job.title}</strong>
          <span>{customer?.name ?? 'Unknown customer'}</span>
        </div>
        <span className={`pill pill-${badgeTone(job.priority)}`}>{job.priority}</span>
      </div>

      <button
        type="button"
        className="address-link board-address"
        onClick={(event) => {
          event.stopPropagation();
          if (customer?.address) openAddressInMaps(customer.address);
        }}
      >
        {shortAddress(customer?.address)}
      </button>

      <div className="job-value-row">
        <strong>{estimate ? money(estimate.totalPrice) : 'No estimate'}</strong>
        <span className={`status-chip ${dueTone}`}>
          {daysUntilDue == null ? 'No date' : daysUntilDue < 0 ? `${Math.abs(daysUntilDue)}d late` : daysUntilDue === 0 ? 'Today' : `${daysUntilDue}d`}
        </span>
      </div>

      <div className="board-label-row">
        <span>{job.status}</span>
        <span>{invoice ? `Invoice ${invoice.status}` : 'No invoice'}</span>
      </div>

      <div className="task-progress-row" title={`${doneTasks} of ${tasks.length} tasks complete`}>
        <div>
          <span style={{ width: `${taskProgress}%` }} />
        </div>
        <small>{tasks.length ? `${doneTasks}/${tasks.length}` : '0/0'} tasks</small>
      </div>

      <div className="card-footer-row">
        <div className="crew-avatar" title={crew?.name ?? 'Unassigned'}>
          {initials(crew?.crewLead || crew?.name || 'Unassigned')}
        </div>
        <small>{crew?.name ?? 'Unassigned'}</small>
      </div>

      {showDetails && <p>{job.notes || 'No notes yet.'}</p>}
    </article>
  );
}

function SortableJobCard(props: BoardJobCardProps) {
  const { attributes, listeners, setActivatorNodeRef, setNodeRef, transform, transition, isDragging } = useSortable({ id: props.job.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <BoardJobCard
        {...props}
        dragAttributes={attributes}
        dragListeners={listeners as Record<string, unknown>}
        setActivatorNodeRef={setActivatorNodeRef}
        isDragging={isDragging}
      />
    </div>
  );
}

type KanbanColumnProps = {
  status: JobStatus;
  jobs: Job[];
  data: AppData;
  selectedJobId: string | null;
  showDetails: boolean;
  onOpenJob: (jobId: string) => void;
};

function KanbanColumn({ status, jobs, data, selectedJobId, showDetails, onOpenJob }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: columnDroppableId(status) });
  const totalValue = jobs.reduce((sum, job) => {
    const estimate = data.estimates.find((entry) => entry.jobId === job.id);
    return sum + (estimate?.totalPrice ?? 0);
  }, 0);

  return (
    <section className={`roofing-kanban-column ${isOver ? 'drop-target' : ''}`} ref={setNodeRef}>
      <div className="kanban-column-header">
        <div>
          <h4>{status}</h4>
          <small>{jobs.length} jobs</small>
        </div>
        <strong>{money(totalValue)}</strong>
      </div>
      <SortableContext items={jobs.map((job) => job.id)} strategy={verticalListSortingStrategy}>
        <div className="kanban-card-stack">
          {jobs.map((job) => (
            <SortableJobCard
              key={job.id}
              job={job}
              data={data}
              selected={selectedJobId === job.id}
              showDetails={showDetails}
              onOpen={() => onOpenJob(job.id)}
            />
          ))}
          {jobs.length === 0 && <div className="kanban-empty">Drop jobs here when they reach {status.toLowerCase()}.</div>}
        </div>
      </SortableContext>
    </section>
  );
}
interface JobForm {
  title: string;
  status: JobStatus;
  priority: JobPriority;
  scheduledFor: string;
  crewId: string;
  notes: string;
}

interface AttachmentForm {
  type: AttachmentType;
  name: string;
}

interface JobsProps {
  data: AppData;
  setData: React.Dispatch<React.SetStateAction<AppData>>;
  selectedCustomerId: string | null;
  selectCustomer: (customerId: string | null, nextData?: AppData) => void;
  selectedJobId: string | null;
  selectJob: (jobId: string | null, nextData?: AppData) => void;
  jobSearch: string;
  setJobSearch: React.Dispatch<React.SetStateAction<string>>;
  setView: React.Dispatch<React.SetStateAction<View>>;
}

export const Jobs: React.FC<JobsProps> = ({
  data,
  setData,
  selectedCustomerId,
  selectCustomer,
  selectedJobId,
  selectJob,
  jobSearch,
  setJobSearch,
  setView
}) => {
  const [showJobDetails, setShowJobDetails] = useState(false);
  const [showProjectListDetails, setShowProjectListDetails] = useState(false);
  const [jobForm, setJobForm] = useState<JobForm>({
    title: '',
    status: 'Scheduled',
    priority: 'Normal',
    scheduledFor: '',
    crewId: '',
    notes: ''
  });
  const [isEditingJob, setIsEditingJob] = useState(false);
  const [jobEditForm, setJobEditForm] = useState<JobForm>({
    title: '',
    status: 'Scheduled',
    priority: 'Normal',
    scheduledFor: '',
    crewId: '',
    notes: ''
  });
  const [weather, setWeather] = useState<JobWeatherSnapshot | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [attachmentForm, setAttachmentForm] = useState<AttachmentForm>({ type: 'Contract', name: '' });
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);

  const customerJobs = useMemo(
    () => data.jobs.filter((job) => job.customerId === selectedCustomerId),
    [data.jobs, selectedCustomerId]
  );

  const filteredJobs = useMemo(() => {
    const q = jobSearch.trim().toLowerCase();
    const source = selectedCustomerId ? customerJobs : data.jobs;
    if (!q) return source;
    return source.filter((job) => {
      const customer = data.customers.find((entry) => entry.id === job.customerId);
      return [job.title, job.notes, job.status, job.priority, job.scheduledFor, customer?.name ?? '', customer?.address ?? ''].some((value) =>
        value.toLowerCase().includes(q)
      );
    });
  }, [jobSearch, selectedCustomerId, customerJobs, data.jobs, data.customers]);

  const selectedCustomer = useMemo(() => findCustomer(data, selectedCustomerId), [data, selectedCustomerId]);
  const selectedJob = useMemo(() => findJob(data, selectedJobId), [data, selectedJobId]);
  const selectedJobCustomer = useMemo(() => findCustomer(data, selectedJob?.customerId), [data, selectedJob?.customerId]);
  const selectedJobCrew = useMemo(() => findCrewById(data, selectedJob?.crewId), [data, selectedJob?.crewId]);
  const selectedEstimate = useMemo(() => findEstimateForJob(data, selectedJobId), [data, selectedJobId]);
  const selectedInvoice = useMemo(() => findInvoiceForJob(data, selectedJobId), [data, selectedJobId]);
  const selectedInspection = useMemo(() => findInspectionForCustomer(data, selectedJobCustomer?.id), [data, selectedJobCustomer?.id]);
  const selectedAttachments = useMemo(() => data.attachments.filter((entry) => entry.jobId === selectedJobId), [data.attachments, selectedJobId]);
  const activeJobs = data.jobs.filter((job) => job.status !== 'Complete' && job.status !== 'Paid');
  const highPriorityJobs = data.jobs.filter((job) => job.priority === 'High');
  const [activeDragJob, setActiveDragJob] = useState<Job | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const jobsByStage = useMemo(() => {
    return JOB_STAGES.reduce<Record<JobStatus, Job[]>>((acc, status) => {
      acc[status] = filteredJobs.filter((job) => job.status === status);
      return acc;
    }, {} as Record<JobStatus, Job[]>);
  }, [filteredJobs]);
  const filteredPipelineValue = filteredJobs.reduce((sum, job) => {
    const estimate = data.estimates.find((entry) => entry.jobId === job.id);
    return sum + (estimate?.totalPrice ?? 0);
  }, 0);

  function handleDragStart(event: DragStartEvent) {
    setActiveDragJob(data.jobs.find((job) => job.id === String(event.active.id)) ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    const activeId = String(event.active.id);
    const overId = event.over?.id;
    setActiveDragJob(null);
    if (!overId) return;

    const activeJob = data.jobs.find((job) => job.id === activeId);
    if (!activeJob) return;

    const overJob = data.jobs.find((job) => job.id === String(overId));
    const targetStatus = statusFromDroppableId(overId) ?? overJob?.status;
    if (!targetStatus) return;

    setData((prev) => {
      const patchedJobs = prev.jobs.map((job) => job.id === activeId ? { ...job, status: targetStatus } : job);
      const fromIndex = patchedJobs.findIndex((job) => job.id === activeId);
      if (fromIndex < 0) return prev;

      let toIndex = overJob ? patchedJobs.findIndex((job) => job.id === overJob.id) : -1;
      if (toIndex < 0) {
        const targetIndexes = patchedJobs
          .map((job, index) => job.status === targetStatus && job.id !== activeId ? index : -1)
          .filter((index) => index >= 0);
        toIndex = targetIndexes.at(-1) ?? fromIndex;
      }

      return { ...prev, jobs: arrayMove(patchedJobs, fromIndex, toIndex) };
    });
    selectJob(activeId);
  }

  useEffect(() => {
    let cancelled = false;

    async function loadWeather() {
      if (!selectedJobCustomer?.address) {
        setWeather(null);
        setWeatherError(null);
        setWeatherLoading(false);
        return;
      }

      setWeatherLoading(true);
      setWeatherError(null);

      try {
        const nextWeather = await fetchJobWeather(selectedJobCustomer.address, selectedJob?.scheduledFor || undefined);
        if (!cancelled) {
          setWeather(nextWeather);
        }
      } catch (error) {
        if (!cancelled) {
          setWeather(null);
          setWeatherError(error instanceof Error ? error.message : 'Could not load weather');
        }
      } finally {
        if (!cancelled) {
          setWeatherLoading(false);
        }
      }
    }

    void loadWeather();

    return () => {
      cancelled = true;
    };
  }, [selectedJob?.scheduledFor, selectedJobCustomer?.address]);

  function addJob() {
    if (!selectedCustomerId || !jobForm.title.trim()) return;

    const newJob: Job = {
      id: uid(),
      customerId: selectedCustomerId,
      title: jobForm.title.trim(),
      status: jobForm.status,
      priority: jobForm.priority,
      scheduledFor: jobForm.scheduledFor,
      crewId: jobForm.crewId || undefined,
      notes: jobForm.notes.trim(),
      createdAt: new Date().toISOString()
    };

    const nextData = { ...data, jobs: [newJob, ...data.jobs] };
    setData(nextData);
    selectJob(newJob.id, nextData);
    setView('jobs');
    setJobForm({ title: '', status: 'Scheduled', priority: 'Normal', scheduledFor: '', crewId: '', notes: '' });
  }

  async function addAttachment() {
    if (!selectedJobCustomer || !selectedJobId || !attachmentFile) return;
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ''));
      reader.onerror = () => reject(reader.error ?? new Error('Failed to read file'));
      reader.readAsDataURL(attachmentFile);
    });
    const nextAttachment = {
      id: uid(),
      customerId: selectedJobCustomer.id,
      jobId: selectedJobId,
      type: attachmentForm.type,
      name: attachmentForm.name.trim() || attachmentFile.name,
      fileName: attachmentFile.name,
      mimeType: attachmentFile.type || 'application/octet-stream',
      sizeBytes: attachmentFile.size,
      dataUrl,
      createdAt: new Date().toISOString(),
    };
    setData((prev) => ({ ...prev, attachments: [nextAttachment, ...prev.attachments] }));
    setAttachmentForm({ type: 'Contract', name: '' });
    setAttachmentFile(null);
  }

  function removeJob(jobId: string) {
    const job = data.jobs.find((entry) => entry.id === jobId);
    const confirmed = window.confirm(
      `Delete ${job?.title ?? 'this project'}? Linked estimates and invoices for this project will also be removed.`
    );

    if (!confirmed) return;

    const nextData = {
      ...data,
      jobs: data.jobs.filter((job) => job.id !== jobId),
      estimates: data.estimates.filter((estimate) => estimate.jobId !== jobId),
      invoices: data.invoices.filter((invoice) => invoice.jobId !== jobId),
      attachments: data.attachments.filter((entry) => entry.jobId !== jobId),
    };
    setData(nextData);
    if (selectedJobId === jobId) {
      const replacementJobId = nextData.jobs.find((job) => job.customerId === selectedCustomerId)?.id ?? nextData.jobs[0]?.id ?? null;
      selectJob(replacementJobId, nextData);
    } else {
      selectJob(selectedJobId, nextData);
    }
  }

  function startEditingJob() {
    if (!selectedJob) return;

    setJobEditForm({
      title: selectedJob.title,
      status: selectedJob.status,
      priority: selectedJob.priority,
      scheduledFor: selectedJob.scheduledFor,
      crewId: selectedJob.crewId ?? '',
      notes: selectedJob.notes,
    });
    setIsEditingJob(true);
  }

  function cancelEditingJob() {
    setIsEditingJob(false);
  }

  function saveJobEdits() {
    if (!selectedJob || !jobEditForm.title.trim()) return;

    const nextData = {
      ...data,
      jobs: data.jobs.map((job) => job.id === selectedJob.id
        ? {
            ...job,
            title: jobEditForm.title.trim(),
            status: jobEditForm.status,
            priority: jobEditForm.priority,
            scheduledFor: jobEditForm.scheduledFor,
            crewId: jobEditForm.crewId || undefined,
            notes: jobEditForm.notes.trim(),
          }
        : job),
    };

    setData(nextData);
    selectJob(selectedJob.id, nextData);
    setIsEditingJob(false);
  }

  return (
    <section className="content-grid">
      <div className="column-stack">
        <div className="card">
          <div className="section-head">
            <h3>{selectedCustomer ? `Projects for ${selectedCustomer.name}` : 'Select a customer'}</h3>
            {selectedCustomer ? (
              <button type="button" className="address-link" onClick={() => openAddressInMaps(selectedCustomer.address)}>
                {selectedCustomer.address}
              </button>
            ) : (
              <span>Choose a customer to continue</span>
            )}
          </div>
          <div className="section-block selection-block">
            <div className="section-subhead">
              <h4>Selection</h4>
              <span>Pick the customer first, then jump to their job.</span>
            </div>
            <div className="selection-grid">
              <label className="field">
                <span>Customer</span>
                <select value={selectedCustomerId ?? ''} onChange={(event) => selectCustomer(event.target.value || null)}>
                  <option value="">Select a customer</option>
                  {data.customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name} — {customer.address}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Job</span>
                <select value={selectedJobId ?? ''} onChange={(event) => selectJob(event.target.value || null)}>
                  <option value="">Select a job</option>
                  {(selectedCustomerId ? data.jobs.filter((job) => job.customerId === selectedCustomerId) : data.jobs).map((job) => (
                    <option key={job.id} value={job.id}>
                      {job.title}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
          {selectedCustomer ? (
            <>
            <div className="form-grid compact-grid">
              <label className="field">
                  <span>Job title</span>
                  <input
                    placeholder="Project title, repair, replacement..."
                  value={jobForm.title}
                  onChange={(event) => setJobForm({ ...jobForm, title: event.target.value })}
                />
              </label>
              <div className="split-grid">
                <label className="field field-compact">
                  <span>Status</span>
                  <input
                    value={jobForm.status}
                    onChange={(event) => setJobForm({ ...jobForm, status: event.target.value as JobStatus })}
                    list="job-status-options"
                  />
                </label>
                <label className="field field-compact">
                  <span>Priority</span>
                  <input
                    value={jobForm.priority}
                    onChange={(event) => setJobForm({ ...jobForm, priority: event.target.value as JobPriority })}
                    list="job-priority-options"
                  />
                </label>
              </div>
              <label className="field field-compact">
                <span>Scheduled date</span>
                <input
                  type="date"
                  value={jobForm.scheduledFor}
                  onChange={(event) => setJobForm({ ...jobForm, scheduledFor: event.target.value })}
                />
              </label>
              <label className="field field-compact">
                <span>Crew</span>
                <select value={jobForm.crewId} onChange={(event) => setJobForm({ ...jobForm, crewId: event.target.value })}>
                  <option value="">Unassigned</option>
                  {data.crews.map((crew) => (
                    <option key={crew.id} value={crew.id}>
                      {crew.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field compact-textarea">
                <span>Job notes</span>
                <textarea
                  placeholder="Crew notes, customer expectations, access issues..."
                  value={jobForm.notes}
                  onChange={(event) => setJobForm({ ...jobForm, notes: event.target.value })}
                />
              </label>
              <button onClick={addJob}>Create project</button>
              <datalist id="job-status-options">
                <option value="Scheduled" />
                <option value="In Progress" />
                <option value="Awaiting Final Review" />
                <option value="Complete" />
                <option value="Invoiced" />
                <option value="Paid" />
              </datalist>
              <datalist id="job-priority-options">
                <option value="Low" />
                <option value="Normal" />
                <option value="High" />
              </datalist>
            </div>
            <div className="hero-actions">
              <button className="ghost" onClick={() => setShowJobDetails((prev) => !prev)}>
                {showJobDetails ? 'Show less details' : 'Show more details'}
              </button>
            </div>
            <div className="summary-box project-summary-box">
              <div className="section-subhead">
                <h4>Attachments</h4>
                <span>Job-level files</span>
              </div>
              <div className="form-grid compact-grid">
                <label className="field field-compact">
                  <span>Type</span>
                  <select value={attachmentForm.type} onChange={(event) => setAttachmentForm({ ...attachmentForm, type: event.target.value as AttachmentType })}>
                    <option value="Contract">Contract</option>
                    <option value="Warranty">Warranty</option>
                    <option value="Permit">Permit</option>
                    <option value="Receipt">Receipt</option>
                    <option value="Photo">Photo</option>
                    <option value="Other">Other</option>
                  </select>
                </label>
                <label className="field">
                  <span>Name</span>
                  <input value={attachmentForm.name} onChange={(event) => setAttachmentForm({ ...attachmentForm, name: event.target.value })} placeholder="Signed contract, permit..." />
                </label>
                <label className="field">
                  <span>File</span>
                  <input type="file" onChange={(event) => setAttachmentFile(event.target.files?.[0] ?? null)} />
                </label>
                <button onClick={() => void addAttachment()} disabled={!attachmentFile}>Add attachment</button>
              </div>
            </div>
            </>
          ) : (
            <div className="empty">Pick a customer first from the Customers page.</div>
          )}
        </div>

        {selectedJob && selectedJobCustomer && (
          <div className="card project-summary-card">
            <div className="section-head">
              <div>
                <h3>{selectedJob.title}</h3>
                <span>{selectedJobCustomer.name}</span>
                <button type="button" className="address-link" onClick={() => openAddressInMaps(selectedJobCustomer.address)}>
                  {selectedJobCustomer.address}
                </button>
              </div>
              <span className={`pill pill-${badgeTone(selectedJob.status)}`}>
                {selectedJob.status}
              </span>
            </div>

            <div className="mini-stats-grid project-summary-stats">
              <div className="mini-stat-card">
                <span>Priority</span>
                <strong>{selectedJob.priority}</strong>
              </div>
              <div className="mini-stat-card">
                <span>Scheduled</span>
                <strong>{selectedJob.scheduledFor || 'Not booked'}</strong>
              </div>
              <div className="mini-stat-card">
                <span>Estimate</span>
                <strong>{selectedEstimate ? money(selectedEstimate.totalPrice) : 'None'}</strong>
              </div>
              <div className="mini-stat-card">
                <span>Invoice</span>
                <strong>{selectedInvoice ? `${selectedInvoice.status}` : 'None'}</strong>
              </div>
              <div className="mini-stat-card">
                <span>Inspection</span>
                <strong>{selectedInspection ? selectedInspection.damageType : 'None'}</strong>
              </div>
              <div className="mini-stat-card">
                <span>Crew</span>
                <strong>{selectedJobCrew?.name ?? 'Unassigned'}</strong>
              </div>
              <div className="mini-stat-card">
                <span>Open items</span>
                <strong>{Number(!selectedEstimate) + Number(!selectedInvoice)}</strong>
              </div>
            </div>

            {showJobDetails && <div className="project-summary-grid">
              <div className="summary-box project-summary-box">
                <div className="section-subhead">
                  <h4>Customer</h4>
                  <span>Easy contact view</span>
                </div>
                <div className="customer-detail-grid">
                  <div className="customer-detail-row">
                    <span>Name</span>
                    <strong>{selectedJobCustomer.name}</strong>
                  </div>
                  <div className="customer-detail-row">
                    <span>Phone</span>
                    <strong>
                      {selectedJobCustomer.phone ? (
                        <button type="button" className="address-link" onClick={() => openPhoneDialer(selectedJobCustomer.phone)}>
                          {selectedJobCustomer.phone}
                        </button>
                      ) : 'Not set'}
                    </strong>
                  </div>
                  <div className="customer-detail-row">
                    <span>Email</span>
                    <strong>
                      {selectedJobCustomer.email ? (
                        <button type="button" className="address-link" onClick={() => openEmailClient(selectedJobCustomer.email)}>
                          {selectedJobCustomer.email}
                        </button>
                      ) : 'Not set'}
                    </strong>
                  </div>
                  <div className="customer-detail-row customer-detail-row-stack">
                    <span>Address</span>
                    <strong>
                      <button type="button" className="address-link" onClick={() => openAddressInMaps(selectedJobCustomer.address)}>
                        {selectedJobCustomer.address}
                      </button>
                    </strong>
                  </div>
                </div>
              </div>

              <div className="summary-box project-summary-box">
                <div className="section-subhead">
                  <h4>Money + inspection</h4>
                  <span>The project state</span>
                </div>
                <div className="customer-detail-grid">
                  <div className="customer-detail-row">
                    <span>Estimate total</span>
                    <strong>{selectedEstimate ? money(selectedEstimate.totalPrice) : 'No estimate yet'}</strong>
                  </div>
                  <div className="customer-detail-row">
                    <span>Invoice</span>
                    <strong>{selectedInvoice ? `${selectedInvoice.invoiceNumber} · ${selectedInvoice.status}` : 'No invoice yet'}</strong>
                  </div>
                  <div className="customer-detail-row">
                    <span>Damage</span>
                    <strong>{selectedInspection ? selectedInspection.damageType : 'No inspection yet'}</strong>
                  </div>
                  <div className="customer-detail-row">
                    <span>Urgency</span>
                    <strong>{selectedInspection ? selectedInspection.urgency : 'N/A'}</strong>
                  </div>
                </div>
              </div>

              <div className="summary-box project-summary-box">
                <div className="section-subhead">
                  <h4>Weather</h4>
                  <span>{selectedJob.scheduledFor ? `Forecast for ${selectedJob.scheduledFor}` : 'Current conditions for this address'}</span>
                </div>
                {weatherLoading ? (
                  <div className="empty">Loading weather...</div>
                ) : weatherError ? (
                  <div className="empty">{weatherError}</div>
                ) : weather ? (
                  <div className="customer-detail-grid">
                    <div className="customer-detail-row">
                      <span>Location</span>
                      <strong>{weather.cityLabel}</strong>
                    </div>
                    <div className="customer-detail-row">
                      <span>Conditions</span>
                      <strong>{weather.summary}</strong>
                    </div>
                    <div className="customer-detail-row">
                      <span>Current</span>
                      <strong>{weather.currentTempC != null ? `${Math.round(weather.currentTempC)}°C` : 'N/A'}</strong>
                    </div>
                    <div className="customer-detail-row">
                      <span>High / low</span>
                      <strong>{weather.highTempC != null && weather.lowTempC != null ? `${Math.round(weather.highTempC)}° / ${Math.round(weather.lowTempC)}°` : 'N/A'}</strong>
                    </div>
                    <div className="customer-detail-row">
                      <span>Rain chance</span>
                      <strong>{weather.rainChance != null ? `${weather.rainChance}%` : 'N/A'}</strong>
                    </div>
                    <div className="customer-detail-row">
                      <span>Wind</span>
                      <strong>{weather.currentWindKph != null ? `${Math.round(weather.currentWindKph)} km/h` : 'N/A'}</strong>
                    </div>
                    <div className="customer-detail-row customer-detail-row-stack">
                      <span>Roofing read</span>
                      <strong>{weather.roofingRisk}</strong>
                    </div>
                    <div className="customer-detail-row customer-detail-row-stack">
                      <span>Next few days</span>
                      <strong>
                        <div className="linked-record-list forecast-list">
                          {weather.daily.map((day) => (
                            <div key={day.date} className="linked-record-row">
                              <strong>{day.date}</strong>
                              <span>{day.summary} · {day.highTempC != null && day.lowTempC != null ? `${Math.round(day.highTempC)}°/${Math.round(day.lowTempC)}°` : 'N/A'} · Rain {day.rainChance != null ? `${day.rainChance}%` : 'N/A'}</span>
                            </div>
                          ))}
                        </div>
                      </strong>
                    </div>
                  </div>
                ) : (
                  <div className="empty">No weather loaded yet.</div>
                )}
              </div>

              <div className="summary-box project-summary-box span-2">
                <div className="section-subhead">
                  <h4>Readable job notes</h4>
                  <span>What matters on-site</span>
                </div>
                <div className="project-notes-box">
                  {selectedJob.notes || 'No notes yet.'}
                </div>
              </div>
            </div>}

            {showJobDetails && <div className="linked-records-grid">
              <div className="summary-box project-summary-box">
                <div className="section-subhead">
                  <h4>Inspection summary</h4>
                  <span>{selectedInspection ? 'Field detail' : 'No inspection yet'}</span>
                </div>
                {selectedInspection ? (
                  <div className="linked-record-list">
                    <div className="linked-record-row">
                      <strong>Roof</strong>
                      <span>{selectedInspection.roofType} · {selectedInspection.pitch || 'Pitch n/a'}</span>
                    </div>
                    <div className="linked-record-row">
                      <strong>Measurements</strong>
                      <span>{selectedInspection.measurements.squares} sq · {selectedInspection.measurements.ridgeLength} ridge</span>
                    </div>
                    <div className="linked-record-row">
                      <strong>Summary</strong>
                      <span>{selectedInspection.summary || 'No summary yet'}</span>
                    </div>
                  </div>
                ) : <div className="empty">No inspection saved yet.</div>}
              </div>

              <div className="summary-box project-summary-box">
                <div className="section-subhead">
                  <h4>Money trail</h4>
                  <span>Estimate to billing</span>
                </div>
                <div className="linked-record-list">
                  {selectedEstimate ? (
                    <div className="linked-record-row">
                      <strong>Proposal</strong>
                      <span>{money(selectedEstimate.totalPrice)} · {selectedEstimate.lineItems.length} items</span>
                    </div>
                  ) : <div className="empty">No estimate linked yet.</div>}
                  {selectedInvoice ? (
                    <div className="linked-record-row">
                      <strong>{selectedInvoice.invoiceNumber}</strong>
                      <span>{selectedInvoice.status} · {money(selectedInvoice.amount)}</span>
                    </div>
                  ) : <div className="empty">No invoice linked yet.</div>}
                </div>
              </div>

              {selectedAttachments.length ? (
                <div className="summary-box project-summary-box span-2">
                  <div className="section-subhead">
                    <h4>Attachment history</h4>
                    <span>Stored files for this job</span>
                  </div>
                  <div className="linked-record-list">
                    {selectedAttachments.map((entry) => (
                      <div key={entry.id} className="linked-record-row">
                        <strong>{entry.type}: {entry.name}</strong>
                        <span>{entry.fileName} · {Math.round(entry.sizeBytes / 1024)} KB</span>
                        <small>{new Date(entry.createdAt).toLocaleString()}</small>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>}

            {isEditingJob && showJobDetails && (
              <div className="summary-box project-summary-box">
                <div className="section-subhead">
                <h4>Edit project</h4>
                  <span>Quick inline update</span>
                </div>
                <div className="form-grid compact-grid">
                  <label className="field">
                    <span>Job title</span>
                    <input value={jobEditForm.title} onChange={(event) => setJobEditForm({ ...jobEditForm, title: event.target.value })} />
                  </label>
                  <div className="split-grid">
                    <label className="field field-compact">
                      <span>Status</span>
                      <input value={jobEditForm.status} onChange={(event) => setJobEditForm({ ...jobEditForm, status: event.target.value as JobStatus })} list="job-status-options" />
                    </label>
                    <label className="field field-compact">
                      <span>Priority</span>
                      <input value={jobEditForm.priority} onChange={(event) => setJobEditForm({ ...jobEditForm, priority: event.target.value as JobPriority })} list="job-priority-options" />
                    </label>
                  </div>
                  <label className="field field-compact">
                    <span>Scheduled date</span>
                    <input type="date" value={jobEditForm.scheduledFor} onChange={(event) => setJobEditForm({ ...jobEditForm, scheduledFor: event.target.value })} />
                  </label>
                  <label className="field field-compact">
                    <span>Crew</span>
                    <select value={jobEditForm.crewId} onChange={(event) => setJobEditForm({ ...jobEditForm, crewId: event.target.value })}>
                      <option value="">Unassigned</option>
                      {data.crews.map((crew) => (
                        <option key={crew.id} value={crew.id}>
                          {crew.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span>Notes</span>
                    <textarea value={jobEditForm.notes} onChange={(event) => setJobEditForm({ ...jobEditForm, notes: event.target.value })} />
                  </label>
                </div>
              </div>
            )}

            <div className="hero-actions">
              {isEditingJob ? (
                <>
                  <button onClick={saveJobEdits}>Save changes</button>
                  <button className="ghost" onClick={cancelEditingJob}>Cancel</button>
                </>
              ) : (
                <button className="ghost" onClick={startEditingJob}>Edit job</button>
              )}
              <button className="ghost" onClick={() => setView('inspect')}>Open inspection</button>
              <button className="ghost" onClick={() => setView('estimates')}>Open estimate</button>
              <button className="ghost" onClick={() => setView('invoices')}>Open billing</button>
              <button className="ghost danger" onClick={() => removeJob(selectedJob.id)}>Delete job</button>
            </div>
          </div>
        )}
      </div>

      <div className="column-stack span-2">
        <div className="card board-workspace-card">
          <div className="section-head board-section-head">
            <div>
              <h3>Job Board</h3>
              <span>{selectedCustomer ? `Showing projects for ${selectedCustomer.name}` : 'All pipelines and active roofing jobs'}</span>
            </div>
            <input
              className="search"
              placeholder="Search jobs, customer, status..."
              value={jobSearch}
              onChange={(event) => setJobSearch(event.target.value)}
            />
          </div>

          <div className="mini-stats-grid board-stats-grid">
            <div className="mini-stat-card">
              <span>Visible value</span>
              <strong>{money(filteredPipelineValue)}</strong>
            </div>
            <div className="mini-stat-card">
              <span>Total jobs</span>
              <strong>{data.jobs.length}</strong>
            </div>
            <div className="mini-stat-card">
              <span>Active jobs</span>
              <strong>{activeJobs.length}</strong>
            </div>
            <div className="mini-stat-card">
              <span>High priority</span>
              <strong>{highPriorityJobs.length}</strong>
            </div>
          </div>

          <div className="jobs-toolbar board-toolbar">
            <span>Drag cards between stages. Click a card to keep its detail panel open on the left.</span>
            <div className="hero-actions compact-actions">
              <button className="ghost" onClick={() => setShowProjectListDetails((prev) => !prev)}>
                {showProjectListDetails ? 'Compact cards' : 'Detailed cards'}
              </button>
              {selectedCustomer && (
                <button className="ghost" onClick={() => selectCustomer(null)}>
                  Show all
                </button>
              )}
            </div>
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={() => setActiveDragJob(null)}
          >
            <div className="kanban-shell job-kanban-shell">
              {JOB_STAGES.map((status) => (
                <KanbanColumn
                  key={status}
                  status={status}
                  jobs={jobsByStage[status]}
                  data={data}
                  selectedJobId={selectedJobId}
                  showDetails={showProjectListDetails}
                  onOpenJob={selectJob}
                />
              ))}
            </div>
            <DragOverlay>
              {activeDragJob ? (
                <BoardJobCard
                  job={activeDragJob}
                  data={data}
                  selected={selectedJobId === activeDragJob.id}
                  showDetails={showProjectListDetails}
                  onOpen={() => undefined}
                  isDragging
                />
              ) : null}
            </DragOverlay>
          </DndContext>

          {filteredJobs.length === 0 && <div className="empty">No projects found.</div>}
        </div>
      </div>
    </section>
  );
};
