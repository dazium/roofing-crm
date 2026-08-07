import { Check, Clock3 } from 'lucide-react';
import { useState } from 'react';
import type { AppData, TimeEntry } from '../types';
import { uid } from '../lib';

type Props = { data: AppData; onUpdate: (data: AppData) => void };
const dayKey = (date: Date) => date.toISOString().slice(0, 10);
const hours = (minutes: number) => `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
const workedMinutes = (entry: TimeEntry) => entry.punchOutTime ? entry.durationMinutes || 0 : 0;

export function Timesheets({ data, onUpdate }: Props) {
  const [form, setForm] = useState({ crewId: data.crews[0]?.id || '', memberId: '', date: new Date().toISOString().slice(0, 10), start: '', end: '', notes: '' });
  const monday = new Date();
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - (monday.getDay() || 7) + 1);
  const days = Array.from({ length: 7 }, (_, index) => { const date = new Date(monday); date.setDate(monday.getDate() + index); return date; });
  const keys = new Set(days.map(dayKey));
  const rows = data.crews.flatMap((crew) => crew.members.map((member) => { const entries = data.timeLogs.flatMap((log) => log.entries).filter((entry) => entry.memberId === member.id && keys.has(entry.date)); return { crew, member, entries, total: entries.reduce((sum, entry) => sum + workedMinutes(entry), 0) }; })).filter((row) => row.entries.length);
  const total = rows.reduce((sum, row) => sum + row.total, 0);
  const pending = rows.reduce((sum, row) => sum + row.entries.filter((entry) => entry.punchOutTime && !entry.approved).length, 0);
  const approve = (id: string) => onUpdate({ ...data, timeLogs: data.timeLogs.map((log) => ({ ...log, entries: log.entries.map((entry) => entry.id === id ? { ...entry, approved: true } : entry) })) });

  function addManualEntry() {
    if (!form.crewId || !form.memberId || !form.date || !form.start || !form.end) return;
    const punchInTime = new Date(`${form.date}T${form.start}`);
    const punchOutTime = new Date(`${form.date}T${form.end}`);
    if (Number.isNaN(punchInTime.getTime()) || Number.isNaN(punchOutTime.getTime()) || punchOutTime <= punchInTime) return;
    const durationMinutes = Math.round((punchOutTime.getTime() - punchInTime.getTime()) / 60000);

    const newEntry: TimeEntry = {
      id: uid(),
      crewId: form.crewId,
      memberId: form.memberId,
      date: form.date,
      punchInTime: punchInTime.toISOString(),
      punchOutTime: punchOutTime.toISOString(),
      durationMinutes,
      breakMinutes: 0,
      approved: false,
      notes: form.notes || undefined,
    };

    const existingLog = data.timeLogs.find((log) => log.crewId === form.crewId && log.date === form.date);
    let nextTimeLogs;
    if (existingLog) {
      const updatedEntries = [...existingLog.entries, newEntry];
      const updatedLog = { ...existingLog, entries: updatedEntries, totalMinutes: updatedEntries.reduce((s, e) => s + (e.durationMinutes || 0), 0) };
      nextTimeLogs = data.timeLogs.map((log) => log.id === existingLog.id ? updatedLog : log);
    } else {
      const newLog = { id: uid(), crewId: form.crewId, date: form.date, entries: [newEntry], totalMinutes: newEntry.durationMinutes || 0 };
      nextTimeLogs = [...data.timeLogs, newLog];
    }

    onUpdate({ ...data, timeLogs: nextTimeLogs });
    setForm({ ...form, memberId: '', start: '', end: '', notes: '' });
  }

  const selectedCrewMembers = data.crews.find((c) => c.id === form.crewId)?.members || [];

  return (
    <section className="workspace timesheets-page">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Crew operations</span>
          <h1>Timesheets</h1>
          <p>Review and approve this week's worked hours.</p>
        </div>
        <strong>{days[0].toLocaleDateString([], { month: 'short', day: 'numeric' })} - {days[6].toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</strong>
      </div>

      <div className="card">
        <div className="section-head">
          <div>
            <h3>Add manual entry</h3>
            <span>Record worked time manually</span>
          </div>
        </div>
        <div className="form-grid compact-grid">
          <label className="field">
            <span>Crew</span>
            <select value={form.crewId} onChange={(e) => setForm({ ...form, crewId: e.target.value, memberId: '' })}>
              <option value="">Select crew</option>
              {data.crews.map((crew) => <option key={crew.id} value={crew.id}>{crew.name}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Member</span>
            <select value={form.memberId} onChange={(e) => setForm({ ...form, memberId: e.target.value })}>
              <option value="">Select member</option>
              {selectedCrewMembers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Date</span>
            <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </label>
          <label className="field">
            <span>Start</span>
            <input type="time" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} />
          </label>
          <label className="field">
            <span>End</span>
            <input type="time" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} />
          </label>
          <label className="field">
            <span>Notes</span>
            <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes" />
          </label>
        </div>
        <div style={{ marginTop: 12 }}>
          <button onClick={addManualEntry} disabled={!form.crewId || !form.memberId || !form.start || !form.end}>Add entry</button>
        </div>
      </div>

      <div className="metric-row">
        <div className="ui-metric"><span>Total worked</span><strong>{hours(total)}</strong></div>
        <div className="ui-metric"><span>Team members</span><strong>{rows.length}</strong></div>
        <div className="ui-metric"><span>Awaiting approval</span><strong>{pending}</strong></div>
      </div>

      <div className="card timesheet-card">
        {rows.length ? rows.map((row) => (
          <div className="timesheet-row" key={row.member.id}>
            <div className="timesheet-person"><strong>{row.member.name}</strong><span>{row.member.role || 'Crew member'} · {row.crew.name}</span></div>
            <div className="timesheet-days">
              {days.map((day) => {
                const minutes = row.entries.filter((entry) => entry.date === dayKey(day)).reduce((sum, entry) => sum + workedMinutes(entry), 0);
                return <div className="timesheet-day" key={dayKey(day)}><small>{day.toLocaleDateString([], { weekday: 'short' })}</small><b>{minutes ? hours(minutes) : '-'}</b></div>;
              })}
            </div>
            <strong>{hours(row.total)}</strong>
            <div>{row.entries.filter((entry) => entry.punchOutTime && !entry.approved).map((entry) => <button className="approve-button" key={entry.id} onClick={() => approve(entry.id)}><Check size={15} /> Approve</button>)}</div>
          </div>
        )) : (
          <div className="empty-state"><Clock3 size={24} /><h3>No timesheets yet</h3><p>Completed crew sessions will appear here for review.</p></div>
        )}
      </div>
    </section>
  );
}
