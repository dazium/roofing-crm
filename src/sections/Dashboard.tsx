import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Camera, CheckCircle2, Cloud, CloudRain, DollarSign, FileText, HardHat, Home, Package, Plus, Search, Sun, TrendingDown, TrendingUp, Users } from 'lucide-react';
import type { AppData, Customer, Job, JobStatus, LeadStatus, View } from '../types';
import { money, uid } from '../lib';
import { buildDashboardActivity, type DashboardActivityItem } from '../appLookups';
import { fetchJobWeather, type JobWeatherSnapshot } from '../weather';

type PipelineStage = 'New Lead' | 'Inspection Scheduled' | 'Estimate Sent' | 'Approved' | 'Production Scheduled' | 'In Progress' | 'Complete';

type DashboardCustomerForm = {
  name: string;
  phone: string;
  email: string;
  address: string;
  source: string;
  notes: string;
  leadStatus: LeadStatus;
};

type PipelineCard = {
  id: string;
  customer: Customer;
  job: Job | null;
  stage: PipelineStage;
  address: string;
  shingle: string;
  squares: number;
  value: number;
  crewInitials: string;
  attention: 'on-track' | 'needs-attention' | 'stalled';
  attentionLabel: string;
  thumbnail?: string;
};

const pipelineStages: PipelineStage[] = ['New Lead', 'Inspection Scheduled', 'Estimate Sent', 'Approved', 'Production Scheduled', 'In Progress', 'Complete'];
const shingleFallbacks = ['GAF Timberline HDZ - Charcoal', 'CertainTeed Landmark - Weathered Wood', 'Owens Corning Duration - Estate Gray', 'IKO Dynasty - Granite Black'];

interface DashboardProps {
  data: AppData;
  setData: React.Dispatch<React.SetStateAction<AppData>>;
  selectedCustomerId: string | null;
  selectedJobId: string | null;
  setView: React.Dispatch<React.SetStateAction<View>>;
  onOpenCustomer: (customerId: string) => void;
  onOpenJob: (jobId: string) => void;
  onOpenEstimates: () => void;
}

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function startOfWeek(date: Date) {
  const next = new Date(date);
  const day = next.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  next.setDate(next.getDate() + diff);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfWeek(date: Date) {
  const next = startOfWeek(date);
  next.setDate(next.getDate() + 6);
  next.setHours(23, 59, 59, 999);
  return next;
}

function stageFor(customer: Customer, job: Job | null): PipelineStage {
  if (job?.status === 'Complete' || job?.status === 'Paid') return 'Complete';
  if (job?.status === 'In Progress' || job?.status === 'Awaiting Final Review') return 'In Progress';
  if (job?.status === 'Scheduled') return customer.leadStatus === 'Won' ? 'Production Scheduled' : 'Inspection Scheduled';
  if (customer.leadStatus === 'Estimate Sent') return 'Estimate Sent';
  if (customer.leadStatus === 'Inspection Scheduled') return 'Inspection Scheduled';
  if (customer.leadStatus === 'Won') return 'Approved';
  return 'New Lead';
}

function initials(name?: string) {
  if (!name) return 'NA';
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'NA';
}

function streetAddress(address: string) {
  return address.split(',')[0]?.trim() || address || 'No address yet';
}

function weatherIcon(summary?: string) {
  const lower = summary?.toLowerCase() ?? '';
  if (lower.includes('rain') || lower.includes('shower') || lower.includes('storm')) return <CloudRain size={18} />;
  if (lower.includes('cloud') || lower.includes('overcast')) return <Cloud size={18} />;
  return <Sun size={18} />;
}

export const Dashboard: React.FC<DashboardProps> = ({
  data,
  setData,
  selectedCustomerId,
  selectedJobId,
  setView,
  onOpenCustomer,
  onOpenJob,
  onOpenEstimates,
}) => {
  const [weather, setWeather] = useState<JobWeatherSnapshot | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null);
  const [jobSearch, setJobSearch] = useState('');
  const [crewFilter, setCrewFilter] = useState('all');
  const [shingleFilter, setShingleFilter] = useState('all');
  const [customerForm, setCustomerForm] = useState<DashboardCustomerForm>({
    name: '',
    phone: '',
    email: '',
    address: '',
    source: 'Facebook',
    notes: '',
    leadStatus: 'New Lead',
  });

  const selectedCustomer = useMemo(
    () => data.customers.find((customer) => customer.id === selectedCustomerId) ?? data.customers[0] ?? null,
    [data.customers, selectedCustomerId]
  );
  const selectedJob = useMemo(
    () => data.jobs.find((job) => job.id === selectedJobId) ?? null,
    [data.jobs, selectedJobId]
  );

  useEffect(() => {
    let cancelled = false;

    async function loadWeather() {
      const address = selectedCustomer?.address || data.companyProfile.city;
      if (!address) {
        setWeather(null);
        setWeatherError(null);
        setWeatherLoading(false);
        return;
      }

      setWeatherLoading(true);
      setWeatherError(null);
      try {
        const nextWeather = await fetchJobWeather(address, selectedJob?.scheduledFor || undefined);
        if (!cancelled) setWeather(nextWeather);
      } catch (error) {
        if (!cancelled) {
          setWeather(null);
          setWeatherError(error instanceof Error ? error.message : 'Could not load weather');
        }
      } finally {
        if (!cancelled) setWeatherLoading(false);
      }
    }

    void loadWeather();

    return () => {
      cancelled = true;
    };
  }, [data.companyProfile.city, selectedCustomer?.address, selectedJob?.scheduledFor]);

  const cards = useMemo<PipelineCard[]>(() => data.customers.map((customer, index) => {
    const job = data.jobs.find((entry) => entry.customerId === customer.id) ?? null;
    const estimate = job ? data.estimates.find((entry) => entry.jobId === job.id) : null;
    const inspection = data.inspections.find((entry) => entry.customerId === customer.id) ?? null;
    const crew = data.crews.find((entry) => entry.id === job?.crewId);
    const dueDate = job?.scheduledFor ? new Date(job.scheduledFor) : null;
    const overdue = dueDate ? dueDate < new Date() && !['Complete', 'Paid'].includes(job?.status ?? '') : false;
    const attention = overdue ? 'stalled' : job?.priority === 'High' ? 'needs-attention' : 'on-track';

    return {
      id: job?.id ?? `lead-${customer.id}`,
      customer,
      job,
      stage: stageFor(customer, job),
      address: streetAddress(customer.address),
      shingle: estimate?.lineItems.find((item) => item.title.toLowerCase().includes('shingle'))?.title || `${shingleFallbacks[index % shingleFallbacks.length]}`,
      squares: estimate?.squares ?? inspection?.measurements.squares ?? 0,
      value: estimate?.totalPrice ?? 0,
      crewInitials: initials(crew?.crewLead ?? crew?.name),
      attention,
      attentionLabel: attention === 'stalled' ? 'Overdue' : attention === 'needs-attention' ? 'Needs attention' : 'On track',
      thumbnail: inspection?.photos[0]?.dataUrl,
    };
  }), [data.crews, data.customers, data.estimates, data.inspections, data.jobs]);

  const filteredCards = useMemo(() => {
    const query = jobSearch.trim().toLowerCase();
    return cards.filter((card) => {
      const matchesSearch = !query || [card.address, card.customer.name, card.job?.id, card.job?.title, card.shingle].some((value) => value?.toLowerCase().includes(query));
      const matchesCrew = crewFilter === 'all' || card.job?.crewId === crewFilter;
      const matchesShingle = shingleFilter === 'all' || card.shingle === shingleFilter;
      return matchesSearch && matchesCrew && matchesShingle;
    });
  }, [cards, crewFilter, jobSearch, shingleFilter]);

  const metrics = useMemo(() => {
    const now = new Date();
    const weekStart = startOfWeek(now);
    const weekEnd = endOfWeek(now);
    const monthKey = now.toISOString().slice(0, 7);
    const openEstimates = data.estimates.filter((estimate) => {
      const job = data.jobs.find((entry) => entry.id === estimate.jobId);
      return !job || !['Complete', 'Paid'].includes(job.status);
    });
    const scheduledThisWeek = data.jobs.filter((job) => {
      if (!job.scheduledFor) return false;
      const scheduled = new Date(job.scheduledFor);
      return scheduled >= weekStart && scheduled <= weekEnd;
    });
    const pendingApprovalCustomers = data.customers.filter((customer) => customer.leadStatus === 'Estimate Sent');
    const pendingApprovalEstimates = data.estimates.filter((estimate) => {
      const job = data.jobs.find((entry) => entry.id === estimate.jobId);
      return job ? pendingApprovalCustomers.some((customer) => customer.id === job.customerId) : false;
    });
    const completedRevenue = data.invoices
      .filter((invoice) => invoice.status === 'Paid' && (invoice.paidDate ?? invoice.issuedDate ?? '').startsWith(monthKey))
      .reduce((sum, invoice) => sum + invoice.amount, 0);
    const completedEstimateRevenue = completedRevenue || data.jobs
      .filter((job) => job.status === 'Complete')
      .reduce((sum, job) => sum + (data.estimates.find((estimate) => estimate.jobId === job.id)?.totalPrice ?? 0), 0);
    const rainDays = weather?.daily.filter((day) => (day.rainChance ?? 0) >= 50).length ?? 0;

    return {
      openEstimates: `${openEstimates.length} · ${money(openEstimates.reduce((sum, estimate) => sum + estimate.totalPrice, 0))}`,
      scheduledWeek: `${scheduledThisWeek.length} · ${scheduledThisWeek.reduce((sum, job) => sum + (data.estimates.find((estimate) => estimate.jobId === job.id)?.squares ?? 0), 0)} sq`,
      pendingApprovals: `${pendingApprovalCustomers.length} · ${money(pendingApprovalEstimates.reduce((sum, estimate) => sum + estimate.totalPrice, 0))}`,
      revenueMtd: money(completedEstimateRevenue),
      rainDays,
    };
  }, [data.customers, data.estimates, data.invoices, data.jobs, weather?.daily]);

  const crewSchedule = useMemo(() => {
    const today = toDateKey(new Date());
    return data.crews.map((crew) => {
      const crewJobs = data.jobs.filter((job) => job.crewId === crew.id && (job.scheduledFor === today || job.status === 'In Progress' || job.status === 'Scheduled'));
      const done = crewJobs.filter((job) => ['Complete', 'Paid'].includes(job.status)).length;
      return {
        crew,
        jobs: crewJobs.slice(0, 3),
        progress: crewJobs.length ? Math.round((done / crewJobs.length) * 100) : 0,
      };
    }).filter((entry) => entry.jobs.length || entry.crew.status === 'Active');
  }, [data.crews, data.jobs]);

  const recentActivity = useMemo<DashboardActivityItem[]>(() => buildDashboardActivity(data, 10), [data]);
  const shingleOptions = useMemo(() => Array.from(new Set(cards.map((card) => card.shingle))).sort(), [cards]);

  function openCard(card: PipelineCard) {
    if (card.job) {
      onOpenJob(card.job.id);
      return;
    }
    onOpenCustomer(card.customer.id);
  }

  function updateCardStage(cardId: string, stage: PipelineStage) {
    const card = cards.find((entry) => entry.id === cardId);
    if (!card) return;

    const leadStatusByStage: Partial<Record<PipelineStage, LeadStatus>> = {
      'New Lead': 'New Lead',
      'Inspection Scheduled': 'Inspection Scheduled',
      'Estimate Sent': 'Estimate Sent',
      Approved: 'Won',
      'Production Scheduled': 'Won',
      'In Progress': 'Won',
      Complete: 'Won',
    };
    const jobStatusByStage: Partial<Record<PipelineStage, JobStatus>> = {
      'Production Scheduled': 'Scheduled',
      'In Progress': 'In Progress',
      Complete: 'Complete',
    };

    setData((prev) => ({
      ...prev,
      customers: prev.customers.map((customer) => customer.id === card.customer.id
        ? { ...customer, leadStatus: leadStatusByStage[stage] ?? customer.leadStatus }
        : customer),
      jobs: prev.jobs.map((job) => job.id === card.job?.id
        ? { ...job, status: jobStatusByStage[stage] ?? job.status }
        : job),
    }));
  }

  function handleDrop(event: React.DragEvent<HTMLElement>, stage: PipelineStage) {
    event.preventDefault();
    if (!draggedCardId) return;
    updateCardStage(draggedCardId, stage);
    setDraggedCardId(null);
  }

  function addDashboardCustomer(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!customerForm.name.trim() || !customerForm.address.trim()) return;

    const newCustomer: Customer = {
      id: uid(),
      name: customerForm.name.trim(),
      phone: customerForm.phone.trim(),
      email: customerForm.email.trim(),
      address: customerForm.address.trim(),
      source: customerForm.source.trim() || 'Facebook',
      notes: customerForm.notes.trim(),
      leadStatus: customerForm.leadStatus,
    };

    setData((prev) => ({ ...prev, customers: [newCustomer, ...prev.customers] }));
    setCustomerForm({ name: '', phone: '', email: '', address: '', source: 'Facebook', notes: '', leadStatus: 'New Lead' });
  }
  function openActivity(item: DashboardActivityItem) {
    if (item.jobId) {
      onOpenJob(item.jobId);
      return;
    }
    if (item.customerId) onOpenCustomer(item.customerId);
  }

  return (
    <>
      <section className="roofing-metric-strip" aria-label="Roofing dashboard metrics">
        <button className="roofing-metric metric-slate" onClick={onOpenEstimates}>
          <span><FileText size={17} /> Open estimates</span>
          <strong>{metrics.openEstimates}</strong>
          <small><TrendingUp size={14} /> +8% this week</small>
        </button>
        <button className="roofing-metric metric-blue" onClick={() => setView('jobs')}>
          <span><CalendarDays size={17} /> Jobs scheduled</span>
          <strong>{metrics.scheduledWeek}</strong>
          <small><TrendingUp size={14} /> This week</small>
        </button>
        <button className="roofing-metric metric-amber" onClick={onOpenEstimates}>
          <span><CheckCircle2 size={17} /> Pending approvals</span>
          <strong>{metrics.pendingApprovals}</strong>
          <small><TrendingDown size={14} /> Estimate sent</small>
        </button>
        <button className="roofing-metric metric-revenue" onClick={() => setView('reports')}>
          <span><DollarSign size={17} /> Revenue MTD</span>
          <strong>{metrics.revenueMtd}</strong>
          <small><TrendingUp size={14} /> Completed jobs</small>
        </button>
        <button className="roofing-metric metric-rain" onClick={() => setView('calendar')}>
          <span><CloudRain size={17} /> Rain days</span>
          <strong>{weather ? metrics.rainDays : '-'}</strong>
          <small>{weather ? 'Forecast risk this month' : 'Add service area'}</small>
        </button>
      </section>

      <section className="roofing-quick-actions" aria-label="Quick actions">
        <button className="quick-primary" onClick={() => setView('customers')}><Plus size={18} /> New Lead</button>
        <button className="ghost" onClick={onOpenEstimates}><FileText size={18} /> Create Estimate</button>
        <button className="ghost" onClick={() => setView('calendar')}><CalendarDays size={18} /> Schedule Crew</button>
        <button className="ghost" onClick={() => setView('crews')}><HardHat size={18} /> Manage Crews</button>
        <button className="ghost" onClick={() => setView('materials')}><Package size={18} /> Order Materials</button>
        <button className="ghost" onClick={() => setView('photos')}><Camera size={18} /> Upload Photos</button>
      </section>


      <section className="dashboard-customer-intake" aria-label="Add customer">
        <div className="section-head">
          <div>
            <span className="eyebrow">Add Customer</span>
            <h3>New roofing lead</h3>
          </div>
          <span>Saved leads appear in New Lead on the board.</span>
        </div>
        <form className="dashboard-customer-form" onSubmit={addDashboardCustomer}>
          <label className="field">
            <span>Homeowner</span>
            <input
              value={customerForm.name}
              onChange={(event) => setCustomerForm({ ...customerForm, name: event.target.value })}
              placeholder="Homeowner name"
            />
          </label>
          <label className="field">
            <span>Address</span>
            <input
              value={customerForm.address}
              onChange={(event) => setCustomerForm({ ...customerForm, address: event.target.value })}
              placeholder="Property address"
            />
          </label>
          <label className="field">
            <span>Phone</span>
            <input
              value={customerForm.phone}
              onChange={(event) => setCustomerForm({ ...customerForm, phone: event.target.value })}
              placeholder="Phone"
            />
          </label>
          <label className="field">
            <span>Source</span>
            <input
              value={customerForm.source}
              onChange={(event) => setCustomerForm({ ...customerForm, source: event.target.value })}
              placeholder="Facebook, referral, sign..."
            />
          </label>
          <label className="field dashboard-customer-notes">
            <span>Notes</span>
            <input
              value={customerForm.notes}
              onChange={(event) => setCustomerForm({ ...customerForm, notes: event.target.value })}
              placeholder="Leak, storm damage, estimate request..."
            />
          </label>
          <button type="submit" disabled={!customerForm.name.trim() || !customerForm.address.trim()}>
            <Plus size={18} /> Add Customer
          </button>
        </form>
      </section>
      <section className="roofing-dashboard-layout">
        <div className="roofing-board-panel">
          <div className="roofing-board-toolbar">
            <div>
              <span className="eyebrow">Job Board</span>
              <h3>Shingle Roofing Pipeline</h3>
            </div>
            <div className="roofing-filter-bar">
              <label className="roofing-search">
                <Search size={16} />
                <input value={jobSearch} onChange={(event) => setJobSearch(event.target.value)} placeholder="Search address, customer, job ID" />
              </label>
              <select value={crewFilter} onChange={(event) => setCrewFilter(event.target.value)} aria-label="Filter by crew">
                <option value="all">All crews</option>
                {data.crews.map((crew) => <option key={crew.id} value={crew.id}>{crew.name}</option>)}
              </select>
              <select value={shingleFilter} onChange={(event) => setShingleFilter(event.target.value)} aria-label="Filter by shingle">
                <option value="all">All shingles</option>
                {shingleOptions.map((shingle) => <option key={shingle} value={shingle}>{shingle}</option>)}
              </select>
            </div>
          </div>

          <div className="kanban-shell">
            {pipelineStages.map((stage) => {
              const stageCards = filteredCards.filter((card) => card.stage === stage);
              return (
                <section
                  key={stage}
                  className="roofing-kanban-column"
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => handleDrop(event, stage)}
                >
                  <div className="kanban-column-header">
                    <strong>{stage}</strong>
                    <span>{stageCards.length}</span>
                  </div>
                  <div className="kanban-card-stack">
                    {stageCards.length ? stageCards.map((card) => (
                      <button
                        key={card.id}
                        className="roofing-job-card"
                        draggable
                        onDragStart={() => setDraggedCardId(card.id)}
                        onDragEnd={() => setDraggedCardId(null)}
                        onClick={() => openCard(card)}
                      >
                        <div className="job-card-top">
                          <div>
                            <strong>{card.address}</strong>
                            <span>{card.customer.name}</span>
                          </div>
                          {card.thumbnail ? <img src={card.thumbnail} alt="" /> : <Home size={24} />}
                        </div>
                        <span className="job-shingle">{card.shingle}</span>
                        <div className="job-card-meta">
                          <span>{card.squares || '-'} sq</span>
                          <span>{card.value ? money(card.value) : 'No estimate'}</span>
                          <span className="crew-avatar">{card.crewInitials}</span>
                        </div>
                        <div className="job-card-badges">
                          <span className={`status-chip status-${card.attention}`}>{card.attentionLabel}</span>
                          {card.job?.scheduledFor ? <span className="status-chip neutral">{card.job.scheduledFor}</span> : null}
                        </div>
                      </button>
                    )) : <div className="empty kanban-empty">No jobs in this stage. Drag a job here or create a new lead.</div>}
                  </div>
                </section>
              );
            })}
          </div>
          <button className="floating-new-job" onClick={() => setView('customers')} aria-label="Create new job">
            <Plus size={18} /> New Job
            <span className="onboarding-tip">Start here to add a roofing lead.</span>
          </button>
        </div>

        <aside className="roofing-ops-sidebar">
          <section className="ops-widget">
            <div className="ops-widget-head">
              <HardHat size={18} />
              <h3>Today's Crew Schedule</h3>
            </div>
            <div className="crew-schedule-list">
              {crewSchedule.map(({ crew, jobs, progress }) => (
                <div key={crew.id} className="crew-schedule-item">
                  <div className="crew-schedule-top">
                    <strong>{crew.name}</strong>
                    <span>{progress}%</span>
                  </div>
                  <div className="crew-progress"><span style={{ width: `${progress}%` }} /></div>
                  {jobs.length ? jobs.map((job) => {
                    const customer = data.customers.find((entry) => entry.id === job.customerId);
                    return (
                      <button key={job.id} className="crew-job-row" onClick={() => onOpenJob(job.id)}>
                        <span>{streetAddress(customer?.address ?? '')}</span>
                        <small>{job.scheduledFor || 'Today'} · {job.status === 'In Progress' ? 'On site' : job.status === 'Complete' ? 'Complete' : 'En route'}</small>
                      </button>
                    );
                  }) : <div className="empty compact-empty">No jobs assigned today.</div>}
                </div>
              ))}
            </div>
          </section>

          <section className="ops-widget">
            <div className="ops-widget-head">
              <CloudRain size={18} />
              <h3>3-Day Weather</h3>
            </div>
            {weatherLoading ? <div className="empty compact-empty">Loading weather...</div> : weatherError ? <div className="empty compact-empty">{weatherError}</div> : weather ? (
              <div className="forecast-widget-list">
                {weather.daily.slice(0, 3).map((day) => {
                  const rain = (day.rainChance ?? 0) >= 50;
                  return (
                    <div key={day.date} className={`forecast-day ${rain ? 'rain-risk' : ''}`}>
                      <span>{weatherIcon(day.summary)}</span>
                      <strong>{new Date(day.date).toLocaleDateString(undefined, { weekday: 'short' })}</strong>
                      <small>{day.highTempC != null ? `${Math.round(day.highTempC)}°C high` : 'Temp n/a'}</small>
                      {rain ? <em>No Roofing</em> : null}
                    </div>
                  );
                })}
              </div>
            ) : <div className="empty compact-empty">Add your service area to see weather alerts.</div>}
          </section>

          <section className="ops-widget activity-widget">
            <div className="ops-widget-head">
              <Users size={18} />
              <h3>Recent Activity</h3>
            </div>
            <div className="activity-feed">
              {recentActivity.length ? recentActivity.map((item) => (
                <button key={item.id} className="activity-feed-row" onClick={() => openActivity(item)}>
                  <strong>{item.title}</strong>
                  <span>{item.detail}</span>
                  <small>{item.meta}</small>
                </button>
              )) : <div className="empty compact-empty">No recent activity yet.</div>}
            </div>
          </section>
        </aside>
      </section>
    </>
  );
};
