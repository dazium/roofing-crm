import { useMemo, useState } from 'react';
import type { AppData, View } from '../types';
import { badgeTone, buildGoogleMapsDirectionsUrl, buildGoogleMapsEmbedUrl, openAddressInMaps, openExternalUrl } from '../lib';

interface LocationsProps {
  data: AppData;
  selectedCustomerId: string | null;
  selectCustomer: (customerId: string | null, nextData?: AppData) => void;
  selectedJobId: string | null;
  selectJob: (jobId: string | null, nextData?: AppData) => void;
  setView: React.Dispatch<React.SetStateAction<View>>;
}

type LocationRow = {
  id: string;
  customerId: string;
  jobId?: string;
  name: string;
  address: string;
  jobTitle?: string;
  status: string;
  priority?: string;
  scheduledFor?: string;
  appointmentTitle?: string;
  appointmentStart?: string;
  crewName?: string;
}

function routeDate(value?: string) {
  if (!value) return 'Unscheduled';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

export const Locations: React.FC<LocationsProps> = ({
  data,
  selectedCustomerId,
  selectCustomer,
  selectedJobId,
  selectJob,
  setView,
}) => {
  const [query, setQuery] = useState('');

  const locationRows = useMemo<LocationRow[]>(() => {
    const rows = data.customers
      .filter((customer) => customer.address.trim())
      .map((customer) => {
        const customerJobs = data.jobs.filter((job) => job.customerId === customer.id);
        const primaryJob = customerJobs.find((job) => job.id === selectedJobId) ?? customerJobs[0];
        const appointment = data.appointments
          .filter((item) => item.customerId === customer.id)
          .sort((a, b) => a.startAt.localeCompare(b.startAt))[0];
        const crew = data.crews.find((item) => item.id === primaryJob?.crewId);

        return {
          id: `${customer.id}-${primaryJob?.id ?? 'location'}`,
          customerId: customer.id,
          jobId: primaryJob?.id,
          name: customer.name,
          address: appointment?.location?.trim() || customer.address,
          jobTitle: primaryJob?.title,
          status: primaryJob?.status ?? customer.leadStatus,
          priority: primaryJob?.priority,
          scheduledFor: primaryJob?.scheduledFor,
          appointmentTitle: appointment?.title,
          appointmentStart: appointment?.startAt,
          crewName: crew?.name,
        };
      });

    return rows.sort((a, b) => {
      const statusScore = (row: LocationRow) => row.status === 'In Progress' ? 0 : row.status === 'Scheduled' ? 1 : 2;
      return statusScore(a) - statusScore(b) || (a.scheduledFor ?? '').localeCompare(b.scheduledFor ?? '') || a.name.localeCompare(b.name);
    });
  }, [data.appointments, data.crews, data.customers, data.jobs, selectedJobId]);

  const filteredRows = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return locationRows;
    return locationRows.filter((row) => [row.name, row.address, row.jobTitle ?? '', row.status, row.priority ?? '', row.crewName ?? ''].some((value) => value.toLowerCase().includes(term)));
  }, [locationRows, query]);

  const selectedRow = filteredRows.find((row) => row.jobId === selectedJobId) ?? filteredRows.find((row) => row.customerId === selectedCustomerId) ?? filteredRows[0] ?? null;
  const routeRows = filteredRows.filter((row) => ['Scheduled', 'In Progress', 'Inspection Scheduled'].includes(row.status)).slice(0, 8);
  const routeUrl = buildGoogleMapsDirectionsUrl(routeRows.map((row) => row.address));
  const selectedMapUrl = selectedRow ? buildGoogleMapsEmbedUrl(selectedRow.address) : '';

  function openRoute() {
    if (!routeUrl) return;
    openExternalUrl(routeUrl);
  }

  function selectLocation(row: LocationRow) {
    selectCustomer(row.customerId);
    if (row.jobId) selectJob(row.jobId);
  }

  return (
    <section className="content-grid locations-layout">
      <div className="column-stack">
        <div className="card">
          <div className="section-head">
            <h3>Map preview</h3>
            <span>{selectedRow ? selectedRow.address : 'No address selected'}</span>
          </div>
          {selectedRow ? (
            <div className="map-preview-panel">
              <iframe
                title={`Map for ${selectedRow.name}`}
                src={selectedMapUrl}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
              <div className="map-preview-overlay">
                <strong>{selectedRow.name}</strong>
                <span>{selectedRow.jobTitle ?? selectedRow.status}</span>
              </div>
            </div>
          ) : (
            <div className="empty">Add customer addresses to populate the map.</div>
          )}
          <div className="hero-actions">
            {selectedRow ? <button onClick={() => openAddressInMaps(selectedRow.address)}>Open in maps</button> : null}
            <button className="ghost" onClick={openRoute} disabled={!routeUrl}>Open route</button>
          </div>
        </div>

        <div className="card">
          <div className="section-head">
            <h3>Route queue</h3>
            <span>{routeRows.length} active stop{routeRows.length === 1 ? '' : 's'}</span>
          </div>
          <div className="route-stop-list">
            {routeRows.length ? routeRows.map((row, index) => (
              <button key={`route-${row.id}`} className="route-stop-row" onClick={() => selectLocation(row)}>
                <strong>{index + 1}</strong>
                <span>{row.name}</span>
                <small>{row.address}</small>
              </button>
            )) : <div className="empty">No scheduled or active stops in the current filter.</div>}
          </div>
        </div>
      </div>

      <div className="column-stack span-2">
        <div className="card">
          <div className="section-head">
            <h3>Locations</h3>
            <input className="search" placeholder="Search customer, address, crew..." value={query} onChange={(event) => setQuery(event.target.value)} />
          </div>
          <div className="mini-stats-grid">
            <div className="mini-stat-card">
              <span>Mapped customers</span>
              <strong>{locationRows.length}</strong>
            </div>
            <div className="mini-stat-card">
              <span>Active stops</span>
              <strong>{routeRows.length}</strong>
            </div>
            <div className="mini-stat-card">
              <span>Crews assigned</span>
              <strong>{locationRows.filter((row) => row.crewName).length}</strong>
            </div>
          </div>

          <div className="job-board-list">
            {filteredRows.map((row) => (
              <div
                key={row.id}
                className={`job-board-row location-board-row ${selectedRow?.id === row.id ? 'active' : ''}`}
                role="button"
                tabIndex={0}
                onClick={() => selectLocation(row)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    selectLocation(row);
                  }
                }}
              >
                <div className="job-board-main">
                  <div className="list-row-top">
                    <strong>{row.name}</strong>
                    <span className={`pill pill-${badgeTone(row.status)}`}>{row.status}</span>
                  </div>
                  <div className="job-board-info">
                    <span>{row.jobTitle ?? 'No project yet'}</span>
                    <span>{row.crewName ?? 'No crew'}</span>
                    <span>{routeDate(row.scheduledFor ?? row.appointmentStart)}</span>
                    {row.priority ? <span>{row.priority} priority</span> : null}
                  </div>
                  <small>{row.appointmentTitle ? `${row.appointmentTitle} · ${row.address}` : row.address}</small>
                </div>
                <div className="job-board-meta">
                  <button
                    type="button"
                    className="address-link"
                    onClick={(event) => {
                      event.stopPropagation();
                      openAddressInMaps(row.address);
                    }}
                  >
                    Map
                  </button>
                  <button
                    type="button"
                    className="address-link"
                    onClick={(event) => {
                      event.stopPropagation();
                      selectLocation(row);
                      setView(row.jobId ? 'jobs' : 'customers');
                    }}
                  >
                    Open record
                  </button>
                </div>
              </div>
            ))}

            {filteredRows.length === 0 ? <div className="empty">No locations match that search.</div> : null}
          </div>
        </div>
      </div>
    </section>
  );
};
