import { useMemo } from 'react';
import type { AppData, View } from '../types';
import { money } from '../lib';

interface ReportsProps {
  data: AppData;
  setView: React.Dispatch<React.SetStateAction<View>>;
}

export const Reports: React.FC<ReportsProps> = ({ data, setView }) => {
  // Calculate various metrics and insights
  const stats = useMemo(() => {
    // Revenue metrics
    const totalRevenue = data.invoices.reduce((sum, invoice) => sum + invoice.paidAmount, 0);
    const pendingRevenue = data.invoices.reduce((sum, invoice) => sum + invoice.balanceDue, 0);
    const overdueAmount = data.invoices
      .filter(invoice => invoice.status === 'Overdue')
      .reduce((sum, invoice) => sum + invoice.balanceDue, 0);
    
    // Job metrics
    const totalJobs = data.jobs.length;
    const completedJobs = data.jobs.filter(job => job.status === 'Complete' || job.status === 'Paid').length;
    const inProgressJobs = data.jobs.filter(job => job.status === 'In Progress' || job.status === 'Scheduled').length;
    
    // Customer metrics
    const totalCustomers = data.customers.length;
    const wonCustomers = data.customers.filter(customer => customer.leadStatus === 'Won').length;
    const lostCustomers = data.customers.filter(customer => customer.leadStatus === 'Lost').length;
    
    // Material costs
    const totalMaterialCost = data.estimates.reduce((sum, estimate) => sum + estimate.materialCost, 0);
    const avgJobValue = totalJobs > 0 ? totalRevenue / totalJobs : 0;
    
    // Recent activity
    const recentInspections = data.inspections
      .slice()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
    
    const recentJobs = data.jobs
      .slice()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
    
    return {
      totalRevenue,
      pendingRevenue,
      overdueAmount,
      totalJobs,
      completedJobs,
      inProgressJobs,
      totalCustomers,
      wonCustomers,
      lostCustomers,
      totalMaterialCost,
      avgJobValue,
      recentInspections,
      recentJobs
    };
  }, [data]);

  const handleViewChange = (view: View) => () => setView(view);

  return (
    <section className="page-content">
      <div className="page-header-shell">
        <div className="page-header">
          <div>
            <span className="eyebrow">Roofing CRM</span>
            <h2>Reports & Insights</h2>
            <p>Business analytics and performance metrics for your roofing business</p>
          </div>
        </div>
      </div>

      <div className="stats-grid reports-overview-grid">
        <div className="card stat-card">
          <div className="section-head">
            <h3>Total Revenue</h3>
            <span>All-time invoiced payments received</span>
          </div>
          <div className="stat-value">{money(stats.totalRevenue)}</div>
        </div>
        
        <div className="card stat-card">
          <div className="section-head">
            <h3>Pending Revenue</h3>
            <span>Outstanding invoice balances</span>
          </div>
          <div className="stat-value">{money(stats.pendingRevenue)}</div>
        </div>
        
        <div className="card stat-card">
          <div className="section-head">
            <h3>Overdue Amount</h3>
            <span>Past due invoice balances</span>
          </div>
          <div className="stat-value">{money(stats.overdueAmount)}</div>
        </div>
        
        <div className="card stat-card">
          <div className="section-head">
            <h3>Average Job Value</h3>
            <span>Average revenue per completed job</span>
          </div>
          <div className="stat-value">{money(stats.avgJobValue)}</div>
        </div>
      </div>

      <div className="stats-grid reports-overview-grid">
        <div className="card stat-card">
          <div className="section-head">
            <h3>Total Jobs</h3>
            <span>All projects tracked in the system</span>
          </div>
          <div className="stat-value">{stats.totalJobs}</div>
        </div>
        
        <div className="card stat-card">
          <div className="section-head">
            <h3>Completed Jobs</h3>
            <span>Finished and paid projects</span>
          </div>
          <div className="stat-value">{stats.completedJobs}</div>
        </div>
        
        <div className="card stat-card">
          <div className="section-head">
            <h3>In Progress Jobs</h3>
            <span>Scheduled and active projects</span>
          </div>
          <div className="stat-value">{stats.inProgressJobs}</div>
        </div>
        
        <div className="card stat-card">
          <div className="section-head">
            <h3>Conversion Rate</h3>
            <span>Won vs total customer leads</span>
          </div>
          <div className="stat-value">
            {stats.totalCustomers > 0 
              ? `${Math.round((stats.wonCustomers / stats.totalCustomers) * 100)}%`
              : '0%'}
          </div>
        </div>
      </div>

      <div className="stats-grid reports-overview-grid">
        <div className="card stat-card">
          <div className="section-head">
            <h3>Total Customers</h3>
            <span>All customer records in database</span>
          </div>
          <div className="stat-value">{stats.totalCustomers}</div>
        </div>
        
        <div className="card stat-card">
          <div className="section-head">
            <h3>Won Customers</h3>
            <span>Successfully converted leads</span>
          </div>
          <div className="stat-value">{stats.wonCustomers}</div>
        </div>
        
        <div className="card stat-card">
          <div className="section-head">
            <h3>Lost Customers</h3>
            <span>Leads that did not convert</span>
          </div>
          <div className="stat-value">{stats.lostCustomers}</div>
        </div>
        
        <div className="card stat-card">
          <div className="section-head">
            <h3>Material Costs</h3>
            <span>Total estimated material expenses</span>
          </div>
          <div className="stat-value">{money(stats.totalMaterialCost)}</div>
        </div>
      </div>

      <section className="card">
        <div className="section-head">
          <h3>Recent Activity</h3>
          <span>Latest inspections and job creations</span>
        </div>
        
        <div className="timeline-list">
          {[
            ...stats.recentInspections.map((inspection) => ({
              type: 'inspection' as const,
              title: `Roof Inspection: ${inspection.roofType}`,
              detail: `${inspection.damageType} damage • ${inspection.measurements.squares} squares`,
              meta: new Date(inspection.createdAt).toLocaleDateString(),
              customerId: inspection.customerId,
              action: handleViewChange('inspect'),
            })),
            ...stats.recentJobs.map((job) => ({
              type: 'job' as const,
              title: `New Project: ${job.title}`,
              detail: `${job.status} • ${job.priority} priority`,
              meta: new Date(job.createdAt).toLocaleDateString(),
              jobId: job.id,
              action: handleViewChange('jobs'),
            })),
          ]
            .sort((a, b) => new Date(b.meta).getTime() - new Date(a.meta).getTime())
            .slice(0, 8)
            .map((item, index) => (
              <button
                key={`${item.type}-${index}`}
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
            ))}
          
          {stats.recentInspections.length === 0 && stats.recentJobs.length === 0 && (
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
          <div className="linked-record-list">
            {[...new Set(data.invoices.map(invoice => invoice.status))].map(status => {
              const count = data.invoices.filter(inv => inv.status === status).length;
              const amount = data.invoices
                .filter(inv => inv.status === status)
                .reduce((sum, inv) => sum + inv.paidAmount, 0);
              return (
                <button 
                  key={`status-${status}`} 
                  className="linked-record-row linked-record-action"
                >
                  <strong>{status}</strong>
                  <span>{count} invoices</span>
                  <small>{money(amount)} collected</small>
                </button>
              );
            })}
          </div>
        </div>
        
        <div className="card">
          <div className="section-head">
            <h3>Job Status Distribution</h3>
            <span>Current state of all projects</span>
          </div>
          <div className="linked-record-list">
            {[...new Set(data.jobs.map(job => job.status))].map(status => {
              const count = data.jobs.filter(job => job.status === status).length;
              return (
                <button 
                  key={`job-status-${status}`} 
                  className="linked-record-row linked-record-action"
                >
                  <strong>{status}</strong>
                  <span>{count} jobs</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>
    </section>
  );
};
