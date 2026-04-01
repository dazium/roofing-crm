import { useState, useMemo } from 'react';
import type { AppData, Customer, LeadStatus, View } from '../types';
import { badgeTone, openAddressInMaps, openEmailClient, openPhoneDialer } from '../lib';

interface CustomerForm {
  name: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  leadStatus: LeadStatus;
  source: string;
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
  const [customerEditForm, setCustomerEditForm] = useState<CustomerForm>({
    name: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
    leadStatus: 'New Lead',
    source: 'Facebook'
  });

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
  const openJobs = customerJobs.filter((job) => !['Complete', 'Paid'].includes(job.status));
  const unpaidInvoices = customerInvoices.filter((invoice) => invoice.status !== 'Paid');
  const latestJob = customerJobs[0] ?? null;
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
    const jobIds = data.jobs.filter((job) => job.customerId === customerId).map((job) => job.id);
    const nextData = {
      ...data,
      customers: data.customers.filter((customer) => customer.id !== customerId),
      jobs: data.jobs.filter((job) => job.customerId !== customerId),
      inspections: data.inspections.filter((inspection) => inspection.customerId !== customerId),
      estimates: data.estimates.filter((estimate) => !jobIds.includes(estimate.jobId)),
      invoices: data.invoices.filter((invoice) => !jobIds.includes(invoice.jobId)),
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
            leadStatus: customerEditForm.leadStatus,
            source: customerEditForm.source.trim() || 'Facebook',
          }
        : customer),
    };

    setData(nextData);
    selectCustomer(selectedCustomer.id);
    setIsEditingCustomer(false);
  }

  function uid() {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
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

            <div className="project-summary-grid">
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
            </div>

            <div className="linked-records-grid">
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
            </div>

            {isEditingCustomer && (
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
          <div className="list-grid">
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
                <small>
                  {customer.phone || 'No phone'}
                  {customer.email ? ` · ${customer.email}` : ''} · {customer.source}
                </small>
              </div>
            ))}

            {filteredCustomers.length === 0 && <div className="empty">No customers found.</div>}
          </div>
        </div>
      </div>
    </section>
  );
};
