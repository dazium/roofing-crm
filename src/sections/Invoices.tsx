import { useEffect, useMemo, useState } from 'react';
import type { AppData, Invoice, InvoiceHistoryAction, InvoiceHistoryEntry, InvoiceStatus } from '../types';
import { badgeTone, buildInvoicePdfHtml, money, openAddressInMaps, openEmailClient, openPhoneDialer, reconcileInvoice, uid } from '../lib';

interface InvoicesProps {
  data: AppData;
  setData: React.Dispatch<React.SetStateAction<AppData>>;
  selectedCustomerId?: string | null;
  selectCustomer: (customerId: string | null, nextData?: AppData) => void;
  selectedJobId?: string | null;
  selectJob: (jobId: string | null, nextData?: AppData) => void;
}

type InvoiceForm = {
  jobId: string;
  invoiceNumber: string;
  amount: number;
  paidAmount: number;
  status: InvoiceStatus;
  dueDate: string;
  issuedDate: string;
  paidDate: string;
  notes: string;
};

function nextInvoiceNumber(invoices: Invoice[]) {
  const max = invoices.reduce((highest, invoice) => {
    const match = invoice.invoiceNumber.match(/(\d+)$/);
    const number = match ? Number(match[1]) : 2000;
    return Math.max(highest, number);
  }, 2000);
  return `INV-${max + 1}`;
}

function cleanMoney(value: number) {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

const INVOICE_HISTORY_LIMIT = 300;

function changedInvoiceState(a: Invoice, b: Invoice) {
  return a.status !== b.status || a.paidAmount !== b.paidAmount || a.balanceDue !== b.balanceDue || a.paidDate !== b.paidDate;
}

function daysUntil(dateValue?: string) {
  if (!dateValue) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dateValue);
  if (Number.isNaN(due.getTime())) return null;
  due.setHours(0, 0, 0, 0);
  return Math.floor((due.getTime() - today.getTime()) / 86400000);
}

function pushInvoiceHistory(
  previous: InvoiceHistoryEntry[],
  invoice: Invoice,
  action: InvoiceHistoryAction,
  message: string,
): InvoiceHistoryEntry[] {
  const entry: InvoiceHistoryEntry = {
    id: uid(),
    invoiceId: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    jobId: invoice.jobId,
    action,
    message,
    createdAt: new Date().toISOString(),
  };
  return [entry, ...previous].slice(0, INVOICE_HISTORY_LIMIT);
}

export const Invoices: React.FC<InvoicesProps> = ({
  data,
  setData,
  selectedCustomerId,
  selectCustomer,
  selectedJobId,
  selectJob,
}) => {
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(data.invoices[0]?.id ?? null);
  const [paymentDraft, setPaymentDraft] = useState(0);
  const [billingCustomerId, setBillingCustomerId] = useState<string>(
    selectedCustomerId
    ?? data.jobs.find((job) => job.id === selectedJobId)?.customerId
    ?? data.customers[0]?.id
    ?? ''
  );

  const initialJobId = selectedJobId ?? data.jobs[0]?.id ?? '';
  const [invoiceForm, setInvoiceForm] = useState<InvoiceForm>({
    jobId: initialJobId,
    invoiceNumber: nextInvoiceNumber(data.invoices),
    amount: data.estimates.find((estimate) => estimate.jobId === initialJobId)?.totalPrice ?? 0,
    paidAmount: 0,
    status: 'Draft',
    dueDate: '',
    issuedDate: new Date().toISOString().slice(0, 10),
    paidDate: '',
    notes: '',
  });

  const availableJobs = useMemo(
    () => (billingCustomerId ? data.jobs.filter((job) => job.customerId === billingCustomerId) : data.jobs),
    [data.jobs, billingCustomerId],
  );

  const sortedInvoices = useMemo(
    () => [...data.invoices].sort((a, b) => (b.issuedDate ?? b.dueDate ?? '').localeCompare(a.issuedDate ?? a.dueDate ?? '')),
    [data.invoices],
  );

  const selectedInvoice = data.invoices.find((invoice) => invoice.id === selectedInvoiceId) ?? null;
  const selectedInvoiceJob = data.jobs.find((job) => job.id === selectedInvoice?.jobId) ?? null;
  const selectedInvoiceCustomer = data.customers.find((customer) => customer.id === selectedInvoiceJob?.customerId) ?? null;
  const selectedInvoiceHistory = selectedInvoice
    ? data.invoiceHistory.filter((entry) => entry.invoiceId === selectedInvoice.id).slice(0, 8)
    : [];

  const outstandingInvoices = data.invoices.filter((invoice) => invoice.status !== 'Paid');
  const overdueInvoices = data.invoices.filter((invoice) => invoice.status === 'Overdue');
  const dueSoonInvoices = data.invoices.filter((invoice) => {
    if (invoice.status === 'Paid') return false;
    const days = daysUntil(invoice.dueDate);
    return days !== null && days >= 0 && days <= 3;
  });

  const invoiceJob = data.jobs.find((job) => job.id === invoiceForm.jobId) ?? null;
  const invoiceCustomer = data.customers.find((customer) => customer.id === invoiceJob?.customerId) ?? null;
  const selectedEstimate = data.estimates.find((estimate) => estimate.jobId === invoiceForm.jobId) ?? null;
  const selectedBillingCustomer = data.customers.find((customer) => customer.id === billingCustomerId) ?? null;

  useEffect(() => {
    const nextCustomerId = selectedCustomerId
      ?? data.jobs.find((job) => job.id === selectedJobId)?.customerId
      ?? data.customers[0]?.id
      ?? '';
    setBillingCustomerId(nextCustomerId);
  }, [data.customers, data.jobs, selectedCustomerId, selectedJobId]);

  useEffect(() => {
    const nextJobId = selectedJobId ?? '';
    setInvoiceForm((prev) => {
      if (prev.jobId === nextJobId) return prev;

      return {
        ...prev,
        jobId: nextJobId,
        amount: data.estimates.find((estimate) => estimate.jobId === nextJobId)?.totalPrice ?? 0,
        paidAmount: 0,
      };
    });
  }, [data.estimates, selectedJobId]);

  useEffect(() => {
    setPaymentDraft(0);
  }, [selectedInvoiceId]);

  useEffect(() => {
    const reconciled = data.invoices.map((invoice) => reconcileInvoice(invoice));
    const changed = reconciled.some((invoice, index) => changedInvoiceState(invoice, data.invoices[index]));
    if (!changed) return;

    let history = data.invoiceHistory;
    for (let index = 0; index < reconciled.length; index += 1) {
      const before = data.invoices[index];
      const after = reconciled[index];
      if (before.status !== 'Overdue' && after.status === 'Overdue') {
        history = pushInvoiceHistory(history, after, 'Auto Marked Overdue', `Invoice auto-marked overdue after due date ${after.dueDate || 'N/A'}.`);
      }
    }

    setData({ ...data, invoices: reconciled, invoiceHistory: history });
  }, [data, setData]);

  function resetForm(jobId = selectedJobId ?? data.jobs[0]?.id ?? '') {
    setInvoiceForm({
      jobId,
      invoiceNumber: nextInvoiceNumber(data.invoices),
      amount: data.estimates.find((estimate) => estimate.jobId === jobId)?.totalPrice ?? 0,
      paidAmount: 0,
      status: 'Draft',
      dueDate: '',
      issuedDate: new Date().toISOString().slice(0, 10),
      paidDate: '',
      notes: '',
    });
  }

  function createInvoice() {
    const amount = cleanMoney(Number(invoiceForm.amount));
    const paidAmount = Math.min(amount, cleanMoney(Number(invoiceForm.paidAmount)));
    if (!invoiceForm.jobId || !invoiceForm.invoiceNumber.trim() || amount <= 0) return;

    const record = reconcileInvoice({
      id: uid(),
      jobId: invoiceForm.jobId,
      invoiceNumber: invoiceForm.invoiceNumber.trim(),
      amount,
      paidAmount,
      balanceDue: Math.max(0, amount - paidAmount),
      status: invoiceForm.status,
      dueDate: invoiceForm.dueDate,
      issuedDate: invoiceForm.issuedDate,
      paidDate: invoiceForm.paidDate || undefined,
      notes: invoiceForm.notes.trim() || undefined,
    });

    const nextData = {
      ...data,
      invoices: [record, ...data.invoices],
      invoiceHistory: pushInvoiceHistory(data.invoiceHistory, record, 'Created', `Invoice created for ${money(record.amount)}.`),
    };
    setData(nextData);
    setSelectedInvoiceId(record.id);
    resetForm(invoiceForm.jobId);
  }

  function updateInvoiceStatus(invoiceId: string, status: InvoiceStatus) {
    const current = data.invoices.find((invoice) => invoice.id === invoiceId);
    if (!current) return;
    const nextData = {
      ...data,
      invoices: data.invoices.map((invoice) =>
        invoice.id === invoiceId
          ? reconcileInvoice({
              ...invoice,
              status,
              paidDate: status === 'Paid' ? new Date().toISOString().slice(0, 10) : invoice.paidDate,
              paidAmount: status === 'Paid' ? invoice.amount : invoice.paidAmount,
            })
          : invoice,
      ),
    };
    const updated = nextData.invoices.find((invoice) => invoice.id === invoiceId) ?? current;
    nextData.invoiceHistory = pushInvoiceHistory(
      data.invoiceHistory,
      updated,
      'Status Changed',
      `Status changed from ${current.status} to ${updated.status}.`,
    );
    setData(nextData);
  }

  function createInvoiceFromEstimate() {
    if (!invoiceForm.jobId || !selectedEstimate) return;

    setInvoiceForm((prev) => ({
      ...prev,
      amount: selectedEstimate.totalPrice,
      paidAmount: 0,
      notes: prev.notes || `Generated from estimate for ${invoiceJob?.title ?? 'job'}.`,
    }));
  }

  function createDepositInvoice() {
    if (!selectedEstimate) return;
    const depositAmount = Math.round(selectedEstimate.totalPrice * (selectedEstimate.depositRequired / 100) * 100) / 100;
    setInvoiceForm((prev) => ({
      ...prev,
      amount: depositAmount,
      paidAmount: 0,
      notes: prev.notes || `Deposit invoice for ${selectedEstimate.depositRequired}% of proposal total.`,
    }));
  }

  function deleteInvoice(invoiceId: string) {
    const invoice = data.invoices.find((entry) => entry.id === invoiceId);
    if (!invoice) return;
    const confirmed = window.confirm(`Delete invoice "${invoice?.invoiceNumber ?? 'this invoice'}"?`);
    if (!confirmed) return;

    const nextInvoices = data.invoices.filter((invoice) => invoice.id !== invoiceId);
    setData({
      ...data,
      invoices: nextInvoices,
      invoiceHistory: pushInvoiceHistory(data.invoiceHistory, invoice, 'Deleted', `Invoice deleted (${invoice.invoiceNumber}).`),
    });
    setSelectedInvoiceId(nextInvoices[0]?.id ?? null);
  }

  async function exportInvoicePdf(invoice: Invoice) {
    const job = data.jobs.find((entry) => entry.id === invoice.jobId);
    const customer = data.customers.find((entry) => entry.id === job?.customerId);
    if (!job || !customer) return;

    const html = buildInvoicePdfHtml({
      companyProfile: data.companyProfile,
      customerName: customer.name,
      customerAddress: customer.address,
      customerPhone: customer.phone,
      customerEmail: customer.email,
      jobTitle: job.title,
      invoice,
    });

    const safeCustomer = customer.name.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'invoice';
    const suggestedName = `${safeCustomer}-${invoice.invoiceNumber.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.pdf`;

    if (window.roofingcrmDesktop?.exportEstimatePdf) {
      await window.roofingcrmDesktop.exportEstimatePdf({ html, suggestedName });
      return;
    }

    const printWindow = window.open('', '_blank', 'noopener,noreferrer,width=900,height=1200');
    if (!printWindow) return;
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  function handleCustomerChange(customerId: string) {
    const nextCustomerId = customerId || null;
    const nextJobId = nextCustomerId
      ? data.jobs.find((job) => job.customerId === nextCustomerId)?.id ?? null
      : data.jobs[0]?.id ?? null;

    setBillingCustomerId(nextCustomerId ?? '');
    selectCustomer(nextCustomerId);
    selectJob(nextJobId);

    setInvoiceForm((prev) => ({
      ...prev,
      jobId: nextJobId ?? '',
      amount: data.estimates.find((estimate) => estimate.jobId === nextJobId)?.totalPrice ?? 0,
      paidAmount: 0,
    }));
  }

  function recordPayment(invoiceId: string) {
    if (paymentDraft <= 0) return;
    const target = data.invoices.find((invoice) => invoice.id === invoiceId);
    if (!target) return;
    const nextData = {
      ...data,
      invoices: data.invoices.map((invoice) => {
        if (invoice.id !== invoiceId) return invoice;
        return reconcileInvoice({
          ...invoice,
          paidAmount: Math.min(invoice.amount, invoice.paidAmount + paymentDraft),
          paidDate: new Date().toISOString().slice(0, 10),
        });
      }),
    };
    const updated = nextData.invoices.find((invoice) => invoice.id === invoiceId) ?? target;
    nextData.invoiceHistory = pushInvoiceHistory(
      data.invoiceHistory,
      updated,
      'Payment Recorded',
      `Payment recorded: ${money(paymentDraft)}. Balance now ${money(updated.balanceDue)}.`,
    );
    setData(nextData);
    setPaymentDraft(0);
  }

  function sendPaymentReminder(invoice: Invoice) {
    const job = data.jobs.find((entry) => entry.id === invoice.jobId);
    const customer = data.customers.find((entry) => entry.id === job?.customerId);
    if (!customer?.email) {
      window.alert('Add a customer email before sending reminders.');
      return;
    }
    const subject = encodeURIComponent(`Payment reminder: ${invoice.invoiceNumber}`);
    const body = encodeURIComponent(
      `Hi ${customer.name},\n\nThis is a reminder that invoice ${invoice.invoiceNumber} has ${money(invoice.balanceDue)} outstanding and is due on ${invoice.dueDate || 'the due date on file'}.\n\nThanks,\n${data.companyProfile.name || 'RoofingCRM'}`,
    );
    window.open(`mailto:${customer.email}?subject=${subject}&body=${body}`, '_blank', 'noopener,noreferrer');
    setData({
      ...data,
      invoiceHistory: pushInvoiceHistory(data.invoiceHistory, invoice, 'Reminder Sent', `Payment reminder prepared for ${customer.email}.`),
    });
  }

  return (
    <section className="content-grid two-col invoices-layout">
      <div className="column-stack">
        <div className="card">
          <div className="section-head">
            <h3>Create invoice</h3>
            <span>Turn finished work into money</span>
          </div>
          <div className="workflow-callout">
            <strong>Step 5: bill clearly.</strong>
            <span>Create the invoice, set the due date, then mark it sent, partial, or paid as cash comes in.</span>
          </div>
          <div className="form-grid compact-grid">
            <div className="section-block selection-block">
              <div className="section-subhead">
                <h4>Selection</h4>
                <span>Pick the customer, then bill against that customer’s job.</span>
              </div>
              <div className="selection-grid">
                <label className="field">
                  <span>Customer</span>
                  <select value={billingCustomerId} onChange={(event) => handleCustomerChange(event.target.value)}>
                    <option value="">Select a customer</option>
                    {data.customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name} - {customer.address}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Job</span>
                  <select
                    value={invoiceForm.jobId}
                    onChange={(event) => {
                      const jobId = event.target.value;
                      const customerId = data.jobs.find((job) => job.id === jobId)?.customerId ?? null;
                      selectCustomer(customerId);
                      selectJob(jobId || null);
                      setInvoiceForm((prev) => ({
                        ...prev,
                        jobId,
                        amount: data.estimates.find((estimate) => estimate.jobId === jobId)?.totalPrice ?? prev.amount,
                      }));
                    }}
                  >
                    <option value="">Select a job</option>
                    {availableJobs.map((job) => {
                      const customer = data.customers.find((entry) => entry.id === job.customerId);
                      return (
                        <option key={job.id} value={job.id}>
                          {job.title} — {customer?.name ?? 'Unknown customer'}
                        </option>
                      );
                    })}
                  </select>
                </label>
              </div>
            </div>
            <div className="split-grid">
              <label className="field field-compact">
                <span>Invoice number</span>
                <input
                  value={invoiceForm.invoiceNumber}
                  onChange={(event) => setInvoiceForm({ ...invoiceForm, invoiceNumber: event.target.value })}
                />
              </label>
              <label className="field field-compact">
                <span>Status</span>
                <select
                  value={invoiceForm.status}
                  onChange={(event) => setInvoiceForm({ ...invoiceForm, status: event.target.value as InvoiceStatus })}
                >
                  <option>Draft</option>
                  <option>Sent</option>
                  <option>Partial</option>
                  <option>Paid</option>
                  <option>Overdue</option>
                </select>
              </label>
            </div>
            <div className="split-grid">
              <label className="field field-short">
                <span>Amount</span>
                <input
                  type="number"
                  min={0}
                  value={invoiceForm.amount}
                  onChange={(event) => setInvoiceForm({ ...invoiceForm, amount: cleanMoney(Number(event.target.value)) })}
                />
              </label>
              <label className="field field-short">
                <span>Amount received</span>
                <input
                  type="number"
                  min={0}
                  value={invoiceForm.paidAmount}
                  onChange={(event) => setInvoiceForm({ ...invoiceForm, paidAmount: cleanMoney(Number(event.target.value)) })}
                />
              </label>
            </div>
            <div className="split-grid">
              <label className="field field-compact">
                <span>Due date</span>
                <input
                  type="date"
                  value={invoiceForm.dueDate}
                  onChange={(event) => setInvoiceForm({ ...invoiceForm, dueDate: event.target.value })}
                />
              </label>
            </div>
            <div className="split-grid">
              <label className="field field-compact">
                <span>Issued date</span>
                <input
                  type="date"
                  value={invoiceForm.issuedDate}
                  onChange={(event) => setInvoiceForm({ ...invoiceForm, issuedDate: event.target.value })}
                />
              </label>
              <label className="field field-compact">
                <span>Paid date</span>
                <input
                  type="date"
                  value={invoiceForm.paidDate}
                  onChange={(event) => setInvoiceForm({ ...invoiceForm, paidDate: event.target.value })}
                />
              </label>
            </div>
            <label className="field compact-textarea">
              <span>Notes</span>
              <textarea
                placeholder="Deposit received, balance due on completion, e-transfer details..."
                value={invoiceForm.notes}
                onChange={(event) => setInvoiceForm({ ...invoiceForm, notes: event.target.value })}
              />
            </label>
            <div className="mini-stats-grid">
              <div className="mini-stat-card">
                <span>Billing customer</span>
                <strong>{selectedBillingCustomer?.name ?? 'No customer selected'}</strong>
              </div>
              <div className="mini-stat-card">
                <span>Customer</span>
                <strong>{invoiceCustomer?.name ?? 'No job selected'}</strong>
              </div>
              <div className="mini-stat-card">
                <span>Estimate total</span>
                <strong>{money(selectedEstimate?.totalPrice ?? 0)}</strong>
              </div>
              <div className="mini-stat-card">
                <span>Balance due</span>
                <strong>{money(Math.max(0, invoiceForm.amount - invoiceForm.paidAmount))}</strong>
              </div>
            </div>
            {selectedBillingCustomer && (
              <div className="summary-box">
                <div className="customer-detail-grid">
                  <div className="customer-detail-row">
                    <span>Address</span>
                    <strong>
                      <button type="button" className="address-link" onClick={() => openAddressInMaps(selectedBillingCustomer.address)}>
                        {selectedBillingCustomer.address}
                      </button>
                    </strong>
                  </div>
                  <div className="customer-detail-row">
                    <span>Phone</span>
                    <strong>
                      {selectedBillingCustomer.phone ? (
                        <button type="button" className="address-link" onClick={() => openPhoneDialer(selectedBillingCustomer.phone)}>
                          {selectedBillingCustomer.phone}
                        </button>
                      ) : 'Not set'}
                    </strong>
                  </div>
                  <div className="customer-detail-row">
                    <span>Email</span>
                    <strong>
                      {selectedBillingCustomer.email ? (
                        <button type="button" className="address-link" onClick={() => openEmailClient(selectedBillingCustomer.email)}>
                          {selectedBillingCustomer.email}
                        </button>
                      ) : 'Not set'}
                    </strong>
                  </div>
                </div>
              </div>
            )}
            <div className="hero-actions">
              <button className="ghost" onClick={createInvoiceFromEstimate}>Pull from estimate</button>
              <button className="ghost" onClick={createDepositInvoice} disabled={!selectedEstimate}>Use deposit amount</button>
              <button onClick={createInvoice}>Save invoice</button>
              <button className="ghost" onClick={() => resetForm()}>Reset</button>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="section-head">
            <h3>Money summary</h3>
            <span>Simple totals</span>
          </div>
          <div className="mini-stats-grid">
            <div className="mini-stat-card">
              <span>Total invoiced</span>
              <strong>{money(data.invoices.reduce((sum, invoice) => sum + invoice.amount, 0))}</strong>
            </div>
            <div className="mini-stat-card">
              <span>Outstanding</span>
              <strong>{money(outstandingInvoices.reduce((sum, invoice) => sum + invoice.balanceDue, 0))}</strong>
            </div>
            <div className="mini-stat-card">
              <span>Collected</span>
              <strong>{money(data.invoices.reduce((sum, invoice) => sum + invoice.paidAmount, 0))}</strong>
            </div>
            <div className="mini-stat-card">
              <span>Overdue</span>
              <strong>{overdueInvoices.length}</strong>
            </div>
            <div className="mini-stat-card">
              <span>Due in 3 days</span>
              <strong>{dueSoonInvoices.length}</strong>
            </div>
          </div>
          {(overdueInvoices.length > 0 || dueSoonInvoices.length > 0) && (
            <div className="summary-box">
              <div className="section-subhead">
                <h4>Reminders queue</h4>
                <span>Invoices that need customer follow-up now</span>
              </div>
              <div className="linked-record-list">
                {overdueInvoices.slice(0, 4).map((invoice) => (
                  <div key={`overdue-${invoice.id}`} className="linked-record-row">
                    <strong>{invoice.invoiceNumber} overdue</strong>
                    <span>{money(invoice.balanceDue)} due since {invoice.dueDate || 'unset due date'}</span>
                  </div>
                ))}
                {dueSoonInvoices.slice(0, 4).map((invoice) => (
                  <div key={`soon-${invoice.id}`} className="linked-record-row">
                    <strong>{invoice.invoiceNumber} due soon</strong>
                    <span>{money(invoice.balanceDue)} due on {invoice.dueDate}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="column-stack">
        <div className="card">
          <div className="section-head">
            <h3>Invoice board</h3>
            <span>Track what still needs money in</span>
          </div>
          <div className="list-grid">
            {sortedInvoices.map((invoice) => {
              const job = data.jobs.find((entry) => entry.id === invoice.jobId);
              const customer = data.customers.find((entry) => entry.id === job?.customerId);
              return (
                <button
                  key={invoice.id}
                  className={`job-board-row ${selectedInvoiceId === invoice.id ? 'active' : ''}`}
                  onClick={() => setSelectedInvoiceId(invoice.id)}
                >
                  <div className="job-board-main">
                    <div className="list-row-top">
                      <strong>{invoice.invoiceNumber}</strong>
                      <span className={`pill pill-${badgeTone(invoice.status)}`}>{invoice.status}</span>
                    </div>
                    <div className="job-board-info">
                      <span>{customer?.name ?? 'Unknown customer'}</span>
                      <span>{job?.title ?? 'Unknown job'}</span>
                      <span>{money(invoice.balanceDue)} due</span>
                    </div>
                    <small>Due {invoice.dueDate || 'Not set'} · Received {money(invoice.paidAmount)} of {money(invoice.amount)}</small>
                  </div>
                  <div className="job-board-meta">
                    <span>
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
                      ) : 'No address'}
                    </span>
                    <strong>{selectedInvoiceId === invoice.id ? 'Selected' : 'Open'}</strong>
                  </div>
                </button>
              );
            })}
            {sortedInvoices.length === 0 && <div className="empty">No invoices yet.</div>}
          </div>
        </div>

        {selectedInvoice && (
          <div className="card">
            <div className="section-head">
              <div>
                <h3>{selectedInvoice.invoiceNumber}</h3>
                <span>{selectedInvoiceCustomer?.name ?? 'Unknown customer'} · {selectedInvoiceJob?.title ?? 'Unknown job'}</span>
              </div>
              <span className={`pill pill-${badgeTone(selectedInvoice.status)}`}>{selectedInvoice.status}</span>
            </div>
            <div className="customer-profile-grid">
              <div className="summary-box">
                <div className="customer-detail-grid">
                  <div className="customer-detail-row">
                    <span>Amount</span>
                    <strong>{money(selectedInvoice.amount)}</strong>
                  </div>
                  <div className="customer-detail-row">
                    <span>Received</span>
                    <strong>{money(selectedInvoice.paidAmount)}</strong>
                  </div>
                  <div className="customer-detail-row">
                    <span>Balance due</span>
                    <strong>{money(selectedInvoice.balanceDue)}</strong>
                  </div>
                  <div className="customer-detail-row">
                    <span>Due date</span>
                    <strong>{selectedInvoice.dueDate || 'Not set'}</strong>
                  </div>
                  <div className="customer-detail-row">
                    <span>Issued</span>
                    <strong>{selectedInvoice.issuedDate || 'Not set'}</strong>
                  </div>
                  <div className="customer-detail-row">
                    <span>Paid</span>
                    <strong>{selectedInvoice.paidDate || 'Not paid yet'}</strong>
                  </div>
                </div>
              </div>
              <div className="summary-box">
                <div className="customer-detail-grid">
                  <label className="field field-short">
                    <span>Record payment</span>
                    <input type="number" min={0} value={paymentDraft || ''} onChange={(event) => setPaymentDraft(cleanMoney(Number(event.target.value)))} />
                  </label>
                  <div className="customer-detail-row customer-detail-row-stack">
                    <span>Notes</span>
                    <strong>{selectedInvoice.notes || 'No billing notes yet'}</strong>
                  </div>
                </div>
              </div>
              <div className="summary-box">
                <div className="section-subhead">
                  <h4>Invoice history</h4>
                  <span>Recent changes and billing actions</span>
                </div>
                <div className="linked-record-list">
                  {selectedInvoiceHistory.length ? selectedInvoiceHistory.map((entry) => (
                    <div key={entry.id} className="linked-record-row">
                      <strong>{entry.action}</strong>
                      <span>{new Date(entry.createdAt).toLocaleString()} · {entry.message}</span>
                    </div>
                  )) : <div className="empty">No history yet for this invoice.</div>}
                </div>
              </div>
            </div>
            <div className="hero-actions">
              <button className="ghost" onClick={() => exportInvoicePdf(selectedInvoice)}>Export PDF</button>
              <button className="ghost" onClick={() => recordPayment(selectedInvoice.id)} disabled={paymentDraft <= 0 || selectedInvoice.balanceDue <= 0}>Record payment</button>
              <button className="ghost" onClick={() => sendPaymentReminder(selectedInvoice)} disabled={selectedInvoice.balanceDue <= 0}>Send reminder</button>
              <button className="ghost" onClick={() => updateInvoiceStatus(selectedInvoice.id, 'Sent')}>Mark sent</button>
              <button className="ghost" onClick={() => updateInvoiceStatus(selectedInvoice.id, 'Partial')}>Mark partial</button>
              <button className="ghost" onClick={() => updateInvoiceStatus(selectedInvoice.id, 'Paid')}>Mark paid</button>
              <button className="ghost danger" onClick={() => deleteInvoice(selectedInvoice.id)}>Delete invoice</button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
