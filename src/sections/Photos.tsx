import { useMemo, useState } from 'react';
import type { AppData, PhotoCategory } from '../types';
import { badgeTone, formatBytes } from '../lib';

interface PhotosProps {
  data: AppData;
  selectedCustomerId: string | null;
  selectCustomer: (customerId: string | null, nextData?: AppData) => void;
  selectedJobId: string | null;
  selectJob: (jobId: string | null, nextData?: AppData) => void;
  setData: React.Dispatch<React.SetStateAction<AppData>>;
  photoCategory: PhotoCategory;
  setPhotoCategory: React.Dispatch<React.SetStateAction<PhotoCategory>>;
  photoLabel: string;
  setPhotoLabel: React.Dispatch<React.SetStateAction<string>>;
  handlePhotoUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  removeInspectionPhoto: (photoId: string) => void;
  galleryInputRef: React.RefObject<HTMLInputElement | null>;
  cameraInputRef: React.RefObject<HTMLInputElement | null>;
  setView: React.Dispatch<React.SetStateAction<import('../types').View>>;
}

export const Photos: React.FC<PhotosProps> = ({
  data,
  selectedCustomerId,
  selectCustomer,
  selectedJobId,
  selectJob,
  setData,
  photoCategory,
  setPhotoCategory,
  photoLabel,
  setPhotoLabel,
  handlePhotoUpload,
  removeInspectionPhoto,
  galleryInputRef,
  cameraInputRef,
  setView,
}) => {
  const [linkPhotoId, setLinkPhotoId] = useState('');
  const [linkDamageId, setLinkDamageId] = useState('');
  const selectedCustomer = data.customers.find((customer) => customer.id === selectedCustomerId) ?? null;
  const selectedInspection = data.inspections.find((inspection) => inspection.customerId === selectedCustomerId) ?? null;
  const selectedPhotos = selectedInspection?.photos ?? [];
  const totalPhotoBytes = selectedPhotos.reduce((sum, photo) => sum + (photo.sizeBytes ?? 0), 0);
  const projectDamages = data.damages.filter((damage) => {
    if (selectedJobId) return damage.jobId === selectedJobId;
    if (selectedCustomerId) return damage.customerId === selectedCustomerId;
    return false;
  });

  const linkedDamageByPhoto = useMemo(() => {
    const lookup = new Map<string, string[]>();
    for (const damage of data.damages) {
      for (const photoId of damage.linkedPhotoIds) {
        lookup.set(photoId, [...(lookup.get(photoId) ?? []), `${damage.category} (${damage.severity})`]);
      }
    }
    return lookup;
  }, [data.damages]);

  const photosByCategory = selectedPhotos.reduce<Record<PhotoCategory, number>>((acc, photo) => {
    acc[photo.category] += 1;
    return acc;
  }, { Before: 0, Damage: 0, Progress: 0, After: 0 });

  const selectedLinkDamage = data.damages.find((damage) => damage.id === linkDamageId) ?? null;
  const linkAlreadyExists = Boolean(selectedLinkDamage && linkPhotoId && selectedLinkDamage.linkedPhotoIds.includes(linkPhotoId));

  function applyPhotoDamageLink() {
    if (!linkPhotoId || !linkDamageId) return;
    setData((prev) => ({
      ...prev,
      damages: prev.damages.map((damage) => damage.id === linkDamageId
        ? {
            ...damage,
            linkedPhotoIds: damage.linkedPhotoIds.includes(linkPhotoId)
              ? damage.linkedPhotoIds
              : [...damage.linkedPhotoIds, linkPhotoId],
            updatedAt: new Date().toISOString(),
          }
        : damage),
    }));
  }

  function removePhotoDamageLink() {
    if (!linkPhotoId || !linkDamageId) return;
    setData((prev) => ({
      ...prev,
      damages: prev.damages.map((damage) => damage.id === linkDamageId
        ? {
            ...damage,
            linkedPhotoIds: damage.linkedPhotoIds.filter((photoId) => photoId !== linkPhotoId),
            updatedAt: new Date().toISOString(),
          }
        : damage),
    }));
  }

  return (
    <section className="content-grid two-col">
      <div className="column-stack">
        <div className="card">
          <div className="section-head">
            <h3>Photo documentation</h3>
            <span>Adapted from Rooftop Renovators photo gallery workflow</span>
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
                <option value="">No project selected</option>
                {data.jobs.filter((job) => !selectedCustomerId || job.customerId === selectedCustomerId).map((job) => (
                  <option key={job.id} value={job.id}>
                    {job.title}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {selectedCustomer ? (
            <div className="form-grid compact-grid">
              <div className="status-note">
                Photos are saved with the inspection record for this customer, so they stay available offline, in backups, and for damage linking.
              </div>
              <div className="mini-stats-grid">
                <div className="mini-stat-card">
                  <span>Photos</span>
                  <strong>{selectedPhotos.length}</strong>
                </div>
                <div className="mini-stat-card">
                  <span>Storage</span>
                  <strong>{formatBytes(totalPhotoBytes)}</strong>
                </div>
                <div className="mini-stat-card">
                  <span>Linked to damages</span>
                  <strong>{selectedPhotos.filter((photo) => linkedDamageByPhoto.has(photo.id)).length}</strong>
                </div>
              </div>

              <div className="split-grid">
                <label className="field field-compact">
                  <span>Photo category</span>
                  <select value={photoCategory} onChange={(event) => setPhotoCategory(event.target.value as PhotoCategory)}>
                    <option>Before</option>
                    <option>Damage</option>
                    <option>Progress</option>
                    <option>After</option>
                  </select>
                </label>
                <label className="field">
                  <span>Photo label</span>
                  <input value={photoLabel} onChange={(event) => setPhotoLabel(event.target.value)} placeholder="Before front slope, hail hit near vent..." />
                </label>
              </div>

              <div className="hero-actions">
                <button className="ghost" onClick={() => cameraInputRef.current?.click()}>Open camera</button>
                <button className="ghost" onClick={() => galleryInputRef.current?.click()}>Upload from gallery</button>
                <button className="ghost" onClick={() => setView('damages')}>Link photos to damages</button>
              </div>
              <input ref={cameraInputRef} className="hidden-input" type="file" accept="image/*" capture="environment" onChange={handlePhotoUpload} />
              <input ref={galleryInputRef} className="hidden-input" type="file" accept="image/*" onChange={handlePhotoUpload} />
            </div>
          ) : (
            <div className="empty">Select a customer to upload and review job photos.</div>
          )}
        </div>

        <div className="card">
          <div className="section-head">
            <h3>Category coverage</h3>
            <span>Before, damage, progress, and after sets</span>
          </div>
          <div className="mini-stats-grid">
            {Object.entries(photosByCategory).map(([category, count]) => (
              <div key={category} className="mini-stat-card">
                <span>{category}</span>
                <strong>{count}</strong>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="section-head">
            <h3>Damage links</h3>
            <span>Explicit photo-to-damage attachment</span>
          </div>
          {selectedPhotos.length && projectDamages.length ? (
            <div className="form-grid compact-grid">
              <div className="split-grid">
                <label className="field">
                  <span>Photo</span>
                  <select value={linkPhotoId} onChange={(event) => setLinkPhotoId(event.target.value)}>
                    <option value="">Choose photo</option>
                    {selectedPhotos.map((photo) => (
                      <option key={photo.id} value={photo.id}>{photo.label} ({photo.category})</option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Damage</span>
                  <select value={linkDamageId} onChange={(event) => setLinkDamageId(event.target.value)}>
                    <option value="">Choose damage</option>
                    {projectDamages.map((damage) => (
                      <option key={damage.id} value={damage.id}>{damage.category} - {damage.location || damage.severity}</option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="status-note">
                {linkAlreadyExists ? 'This photo is already linked to the selected damage.' : 'Select a photo and damage record to create a documentation link.'}
              </div>
              <div className="hero-actions">
                <button onClick={applyPhotoDamageLink} disabled={!linkPhotoId || !linkDamageId || linkAlreadyExists}>Link photo</button>
                <button className="ghost danger" onClick={removePhotoDamageLink} disabled={!linkPhotoId || !linkDamageId || !linkAlreadyExists}>Remove link</button>
              </div>
            </div>
          ) : (
            <div className="empty">Add photos and damage records for this customer or project before linking.</div>
          )}
        </div>
      </div>

      <div className="column-stack">
        <div className="card">
          <div className="section-head">
            <h3>{selectedCustomer ? `${selectedCustomer.name} gallery` : 'Photo gallery'}</h3>
            <span>{selectedPhotos.length} saved photo(s)</span>
          </div>
          <div className="photo-grid photo-gallery-grid">
            {selectedPhotos.length ? selectedPhotos.map((photo) => {
              const linkedDamages = linkedDamageByPhoto.get(photo.id) ?? [];
              return (
                <div key={photo.id} className="photo-card">
                  <img src={photo.dataUrl} alt={photo.label} />
                  <div className="photo-meta">
                    <strong>{photo.label}</strong>
                    <span className={`pill pill-${badgeTone(photo.category)}`}>{photo.category}</span>
                    <span>{photo.width && photo.height ? `${photo.width} x ${photo.height}` : 'Optimized image'} · {formatBytes(photo.sizeBytes ?? 0)}</span>
                    <span>{linkedDamages.length ? `Linked: ${linkedDamages.join(', ')}` : 'Not linked to a damage record'}</span>
                  </div>
                  <div className="photo-actions">
                    <button className="ghost danger" onClick={() => removeInspectionPhoto(photo.id)}>Remove photo</button>
                  </div>
                </div>
              );
            }) : (
              <div className="empty">No photos yet. Capture field photos from this page or the Inspection page.</div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
