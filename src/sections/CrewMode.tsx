import { useMemo } from 'react';
import type { AppData } from '../types';
import { openAddressInMaps, openEmailClient, openPhoneDialer } from '../lib';
import { TimeTracking } from '../components/TimeTracking';

type ReadinessItem = { id: string; label: string; detail: string; done: boolean };

interface CrewModeProps {
  data: AppData;
  selectedJobId: string | null;
  selectJob: (jobId: string | null, nextData?: AppData) => void;
  setView: React.Dispatch<React.SetStateAction<import('../types').View>>;
  setPhotoCategory: React.Dispatch<React.SetStateAction<import('../types').PhotoCategory>>;
  setPhotoLabel: React.Dispatch<React.SetStateAction<string>>;
  cameraInputRef: React.RefObject<HTMLInputElement | null>;
  handlePhotoUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onDataUpdate: (nextData: AppData) => void;
}

function buildCrewReadiness(selectedJobId: string | null, customerId: string | null, data: AppData): ReadinessItem[] {
  const job = data.jobs.find((entry) => entry.id === selectedJobId) ?? null;
  const customer = data.customers.find((entry) => entry.id === customerId) ?? null;
  const damageCount = data.damages.filter((damage) => damage.customerId === customerId).length;
  return [
    { id: 'customer', label: 'Customer address confirmed', detail: customer?.address ?? 'Add address in customer record', done: Boolean(customer?.address) },
    { id: 'phone', label: 'Customer phone on file', detail: customer?.phone ?? 'Add phone in customer record', done: Boolean(customer?.phone) },
    { id: 'inspection', label: 'Inspection completed', detail: data.inspections.some((entry) => entry.customerId === customerId) ? 'Inspection saved' : 'No inspection yet', done: data.inspections.some((entry) => entry.customerId === customerId) },
    { id: 'damages', label: 'Damage log captured', detail: `${damageCount} damage record(s)`, done: damageCount > 0 },
    { id: 'estimate', label: 'Estimate approved', detail: data.estimates.some((entry) => entry.jobId === selectedJobId) ? 'Estimate saved' : 'Create estimate before starting', done: data.estimates.some((entry) => entry.jobId === selectedJobId) },
    { id: 'crew', label: 'Crew assigned', detail: job?.crewId ? (data.crews.find((entry) => entry.id === job?.crewId)?.name ?? 'Crew assigned') : 'Assign a crew in the project record', done: Boolean(job?.crewId) },
    { id: 'materials', label: 'Materials staged', detail: job ? 'Bundle/sq plan from estimate' : 'Estimate materials first', done: false },
  ];
}

export const CrewMode: React.FC<CrewModeProps> = ({ data, selectedJobId, cameraInputRef, onDataUpdate }) => {
  const customer = data.customers.find((entry) => entry.id === data.jobs.find((job) => job.id === selectedJobId)?.customerId) ?? null;
  const selectedJob = data.jobs.find((job) => job.id === selectedJobId) ?? null;
  const nextJob = selectedJob ?? data.jobs[0] ?? null;
  const readinessItems = useMemo(() => buildCrewReadiness(selectedJobId, nextJob?.customerId ?? null, data), [data, selectedJobId, nextJob?.customerId]);
  const selectedCrew = selectedJob?.crewId ? data.crews.find((entry) => entry.id === selectedJob?.crewId) ?? null : null;
  const jobTasks = data.tasks.filter((task) => task.jobId === selectedJobId);
  const jobDamages = data.damages.filter((damage) => damage.jobId === selectedJobId);
  const jobPhotos = data.inspections.find((inspection) => inspection.customerId === nextJob?.customerId)?.photos ?? [];

  function captureProgressPhoto() {
    cameraInputRef.current?.click();
  }

  return (
    <section className="content-grid two-col">
      <div className="column-stack">
        <div className="card workspace-focus-card">
          <div className="section-head">
            <div>
              <h3>Active job</h3>
              <span>Crew Mode focuses on the job currently in the field</span>
            </div>
          </div>
          <div className="detail-stack">
            <div><span>Project</span><strong>{nextJob ? nextJob.title : 'No jobs assigned yet'}</strong></div>
            <div><span>Crew</span><strong>{selectedCrew?.name ?? 'Unassigned'}</strong></div>
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
              <h3>Crew readiness</h3>
              <span>Pre-flight checklist before heading to the site</span>
            </div>
          </div>
          <ul className="checklist">
            {readinessItems.map((item) => (
              <li key={item.id} className={item.done ? 'is-done' : ''}>
                <span>{item.label}</span>
                <small>{item.detail}</small>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="column-stack">
        <div className="card">
          <div className="section-head">
            <h3>Field packet</h3>
            <span>Quick view of the work the crew is preparing to do</span>
          </div>
          <div className="detail-stack">
            <div><span>Tasks</span><strong>{jobTasks.length}</strong></div>
            <div><span>Damages</span><strong>{jobDamages.length}</strong></div>
            <div><span>Photos</span><strong>{jobPhotos.length}</strong></div>
          </div>
        </div>

        {selectedCrew ? (
          <TimeTracking data={data} selectedCrewId={selectedCrew.id} onUpdate={onDataUpdate} />
        ) : null}
      </div>
    </section>
  );
};
