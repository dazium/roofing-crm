import { useEffect, useMemo, useState } from 'react';
import type { AppData, View } from '../types';
import { badgeTone, money, openAddressInMaps, openEmailClient, openPhoneDialer } from '../lib';

interface CrewModeProps {
  data: AppData;
  selectedJobId: string | null;
  selectJob: (jobId: string | null, nextData?: AppData) => void;
  setView: React.Dispatch<React.SetStateAction<View>>;
  setPhotoCategory: React.Dispatch<React.SetStateAction<import('../types').PhotoCategory>>;
  setPhotoLabel: React.Dispatch<React.SetStateAction<string>>;
  cameraInputRef: React.RefObject<HTMLInputElement | null>;
  handlePhotoUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export const CrewMode: React.FC<CrewModeProps> = ({
  data,
  selectedJobId,
  selectJob,
  setView,
  setPhotoCategory,
  setPhotoLabel,
  cameraInputRef,
  handlePhotoUpload,
}) => {
  const initialCrewId = data.jobs.find((job) => job.id === selectedJobId)?.crewId ?? data.crews.find((crew) => crew.status === 'Active')?.id ?? data.crews[0]?.id ?? '';
  const [selectedCrewId, setSelectedCrewId] = useState(initialCrewId);
  const selectedCrew = data.crews.find((crew) => crew.id === selectedCrewId) ?? null;
  const assignedJobs = useMemo(
    () => data.jobs.filter((job) => job.crewId === selectedCrewId),
    [data.jobs, selectedCrewId],
  );
  const activeAssignedJobs = assignedJobs.filter((job) => job.status !== 'Complete' && job.status !== 'Paid');
  const selectedJob = data.jobs.find((job) => job.id === selectedJobId && job.crewId === selectedCrewId)
    ?? assignedJobs[0]
    ?? null;
  const customer = data.customers.find((entry) => entry.id === selectedJob?.customerId) ?? null;
  const inspection = data.inspections.find((entry) => entry.customerId === selectedJob?.customerId) ?? null;
  const damages = data.damages.filter((damage) => selectedJob ? damage.jobId === selectedJob.id || (!damage.jobId && damage.customerId === selectedJob.customerId) : false);
  const estimate = data.estimates.find((entry) => entry.jobId === selectedJob?.id) ?? null;
  const invoice = data.invoices.find((entry) => entry.jobId === selectedJob?.id) ?? null;
  const tasks = data.tasks.filter((task) => selectedJob ? task.jobId === selectedJob.id || (!task.jobId && task.customerId === selectedJob.customerId) : false);
  const linkedPhotoIds = new Set(damages.flatMap((damage) => damage.linkedPhotoIds));
  const relevantPhotos = inspection?.photos.filter((photo) => linkedPhotoIds.has(photo.id) || photo.category === 'Before' || photo.category === 'Progress' || photo.category === 'After') ?? [];

  useEffect(() => {
    if (selectedJob && selectedJob.id !== selectedJobId) {
      selectJob(selectedJob.id);
    }
  }, [selectJob, selectedJob, selectedJobId]);

  function openJob(jobId: string) {
    selectJob(jobId);
  }

  function captureProgressPhoto() {
    if (!selectedJob || !customer) return;
    setPhotoCategory('Progress');
    setPhotoLabel(`${selectedJob.title} progress`);
    cameraInputRef.current?.click();
  }

  return (
    <section className="content-grid two-col crew-mode-layout">
      <div className="column-stack">
        <div className="card crew-mode-panel">
          <div className="section-head">
            <h3>Crew Mode</h3>
            <span>Mobile-first job view adapted from Rooftop Renovators</span>
          </div>
          <label className="field">
            <span>Crew</span>
            <select value={selectedCrewId} onChange={(event) => setSelectedCrewId(event.target.value)}>
              {data.crews.map((crew) => (
                <option key={crew.id} value={crew.id}>
                  {crew.name} - {crew.status}
                </option>
              ))}
            </select>
          </label>
          {selectedCrew ? (
            <div className="mini-stats-grid">
              <div className="mini-stat-card">
                <span>Lead</span>
                <strong>{selectedCrew.crewLead ?? 'Unset'}</strong>
              </div>
              <div className="mini-stat-card">
                <span>Assigned</span>
                <strong>{assignedJobs.length}</strong>
              </div>
              <div className="mini-stat-card">
                <span>Active</span>
                <strong>{activeAssignedJobs.length}</strong>
              </div>
            </div>
          ) : (
            <div className="empty">Create a crew first, then assign projects to that crew.</div>
          )}
        </div>

        <div className="card crew-mode-panel">
          <div className="section-head">
            <h3>Assigned jobs</h3>
            <span>{assignedJobs.length} job(s)</span>
          </div>
          <div className="list-grid">
            {assignedJobs.length ? assignedJobs.map((job) => {
              const jobCustomer = data.customers.find((entry) => entry.id === job.customerId);
              return (
                <button key={job.id} className={`crew-job-card ${selectedJob?.id === job.id ? 'active' : ''}`} onClick={() => openJob(job.id)}>
                  <span className={`pill pill-${badgeTone(job.status)}`}>{job.status}</span>
                  <strong>{job.title}</strong>
                  <small>{jobCustomer?.name ?? 'Unknown customer'} - {job.scheduledFor || 'No date set'}</small>
                  <span>{jobCustomer?.address ?? 'No address'}</span>
                </button>
              );
            }) : (
              <div className="empty">No jobs assigned to this crew yet.</div>
            )}
          </div>
        </div>
      </div>

      <div className="column-stack">
        {selectedJob && customer ? (
          <>
            <div className="card crew-mode-panel crew-job-detail">
              <div className="section-head">
                <div>
                  <h3>{selectedJob.title}</h3>
                  <span>{customer.name}</span>
                </div>
                <span className={`pill pill-${badgeTone(selectedJob.priority)}`}>{selectedJob.priority}</span>
              </div>
              <div className="mini-stats-grid">
                <div className="mini-stat-card">
                  <span>Status</span>
                  <strong>{selectedJob.status}</strong>
                </div>
                <div className="mini-stat-card">
                  <span>Scheduled</span>
                  <strong>{selectedJob.scheduledFor || 'Unset'}</strong>
                </div>
                <div className="mini-stat-card">
                  <span>Photos</span>
                  <strong>{inspection?.photos.length ?? 0}</strong>
                </div>
              </div>
              <div className="crew-action-grid">
                <button className="ghost" onClick={() => openPhoneDialer(customer.phone)}>Call</button>
                <button className="ghost" onClick={() => openEmailClient(customer.email)}>Email</button>
                <button className="ghost" onClick={() => openAddressInMaps(customer.address)}>Map</button>
                <button className="ghost" onClick={captureProgressPhoto}>Progress photo</button>
              </div>
              <input ref={cameraInputRef} className="hidden-input" type="file" accept="image/*" capture="environment" onChange={handlePhotoUpload} />
              <div className="project-notes-box">{selectedJob.notes || 'No crew notes for this job yet.'}</div>
            </div>

            <div className="card crew-mode-panel">
              <div className="section-head">
                <h3>Field packet</h3>
                <span>Damage, tasks, and money summary</span>
              </div>
              <div className="linked-record-list">
                <div className="linked-record-row">
                  <strong>Address</strong>
                  <span>{customer.address || 'No address'}</span>
                </div>
                <div className="linked-record-row">
                  <strong>Inspection</strong>
                  <span>{inspection ? `${inspection.damageType} - ${inspection.urgency}` : 'No inspection saved'}</span>
                </div>
                <div className="linked-record-row">
                  <strong>Estimate</strong>
                  <span>{estimate ? money(estimate.totalPrice) : 'No estimate'}</span>
                </div>
                <div className="linked-record-row">
                  <strong>Invoice</strong>
                  <span>{invoice ? `${invoice.status} - ${money(invoice.balanceDue)} due` : 'No invoice'}</span>
                </div>
              </div>
            </div>

            <div className="card crew-mode-panel">
              <div className="section-head">
                <h3>Damages</h3>
                <span>{damages.length} record(s)</span>
              </div>
              <div className="list-grid">
                {damages.length ? damages.map((damage) => (
                  <div key={damage.id} className="stack-item inspection-card">
                    <div className="stack-item-top">
                      <strong>{damage.category}</strong>
                      <span className={`pill pill-${badgeTone(damage.severity)}`}>{damage.severity}</span>
                    </div>
                    <p>{damage.location || 'No location set'}</p>
                    <small>{damage.description}</small>
                    <div className="inspection-metrics">
                      <span>{damage.materials.length} material item(s)</span>
                      <span>{damage.linkedPhotoIds.length} linked photo(s)</span>
                    </div>
                  </div>
                )) : (
                  <div className="empty">No damage records for this job yet.</div>
                )}
              </div>
            </div>

            <div className="card crew-mode-panel">
              <div className="section-head">
                <h3>Tasks</h3>
                <span>{tasks.length} item(s)</span>
              </div>
              <div className="linked-record-list">
                {tasks.length ? tasks.map((task) => (
                  <div key={task.id} className="linked-record-row">
                    <strong>{task.title}</strong>
                    <span>{task.status} - {task.priority}{task.dueDate ? ` - due ${task.dueDate}` : ''}</span>
                  </div>
                )) : (
                  <div className="empty">No tasks assigned to this job yet.</div>
                )}
              </div>
            </div>

            <div className="card crew-mode-panel">
              <div className="section-head">
                <h3>Job photos</h3>
                <span>{relevantPhotos.length} shown</span>
              </div>
              <div className="photo-grid">
                {relevantPhotos.length ? relevantPhotos.map((photo) => (
                  <div key={photo.id} className="photo-card">
                    <img src={photo.dataUrl} alt={photo.label} />
                    <div className="photo-meta">
                      <strong>{photo.label}</strong>
                      <span>{photo.category}</span>
                    </div>
                  </div>
                )) : (
                  <div className="empty">No linked before/progress/after photos yet.</div>
                )}
              </div>
              <div className="hero-actions">
                <button className="ghost" onClick={() => setView('photos')}>Open photo gallery</button>
                <button className="ghost" onClick={() => setView('tasks')}>Open tasks</button>
              </div>
            </div>
          </>
        ) : (
          <div className="card crew-mode-panel">
            <div className="empty">Select a crew with assigned jobs to open the field packet.</div>
          </div>
        )}
      </div>
    </section>
  );
};
