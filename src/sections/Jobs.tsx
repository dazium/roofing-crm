import { useState, useMemo } from 'react';
import type { AppData, JobStatus, JobPriority, Job, View } from '../types';
import { badgeTone, money, openAddressInMaps, openEmailClient, openPhoneDialer } from '../lib';

interface JobForm {
  title: string;
  status: JobStatus;
  priority: JobPriority;
  scheduledFor: string;
  notes: string;
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
  const [jobForm, setJobForm] = useState<JobForm>({
    title: '',
    status: 'Scheduled',
    priority: 'Normal',
    scheduledFor: '',
    notes: ''
  });
  const [isEditingJob, setIsEditingJob] = useState(false);
  const [jobEditForm, setJobEditForm] = useState<JobForm>({
    title: '',
    status: 'Scheduled',
    priority: 'Normal',
    scheduledFor: '',
    notes: ''
  });

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

  const selectedCustomer = data.customers.find((customer) => customer.id === selectedCustomerId) || null;
  const selectedJob = data.jobs.find((job) => job.id === selectedJobId) || null;
  const selectedJobCustomer = data.customers.find((customer) => customer.id === selectedJob?.customerId) || null;
  const selectedEstimate = data.estimates.find((estimate) => estimate.jobId === selectedJobId) || null;
  const selectedInvoice = data.invoices.find((invoice) => invoice.jobId === selectedJobId) || null;
  const selectedInspection = data.inspections.find((inspection) => inspection.customerId === selectedJobCustomer?.id) || null;
  const activeJobs = data.jobs.filter((job) => job.status !== 'Complete' && job.status !== 'Paid');
  const highPriorityJobs = data.jobs.filter((job) => job.priority === 'High');


  function uid() {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }


  function addJob() {
    if (!selectedCustomerId || !jobForm.title.trim()) return;

    const newJob: Job = {
      id: uid(),
      customerId: selectedCustomerId,
      title: jobForm.title.trim(),
      status: jobForm.status,
      priority: jobForm.priority,
      scheduledFor: jobForm.scheduledFor,
      notes: jobForm.notes.trim(),
      createdAt: new Date().toISOString()
    };

    const nextData = { ...data, jobs: [newJob, ...data.jobs] };
    setData(nextData);
    selectJob(newJob.id, nextData);
    setView('jobs');
    setJobForm({ title: '', status: 'Scheduled', priority: 'Normal', scheduledFor: '', notes: '' });
  }

  function removeJob(jobId: string) {
    const nextData = {
      ...data,
      jobs: data.jobs.filter((job) => job.id !== jobId),
      estimates: data.estimates.filter((estimate) => estimate.jobId !== jobId),
      invoices: data.invoices.filter((invoice) => invoice.jobId !== jobId),
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
                <label className="field">
                  <span>Status</span>
                  <input
                    value={jobForm.status}
                    onChange={(event) => setJobForm({ ...jobForm, status: event.target.value as JobStatus })}
                    list="job-status-options"
                  />
                </label>
                <label className="field">
                  <span>Priority</span>
                  <input
                    value={jobForm.priority}
                    onChange={(event) => setJobForm({ ...jobForm, priority: event.target.value as JobPriority })}
                    list="job-priority-options"
                  />
                </label>
              </div>
              <label className="field">
                <span>Scheduled date</span>
                <input
                  type="date"
                  value={jobForm.scheduledFor}
                  onChange={(event) => setJobForm({ ...jobForm, scheduledFor: event.target.value })}
                />
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
                <span>Open items</span>
                <strong>{Number(!selectedEstimate) + Number(!selectedInvoice)}</strong>
              </div>
            </div>

            <div className="project-summary-grid">
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

              <div className="summary-box project-summary-box span-2">
                <div className="section-subhead">
                  <h4>Readable job notes</h4>
                  <span>What matters on-site</span>
                </div>
                <div className="project-notes-box">
                  {selectedJob.notes || 'No notes yet.'}
                </div>
              </div>
            </div>

            <div className="linked-records-grid">
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
            </div>

            {isEditingJob && (
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
                    <label className="field">
                      <span>Status</span>
                      <input value={jobEditForm.status} onChange={(event) => setJobEditForm({ ...jobEditForm, status: event.target.value as JobStatus })} list="job-status-options" />
                    </label>
                    <label className="field">
                      <span>Priority</span>
                      <input value={jobEditForm.priority} onChange={(event) => setJobEditForm({ ...jobEditForm, priority: event.target.value as JobPriority })} list="job-priority-options" />
                    </label>
                  </div>
                  <label className="field">
                    <span>Scheduled date</span>
                    <input type="date" value={jobEditForm.scheduledFor} onChange={(event) => setJobEditForm({ ...jobEditForm, scheduledFor: event.target.value })} />
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
        <div className="card">
          <div className="section-head">
            <h3>Projects</h3>
            <input
              className="search"
              placeholder="Search projects, customer, status..."
              value={jobSearch}
              onChange={(event) => setJobSearch(event.target.value)}
            />
          </div>
          <div className="mini-stats-grid">
            <div className="mini-stat-card">
              <span>Total projects</span>
              <strong>{data.jobs.length}</strong>
            </div>
            <div className="mini-stat-card">
              <span>Active projects</span>
              <strong>{activeJobs.length}</strong>
            </div>
            <div className="mini-stat-card">
              <span>High priority</span>
              <strong>{highPriorityJobs.length}</strong>
            </div>
          </div>
          <div className="jobs-toolbar">
            <span>
              {selectedCustomer ? `Showing projects for ${selectedCustomer.name}` : 'Showing all projects'}
            </span>
            {selectedCustomer && (
              <button className="ghost" onClick={() => selectCustomer(null)}>
                Show all
              </button>
            )}
          </div>
          <div className="job-board-list">
            {filteredJobs.map((job) => {
              const customer = data.customers.find((entry) => entry.id === job.customerId);
              const estimate = data.estimates.find((entry) => entry.jobId === job.id);
              const invoice = data.invoices.find((entry) => entry.jobId === job.id);
              return (
                <div
                  key={job.id}
                  className={`job-board-row ${selectedJobId === job.id ? 'active' : ''}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => selectJob(job.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      selectJob(job.id);
                    }
                  }}
                >
                  <div className="job-board-main">
                    <div className="list-row-top">
                      <strong>{job.title}</strong>
                      <span className={`pill pill-${badgeTone(job.status)}`}>
                        {job.status}
                      </span>
                    </div>
                    <div className="job-board-info">
                      <span>{customer?.name ?? 'Unknown customer'}</span>
                      <span>{job.scheduledFor || 'No date set'}</span>
                      <span>{job.priority} priority</span>
                    </div>
                    <small>{job.notes || 'No notes yet'}</small>
                    <div className="job-tile-meta-row">
                      <span>{estimate ? `Estimate ${money(estimate.totalPrice)}` : 'No estimate'}</span>
                      <span>{invoice ? `Invoice ${invoice.status}` : 'No invoice'}</span>
                    </div>
                  </div>
                  <div className="job-board-meta">
                    {customer?.address ? (
                      <button
                        type="button"
                        className="address-link"
                        onClick={(event) => {
                          event.stopPropagation();
                          openAddressInMaps(customer.address);
                        }}
                      >
                        {customer.address}
                      </button>
                    ) : (
                      <span>No address</span>
                    )}
                    <strong>{selectedJobId === job.id ? 'Selected' : 'Open'}</strong>
                  </div>
                </div>
              );
            })}

            {filteredJobs.length === 0 && <div className="empty">No projects found.</div>}
          </div>
        </div>
      </div>
    </section>
  );
};
