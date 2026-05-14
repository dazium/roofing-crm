import { useMemo, useState } from 'react';
import type { AppData, Appointment, AppointmentStatus, AppointmentType } from '../types';
import { badgeTone, uid } from '../lib';

interface AppointmentForm {
  title: string;
  customerId: string;
  jobId: string;
  type: AppointmentType;
  status: AppointmentStatus;
  startAt: string;
  endAt: string;
  location: string;
  notes: string;
}

interface CalendarProps {
  data: AppData;
  setData: React.Dispatch<React.SetStateAction<AppData>>;
  selectedCustomerId: string | null;
  selectCustomer: (customerId: string | null, nextData?: AppData) => void;
  selectedJobId: string | null;
  selectJob: (jobId: string | null, nextData?: AppData) => void;
}

function toDatetimeLocal(iso?: string) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const tzOffsetMs = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffsetMs).toISOString().slice(0, 16);
}

function fromDatetimeLocal(value: string) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
}

function buildDefaultForm(customerId?: string | null, jobId?: string | null): AppointmentForm {
  const start = new Date();
  const end = new Date(start);
  end.setHours(end.getHours() + 1);

  return {
    title: '',
    customerId: customerId ?? '',
    jobId: jobId ?? '',
    type: 'Inspection',
    status: 'Scheduled',
    startAt: toDatetimeLocal(start.toISOString()),
    endAt: toDatetimeLocal(end.toISOString()),
    location: '',
    notes: '',
  };
}

export const Calendar: React.FC<CalendarProps> = ({
  data,
  setData,
  selectedCustomerId,
  selectCustomer,
  selectedJobId,
  selectJob,
}) => {
  const [editingAppointmentId, setEditingAppointmentId] = useState<string | null>(null);
  const [form, setForm] = useState<AppointmentForm>(() => buildDefaultForm(selectedCustomerId, selectedJobId));

  const availableJobs = useMemo(
    () => (form.customerId ? data.jobs.filter((job) => job.customerId === form.customerId) : data.jobs),
    [data.jobs, form.customerId],
  );

  const appointments = useMemo(
    () => [...data.appointments].sort((a, b) => a.startAt.localeCompare(b.startAt)),
    [data.appointments],
  );

  const upcomingCount = appointments.filter((item) => item.status === 'Scheduled').length;

  function resetForm() {
    setEditingAppointmentId(null);
    setForm(buildDefaultForm(selectedCustomerId, selectedJobId));
  }

  function saveAppointment() {
    if (!form.title.trim() || !form.startAt || !form.endAt) return;

    const recordBase = {
      title: form.title.trim(),
      customerId: form.customerId || undefined,
      jobId: form.jobId || undefined,
      type: form.type,
      status: form.status,
      startAt: fromDatetimeLocal(form.startAt),
      endAt: fromDatetimeLocal(form.endAt),
      location: form.location.trim() || undefined,
      notes: form.notes.trim() || undefined,
      updatedAt: new Date().toISOString(),
    };

    if (editingAppointmentId) {
      setData((prev) => ({
        ...prev,
        appointments: prev.appointments.map((item) => item.id === editingAppointmentId ? { ...item, ...recordBase } : item),
      }));
      resetForm();
      return;
    }

    const newAppointment: Appointment = {
      id: uid(),
      ...recordBase,
      createdAt: new Date().toISOString(),
    };

    setData((prev) => ({
      ...prev,
      appointments: [newAppointment, ...prev.appointments],
    }));
    resetForm();
  }

  function beginEdit(item: Appointment) {
    setEditingAppointmentId(item.id);
    setForm({
      title: item.title,
      customerId: item.customerId ?? '',
      jobId: item.jobId ?? '',
      type: item.type,
      status: item.status,
      startAt: toDatetimeLocal(item.startAt),
      endAt: toDatetimeLocal(item.endAt),
      location: item.location ?? '',
      notes: item.notes ?? '',
    });
  }

  function removeAppointment(id: string) {
    const item = data.appointments.find((entry) => entry.id === id);
    const confirmed = window.confirm(`Delete appointment "${item?.title ?? 'this appointment'}"?`);
    if (!confirmed) return;

    setData((prev) => ({
      ...prev,
      appointments: prev.appointments.filter((entry) => entry.id !== id),
    }));
    if (editingAppointmentId === id) resetForm();
  }

  return (
    <section className="content-grid two-col">
      <div className="column-stack">
        <div className="card">
          <div className="section-head">
            <h3>{editingAppointmentId ? 'Edit appointment' : 'Schedule appointment'}</h3>
            <span>Imported from Rooftop Renovators: calendar + scheduling flow</span>
          </div>
          <div className="form-grid compact-grid">
            <label className="field">
              <span>Title</span>
              <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Inspection, estimate review, job start..." />
            </label>
            <div className="split-grid">
              <label className="field">
                <span>Customer</span>
                <select
                  value={form.customerId}
                  onChange={(event) => {
                    const customerId = event.target.value;
                    setForm({ ...form, customerId, jobId: '' });
                    selectCustomer(customerId || null);
                  }}
                >
                  <option value="">No customer</option>
                  {data.customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Project</span>
                <select
                  value={form.jobId}
                  onChange={(event) => {
                    const jobId = event.target.value;
                    setForm({ ...form, jobId });
                    selectJob(jobId || null);
                  }}
                >
                  <option value="">No project</option>
                  {availableJobs.map((job) => (
                    <option key={job.id} value={job.id}>
                      {job.title}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="split-grid">
              <label className="field">
                <span>Type</span>
                <select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as AppointmentType })}>
                  <option>Estimate</option>
                  <option>Inspection</option>
                  <option>Consultation</option>
                  <option>Job Start</option>
                  <option>Follow-up</option>
                  <option>Other</option>
                </select>
              </label>
              <label className="field">
                <span>Status</span>
                <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as AppointmentStatus })}>
                  <option>Scheduled</option>
                  <option>Completed</option>
                  <option>Cancelled</option>
                  <option>No Show</option>
                </select>
              </label>
            </div>
            <div className="split-grid">
              <label className="field">
                <span>Start</span>
                <input type="datetime-local" value={form.startAt} onChange={(event) => setForm({ ...form, startAt: event.target.value })} />
              </label>
              <label className="field">
                <span>End</span>
                <input type="datetime-local" value={form.endAt} onChange={(event) => setForm({ ...form, endAt: event.target.value })} />
              </label>
            </div>
            <label className="field">
              <span>Location</span>
              <input value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} placeholder="Site address or meeting location" />
            </label>
            <label className="field compact-textarea">
              <span>Notes</span>
              <textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Crew assignment, prep notes, special instructions..." />
            </label>
            <div className="hero-actions">
              <button onClick={saveAppointment}>{editingAppointmentId ? 'Save appointment' : 'Add appointment'}</button>
              {editingAppointmentId ? <button className="ghost" onClick={resetForm}>Cancel edit</button> : null}
            </div>
          </div>
        </div>
      </div>

      <div className="column-stack">
        <div className="card">
          <div className="section-head">
            <h3>Schedule</h3>
            <span>{upcomingCount} upcoming appointment{upcomingCount === 1 ? '' : 's'}</span>
          </div>
          <div className="list-grid">
            {appointments.length ? appointments.map((item) => {
              const customer = data.customers.find((entry) => entry.id === item.customerId);
              const job = data.jobs.find((entry) => entry.id === item.jobId);
              return (
                <div key={item.id} className="stack-item inspection-card">
                  <div className="stack-item-top">
                    <strong>{item.title}</strong>
                    <span className={`pill pill-${badgeTone(item.status)}`}>{item.status}</span>
                  </div>
                  <p>{item.type} · {new Date(item.startAt).toLocaleString()} to {new Date(item.endAt).toLocaleTimeString()}</p>
                  <small>{customer?.name ?? 'No customer'}{job ? ` · ${job.title}` : ''}</small>
                  <div className="inspection-metrics">
                    <span>{item.location || 'No location set'}</span>
                  </div>
                  <div className="hero-actions">
                    <button className="ghost" onClick={() => beginEdit(item)}>Edit</button>
                    <button className="ghost danger" onClick={() => removeAppointment(item.id)}>Delete</button>
                  </div>
                </div>
              );
            }) : <div className="empty">No appointments yet. Add inspections, estimates, and job starts here.</div>}
          </div>
        </div>
      </div>
    </section>
  );
};
