import { useState, useMemo } from 'react';
import type { AppData, AttachmentType, CommunicationType, Customer, Job, LeadStatus, View } from '../types';
import { LEAD_STATUS_FLOW, allowedLeadStatusTransitions, badgeTone, canTransitionLeadStatus, openAddressInMaps, openEmailClient, openPhoneDialer, recommendedLeadStatus, uid, validateLeadWorkflowStatus } from '../lib';

interface CustomerForm {
  name: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  leadStatus: LeadStatus;
  source: string;
}

interface CommunicationForm {
  type: CommunicationType;
  subject: string;
  message: string;
}

interface AttachmentForm {
  type: AttachmentType;
  name: string;
}

interface CustomersProps {
  data: AppData;
  setData: React.Dispatch<React.SetStateAction<AppData>>;
  selectedCustomerId: string | null;
  selectCustomer: (customerId: string | null) => void;
  selectJob: (jobId: string | null, nextData?: AppData) => void;
  search: string;
  setSearch: React.Dispatch<React.SetStateAction<string>>;
  setView: React.Dispatch<React.SetStateAction<View>>;
}

export const Customers: React.FC<CustomersProps> = ({
  data,
  setData,
  selectedCustomerId,
  selectCustomer,
  selectJob,
  search,
  setSearch,
  setView
}) => {
  const [customerForm, setCustomerForm] = useState<CustomerForm>({
    name: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
    leadStatus: 'New Lead',
    source: 'Facebook'
  });
  const [isEditingCustomer, setIsEditingCustomer] = useState(false);
  const [showCustomerDetails, setShowCustomerDetails] = useState(false);
  const [showLeadListDetails, setShowLeadListDetails] = useState(false);
  const [customerEditForm, setCustomerEditForm] = useState<CustomerForm>({
    name: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
    leadStatus: 'New Lead',
    source: 'Facebook'
  });
  const [communicationForm, setCommunicationForm] = useState<CommunicationForm>({
    type: 'Call',
    subject: '',
    message: ''
  });
  const [attachmentForm, setAttachmentForm] = useState<AttachmentForm>({
    type: 'Contract',
    name: ''
  });
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);

  const filteredCustomers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data.customers;
    return data.customers.filter((customer) =>
      [customer.name, customer.phone, customer.address, customer.notes, customer.source, customer.leadStatus].some((value) =>
        value.toLowerCase().includes(q)
      )
    );
  }, [data.customers, search]);

  const selectedCustomer = data.customers.find((customer) => customer.id === selectedCustomerId) || null;
  const customerJobs = useMemo(
    () => data.jobs.filter((job) => job.customerId === selectedCustomerId),
    [data.jobs, selectedCustomerId]
  );
  const customerInspections = useMemo(
    () => data.inspections.filter((inspection) => inspection.customerId === selectedCustomerId),
    [data.inspections, selectedCustomerId]
  );
  const customerJobIds = customerJobs.map((job) => job.id);
  const customerEstimates = data.estimates.filter((estimate) => customerJobIds.includes(estimate.jobId));
  const customerInvoices = data.invoices.filter((invoice) => customerJobIds.includes(invoice.jobId));
  const customerCommunications = data.communications.filter((entry) => entry.customerId === selectedCustomerId);
  const customerAttachments = data.attachments.filter((entry) => entry.customerId === selectedCustomerId);
  const openJobs = customerJobs.filter((job) => !['Complete', 'Paid'].includes(job.status));
  const unpaidInvoices = customerInvoices.filter((invoice) => invoice.status !== 'Paid');
  const leadWorkflowContext = {
    hasJob: customerJobs.length > 0,
    hasInspection: customerInspections.length > 0,
    hasEstimate: customerEstimates.length > 0,
    hasInvoice: customerInvoices.length > 0,
    hasPaidInvoice: customerInvoices.some((invoice) => invoice.status === 'Paid'),
  };
  const recommendedStatus = recommendedLeadStatus(leadWorkflowContext);
  const leadStatusValidation = validateLeadWorkflowStatus(selectedCustomer?.leadStatus ?? 'New Lead', leadWorkflowContext);
  const editableLeadOptions = selectedCustomer ? allowedLeadStatusTransitions(selectedCustomer.leadStatus) : LEAD_STATUS_FLOW;
  const canConvertLeadToJob = Boolean(selectedCustomer && customerJobs.length === 0 && selectedCustomer.leadStatus !== 'Lost');
  const latestJob = customerJobs[0] ?? null;
  const customerTimeline = useMemo(() => {
    if (!selectedCustomerId) return [];

    const inspectionEvents = customerInspections.map((inspection) => ({
      id: `inspection-${inspection.id}`,
      type: 'Inspection',
      title: inspection.damageType,
      detail: inspection.summary || 'Inspection saved',
      meta: inspection.createdAt,
    }));
    const jobEvents = customerJobs.map((job) => ({
      id: `job-${job.id}`,
      type: 'Project',
      title: job.title,
      detail: `${job.status} · ${job.priority} priority`,
      meta: job.createdAt,
    }));
    const estimateEvents = customerEstimates.map((estimate) => ({
      id: `estimate-${estimate.id}`,
      type: 'Estimate',
      title: `$${estimate.totalPrice.toLocaleString()}`,
      detail: `${estimate.lineItems.length} line items`,
      meta: customerJobs.find((job) => job.id === estimate.jobId)?.createdAt ?? new Date().toISOString(),
    }));
    const invoiceEvents = customerInvoices.map((invoice) => ({
      id: `invoice-${invoice.id}`,
      type: 'Invoice',
      title: invoice.invoiceNumber,
      detail: `${invoice.status} · $${invoice.balanceDue.toLocaleString()} balance`,
      meta: invoice.issuedDate ?? invoice.dueDate,
    }));
    const communicationEvents = customerCommunications.map((entry) => ({
      id: `comm-${entry.id}`,
      type: 'Communication',
      title: `${entry.type}: ${entry.subject}`,
      detail: entry.message,
      meta: entry.createdAt,
    }));

    return [...communicationEvents, ...invoiceEvents, ...estimateEvents, ...jobEvents, ...inspectionEvents]
      .sort((a, b) => b.meta.localeCompare(a.meta));
  }, [customerCommunications, customerEstimates, customerInspections, customerInvoices, customerJobs, selectedCustomerId]);

  function convertLeadToJob() {
    if (!selectedCustomer) return;
    const newJob: Job = {
      id: uid(),
      customerId: selectedCustomer.id,
      title: `${selectedCustomer.name} - Roof Project`,
      status: 'Scheduled',
      priority: 'Normal',
      scheduledFor: '',
      notes: '',
      createdAt: new Date().toISOString(),
    };
    const nextData = { ...data, jobs: [newJob, ...data.jobs] };
    setData(nextData);
    selectJob(newJob.id, nextData);
    setView('jobs');
  }

  const latestInspection = customerInspections[0] ?? null;
  const latestEstimate = customerEstimates[0] ?? null;
  const latestInvoice = customerInvoices[0] ?? null;

  function openCustomerProject(customerId: string) {
    const relatedJobId = data.jobs.find((job) => job.customerId === customerId)?.id ?? null;
    if (relatedJobId) {
      selectJob(relatedJobId);
      setView('jobs');
      return;
    }

    selectCustomer(customerId);
  }

  function addCommunication() {
    if (!selectedCustomer) return;
    if (!communicationForm.subject.trim() && !communicationForm.message.trim()) return;

    const nextCommunication = {
      id: uid(),
      customerId: selectedCustomer.id,
      jobId: latestJob?.id,
      type: communicationForm.type,
      subject: communicationForm.subject.trim() || communicationForm.type,
      message: communicationForm.message.trim(),
      createdAt: new Date().toISOString(),
    };
    setData((prev) => ({ ...prev, communications: [nextCommunication, ...prev.communications] }));
    setCommunicationForm({ type: 'Call', subject: '', message: '' });
  }

  async function addAttachment() {
    if (!selectedCustomer || !attachmentFile) return;
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ''));
      reader.onerror = () => reject(reader.error ?? new Error('Failed to read file'));
      reader.readAsDataURL(attachmentFile);
    });

    const nextAttachment = {
      id: uid(),
      customerId: selectedCustomer.id,
      jobId: latestJob?.id,
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

  function addCustomer() {
    if (!customerForm.name.trim() || !customerForm.address.trim()) return;
    const newCustomer: Customer = {
      id: uid(),
      name: customerForm.name.trim(),
      phone: customerForm.phone.trim(),
      email: customerForm.email.trim(),
      address: customerForm.address.trim(),
      notes: customerForm.notes.trim(),
      leadStatus: customerForm.leadStatus,
      source: customerForm.source.trim() || 'Facebook'
    };
    const nextData = { ...data, customers: [newCustomer, ...data.customers] };
    setData(nextData);
    selectCustomer(newCustomer.id);
    setView('customers');
    setCustomerForm({ name: '', phone: '', email: '', address: '', notes: '', leadStatus: 'New Lead', source: 'Facebook' });
  }

  function removeCustomer(customerId: string) {
    const customer = data.customers.find((entry) => entry.id === customerId);
    const relatedJobs = data.jobs.filter((job) => job.customerId === customerId);
    const confirmed = window.confirm(
      `Delete ${customer?.name ?? 'this customer'}? This will also remove ${relatedJobs.length} linked project(s), related inspections, estimates, and invoices.`
    );

    if (!confirmed) return;

    const jobIds = relatedJobs.map((job) => job.id);
    const nextData = {
      ...data,
      customers: data.customers.filter((customer) => customer.id !== customerId),
      jobs: data.jobs.filter((job) => job.customerId !== customerId),
      inspections: data.inspections.filter((inspection) => inspection.customerId !== customerId),
      estimates: data.estimates.filter((estimate) => !jobIds.includes(estimate.jobId)),
      invoices: data.invoices.filter((invoice) => !jobIds.includes(invoice.jobId)),
      communications: data.communications.filter((entry) => entry.customerId !== customerId),
      attachments: data.attachments.filter((entry) => entry.customerId !== customerId),
    };
    setData(nextData);
    selectCustomer(selectedCustomerId === customerId ? null : selectedCustomerId);
  }

  function startEditingCustomer() {
    if (!selectedCustomer) return;

    setCustomerEditForm({
      name: selectedCustomer.name,
      phone: selectedCustomer.phone,
      email: selectedCustomer.email,
      address: selectedCustomer.address,
      notes: selectedCustomer.notes,
      leadStatus: selectedCustomer.leadStatus,
      source: selectedCustomer.source,
    });
    setIsEditingCustomer(true);
  }

  function cancelEditingCustomer() {
    setIsEditingCustomer(false);
  }

  function saveCustomerEdits() {
    if (!selectedCustomer) return;
    if (!customerEditForm.name.trim() || !customerEditForm.address.trim()) return;
    if (!canTransitionLeadStatus(selectedCustomer.leadStatus, customerEditForm.leadStatus)) {
      window.alert(`Lead status transition "${selectedCustomer.leadStatus}" -> "${customerEditForm.leadStatus}" is blocked by the workflow guard.`);
      return;
    }

    let nextLeadStatus = customerEditForm.leadStatus;
    const nextStatusValidation = validateLeadWorkflowStatus(nextLeadStatus, leadWorkflowContext);
    if (!nextStatusValidation.valid) {
      const useRecommended = window.confirm(`${nextStatusValidation.message}\n\nSet status to "${recommendedStatus}" instead?`);
      if (!useRecommended) return;
      nextLeadStatus = recommendedStatus;
    }

    const nextData = {
      ...data,
      customers: data.customers.map((customer) => customer.id === selectedCustomer.id
        ? {
            ...customer,
            name: customerEditForm.name.trim(),
            phone: customerEditForm.phone.trim(),
            email: customerEditForm.email.trim(),
            address: customerEditForm.address.trim(),
            notes: customerEditForm.notes.trim(),
            leadStatus: nextLeadStatus,
            source: customerEditForm.source.trim() || 'Facebook',
          }
        : customer),
    };

    setData(nextData);
    selectCustomer(selectedCustomer.id);
    setIsEditingCustomer(false);
  }

  return (
    <section className="content-grid">
      <div className="column-stack">
        <div className="card">
          <div className="section-head">
            <h3>Add customer</h3>
            <span>Sales intake</span>
          </div>
          <div className="form-grid">
            <label className="field">
              <span>Homeowner name</span>
              <input
                placeholder="Homeowner name"
                value={customerForm.name}
                onChange={(event) => setCustomerForm({ ...customerForm, name: event.target.value })}
              />
            </label>
            <div className="split-grid">
              <label className="field">
                <span>Phone</span>
                <input
                  placeholder="Phone"
                  value={customerForm.phone}
                  onChange={(event) => setCustomerForm({ ...customerForm, phone: event.target.value })}
                />
              </label>
              <label className="field">
                <span>Email</span>
                <input
                  placeholder="Email"
                  value={customerForm.email}
                  onChange={(event) => setCustomerForm({ ...customerForm, email: event.target.value })}
                />
              </label>
            </div>
            <label className="field">
              <span>Address</span>
              <input
                placeholder="Address"
                value={customerForm.address}
                onChange={(event) => setCustomerForm({ ...customerForm, address: event.target.value })}
              />
            </label>
            <div className="split-grid">
              <label className="field">
                <span>Lead status</span>
                <select
                  value={customerForm.leadStatus}
                  onChange={(event) => setCustomerForm({ ...customerForm, leadStatus: event.target.value as LeadStatus })}
                >
                  <option>New Lead</option>
                  <option>Contacted</option>
                  <option>Inspection Scheduled</option>
                  <option>Estimate Sent</option>
                  <option>Won</option>
                  <option>Lost</option>
                </select>
              </label>
              <label className="field">
                <span>Lead source</span>
                <input
                  placeholder="Facebook, referral, sign..."
                  value={customerForm.source}
                  onChange={(event) => setCustomerForm({ ...customerForm, source: event.target.value })}
                />
              </label>
            </div>
            <label className="field compact-textarea">
              <span>Notes</span>
              <textarea
                placeholder="Notes"
                value={customerForm.notes}
                onChange={(event) => setCustomerForm({ ...customerForm, notes: event.target.value })}
              />
            </label>
            <button onClick={addCustomer}>Save customer</button>
          </div>
        </div>

        {selectedCustomer && (
          <div className="card customer-profile-card">
            <div className="section-head">
              <div>
                <h3>{selectedCustomer.name}</h3>
                <button type="button" className="address-link" onClick={() => openAddressInMaps(selectedCustomer.address)}>
                  {selectedCustomer.address}
                </button>
              </div>
              <span className={`pill pill-${badgeTone(selectedCustomer.leadStatus)}`}>
                {selectedCustomer.leadStatus}
              </span>
            </div>

            <div className="mini-stats-grid project-summary-stats">
              <div className="mini-stat-card">
                <span>Jobs</span>
                <strong>{customerJobs.length}</strong>
              </div>
              <div className="mini-stat-card">
                <span>Open jobs</span>
                <strong>{openJobs.length}</strong>
              </div>
              <div className="mini-stat-card">
                <span>Estimates</span>
                <strong>{customerEstimates.length}</strong>
              </div>
              <div className="mini-stat-card">
                <span>Invoices</span>
                <strong>{customerInvoices.length}</strong>
              </div>
              <div className="mini-stat-card">
                <span>Outstanding</span>
                <strong>{unpaidInvoices.length}</strong>
              </div>
              <div className="mini-stat-card">
                <span>Inspections</span>
                <strong>{customerInspections.length}</strong>
              </div>
            </div>
            <div className="hero-actions">
              <button className="ghost" onClick={() => setShowCustomerDetails((prev) => !prev)}>
                {showCustomerDetails ? 'Show less details' : 'Show more details'}
              </button>
            </div>
            {showCustomerDetails && <div className="project-summary-grid">
              <div className="summary-box project-summary-box">
                <div className="section-subhead">
                  <h4>Contact snapshot</h4>
                  <span>Who this job belongs to</span>
                </div>
                <div className="customer-detail-grid">
                  <div className="customer-detail-row">
                    <span>Phone</span>
                    <strong>
                      {selectedCustomer.phone ? (
                        <button type="button" className="address-link" onClick={() => openPhoneDialer(selectedCustomer.phone)}>
                          {selectedCustomer.phone}
                        </button>
                      ) : 'Not set'}
                    </strong>
                  </div>
                  <div className="customer-detail-row">
                    <span>Email</span>
                    <strong>
                      {selectedCustomer.email ? (
                        <button type="button" className="address-link" onClick={() => openEmailClient(selectedCustomer.email)}>
                          {selectedCustomer.email}
                        </button>
                      ) : 'Not set'}
                    </strong>
                  </div>
                  <div className="customer-detail-row">
                    <span>Source</span>
                    <strong>{selectedCustomer.source}</strong>
                  </div>
                  <div className="customer-detail-row">
                    <span>Lead status</span>
                    <strong>{selectedCustomer.leadStatus}</strong>
                  </div>
                </div>
              </div>

              <div className="summary-box project-summary-box">
                <div className="section-subhead">
                  <h4>Current project picture</h4>
                  <span>The latest connected records</span>
                </div>
                <div className="customer-detail-grid">
                  <div className="customer-detail-row">
                    <span>Latest job</span>
                    <strong>{latestJob?.title ?? 'No job yet'}</strong>
                  </div>
                  <div className="customer-detail-row">
                    <span>Latest inspection</span>
                    <strong>{latestInspection ? `${latestInspection.damageType} · ${latestInspection.urgency}` : 'No inspection yet'}</strong>
                  </div>
                  <div className="customer-detail-row">
                    <span>Latest estimate</span>
                    <strong>{latestEstimate ? `$${latestEstimate.totalPrice.toLocaleString()}` : 'No estimate yet'}</strong>
                  </div>
                  <div className="customer-detail-row">
                    <span>Latest invoice</span>
                    <strong>{latestInvoice ? `${latestInvoice.invoiceNumber} · ${latestInvoice.status}` : 'No invoice yet'}</strong>
                  </div>
                </div>
              </div>

              <div className="summary-box project-summary-box span-2">
                <div className="section-subhead">
                  <h4>Project notes</h4>
                  <span>Readable at a glance</span>
                </div>
                <div className="project-notes-box">
                  {selectedCustomer.notes || 'No notes yet.'}
                </div>
              </div>

              <div className="summary-box project-summary-box">
                <div className="section-subhead">
                  <h4>Communication log</h4>
                  <span>Calls, texts, emails</span>
                </div>
                <div className="form-grid compact-grid">
                  <label className="field field-compact">
                    <span>Type</span>
                    <select value={communicationForm.type} onChange={(event) => setCommunicationForm({ ...communicationForm, type: event.target.value as CommunicationType })}>
                      <option value="Call">Call</option>
                      <option value="Text">Text</option>
                      <option value="Email">Email</option>
                      <option value="Site Visit">Site Visit</option>
                      <option value="Note">Note</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>Subject</span>
                    <input value={communicationForm.subject} onChange={(event) => setCommunicationForm({ ...communicationForm, subject: event.target.value })} placeholder="Reminder, confirmation, follow-up..." />
                  </label>
                  <label className="field compact-textarea">
                    <span>Message</span>
                    <textarea value={communicationForm.message} onChange={(event) => setCommunicationForm({ ...communicationForm, message: event.target.value })} placeholder="What was said or agreed..." />
                  </label>
                  <button onClick={addCommunication}>Log communication</button>
                </div>
              </div>

              <div className="summary-box project-summary-box">
                <div className="section-subhead">
                  <h4>Attachments</h4>
                  <span>Contracts, warranties, permits</span>
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
                    <input value={attachmentForm.name} onChange={(event) => setAttachmentForm({ ...attachmentForm, name: event.target.value })} placeholder="Signed contract, permit, warranty..." />
                  </label>
                  <label className="field">
                    <span>File</span>
                    <input type="file" onChange={(event) => setAttachmentFile(event.target.files?.[0] ?? null)} />
                  </label>
                  <button onClick={() => void addAttachment()} disabled={!attachmentFile}>Add attachment</button>
                </div>
              </div>
            </div>}

            {canConvertLeadToJob && (
              <div className="workflow-callout">
                <strong className="callout-title">Convert lead to active job</strong>
                <span className="callout-text">No job record exists yet for this customer. Create a project to begin scheduling and pricing.</span>
                <button className="callout-btn" onClick={convertLeadToJob}>Create Project Now</button>
              </div>
            )}
            {showCustomerDetails && <div className="workflow-callout">
              <strong>Lead workflow check</strong>
              <span>
                {leadStatusValidation.valid
                  ? `Current status is consistent. Recommended stage: ${recommendedStatus}.`
                  : `${leadStatusValidation.message} Recommended stage: ${recommendedStatus}.`}
              </span>
            </div>}

            {showCustomerDetails && <div className="linked-records-grid">
              <div className="summary-box project-summary-box">
                <div className="section-subhead">
                  <h4>Jobs</h4>
                  <span>{customerJobs.length ? 'Connected work orders' : 'Nothing yet'}</span>
                </div>
                <div className="linked-record-list">
                  {customerJobs.length ? customerJobs.map((job) => (
                    <div key={job.id} className="linked-record-row">
                      <strong>{job.title}</strong>
                      <span>{job.status} · {job.scheduledFor || 'No date set'}</span>
                    </div>
                  )) : <div className="empty">No jobs linked yet.</div>}
                </div>
              </div>

              <div className="summary-box project-summary-box span-2">
                <div className="section-subhead">
                  <h4>Customer timeline</h4>
                  <span>{customerTimeline.length} tracked items</span>
                </div>
                <div className="timeline-list">
                  {customerTimeline.length ? customerTimeline.map((item) => (
                    <div key={item.id} className="timeline-item">
                      <div className="timeline-dot" />
                      <div className="timeline-content">
                        <strong>{item.type}: {item.title}</strong>
                        <span>{item.detail}</span>
                        <small>{new Date(item.meta).toLocaleString()}</small>
                      </div>
                    </div>
                  )) : <div className="empty">No customer activity yet.</div>}
                </div>
              </div>

              {customerCommunications.length ? (
                <div className="summary-box project-summary-box span-2">
                  <div className="section-subhead">
                    <h4>Communication history</h4>
                    <span>Most recent notes first</span>
                  </div>
                  <div className="linked-record-list">
                    {customerCommunications.map((entry) => (
                      <div key={entry.id} className="linked-record-row">
                        <strong>{entry.type}: {entry.subject}</strong>
                        <span>{entry.message}</span>
                        <small>{new Date(entry.createdAt).toLocaleString()}</small>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {customerAttachments.length ? (
                <div className="summary-box project-summary-box span-2">
                  <div className="section-subhead">
                    <h4>Attachment history</h4>
                    <span>Stored files</span>
                  </div>
                  <div className="linked-record-list">
                    {customerAttachments.map((entry) => (
                      <div key={entry.id} className="linked-record-row">
                        <strong>{entry.type}: {entry.name}</strong>
                        <span>{entry.fileName} · {Math.round(entry.sizeBytes / 1024)} KB</span>
                        <small>{new Date(entry.createdAt).toLocaleString()}</small>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="summary-box project-summary-box">
                <div className="section-subhead">
                  <h4>Money</h4>
                  <span>Estimate + invoice snapshot</span>
                </div>
                <div className="linked-record-list">
                  {customerEstimates.length ? customerEstimates.map((estimate) => (
                    <div key={estimate.id} className="linked-record-row">
                      <strong>Estimate</strong>
                      <span>${estimate.totalPrice.toLocaleString()}</span>
                    </div>
                  )) : <div className="empty">No estimates yet.</div>}
                  {customerInvoices.length ? customerInvoices.map((invoice) => (
                    <div key={invoice.id} className="linked-record-row">
                      <strong>{invoice.invoiceNumber}</strong>
                      <span>{invoice.status} · ${invoice.amount.toLocaleString()}</span>
                    </div>
                  )) : <div className="empty">No invoices yet.</div>}
                </div>
              </div>
            </div>}

            {isEditingCustomer && showCustomerDetails && (
              <div className="summary-box project-summary-box">
                <div className="section-subhead">
                  <h4>Edit customer</h4>
                  <span>Quick inline update</span>
                </div>
                <div className="form-grid compact-grid">
                  <label className="field">
                    <span>Name</span>
                    <input value={customerEditForm.name} onChange={(event) => setCustomerEditForm({ ...customerEditForm, name: event.target.value })} />
                  </label>
                  <div className="split-grid">
                    <label className="field">
                      <span>Phone</span>
                      <input value={customerEditForm.phone} onChange={(event) => setCustomerEditForm({ ...customerEditForm, phone: event.target.value })} />
                    </label>
                    <label className="field">
                      <span>Email</span>
                      <input value={customerEditForm.email} onChange={(event) => setCustomerEditForm({ ...customerEditForm, email: event.target.value })} />
                    </label>
                  </div>
                  <label className="field">
                    <span>Address</span>
                    <input value={customerEditForm.address} onChange={(event) => setCustomerEditForm({ ...customerEditForm, address: event.target.value })} />
                  </label>
                  <div className="split-grid">
                    <label className="field">
                      <span>Lead status</span>
                      <select value={customerEditForm.leadStatus} onChange={(event) => setCustomerEditForm({ ...customerEditForm, leadStatus: event.target.value as LeadStatus })}>
                        {editableLeadOptions.map((status) => (
                          <option key={status}>{status}</option>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      <span>Lead source</span>
                      <input value={customerEditForm.source} onChange={(event) => setCustomerEditForm({ ...customerEditForm, source: event.target.value })} />
                    </label>
                  </div>
                  <label className="field">
                    <span>Notes</span>
                    <textarea value={customerEditForm.notes} onChange={(event) => setCustomerEditForm({ ...customerEditForm, notes: event.target.value })} />
                  </label>
                </div>
              </div>
            )}

            <div className="hero-actions">
              {isEditingCustomer ? (
                <>
                  <button onClick={saveCustomerEdits}>Save changes</button>
                  <button className="ghost" onClick={cancelEditingCustomer}>Cancel</button>
                </>
              ) : (
                <button className="ghost" onClick={startEditingCustomer}>Edit customer</button>
              )}
              <button className="ghost" onClick={() => setView('inspect')}>Next: inspection</button>
              <button className="ghost" onClick={() => setView('estimates')}>Next: proposal</button>
              <button className="ghost" onClick={() => setView('jobs')}>Open job record</button>
              <button className="ghost" onClick={() => setView('invoices')}>Open billing</button>
              <button className="ghost danger" onClick={() => removeCustomer(selectedCustomer.id)}>
                Delete customer
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="column-stack span-2">
        <div className="card">
          <div className="section-head">
            <h3>Lead list</h3>
            <input
              className="search"
              placeholder="Search customers, address, source..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <div className="hero-actions">
            <button className="ghost" onClick={() => setShowLeadListDetails((prev) => !prev)}>
              {showLeadListDetails ? 'Simple list' : 'Show more in list'}
            </button>
          </div>
          <div className="list-grid">
            {data.customers.length === 0 && (
              <div className="empty">
                No customers yet. Add your first homeowner above, then run the flow: customer to inspection to estimate to invoice to tasks.
              </div>
            )}
            {filteredCustomers.map((customer) => (
              <div
                key={customer.id}
                className={`list-row ${selectedCustomerId === customer.id ? 'active' : ''}`}
                role="button"
                tabIndex={0}
                onClick={() => openCustomerProject(customer.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    openCustomerProject(customer.id);
                  }
                }}
              >
                <div className="list-row-top">
                  <strong>{customer.name}</strong>
                  <span className={`pill pill-${badgeTone(customer.leadStatus)}`}>
                    {customer.leadStatus}
                  </span>
                </div>
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
                    {showLeadListDetails && <div className="job-tile-meta-row">
                  {customer.phone ? (
                    <button
                      type="button"
                      className="address-link"
                      onClick={(event) => {
                        event.stopPropagation();
                        openPhoneDialer(customer.phone);
                      }}
                    >
                      {customer.phone}
                    </button>
                  ) : (
                    <span>No phone</span>
                  )}
                  {customer.email ? (
                    <button
                      type="button"
                      className="address-link"
                      onClick={(event) => {
                        event.stopPropagation();
                        openEmailClient(customer.email);
                      }}
                    >
                      {customer.email}
                    </button>
                  ) : (
                    <span>No email</span>
                  )}
                  <span>{customer.source}</span>
                    </div>}
              </div>
            ))}

            {filteredCustomers.length === 0 && <div className="empty">No customers found.</div>}
          </div>
        </div>
      </div>
    </section>
  );
};
