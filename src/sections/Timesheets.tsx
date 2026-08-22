import { Check, Clock3, Plus, Users } from 'lucide-react';
import { useState } from 'react';
import type { AppData, TimeEntry, TimeLog } from '../types';
import { uid } from '../lib';

type Props = { data: AppData; onUpdate: (data: AppData) => void };
const dayKey = (date: Date) => date.toISOString().slice(0, 10);
const hours = (minutes: number) => `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
const workedMinutes = (entry: TimeEntry) => entry.punchOutTime ? entry.durationMinutes || 0 : 0;
type TimesheetMode = 'crew' | 'member';

export function Timesheets({ data, onUpdate }: Props) {
  const [showAddForm, setShowAddForm] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const [clockForm, setClockForm] = useState({
    mode: 'member' as TimesheetMode,
    crewId: data.crews[0]?.id || '',
    memberId: '',
  });
  const [form, setForm] = useState({
    mode: 'member' as TimesheetMode,
    crewId: data.crews[0]?.id || '',
    memberId: '',
    date: today,
    start: '',
    end: '',
    notes: '',
  });
  const monday = new Date();
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - (monday.getDay() || 7) + 1);
  const days = Array.from({ length: 7 }, (_, index) => { const date = new Date(monday); date.setDate(monday.getDate() + index); return date; });
  const keys = new Set(days.map(dayKey));
  const rows = data.crews.flatMap((crew) => crew.members.map((member) => { const entries = data.timeLogs.flatMap((log) => log.entries).filter((entry) => entry.memberId === member.id && keys.has(entry.date)); return { crew, member, entries, total: entries.reduce((sum, entry) => sum + workedMinutes(entry), 0) }; })).filter((row) => row.entries.length);
  const total = rows.reduce((sum, row) => sum + row.total, 0);
  const pending = rows.reduce((sum, row) => sum + row.entries.filter((entry) => entry.punchOutTime && !entry.approved).length, 0);
  const approve = (id: string) => onUpdate({ ...data, timeLogs: data.timeLogs.map((log) => ({ ...log, entries: log.entries.map((entry) => entry.id === id ? { ...entry, approved: true } : entry) })) });
  const selectedClockCrew = data.crews.find((crew) => crew.id === clockForm.crewId);
  const selectedClockMembers = selectedClockCrew?.members ?? [];
  const selectedClockMemberIds = clockForm.mode === 'crew'
    ? selectedClockMembers.map((member) => member.id)
    : clockForm.memberId ? [clockForm.memberId] : [];
  const activeClockEntries = data.timeLogs
    .flatMap((log) => log.entries)
    .filter((entry) =>
      entry.crewId === clockForm.crewId &&
      !entry.punchOutTime &&
      (!selectedClockMemberIds.length || !entry.memberId || selectedClockMemberIds.includes(entry.memberId))
    );
  const activeClockMemberIds = new Set(activeClockEntries.map((entry) => entry.memberId).filter(Boolean));

  function upsertTimeLog(logs: TimeLog[], entry: TimeEntry) {
    const existingLog = logs.find((log) => log.crewId === entry.crewId && log.date === entry.date);
    if (existingLog) {
      const updatedEntries = [...existingLog.entries, entry];
      const updatedLog = {
        ...existingLog,
        entries: updatedEntries,
        totalMinutes: updatedEntries.reduce((sum, item) => sum + (item.durationMinutes || 0), 0),
      };
      return logs.map((log) => log.id === existingLog.id ? updatedLog : log);
    }

    return [
      ...logs,
      {
        id: uid(),
        crewId: entry.crewId,
        date: entry.date,
        entries: [entry],
        totalMinutes: entry.durationMinutes || 0,
      },
    ];
  }

  function addManualTimesheet() {
    if (!form.crewId || !form.date || !form.start || !form.end) return;
    const punchInTime = new Date(`${form.date}T${form.start}`);
    const punchOutTime = new Date(`${form.date}T${form.end}`);
    if (Number.isNaN(punchInTime.getTime()) || Number.isNaN(punchOutTime.getTime()) || punchOutTime <= punchInTime) return;
    const durationMinutes = Math.round((punchOutTime.getTime() - punchInTime.getTime()) / 60000);
    const selectedCrew = data.crews.find((crew) => crew.id === form.crewId);
    const memberIds = form.mode === 'crew'
      ? selectedCrew?.members.map((member) => member.id) ?? []
      : form.memberId ? [form.memberId] : [];

    if (!memberIds.length) return;

    const newEntries: TimeEntry[] = memberIds.map((memberId) => ({
      id: uid(),
      crewId: form.crewId,
      memberId,
      date: form.date,
      punchInTime: punchInTime.toISOString(),
      punchOutTime: punchOutTime.toISOString(),
      durationMinutes,
      breakMinutes: 0,
      approved: false,
      notes: form.notes || undefined,
    }));

    const nextTimeLogs = newEntries.reduce(upsertTimeLog, data.timeLogs);
    onUpdate({ ...data, timeLogs: nextTimeLogs });
    setForm({ ...form, memberId: '', start: '', end: '', notes: '' });
    setShowAddForm(false);
  }

  function punchInLive() {
    if (!clockForm.crewId || !selectedClockMemberIds.length) return;
    const now = new Date().toISOString();
    const memberIds = selectedClockMemberIds.filter((memberId) => !activeClockMemberIds.has(memberId));
    if (!memberIds.length) return;

    const entries: TimeEntry[] = memberIds.map((memberId) => ({
      id: uid(),
      crewId: clockForm.crewId,
      memberId,
      date: today,
      punchInTime: now,
      breakMinutes: 0,
      approved: false,
    }));

    onUpdate({
      ...data,
      timeLogs: entries.reduce(upsertTimeLog, data.timeLogs),
    });
  }

  function punchOutLive() {
    if (!clockForm.crewId || !activeClockEntries.length) return;
    const now = new Date().toISOString();
    const activeIds = new Set(activeClockEntries.map((entry) => entry.id));

    onUpdate({
      ...data,
      timeLogs: data.timeLogs.map((log) => {
        if (!log.entries.some((entry) => activeIds.has(entry.id))) return log;
        const entries = log.entries.map((entry) => {
          if (!activeIds.has(entry.id)) return entry;
          const breakMinutes = (entry.breakMinutes || 0) + (entry.breakStartTime
            ? Math.round((Date.now() - new Date(entry.breakStartTime).getTime()) / 60000)
            : 0);
          const durationMinutes = Math.max(0, Math.round((new Date(now).getTime() - new Date(entry.punchInTime).getTime()) / 60000) - breakMinutes);
          return {
            ...entry,
            punchOutTime: now,
            durationMinutes,
            breakMinutes,
            breakStartTime: undefined,
          };
        });
        return {
          ...log,
          entries,
          totalMinutes: entries.reduce((sum, entry) => sum + (entry.durationMinutes || 0), 0),
        };
      }),
    });
  }

  const selectedCrewMembers = data.crews.find((c) => c.id === form.crewId)?.members || [];
  const canAddTimesheet = Boolean(form.crewId && form.date && form.start && form.end && (form.mode === 'crew' ? selectedCrewMembers.length : form.memberId));
  const canPunchIn = Boolean(clockForm.crewId && selectedClockMemberIds.some((memberId) => !activeClockMemberIds.has(memberId)));
  const canPunchOut = activeClockEntries.length > 0;

  return (
    <section className="workspace timesheets-page">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Crew operations</span>
          <h1>Timesheets</h1>
          <p>Review and approve this week's worked hours.</p>
        </div>
        <div className="timesheet-heading-actions">
          <strong>{days[0].toLocaleDateString([], { month: 'short', day: 'numeric' })} - {days[6].toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</strong>
          <button type="button" onClick={() => setShowAddForm((prev) => !prev)}>
            <Plus size={18} /> Add timesheet
          </button>
        </div>
      </div>

      <div className="card timesheet-clock-card">
        <div className="section-head">
          <div>
            <h3>Time clock</h3>
            <span>Punch in or out for a crew or individual member</span>
          </div>
          {activeClockEntries.length ? <span className="active-badge">{activeClockEntries.length} active</span> : null}
        </div>
        <div className="timesheet-entry-mode" role="group" aria-label="Punch clock type">
          <button
            type="button"
            className={clockForm.mode === 'member' ? '' : 'ghost'}
            onClick={() => setClockForm({ ...clockForm, mode: 'member' })}
          >
            <Check size={16} /> Individual member
          </button>
          <button
            type="button"
            className={clockForm.mode === 'crew' ? '' : 'ghost'}
            onClick={() => setClockForm({ ...clockForm, mode: 'crew', memberId: '' })}
          >
            <Users size={16} /> Entire crew
          </button>
        </div>
        <div className="timesheet-clock-grid">
          <label className="field">
            <span>Crew</span>
            <select value={clockForm.crewId} onChange={(event) => setClockForm({ ...clockForm, crewId: event.target.value, memberId: '' })}>
              <option value="">Select crew</option>
              {data.crews.map((crew) => <option key={crew.id} value={crew.id}>{crew.name}</option>)}
            </select>
          </label>
          {clockForm.mode === 'member' ? (
            <label className="field">
              <span>Member</span>
              <select value={clockForm.memberId} onChange={(event) => setClockForm({ ...clockForm, memberId: event.target.value })}>
                <option value="">Select member</option>
                {selectedClockMembers.map((member) => (
                  <option key={member.id} value={member.id}>{member.name}{member.role ? ` - ${member.role}` : ''}</option>
                ))}
              </select>
            </label>
          ) : (
            <div className="timesheet-crew-summary">
              <span>Crew members</span>
              <strong>{selectedClockMembers.length}</strong>
            </div>
          )}
        </div>
        <div className="time-actions">
          <button className="punch-button punch-in" onClick={punchInLive} disabled={!canPunchIn}>
            Punch In
          </button>
          <button className="punch-button punch-out" onClick={punchOutLive} disabled={!canPunchOut}>
            Punch Out
          </button>
        </div>
      </div>

      {showAddForm && <div className="card">
        <div className="section-head">
          <div>
            <h3>Add timesheet</h3>
            <span>Create time for an entire crew or one individual member</span>
          </div>
        </div>
        <div className="timesheet-entry-mode" role="group" aria-label="Timesheet entry type">
          <button
            type="button"
            className={form.mode === 'member' ? '' : 'ghost'}
            onClick={() => setForm({ ...form, mode: 'member' })}
          >
            <Check size={16} /> Individual member
          </button>
          <button
            type="button"
            className={form.mode === 'crew' ? '' : 'ghost'}
            onClick={() => setForm({ ...form, mode: 'crew', memberId: '' })}
          >
            <Users size={16} /> Entire crew
          </button>
        </div>
        <div className="form-grid compact-grid">
          <label className="field">
            <span>Crew</span>
            <select value={form.crewId} onChange={(e) => setForm({ ...form, crewId: e.target.value, memberId: '' })}>
              <option value="">Select crew</option>
              {data.crews.map((crew) => <option key={crew.id} value={crew.id}>{crew.name}</option>)}
            </select>
          </label>
          {form.mode === 'member' ? <label className="field">
            <span>Member</span>
            <select value={form.memberId} onChange={(e) => setForm({ ...form, memberId: e.target.value })}>
              <option value="">Select member</option>
              {selectedCrewMembers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </label> : <div className="timesheet-crew-summary">
            <span>Members included</span>
            <strong>{selectedCrewMembers.length}</strong>
          </div>}
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
        <div className="timesheet-form-actions">
          <button onClick={addManualTimesheet} disabled={!canAddTimesheet}>
            {form.mode === 'crew' ? 'Create crew timesheets' : 'Create member timesheet'}
          </button>
          <button className="ghost" onClick={() => setShowAddForm(false)}>Cancel</button>
        </div>
      </div>}

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
          <div className="empty-state">
            <Clock3 size={24} />
            <h3>No timesheets yet</h3>
            <p>Completed crew sessions will appear here for review.</p>
            <button type="button" onClick={() => setShowAddForm(true)}>
              <Plus size={18} /> Add timesheet
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
