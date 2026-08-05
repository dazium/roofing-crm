import { useMemo } from 'react';
import type { AppData, View } from '../types';
import { money } from '../lib';

interface ReportsProps {
  data: AppData;
  setView: React.Dispatch<React.SetStateAction<View>>;
}

type ReportMetric = {
  title: string;
  subtitle: string;
  value: string | number;
};

type SummaryItem = {
  label: string;
  count: number;
  amount?: number;
};

export const Reports: React.FC<ReportsProps> = ({ data, setView }) => {
  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const monthKey = new Date().toISOString().slice(0, 7);

    const totalInvoiceAmount = data.invoices.reduce((sum, invoice) => sum + invoice.amount, 0);
    const totalRevenue = data.invoices.reduce((sum, invoice) => sum + invoice.paidAmount, 0);
    const openBalance = data.invoices.reduce((sum, invoice) => sum + invoice.balanceDue, 0);
    const overdueAmount = data.invoices
      .filter((invoice) => invoice.status === 'Overdue' || (invoice.dueDate && invoice.dueDate < today && invoice.status !== 'Paid' && invoice.status !== 'Cancelled'))
      .reduce((sum, invoice) => sum + invoice.balanceDue, 0);
    const collectionRate = totalInvoiceAmount > 0 ? Math.round((totalRevenue / totalInvoiceAmount) * 100) : 0;
    const revenueMTD = data.invoices
      .filter((invoice) => invoice.paidDate?.startsWith(monthKey) || invoice.issuedDate?.startsWith(monthKey))
      .reduce((sum, invoice) => sum + invoice.paidAmount, 0);

    const totalJobs = data.jobs.length;
    const completedJobs = data.jobs.filter((job) => job.status === 'Complete' || job.status === 'Paid').length;
    const inProgressJobs = data.jobs.filter((job) => job.status === 'In Progress' || job.status === 'Scheduled').length;

    const totalCustomers = data.customers.length;
    const wonCustomers = data.customers.filter((customer) => customer.leadStatus === 'Won').length;
    const lostCustomers = data.customers.filter((customer) => customer.leadStatus === 'Lost').length;

    const totalMaterialCost = data.estimates.reduce((sum, estimate) => sum + estimate.materialCost, 0);
    const avgJobValue = totalJobs > 0 ? totalRevenue / totalJobs : 0;

    const openEstimateJobs = data.estimates.filter((estimate) => {
      const job = data.jobs.find((entry) => entry.id === estimate.jobId);
      return !job || !['Complete', 'Paid'].includes(job.status);
    });
    const openPipelineValue = openEstimateJobs.reduce((sum, estimate) => sum + estimate.totalPrice, 0);
    const openPipelineCount = openEstimateJobs.length;

    const recentInspections = data.inspections
      .slice()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);

    const recentJobs = data.jobs
      .slice()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);

    return {
      totalInvoiceAmount,
      totalRevenue,
      openBalance,
      overdueAmount,
      collectionRate,
      revenueMTD,
      totalJobs,
      completedJobs,
      inProgressJobs,
      totalCustomers,
      wonCustomers,
      lostCustomers,
      totalMaterialCost,
      avgJobValue,
      openPipelineValue,
      openPipelineCount,
      recentInspections,
      recentJobs,
    };
  }, [data]);

  const financialMetrics: ReportMetric[] = [
    { title: 'Total Invoiced', subtitle: 'All billing issued to customers', value: money(stats.totalInvoiceAmount) },
    { title: 'Total Revenue', subtitle: 'Payments received to date', value: money(stats.totalRevenue) },
    { title: 'Open AR', subtitle: 'Outstanding invoice balances', value: money(stats.openBalance) },
    { title: 'Collection Rate', subtitle: 'Paid value vs invoiced value', value: `${stats.collectionRate}%` },
  ];

  const pipelineMetrics: ReportMetric[] = [
    { title: 'Pipeline Value', subtitle: 'Open proposals for active jobs', value: money(stats.openPipelineValue) },
    { title: 'Open Proposals', subtitle: 'Estimates waiting on approval', value: stats.openPipelineCount },
    { title: 'Revenue MTD', subtitle: 'Payments received this month', value: money(stats.revenueMTD) },
    { title: 'Overdue Balance', subtitle: 'Past due amounts', value: money(stats.overdueAmount) },
  ];

  const projectMetrics: ReportMetric[] = [
    { title: 'Total Jobs', subtitle: 'All projects tracked in the system', value: stats.totalJobs },
    { title: 'Completed Jobs', subtitle: 'Finished and paid projects', value: stats.completedJobs },
    { title: 'Active Jobs', subtitle: 'Scheduled and in-progress work', value: stats.inProgressJobs },
    { title: 'Average Job Value', subtitle: 'Average revenue per project', value: money(stats.avgJobValue) },
  ];

  const customerMetrics: ReportMetric[] = [
    { title: 'Total Customers', subtitle: 'All customer records in the system', value: stats.totalCustomers },
    { title: 'Won Customers', subtitle: 'Successfully converted leads', value: stats.wonCustomers },
    { title: 'Lost Customers', subtitle: 'Leads that did not convert', value: stats.lostCustomers },
    { title: 'Material Cost', subtitle: 'Estimated material spend', value: money(stats.totalMaterialCost) },
  ];

  const invoiceSummary = useMemo<SummaryItem[]>(() => {
    const map = new Map<string, SummaryItem>();
    data.invoices.forEach((invoice) => {
      const existing = map.get(invoice.status);
      if (existing) {
        existing.count += 1;
        existing.amount = (existing.amount ?? 0) + invoice.paidAmount;
      } else {
        map.set(invoice.status, { label: invoice.status, count: 1, amount: invoice.paidAmount });
      }
    });
    return Array.from(map.values());
  }, [data.invoices]);

  const jobSummary = useMemo<SummaryItem[]>(() => {
    const map = new Map<string, SummaryItem>();
    data.jobs.forEach((job) => {
      const existing = map.get(job.status);
      if (existing) {
        existing.count += 1;
      } else {
        map.set(job.status, { label: job.status, count: 1 });
      }
    });
    return Array.from(map.values());
  }, [data.jobs]);

  const timelineItems = useMemo(() => [
    ...stats.recentInspections.map((inspection) => ({
      id: inspection.id,
      type: 'inspection' as const,
      title: `Roof Inspection: ${inspection.roofType}`,
      detail: `${inspection.damageType} damage • ${inspection.measurements.squares} squares`,
      meta: new Date(inspection.createdAt).toLocaleDateString(),
      action: () => setView('inspect'),
    })),
    ...stats.recentJobs.map((job) => ({
      id: job.id,
      type: 'job' as const,
      title: `New Project: ${job.title}`,
      detail: `${job.status} • ${job.priority} priority`,
      meta: new Date(job.createdAt).toLocaleDateString(),
      action: () => setView('jobs'),
    })),
  ].sort((a, b) => new Date(b.meta).getTime() - new Date(a.meta).getTime()).slice(0, 8), [stats.recentInspections, stats.recentJobs, setView]);

  const renderMetrics = (cards: ReportMetric[]) => (
    <div className="stats-grid reports-overview-grid">
      {cards.map((card) => (
        <div className="card stat-card" key={card.title}>
          <div className="section-head">
            <h3>{card.title}</h3>
            <span>{card.subtitle}</span>
          </div>
          <div className="stat-value">{card.value}</div>
        </div>
      ))}
    </div>
  );

  const renderSummary = (items: SummaryItem[]) => (
    <div className="linked-record-list">
      {items.map((item) => (
        <button key={item.label} className="linked-record-row linked-record-action">
          <strong>{item.label}</strong>
          <span>{item.count} {item.amount !== undefined ? 'invoices' : 'jobs'}</span>
          {item.amount !== undefined ? <small>{money(item.amount)}</small> : null}
        </button>
      ))}
    </div>
  );

  return (
    <section className="page-content">
      <div className="page-header-shell">
        <div className="page-header">
          <div>
            <span className="eyebrow">Roofing CRM</span>
            <h2>Financial Dashboard</h2>
            <p>Monitor invoice revenue, job margins, and the financial health of your roofing business.</p>
          </div>
        </div>
      </div>

      {renderMetrics(financialMetrics)}
      {renderMetrics(pipelineMetrics)}
      {renderMetrics(projectMetrics)}
      {renderMetrics(customerMetrics)}

      <section className="card">
        <div className="section-head">
          <h3>Recent Activity</h3>
          <span>Latest inspections and job creations</span>
        </div>
        <div className="timeline-list">
          {timelineItems.length ? timelineItems.map((item) => (
            <button
              key={item.id}
              className={`timeline-item timeline-action timeline-${item.type}`}
              onClick={item.action}
            >
              <div className="timeline-dot" />
              <div className="timeline-content">
                <strong>{item.title}</strong>
                <span>{item.detail}</span>
                <small>{item.meta}</small>
              </div>
            </button>
          )) : (
            <div className="empty">No recent activity yet.</div>
          )}
        </div>
      </section>

      <section className="card">
        <div className="section-head">
          <h3>Financial Trends</h3>
          <span>Revenue and payment patterns</span>
        </div>

        <div className="card">
          <div className="section-head">
            <h3>Payment Status Distribution</h3>
            <span>Breakdown of invoice statuses</span>
          </div>
          {renderSummary(invoiceSummary)}
        </div>

        <div className="card">
          <div className="section-head">
            <h3>Job Status Distribution</h3>
            <span>Current state of all projects</span>
          </div>
          {renderSummary(jobSummary)}
        </div>
      </section>
    </section>
  );
};
