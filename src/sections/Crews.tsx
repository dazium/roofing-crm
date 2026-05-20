import { useMemo, useState } from 'react';
import type { AppData, Crew, CrewMember, CrewStatus } from '../types';
import { badgeTone, uid } from '../lib';

interface CrewForm {
  name: string;
  crewLead: string;
  members: CrewMember[];
  phone: string;
  email: string;
  status: CrewStatus;
  notes: string;
}

interface CrewsProps {
  data: AppData;
  setData: React.Dispatch<React.SetStateAction<AppData>>;
}

const emptyCrewForm: CrewForm = {
  name: '',
  crewLead: '',
  members: [],
  phone: '',
  email: '',
  status: 'Active',
  notes: '',
};

export const Crews: React.FC<CrewsProps> = ({ data, setData }) => {
  const [crewForm, setCrewForm] = useState<CrewForm>(emptyCrewForm);
  const [editingCrewId, setEditingCrewId] = useState<string | null>(null);
  const [memberForm, setMemberForm] = useState({ name: '', role: '', phone: '', email: '', notes: '' });

  const selectedCrew = useMemo(
    () => data.crews.find((crew) => crew.id === editingCrewId) ?? null,
    [data.crews, editingCrewId],
  );

  function resetForm() {
    setCrewForm(emptyCrewForm);
    setMemberForm({ name: '', role: '', phone: '', email: '', notes: '' });
    setEditingCrewId(null);
  }

  function cleanMembers(members: CrewMember[]) {
    return members
      .map((member) => ({
        ...member,
        name: member.name.trim(),
        role: member.role?.trim() || undefined,
        phone: member.phone?.trim() || undefined,
        email: member.email?.trim() || undefined,
        notes: member.notes?.trim() || undefined,
      }))
      .filter((member) => member.name);
  }

  function addMember() {
    if (!memberForm.name.trim()) return;
    const newMember: CrewMember = {
      id: uid(),
      name: memberForm.name.trim(),
      role: memberForm.role.trim() || undefined,
      phone: memberForm.phone.trim() || undefined,
      email: memberForm.email.trim() || undefined,
      notes: memberForm.notes.trim() || undefined,
    };
    setCrewForm((prev) => ({ ...prev, members: [...prev.members, newMember] }));
    setMemberForm({ name: '', role: '', phone: '', email: '', notes: '' });
  }

  function removeMember(memberId: string) {
    setCrewForm((prev) => ({ ...prev, members: prev.members.filter((member) => member.id !== memberId) }));
  }

  function saveCrew() {
    if (!crewForm.name.trim()) return;
    const members = cleanMembers(crewForm.members);

    if (editingCrewId) {
      setData((prev) => ({
        ...prev,
        crews: prev.crews.map((crew) => crew.id === editingCrewId
          ? {
              ...crew,
              name: crewForm.name.trim(),
              crewLead: crewForm.crewLead.trim() || undefined,
              members,
              phone: crewForm.phone.trim() || undefined,
              email: crewForm.email.trim() || undefined,
              status: crewForm.status,
              notes: crewForm.notes.trim() || undefined,
              updatedAt: new Date().toISOString(),
            }
          : crew),
      }));
      resetForm();
      return;
    }

    const newCrew: Crew = {
      id: uid(),
      name: crewForm.name.trim(),
      crewLead: crewForm.crewLead.trim() || undefined,
      members,
      phone: crewForm.phone.trim() || undefined,
      email: crewForm.email.trim() || undefined,
      status: crewForm.status,
      notes: crewForm.notes.trim() || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setData((prev) => ({
      ...prev,
      crews: [newCrew, ...prev.crews],
    }));
    resetForm();
  }

  function startEdit(crew: Crew) {
    setEditingCrewId(crew.id);
    setCrewForm({
      name: crew.name,
      crewLead: crew.crewLead ?? '',
      members: crew.members ?? [],
      phone: crew.phone ?? '',
      email: crew.email ?? '',
      status: crew.status,
      notes: crew.notes ?? '',
    });
  }

  function deleteCrew(crewId: string) {
    const crew = data.crews.find((entry) => entry.id === crewId);
    const confirmed = window.confirm(`Delete crew "${crew?.name ?? 'this crew'}"?`);
    if (!confirmed) return;

    setData((prev) => ({
      ...prev,
      crews: prev.crews.filter((crew) => crew.id !== crewId),
    }));
    if (editingCrewId === crewId) {
      resetForm();
    }
  }

  const activeCrews = data.crews.filter((crew) => crew.status === 'Active').length;

  return (
    <section className="content-grid two-col">
      <div className="column-stack">
        <div className="card">
          <div className="section-head">
            <h3>{editingCrewId ? `Edit crew: ${selectedCrew?.name ?? ''}` : 'Crew management'}</h3>
            <span>Imported from Rooftop Renovators: dedicated crew records</span>
          </div>
          <div className="form-grid compact-grid">
            <label className="field">
              <span>Crew name</span>
              <input value={crewForm.name} onChange={(event) => setCrewForm({ ...crewForm, name: event.target.value })} placeholder="Crew Alpha" />
            </label>
            <div className="split-grid">
              <label className="field">
                <span>Crew lead</span>
                <input value={crewForm.crewLead} onChange={(event) => setCrewForm({ ...crewForm, crewLead: event.target.value })} placeholder="Lead name" />
              </label>
              <label className="field">
                <span>Status</span>
                <select value={crewForm.status} onChange={(event) => setCrewForm({ ...crewForm, status: event.target.value as CrewStatus })}>
                  <option>Active</option>
                  <option>Inactive</option>
                </select>
              </label>
            </div>
            <div className="split-grid">
              <label className="field">
                <span>Phone</span>
                <input value={crewForm.phone} onChange={(event) => setCrewForm({ ...crewForm, phone: event.target.value })} placeholder="(519) 555-2201" />
              </label>
              <label className="field">
                <span>Email</span>
                <input value={crewForm.email} onChange={(event) => setCrewForm({ ...crewForm, email: event.target.value })} placeholder="crew@example.com" />
              </label>
            </div>
            <label className="field compact-textarea">
              <span>Notes</span>
              <textarea value={crewForm.notes} onChange={(event) => setCrewForm({ ...crewForm, notes: event.target.value })} placeholder="Certifications, preferred work types, constraints..." />
            </label>
            <div className="section-block">
              <div className="section-subhead">
                <div>
                  <h4>Crew members</h4>
                  <span>{crewForm.members.length} member{crewForm.members.length === 1 ? '' : 's'} staged for this crew</span>
                </div>
              </div>
              <div className="crew-member-form">
                <input value={memberForm.name} onChange={(event) => setMemberForm({ ...memberForm, name: event.target.value })} placeholder="Member name" />
                <input value={memberForm.role} onChange={(event) => setMemberForm({ ...memberForm, role: event.target.value })} placeholder="Role" />
                <input value={memberForm.phone} onChange={(event) => setMemberForm({ ...memberForm, phone: event.target.value })} placeholder="Phone" />
                <input value={memberForm.email} onChange={(event) => setMemberForm({ ...memberForm, email: event.target.value })} placeholder="Email" />
                <input value={memberForm.notes} onChange={(event) => setMemberForm({ ...memberForm, notes: event.target.value })} placeholder="Notes" />
                <button type="button" className="ghost" onClick={addMember}>Add member</button>
              </div>
              <div className="crew-member-list">
                {crewForm.members.length ? crewForm.members.map((member) => (
                  <div key={member.id} className="crew-member-row">
                    <div>
                      <strong>{member.name}</strong>
                      <span>{[member.role, member.phone, member.email].filter(Boolean).join(' · ') || 'No details yet'}</span>
                      {member.notes ? <small>{member.notes}</small> : null}
                    </div>
                    <button type="button" className="ghost danger" onClick={() => removeMember(member.id)}>Remove</button>
                  </div>
                )) : <div className="empty">Add members so Crew Mode and scheduling have a real roster.</div>}
              </div>
            </div>
            <div className="hero-actions">
              <button onClick={saveCrew}>{editingCrewId ? 'Save crew changes' : 'Add crew'}</button>
              {editingCrewId ? <button className="ghost" onClick={resetForm}>Cancel edit</button> : null}
            </div>
          </div>
        </div>
      </div>

      <div className="column-stack">
        <div className="card">
          <div className="section-head">
            <h3>Crew roster</h3>
            <span>{activeCrews} active of {data.crews.length} total</span>
          </div>
          <div className="list-grid">
            {data.crews.length ? data.crews.map((crew) => (
              <div key={crew.id} className="stack-item inspection-card">
                <div className="stack-item-top">
                  <strong>{crew.name}</strong>
                  <span className={`pill pill-${badgeTone(crew.status)}`}>{crew.status}</span>
                </div>
                <p>{crew.crewLead ? `Lead: ${crew.crewLead}` : 'No crew lead assigned yet'}</p>
                <small>{crew.notes || 'No crew notes yet.'}</small>
                <div className="crew-roster-list">
                  {(crew.members ?? []).length ? (crew.members ?? []).map((member) => (
                    <span key={member.id}>{member.name}{member.role ? ` - ${member.role}` : ''}</span>
                  )) : <span>No members added yet</span>}
                </div>
                <div className="inspection-metrics">
                  <span>{crew.phone || 'No phone'}</span>
                  <span>{crew.email || 'No email'}</span>
                  <span>{(crew.members ?? []).length} member{(crew.members ?? []).length === 1 ? '' : 's'}</span>
                </div>
                <div className="hero-actions">
                  <button className="ghost" onClick={() => startEdit(crew)}>Edit</button>
                  <button className="ghost danger" onClick={() => deleteCrew(crew.id)}>Delete</button>
                </div>
              </div>
            )) : <div className="empty">No crews yet. Add your first crew to start scheduling by team.</div>}
          </div>
        </div>
      </div>
    </section>
  );
};
