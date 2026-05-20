import { useEffect, useMemo, useState } from 'react';
import type { AppData, View } from '../types';
import { badgeTone, money, openAddressInMaps, openEmailClient, openPhoneDialer } from '../lib';
import { TimeTracking } from '../components/TimeTracking';

interface CrewModeProps {
  data: AppData;
  selectedJobId: string | null;
  selectJob: (jobId: string | null, nextData?: AppData) => void;
  setView: React.Dispatch<React.SetStateAction<View>>;
  setPhotoCategory: React.Dispatch<React.SetStateAction<import('../types').PhotoCategory>>;
  setPhotoLabel: React.Dispatch<React.SetStateAction<string>>;
  cameraInputRef: React.RefObject<HTMLInputElement | null>;
  handlePhotoUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onDataUpdate: (nextData: AppData) => void;
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
  onDataUpdate,
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
  const openTasks = tasks.filter((task) => task.status !== 'Done').length;
  const progressPhotos = inspection?.photos.filter((photo) => photo.category === 'Progress').length ?? 0;
  const nextJob = activeAssignedJobs[0] ?? selectedJob;

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
    <>
      <section className="hero-grid workspace-hero-grid crew-mode-hero-grid">
        <div className="card hero-card workspace-hero-card">
          <div className="section-head">
            <div>
              <span className="pill pill-blue">Crew workspace</span>
              <h2>{selectedCrew?.name ?? 'Select a crew'}</h2>
              <p>
                {selectedJob && customer
                  ? `${selectedJob.title} · ${customer.name} · ${selectedJob.status}`
                  : 'Pick a crew to see assigned jobs, field notes, photos, tasks, and customer contact actions.'}
              </p>
            </div>
            <div className="workspace-status-row">
              {selectedCrew ? <span className={`pill pill-${badgeTone(selectedCrew.status)}`}>{selectedCrew.status}</span> : null}
              {selectedJob ? <span className={`pill pill-${badgeTone(selectedJob.priority)}`}>{selectedJob.priority}</span> : null}
            </div>
          </div>

          <div className="workspace-meta-grid">
            <div className="workspace-meta-item">
              <span>Crew lead</span>
              <strong>{selectedCrew?.crewLead ?? 'Unset'}</strong>
            </div>
            <div className="workspace-meta-item">
              <span>Current project</span>
              <strong>{selectedJob?.title ?? 'No job selected'}</strong>
            </div>
            <div className="workspace-meta-item">
              <span>Customer</span>
              <strong>{customer?.name ?? 'No customer selected'}</strong>
            </div>
            <div className="workspace-meta-item">
              <span>Address</span>
              <strong>
                {customer?.address ? (
                  <button type="button" className="address-link" onClick={() => openAddressInMaps(customer.address)}>
                    {customer.address}
                  </button>
                ) : 'No address yet'}
              </strong>
            </div>
          </div>

          <div className="hero-actions">
            <button className="ghost" onClick={() => customer?.phone && openPhoneDialer(customer.phone)} disabled={!customer?.phone}>Call customer</button>
            <button className="ghost" onClick={() => customer?.email && openEmailClient(customer.email)} disabled={!customer?.email}>Email customer</button>
            <button className="ghost" onClick={() => customer?.address && openAddressInMaps(customer.address)} disabled={!customer?.address}>Open map</button>
            <button onClick={captureProgressPhoto} disabled={!selectedJob || !customer}>Progress photo</button>
          </div>
        </div>

        <div className="card workspace-focus-card">
          <div className="section-head">
            <div>
              <h3>Next crew action</h3>
              <span>Keep the field packet moving</span>
            </div>
          </div>
          <div className="workflow-callout">
            <strong>{nextJob ? nextJob.title : 'Assign the first job'}</strong>
            <span>
              {nextJob
                ? `${activeAssignedJobs.length} active job(s), ${openTasks} open task(s), and ${damages.length} damage record(s) for this packet.`
                : 'No active jobs are assigned to this crew yet.'}
            </span>
          </div>
          <div className="linked-record-list workspace-links-list">
            {assignedJobs.length ? assignedJobs.slice(0, 4).map((job) => {
              const jobCustomer = data.customers.find((entry) => entry.id === job.customerId);
              return (
                <button key={job.id} className="linked-record-row linked-record-action dashboard-activity-row" onClick={() => openJob(job.id)}>
                  <strong>{job.title}</strong>
                  <span>{jobCustomer?.name ?? 'Unknown customer'} · {job.status}</span>
                  <small>{job.scheduledFor || 'No date set'}</small>
                </button>
              );
            }) : (
              <div className="empty">No assigned jobs yet.</div>
            )}
          </div>
        </div>
      </section>

      <section className="stats-grid dashboard-priority-grid crew-mode-stats-grid">
        <div className="card stat-card">
          <span>Assigned jobs</span>
          <strong>{assignedJobs.length}</strong>
          <small>Total jobs for selected crew</small>
        </div>
        <div className="card stat-card">
          <span>Active jobs</span>
          <strong>{activeAssignedJobs.length}</strong>
          <small>Not complete or paid</small>
        </div>
        <div className="card stat-card">
          <span>Open tasks</span>
          <strong>{openTasks}</strong>
          <small>For the selected job packet</small>
        </div>
        <div className="card stat-card">
          <span>Progress photos</span>
          <strong>{progressPhotos}</strong>
          <small>Captured from the field</small>
        </div>
      </section>

      <section className="content-grid two-col crew-mode-layout dashboard-detail-grid">
      <div className="column-stack">
        <div className="card crew-mode-panel">
          <div className="section-head">
            <h3>Crew Mode</h3>
            <span>Field job view matched to the dashboard workspace</span>
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

        {selectedCrew && (
          <div className="card crew-mode-panel">
            <div className="section-head">
              <h3>Time Tracking</h3>
              <span>Punch in/out for {selectedCrew.name}</span>
            </div>
            <TimeTracking
              data={data}
              selectedCrewId={selectedCrewId}
              onUpdate={onDataUpdate}
            />
          </div>
        )}

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
    </>
  );
};
