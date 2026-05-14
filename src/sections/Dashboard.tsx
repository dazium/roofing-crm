import { useMemo } from 'react';
import type { AppData, View } from '../types';
import { money, openAddressInMaps, openEmailClient, openPhoneDialer } from '../lib';

interface DashboardProps {
  data: AppData;
  selectedCustomerId: string | null;
  selectedJobId: string | null;
  setView: React.Dispatch<React.SetStateAction<View>>;
  onOpenCustomer: (customerId: string) => void;
  onOpenJob: (jobId: string) => void;
  onOpenInspect: () => void;
  onOpenDamages: () => void;
  onOpenEstimates: () => void;
  onOpenInvoices: () => void;
  onOpenTasks: () => void;
}

type ActivityItem = {
  id: string;
  title: string;
  detail: string;
  meta: string;
  type: 'customer' | 'job' | 'inspection' | 'estimate' | 'invoice';
  when: string;
  customerId?: string;
  jobId?: string;
};

export const Dashboard: React.FC<DashboardProps> = ({
  data,
  selectedCustomerId,
  selectedJobId,
  setView,
  onOpenCustomer,
  onOpenJob,
  onOpenInspect,
  onOpenDamages,
  onOpenEstimates,
  onOpenInvoices,
  onOpenTasks,
}) => {
  const selectedCustomer = useMemo(
    () => data.customers.find((customer) => customer.id === selectedCustomerId) ?? null,
    [data.customers, selectedCustomerId]
  );

  const selectedJob = useMemo(
    () => data.jobs.find((job) => job.id === selectedJobId) ?? null,
    [data.jobs, selectedJobId]
  );

  const selectedInspection = useMemo(
    () => data.inspections.find((inspection) => inspection.customerId === selectedCustomerId) ?? null,
    [data.inspections, selectedCustomerId]
  );

  const selectedEstimate = useMemo(
    () => data.estimates.find((estimate) => estimate.jobId === selectedJobId) ?? null,
    [data.estimates, selectedJobId]
  );
  const selectedDamages = useMemo(
    () => data.damages.filter((damage) => damage.jobId === selectedJobId || (!selectedJobId && damage.customerId === selectedCustomerId)),
    [data.damages, selectedCustomerId, selectedJobId]
  );

  const selectedInvoices = useMemo(
    () => data.invoices.filter((invoice) => invoice.jobId === selectedJobId),
    [data.invoices, selectedJobId]
  );

  const openInvoice = selectedInvoices.find((invoice) => invoice.balanceDue > 0) ?? selectedInvoices[0] ?? null;

  const dashboard = useMemo(() => {
    const openCustomers = data.customers.filter((customer) => !['Won', 'Lost'].includes(customer.leadStatus)).length;
    const activeProjects = data.jobs.filter((job) => ['Scheduled', 'In Progress', 'Awaiting Final Review'].includes(job.status)).length;
    const needsEstimate = data.customers.filter((customer) => ['Contacted', 'Inspection Scheduled'].includes(customer.leadStatus)).length;
    const outstanding = data.invoices.filter((invoice) => invoice.status !== 'Paid').reduce((sum, invoice) => sum + invoice.balanceDue, 0);
    const openTasks = data.tasks.filter((task) => task.status !== 'Done').length;
    const openDamages = data.damages.length;

    return { openCustomers, activeProjects, needsEstimate, outstanding, openTasks, openDamages };
  }, [data]);

  const priorityJobs = useMemo(
    () => data.jobs.filter((job) => job.priority === 'High' || job.status === 'Awaiting Final Review').slice(0, 4),
    [data.jobs]
  );

  const waitingOnMoney = useMemo(
    () => data.invoices.filter((invoice) => invoice.status !== 'Paid').slice(0, 4),
    [data.invoices]
  );

  const needsProposal = useMemo(
    () => data.customers.filter((customer) => ['Inspection Scheduled', 'Contacted'].includes(customer.leadStatus)).slice(0, 4),
    [data.customers]
  );

  const recentActivity = useMemo<ActivityItem[]>(() => {
    const customerEvents = data.customers.map((customer) => ({
      id: `customer-${customer.id}`,
      title: `Lead: ${customer.name}`,
      detail: customer.address,
      meta: `${customer.leadStatus} · ${customer.source}`,
      type: 'customer' as const,
      when: customer.id,
      customerId: customer.id,
    }));

    const jobEvents = data.jobs.map((job) => {
      const customer = data.customers.find((entry) => entry.id === job.customerId);
      return {
        id: `job-${job.id}`,
        title: `Project: ${job.title}`,
        detail: `${customer?.name ?? 'Unknown customer'} · ${job.status}`,
        meta: `${job.scheduledFor || 'No date set'} · ${job.priority} priority`,
        type: 'job' as const,
        when: job.createdAt,
        jobId: job.id,
      };
    });

    const inspectionEvents = data.inspections.map((inspection) => {
      const customer = data.customers.find((entry) => entry.id === inspection.customerId);
      const job = data.jobs.find((entry) => entry.customerId === inspection.customerId);
      return {
        id: `inspection-${inspection.id}`,
        title: 'Inspection saved',
        detail: `${customer?.name ?? 'Unknown customer'} · ${inspection.damageType}`,
        meta: `${inspection.urgency} urgency · ${inspection.measurements.squares} squares`,
        type: 'inspection' as const,
        when: inspection.createdAt,
        customerId: inspection.customerId,
        jobId: job?.id,
      };
    });

    const estimateEvents = data.estimates.map((estimate) => {
      const job = data.jobs.find((entry) => entry.id === estimate.jobId);
      const customer = data.customers.find((entry) => entry.id === job?.customerId);
      return {
        id: `estimate-${estimate.id}`,
        title: 'Estimate ready',
        detail: `${customer?.name ?? 'Unknown customer'} · ${job?.title ?? 'Unknown project'}`,
        meta: `${money(estimate.totalPrice)} · ${estimate.lineItems.length} line items`,
        type: 'estimate' as const,
        when: estimate.id,
        customerId: customer?.id,
        jobId: estimate.jobId,
      };
    });

    const invoiceEvents = data.invoices.map((invoice) => {
      const job = data.jobs.find((entry) => entry.id === invoice.jobId);
      const customer = data.customers.find((entry) => entry.id === job?.customerId);
      return {
        id: `invoice-${invoice.id}`,
        title: `Invoice ${invoice.invoiceNumber}`,
        detail: `${customer?.name ?? 'Unknown customer'} · ${invoice.status}`,
        meta: `${money(invoice.balanceDue)} balance · due ${invoice.dueDate || 'not set'}`,
        type: 'invoice' as const,
        when: invoice.issuedDate ?? invoice.id,
        customerId: customer?.id,
        jobId: invoice.jobId,
      };
    });

    return [...jobEvents, ...inspectionEvents, ...invoiceEvents, ...estimateEvents, ...customerEvents]
      .sort((a, b) => b.when.localeCompare(a.when))
      .slice(0, 8);
  }, [data]);

  const nextAction = useMemo(() => {
    if (!selectedCustomer) {
      return {
        title: 'Pick or add a customer',
        detail: 'Start by selecting a homeowner so the workspace can focus on one project.',
        label: 'Open customers',
        action: () => setView('customers'),
      };
    }

    if (!selectedJob) {
      return {
        title: 'Create or select a project',
        detail: 'The customer is selected, but there is no active project tied to this workspace yet.',
        label: 'Open projects',
        action: () => setView('jobs'),
      };
    }

    if (!selectedInspection) {
      return {
        title: 'Capture the inspection',
        detail: 'You need roof notes, measurements, and photos before pricing and paperwork are reliable.',
        label: 'Open inspection',
        action: onOpenInspect,
      };
    }

    if (!selectedEstimate) {
      if (!selectedDamages.length) {
        return {
          title: 'Log damage details',
          detail: 'Inspection exists, but no structured damage records are linked yet. Capture damage + material needs before pricing.',
          label: 'Open damages',
          action: onOpenDamages,
        };
      }

      return {
        title: 'Create the estimate',
        detail: 'The inspection is saved. Turn those measurements into a customer-facing estimate next.',
        label: 'Open estimates',
        action: onOpenEstimates,
      };
    }

    if (!selectedInvoices.length) {
      return {
        title: 'Create the invoice',
        detail: 'The project has an estimate but no invoice yet.',
        label: 'Open invoices',
        action: onOpenInvoices,
      };
    }

    if (openInvoice?.balanceDue) {
      return {
        title: 'Record payment',
        detail: `${money(openInvoice.balanceDue)} is still open on ${openInvoice.invoiceNumber}.`,
        label: 'Open invoices',
        action: onOpenInvoices,
      };
    }

    return {
      title: 'Keep the project moving',
      detail: 'The project has inspection, estimate, and invoice records. Review status and close-out details next.',
      label: 'Open project',
      action: () => onOpenJob(selectedJob.id),
    };
  }, [selectedCustomer, selectedJob, selectedInspection, selectedEstimate, selectedDamages.length, selectedInvoices, openInvoice, onOpenDamages, onOpenEstimates, onOpenInspect, onOpenInvoices, onOpenJob, setView]);

  const workspaceLinks = [
    {
      title: 'Inspection',
      detail: selectedInspection ? `${selectedInspection.damageType} · ${selectedInspection.measurements.squares} squares` : 'No inspection saved yet',
      actionLabel: selectedInspection ? 'Open inspection' : 'Start inspection',
      action: onOpenInspect,
    },
    {
      title: 'Damages',
      detail: selectedDamages.length ? `${selectedDamages.length} damage record(s) logged` : 'No damage records yet',
      actionLabel: 'Open damages',
      action: onOpenDamages,
    },
    {
      title: 'Estimate',
      detail: selectedEstimate ? `${money(selectedEstimate.totalPrice)} total · ${selectedEstimate.lineItems.length} lines` : 'No estimate drafted yet',
      actionLabel: selectedEstimate ? 'Open estimate' : 'Create estimate',
      action: onOpenEstimates,
    },
    {
      title: 'Invoices',
      detail: openInvoice ? `${openInvoice.invoiceNumber} · ${money(openInvoice.balanceDue)} balance` : 'No invoice created yet',
      actionLabel: openInvoice ? 'Open invoices' : 'Create invoice',
      action: onOpenInvoices,
    },
    {
      title: 'Tasks',
      detail: data.tasks.find((task) => task.jobId === selectedJobId || (!selectedJobId && task.customerId === selectedCustomerId)) ? 'Follow-ups and office prep saved' : 'No tasks tracked yet',
      actionLabel: 'Open tasks',
      action: onOpenTasks,
    },
  ];

  function openActivity(item: ActivityItem) {
    if (item.jobId) {
      onOpenJob(item.jobId);
      return;
    }
    if (item.customerId) {
      onOpenCustomer(item.customerId);
      return;
    }
    if (item.type === 'invoice') {
      onOpenInvoices();
    }
  }

  return (
    <>
      <section className="hero-grid workspace-hero-grid">
        <div className="card hero-card workspace-hero-card">
          <div className="section-head">
            <div>
              <span className="pill pill-blue">Current workspace</span>
              <h2>{selectedJob?.title ?? selectedCustomer?.name ?? 'Select a customer to focus the workspace'}</h2>
              <p>
                {selectedCustomer && selectedJob
                  ? `${selectedCustomer.name} · ${selectedJob.status}${selectedJob.scheduledFor ? ` · scheduled ${selectedJob.scheduledFor}` : ''}`
                  : 'Use the customer and project selectors above, then drive the next inspection, estimate, invoice, or payment from here.'}
              </p>
            </div>
            <div className="workspace-status-row">
              {selectedCustomer ? <span className="pill pill-green">{selectedCustomer.leadStatus}</span> : null}
              {selectedJob ? <span className="pill pill-orange">{selectedJob.status}</span> : null}
            </div>
          </div>

          <div className="workspace-meta-grid">
            <div className="workspace-meta-item">
              <span>Customer</span>
              <strong>{selectedCustomer?.name ?? 'No customer selected'}</strong>
            </div>
            <div className="workspace-meta-item">
              <span>Phone</span>
              <strong>
                {selectedCustomer?.phone ? (
                  <button type="button" className="address-link" onClick={() => openPhoneDialer(selectedCustomer.phone)}>
                    {selectedCustomer.phone}
                  </button>
                ) : 'Add customer details'}
              </strong>
            </div>
            <div className="workspace-meta-item">
              <span>Email</span>
              <strong>
                {selectedCustomer?.email ? (
                  <button type="button" className="address-link" onClick={() => openEmailClient(selectedCustomer.email)}>
                    {selectedCustomer.email}
                  </button>
                ) : 'Add customer details'}
              </strong>
            </div>
            <div className="workspace-meta-item">
              <span>Address</span>
              <strong>
                {selectedCustomer?.address ? (
                  <button type="button" className="address-link" onClick={() => openAddressInMaps(selectedCustomer.address)}>
                    {selectedCustomer.address}
                  </button>
                ) : 'No address yet'}
              </strong>
            </div>
            <div className="workspace-meta-item">
              <span>Lead source</span>
              <strong>{selectedCustomer?.source ?? 'Not set'}</strong>
            </div>
            <div className="workspace-meta-item">
              <span>Project notes</span>
              <strong>{selectedJob?.notes?.trim() || 'No project notes yet'}</strong>
            </div>
          </div>

          <div className="hero-actions">
            <button onClick={onOpenInspect}>Open inspection</button>
            <button className="ghost" onClick={onOpenDamages}>Open damages</button>
            <button className="ghost" onClick={onOpenEstimates}>Open estimates</button>
            <button className="ghost" onClick={onOpenInvoices}>Open invoices</button>
            <button className="ghost" onClick={onOpenTasks}>Open tasks</button>
            <button className="ghost" onClick={() => setView('jobs')}>Open projects</button>
          </div>
        </div>

        <div className="card workspace-focus-card">
          <div className="section-head">
            <div>
              <h3>{nextAction.title}</h3>
              <span>Clear next step for the selected workspace</span>
            </div>
          </div>

          <div className="workflow-callout">
            <strong>{nextAction.label}</strong>
            <span>{nextAction.detail}</span>
          </div>

          <button onClick={nextAction.action}>{nextAction.label}</button>

          <div className="linked-record-list workspace-links-list">
            {workspaceLinks.map((item) => (
              <button key={item.title} className="linked-record-row linked-record-action" onClick={item.action}>
                <strong>{item.title}</strong>
                <span>{item.detail}</span>
                <small>{item.actionLabel}</small>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="stats-grid dashboard-priority-grid">
        <button className="card stat-card card-action" onClick={() => setView('customers')}>
          <span>Open customers</span>
          <strong>{dashboard.openCustomers}</strong>
          <small>Leads that still need movement</small>
        </button>
        <button className="card stat-card card-action" onClick={() => setView('jobs')}>
          <span>Active projects</span>
          <strong>{dashboard.activeProjects}</strong>
          <small>Scheduled, in progress, or final review</small>
        </button>
        <button className="card stat-card card-action" onClick={onOpenEstimates}>
          <span>Needs estimate</span>
          <strong>{dashboard.needsEstimate}</strong>
          <small>Customers still waiting on pricing</small>
        </button>
        <button className="card stat-card card-action" onClick={onOpenInvoices}>
          <span>Outstanding balance</span>
          <strong>{money(dashboard.outstanding)}</strong>
          <small>Money still to collect</small>
        </button>
        <button className="card stat-card card-action" onClick={onOpenTasks}>
          <span>Open tasks</span>
          <strong>{dashboard.openTasks}</strong>
          <small>Follow-ups and office prep still open</small>
        </button>
        <button className="card stat-card card-action" onClick={onOpenDamages}>
          <span>Damage records</span>
          <strong>{dashboard.openDamages}</strong>
          <small>Tracked damage entries</small>
        </button>
      </section>

      <section className="content-grid two-col dashboard-detail-grid">
        <div className="column-stack">
          <div className="card">
            <div className="section-head">
              <h3>Project queue</h3>
              <span>Projects that need direct attention next</span>
            </div>
            <div className="linked-record-list">
              {priorityJobs.length ? priorityJobs.map((job) => {
                const customer = data.customers.find((entry) => entry.id === job.customerId);
                const estimate = data.estimates.find((entry) => entry.jobId === job.id);
                const invoice = data.invoices.find((entry) => entry.jobId === job.id && entry.balanceDue > 0);
                return (
                  <button key={job.id} className="linked-record-row linked-record-action dashboard-activity-row" onClick={() => onOpenJob(job.id)}>
                    <strong>{job.title}</strong>
                    <span>{customer?.name ?? 'Unknown customer'} · {job.status} · {job.priority}</span>
                    <small>{estimate ? `Estimate ${money(estimate.totalPrice)}` : 'No estimate'} · {invoice ? `${money(invoice.balanceDue)} unpaid` : 'No open balance'}</small>
                  </button>
                );
              }) : <div className="empty">No priority projects right now.</div>}
            </div>
          </div>

          <div className="card">
            <div className="section-head">
              <h3>Needs estimate</h3>
              <span>Customers ready for pricing or follow-up</span>
            </div>
            <div className="linked-record-list">
              {needsProposal.length ? needsProposal.map((customer) => (
                <button key={customer.id} className="linked-record-row linked-record-action dashboard-activity-row" onClick={() => onOpenCustomer(customer.id)}>
                  <strong>{customer.name}</strong>
                  <span>{customer.leadStatus} · {customer.source}</span>
                  <small>{customer.address}</small>
                </button>
              )) : <div className="empty">No estimate backlog right now.</div>}
            </div>
          </div>
        </div>

        <div className="column-stack">
          <div className="card">
            <div className="section-head">
              <h3>Waiting on money</h3>
              <span>Invoices with balance still open</span>
            </div>
            <div className="linked-record-list">
              {waitingOnMoney.length ? waitingOnMoney.map((invoice) => {
                const job = data.jobs.find((entry) => entry.id === invoice.jobId);
                const customer = data.customers.find((entry) => entry.id === job?.customerId);
                return (
                  <button key={invoice.id} className="linked-record-row linked-record-action dashboard-activity-row" onClick={() => onOpenJob(invoice.jobId)}>
                    <strong>{invoice.invoiceNumber}</strong>
                    <span>{customer?.name ?? 'Unknown customer'} · {invoice.status}</span>
                    <small>{money(invoice.balanceDue)} due · total {money(invoice.amount)}</small>
                  </button>
                );
              }) : <div className="empty">No open invoices right now.</div>}
            </div>
          </div>

          <div className="card">
            <div className="section-head">
              <h3>Recent activity</h3>
              <span>Latest updates across customers, projects, and billing</span>
            </div>
            <div className="timeline-list">
              {recentActivity.length ? recentActivity.map((item) => (
                <button key={item.id} className={`timeline-item timeline-action timeline-${item.type}`} onClick={() => openActivity(item)}>
                  <div className="timeline-dot" />
                  <div className="timeline-content">
                    <strong>{item.title}</strong>
                    <span>{item.detail}</span>
                    <small>{item.meta}</small>
                  </div>
                </button>
              )) : <div className="empty">No recent activity yet.</div>}
            </div>
          </div>
        </div>
      </section>
    </>
  );
};
