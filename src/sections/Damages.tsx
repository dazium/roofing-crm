import { useMemo, useState } from 'react';
import type { AppData, DamageCategory, DamageMaterialItem, DamageRecord, DamageSeverity } from '../types';
import { badgeTone, money, uid } from '../lib';

interface DamageForm {
  category: DamageCategory;
  severity: DamageSeverity;
  description: string;
  location: string;
  estimatedCost: string;
  linkedPhotoIds: string[];
  materials: DamageMaterialItem[];
}

interface DamagesProps {
  data: AppData;
  setData: React.Dispatch<React.SetStateAction<AppData>>;
  selectedCustomerId: string | null;
  selectCustomer: (customerId: string | null, nextData?: AppData) => void;
  selectedJobId: string | null;
  selectJob: (jobId: string | null, nextData?: AppData) => void;
}

const emptyForm: DamageForm = {
  category: 'Other',
  severity: 'Moderate',
  description: '',
  location: '',
  estimatedCost: '',
  linkedPhotoIds: [],
  materials: [],
};

export const Damages: React.FC<DamagesProps> = ({
  data,
  setData,
  selectedCustomerId,
  selectCustomer,
  selectedJobId,
  selectJob,
}) => {
  const [form, setForm] = useState<DamageForm>(emptyForm);
  const [editingDamageId, setEditingDamageId] = useState<string | null>(null);

  const selectedInspection = data.inspections.find((inspection) => inspection.customerId === selectedCustomerId) ?? null;

  const availablePhotos = selectedInspection?.photos ?? [];
  const filteredDamages = useMemo(() => {
    return data.damages.filter((damage) => {
      if (selectedJobId) return damage.jobId === selectedJobId;
      if (selectedCustomerId) return damage.customerId === selectedCustomerId;
      return true;
    });
  }, [data.damages, selectedCustomerId, selectedJobId]);

  function resetForm() {
    setEditingDamageId(null);
    setForm(emptyForm);
  }

  function addMaterialLine() {
    const firstMaterial = data.materialPrices[0]?.id;
    if (!firstMaterial) return;
    setForm((prev) => ({
      ...prev,
      materials: [...prev.materials, { materialId: firstMaterial, quantity: 1 }],
    }));
  }

  function updateMaterialLine(index: number, next: DamageMaterialItem) {
    setForm((prev) => ({
      ...prev,
      materials: prev.materials.map((item, i) => i === index ? next : item),
    }));
  }

  function removeMaterialLine(index: number) {
    setForm((prev) => ({
      ...prev,
      materials: prev.materials.filter((_, i) => i !== index),
    }));
  }

  function togglePhoto(photoId: string) {
    setForm((prev) => ({
      ...prev,
      linkedPhotoIds: prev.linkedPhotoIds.includes(photoId)
        ? prev.linkedPhotoIds.filter((id) => id !== photoId)
        : [...prev.linkedPhotoIds, photoId],
    }));
  }

  function saveDamage() {
    if (!selectedCustomerId || !form.description.trim()) return;

    const materials = form.materials
      .map((item) => ({
        materialId: item.materialId,
        quantity: Number.isFinite(item.quantity) ? Math.max(0, item.quantity) : 0,
      }))
      .filter((item) => item.materialId && item.quantity > 0);

    const recordBase = {
      customerId: selectedCustomerId,
      jobId: selectedJobId ?? undefined,
      category: form.category,
      severity: form.severity,
      description: form.description.trim(),
      location: form.location.trim() || undefined,
      estimatedCost: form.estimatedCost.trim() ? Math.max(0, Number(form.estimatedCost) || 0) : undefined,
      linkedPhotoIds: form.linkedPhotoIds,
      materials,
      updatedAt: new Date().toISOString(),
    };

    if (editingDamageId) {
      setData((prev) => ({
        ...prev,
        damages: prev.damages.map((damage) => damage.id === editingDamageId ? { ...damage, ...recordBase } : damage),
      }));
      resetForm();
      return;
    }

    const newDamage: DamageRecord = {
      id: uid(),
      ...recordBase,
      createdAt: new Date().toISOString(),
    };

    setData((prev) => ({
      ...prev,
      damages: [newDamage, ...prev.damages],
    }));
    resetForm();
  }

  function beginEdit(damage: DamageRecord) {
    setEditingDamageId(damage.id);
    setForm({
      category: damage.category,
      severity: damage.severity,
      description: damage.description,
      location: damage.location ?? '',
      estimatedCost: damage.estimatedCost ? String(damage.estimatedCost) : '',
      linkedPhotoIds: [...damage.linkedPhotoIds],
      materials: damage.materials.map((item) => ({ ...item })),
    });
  }

  function deleteDamage(damageId: string) {
    const damage = data.damages.find((entry) => entry.id === damageId);
    const confirmed = window.confirm(`Delete damage record "${damage?.category ?? 'this record'}"?`);
    if (!confirmed) return;

    setData((prev) => ({
      ...prev,
      damages: prev.damages.filter((damage) => damage.id !== damageId),
    }));
    if (editingDamageId === damageId) resetForm();
  }

  return (
    <section className="content-grid two-col">
      <div className="column-stack">
        <div className="card">
          <div className="section-head">
            <h3>{editingDamageId ? 'Edit damage record' : 'Damage assessment'}</h3>
            <span>Imported from Rooftop Renovators: damage tracking + material allocation</span>
          </div>
          <div className="selection-grid">
            <label className="field">
              <span>Customer</span>
              <select value={selectedCustomerId ?? ''} onChange={(event) => selectCustomer(event.target.value || null)}>
                <option value="">Select customer</option>
                {data.customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Project</span>
              <select value={selectedJobId ?? ''} onChange={(event) => selectJob(event.target.value || null)}>
                <option value="">No project (customer only)</option>
                {data.jobs.filter((job) => !selectedCustomerId || job.customerId === selectedCustomerId).map((job) => (
                  <option key={job.id} value={job.id}>
                    {job.title}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {selectedCustomerId ? (
            <div className="form-grid compact-grid">
              <div className="split-grid">
                <label className="field">
                  <span>Category</span>
                  <select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value as DamageCategory })}>
                    <option>Missing Shingles</option>
                    <option>Flashing Damage</option>
                    <option>Leaks</option>
                    <option>Sagging</option>
                    <option>Rot</option>
                    <option>Moss/Algae</option>
                    <option>Hail Damage</option>
                    <option>Wind Damage</option>
                    <option>Other</option>
                  </select>
                </label>
                <label className="field">
                  <span>Severity</span>
                  <select value={form.severity} onChange={(event) => setForm({ ...form, severity: event.target.value as DamageSeverity })}>
                    <option>Minor</option>
                    <option>Moderate</option>
                    <option>Severe</option>
                  </select>
                </label>
              </div>
              <label className="field compact-textarea">
                <span>Description</span>
                <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Describe observed damage and scope." />
              </label>
              <div className="split-grid">
                <label className="field">
                  <span>Location</span>
                  <input value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} placeholder="Rear slope, chimney, valley..." />
                </label>
                <label className="field">
                  <span>Estimated cost</span>
                  <input type="number" min={0} value={form.estimatedCost} onChange={(event) => setForm({ ...form, estimatedCost: event.target.value })} placeholder="0.00" />
                </label>
              </div>

              <div className="section-block">
                <div className="section-subhead">
                  <h4>Material allocation</h4>
                  <span>Allocate materials needed for this damage item.</span>
                </div>
                <div className="list-grid">
                  {form.materials.map((item, index) => (
                    <div key={`${item.materialId}-${index}`} className="selection-grid">
                      <label className="field">
                        <span>Material</span>
                        <select
                          value={item.materialId}
                          onChange={(event) => updateMaterialLine(index, { ...item, materialId: event.target.value })}
                        >
                          {data.materialPrices.map((material) => (
                            <option key={material.id} value={material.id}>
                              {material.label} ({material.unit})
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="field">
                        <span>Quantity</span>
                        <input
                          type="number"
                          min={0}
                          value={item.quantity}
                          onChange={(event) => updateMaterialLine(index, { ...item, quantity: Math.max(0, Number(event.target.value) || 0) })}
                        />
                      </label>
                      <div className="hero-actions">
                        <button className="ghost danger" onClick={() => removeMaterialLine(index)}>Remove material</button>
                      </div>
                    </div>
                  ))}
                  <div className="hero-actions">
                    <button className="ghost" onClick={addMaterialLine}>Add material</button>
                  </div>
                </div>
              </div>

              <div className="section-block">
                <div className="section-subhead">
                  <h4>Linked photos</h4>
                  <span>Attach inspection photos to this damage record.</span>
                </div>
                {availablePhotos.length ? (
                  <div className="linked-record-list">
                    {availablePhotos.map((photo) => (
                      <label key={photo.id} className="linked-record-row">
                        <strong>
                          <input type="checkbox" checked={form.linkedPhotoIds.includes(photo.id)} onChange={() => togglePhoto(photo.id)} /> {photo.label}
                        </strong>
                        <span>{photo.category}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <div className="empty">No inspection photos available for this customer yet.</div>
                )}
              </div>

              <div className="hero-actions">
                <button onClick={saveDamage}>{editingDamageId ? 'Save damage' : 'Add damage record'}</button>
                {editingDamageId ? <button className="ghost" onClick={resetForm}>Cancel edit</button> : null}
              </div>
            </div>
          ) : (
            <div className="empty">Select a customer to start logging damage records.</div>
          )}
        </div>
      </div>

      <div className="column-stack">
        <div className="card">
          <div className="section-head">
            <h3>Damage records</h3>
            <span>{filteredDamages.length} in current scope</span>
          </div>
          <div className="list-grid">
            {filteredDamages.length ? filteredDamages.map((damage) => {
              const materialTotal = damage.materials.reduce((sum, item) => {
                const material = data.materialPrices.find((m) => m.id === item.materialId);
                return sum + ((material?.price ?? 0) * item.quantity);
              }, 0);

              return (
                <div key={damage.id} className="stack-item inspection-card">
                  <div className="stack-item-top">
                    <strong>{damage.category}</strong>
                    <span className={`pill pill-${badgeTone(damage.severity)}`}>{damage.severity}</span>
                  </div>
                  <p>{damage.location || 'No location specified'}</p>
                  <small>{damage.description}</small>
                  <div className="inspection-metrics">
                    <span>Materials: {damage.materials.length} item(s)</span>
                    <span>Estimated materials: {money(materialTotal)}</span>
                    <span>Photos: {damage.linkedPhotoIds.length}</span>
                  </div>
                  <div className="hero-actions">
                    <button className="ghost" onClick={() => beginEdit(damage)}>Edit</button>
                    <button className="ghost danger" onClick={() => deleteDamage(damage.id)}>Delete</button>
                  </div>
                </div>
              );
            }) : <div className="empty">No damage records yet in this scope.</div>}
          </div>
        </div>
      </div>
    </section>
  );
};
