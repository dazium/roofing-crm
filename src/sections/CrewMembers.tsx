import { useMemo, useState } from 'react';
import type { AppData, CrewMember } from '../types';
import { badgeTone, uid } from '../lib';

interface CrewMemberForm {
  id?: string;
  name: string;
  role?: string;
  phone?: string;
  email?: string;
  notes?: string;
}

const emptyCrewMemberForm: CrewMemberForm = {
  name: '',
  role: '',
  phone: '',
  email: '',
  notes: '',
};

export const CrewMembers: React.FC<{
  data: AppData;
  setData: React.Dispatch<React.SetStateAction<AppData>>;
}> = ({ data, setData }) => {
  const [crewMemberForm, setCrewMemberForm] = useState<CrewMemberForm>(emptyCrewMemberForm);
  const [editingCrewMemberId, setEditingCrewMemberId] = useState<string | null>(null);

  const selectedCrewMember = useMemo(
    () => data.crewMembers?.find((member) => member.id === editingCrewMemberId) ?? null,
    [data.crewMembers, editingCrewMemberId]
  );

  function resetForm() {
    setCrewMemberForm(emptyCrewMemberForm);
    setEditingCrewMemberId(null);
  }

  function saveCrewMember() {
    if (!crewMemberForm.name.trim()) return;

    const crewMember: CrewMember = {
      id: crewMemberForm.id ?? uid(),
      name: crewMemberForm.name.trim(),
      role: crewMemberForm.role?.trim() || undefined,
      phone: crewMemberForm.phone?.trim() || undefined,
      email: crewMemberForm.email?.trim() || undefined,
      notes: crewMemberForm.notes?.trim() || undefined,
    };

    if (editingCrewMemberId) {
      setData((prev) => ({
        ...prev,
        crewMembers: prev.crewMembers?.map((member) =>
          member.id === editingCrewMemberId ? crewMember : member
        ) ?? [crewMember],
      }));
    } else {
      setData((prev) => ({
        ...prev,
        crewMembers: [crewMember, ...(prev.crewMembers ?? [])],
      }));
    }
    resetForm();
  }

  function startEdit(crewMember: CrewMember) {
    setEditingCrewMemberId(crewMember.id);
    setCrewMemberForm({
      id: crewMember.id,
      name: crewMember.name,
      role: crewMember.role ?? '',
      phone: crewMember.phone ?? '',
      email: crewMember.email ?? '',
      notes: crewMember.notes ?? '',
    });
  }

  function deleteCrewMember(memberId: string) {
    const member = data.crewMembers?.find((entry) => entry.id === memberId);
    const confirmed = window.confirm(
      `Delete crew member "${member?.name ?? 'this member'}"?`
    );
    if (!confirmed) return;

    setData((prev) => ({
      ...prev,
      crewMembers: prev.crewMembers?.filter((member) => member.id !== memberId) ?? [],
    }));
    if (editingCrewMemberId === memberId) {
      resetForm();
    }
  }

  const activeMembers = data.crewMembers?.filter(
    (member) => !(member.notes?.includes('Inactive') ?? false)
  ).length ?? 0;

  return (
    <section className="content-grid two-col">
      <div className="column-stack">
        <div className="card">
          <div className="section-head">
            <h3>
              {editingCrewMemberId
                ? `Edit crew member: ${selectedCrewMember?.name ?? ''}`
                : 'Crew member management'}
            </h3>
            <span>Manage individual crew member profiles, certifications, and contact information</span>
          </div>
          <div className="form-grid compact-grid">
            <label className="field">
              <span>Name</span>
              <input
                value={crewMemberForm.name}
                onChange={(event) =>
                  setCrewMemberForm({ ...crewMemberForm, name: event.target.value })}
                placeholder="John Smith"
              />
            </label>
            <label className="field">
              <span>Role/Position</span>
              <input
                value={crewMemberForm.role ?? ''}
                onChange={(event) =>
                  setCrewMemberForm({
                    ...crewMemberForm,
                    role: event.target.value || undefined,
                  })}
                placeholder="Foreman, Journeyman, Apprentice"
              />
            </label>
            <div className="split-grid">
              <label className="field">
                <span>Phone</span>
                <input
                  value={crewMemberForm.phone ?? ''}
                  onChange={(event) =>
                    setCrewMemberForm({
                      ...crewMemberForm,
                      phone: event.target.value || undefined,
                    })}
                  placeholder="(519) 555-0100"
                />
              </label>
              <label className="field">
                <span>Email</span>
                <input
                  value={crewMemberForm.email ?? ''}
                  onChange={(event) =>
                    setCrewMemberForm({
                      ...crewMemberForm,
                      email: event.target.value || undefined,
                    })}
                  placeholder="johnsmith@email.com"
                />
              </label>
            </div>
            <label className="field compact-textarea">
              <span>Notes & Certifications</span>
              <textarea
                value={crewMemberForm.notes ?? ''}
                onChange={(event) =>
                  setCrewMemberForm({
                    ...crewMemberForm,
                    notes: event.target.value || undefined,
                  })}
                placeholder="Licenses, certifications, special skills, availability constraints..."
              />
            </label>
            <div className="hero-actions">
              <button onClick={saveCrewMember}>
                {editingCrewMemberId ? 'Save member changes' : 'Add crew member'}
              </button>
              {editingCrewMemberId ? (
                <button className="ghost" onClick={resetForm}>
                  Cancel edit
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="column-stack">
        <div className="card">
          <div className="section-head">
            <h3>Crew member directory</h3>
            <span>
              {activeMembers} active of {data.crewMembers?.length ?? 0} total members
            </span>
          </div>
          <div className="list-grid">
            {(data.crewMembers ?? []).length ? (
              data.crewMembers!.map((member) => (
                <div key={member.id} className="stack-item inspection-card">
                  <div className="stack-item-top">
                    <strong>{member.name}</strong>
                    <span className={`pill pill-${badgeTone(
                      member.notes?.includes('Inactive') ? 'Inactive' : 'Active'
                    )}`}>
                      {member.notes?.includes('Inactive') ? 'Inactive' : 'Active'}
                    </span>
                  </div>
                  <p>
                    {member.role ? `Role: ${member.role}` : 'Role not specified'}
                  </p>
                  <div className="crew-member-details">
                    {member.phone ? (
                      <span>
                        <span>📞 </span>{member.phone}
                      </span>
                    ) : null}
                    {member.email ? (
                      <span>
                        <span>📧 </span>{member.email}
                      </span>
                    ) : null}
                  </div>
                  {member.notes && !member.notes.includes('Inactive') ? (
                    <p>{member.notes}</p>
                  ) : null}
                  <div className="hero-actions">
                    <button className="ghost" onClick={() => startEdit(member)}>
                      Edit
                    </button>
                    <button className="ghost danger" onClick={() => deleteCrewMember(member.id)}>
                      Delete
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty">
                No crew members yet. Add your first crew member to start building your team directory.
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
