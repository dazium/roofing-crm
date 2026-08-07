import { Check, Clock3 } from 'lucide-react';
import type { AppData, TimeEntry } from '../types';

type Props = { data: AppData; onUpdate: (data: AppData) => void };
const dayKey = (date: Date) => date.toISOString().slice(0, 10);
const hours = (minutes: number) => `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
const workedMinutes = (entry: TimeEntry) => entry.punchOutTime ? entry.durationMinutes || 0 : 0;

export function Timesheets({ data, onUpdate }: Props) {
  const monday = new Date();
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - (monday.getDay() || 7) + 1);
  const days = Array.from({ length: 7 }, (_, index) => { const date = new Date(monday); date.setDate(monday.getDate() + index); return date; });
  const keys = new Set(days.map(dayKey));
  const rows = data.crews.flatMap((crew) => crew.members.map((member) => { const entries = data.timeLogs.flatMap((log) => log.entries).filter((entry) => entry.memberId === member.id && keys.has(entry.date)); return { crew, member, entries, total: entries.reduce((sum, entry) => sum + workedMinutes(entry), 0) }; })).filter((row) => row.entries.length);
  const total = rows.reduce((sum, row) => sum + row.total, 0);
  const pending = rows.reduce((sum, row) => sum + row.entries.filter((entry) => entry.punchOutTime && !entry.approved).length, 0);
  const approve = (id: string) => onUpdate({ ...data, timeLogs: data.timeLogs.map((log) => ({ ...log, entries: log.entries.map((entry) => entry.id === id ? { ...entry, approved: true } : entry) })) });

  return <section className="workspace timesheets-page"><div className="section-heading"><div><span className="eyebrow">Crew operations</span><h1>Timesheets</h1><p>Review and approve this week's worked hours.</p></div><strong>{days[0].toLocaleDateString([], { month: 'short', day: 'numeric' })} - {days[6].toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</strong></div><div className="metric-row"><div className="ui-metric"><span>Total worked</span><strong>{hours(total)}</strong></div><div className="ui-metric"><span>Team members</span><strong>{rows.length}</strong></div><div className="ui-metric"><span>Awaiting approval</span><strong>{pending}</strong></div></div><div className="card timesheet-card">{rows.length ? rows.map((row) => <div className="timesheet-row" key={row.member.id}><div className="timesheet-person"><strong>{row.member.name}</strong><span>{row.member.role || 'Crew member'} · {row.crew.name}</span></div><div className="timesheet-days">{days.map((day) => { const minutes = row.entries.filter((entry) => entry.date === dayKey(day)).reduce((sum, entry) => sum + workedMinutes(entry), 0); return <div className="timesheet-day" key={dayKey(day)}><small>{day.toLocaleDateString([], { weekday: 'short' })}</small><b>{minutes ? hours(minutes) : '-'}</b></div>; })}</div><strong>{hours(row.total)}</strong><div>{row.entries.filter((entry) => entry.punchOutTime && !entry.approved).map((entry) => <button className="approve-button" key={entry.id} onClick={() => approve(entry.id)}><Check size={15} /> Approve</button>)}</div></div>) : <div className="empty-state"><Clock3 size={24} /><h3>No timesheets yet</h3><p>Completed crew sessions will appear here for review.</p></div>}</div></section>;
}
