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
  const [routeMode, setRouteMode] = useState<'active' | 'schedule' | 'crew'>('active');
  const [routeDateFilter, setRouteDateFilter] = useState('');
  const [routeStartAddress, setRouteStartAddress] = useState('');
  const [routePlanIds, setRoutePlanIds] = useState<string[] | null>(null);

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
  const suggestedRouteRows = [...filteredRows.filter((row) => ['Scheduled', 'In Progress', 'Inspection Scheduled'].includes(row.status))]
    .filter((row) => !routeDateFilter || (row.scheduledFor ?? row.appointmentStart ?? '').startsWith(routeDateFilter))
    .sort((a, b) => {
      if (routeMode === 'schedule') {
        return (a.scheduledFor ?? a.appointmentStart ?? '').localeCompare(b.scheduledFor ?? b.appointmentStart ?? '') || a.name.localeCompare(b.name);
      }
      if (routeMode === 'crew') {
        return (a.crewName ?? 'zz').localeCompare(b.crewName ?? 'zz') || (a.scheduledFor ?? '').localeCompare(b.scheduledFor ?? '');
      }
      const statusScore = (row: LocationRow) => row.status === 'In Progress' ? 0 : row.status === 'Scheduled' ? 1 : 2;
      return statusScore(a) - statusScore(b) || (a.priority === 'High' ? -1 : 0) || (a.scheduledFor ?? '').localeCompare(b.scheduledFor ?? '');
    })
    .slice(0, 8);
  const routePlanSourceIds = routePlanIds ?? suggestedRouteRows.map((row) => row.id);
  const routePlanRows = routePlanSourceIds
    .map((id) => locationRows.find((row) => row.id === id))
    .filter((row): row is LocationRow => Boolean(row));
  const routeAddresses = [...(routeStartAddress.trim() ? [routeStartAddress.trim()] : []), ...routePlanRows.map((row) => row.address)];
  const routeUrl = buildGoogleMapsDirectionsUrl(routeAddresses);
  const selectedMapUrl = selectedRow ? buildGoogleMapsEmbedUrl(selectedRow.address) : '';

  function openRoute() {
    if (!routeUrl) return;
    openExternalUrl(routeUrl);
  }

  function addRouteStop(row: LocationRow) {
    setRoutePlanIds((prev) => {
      const current = prev ?? routePlanRows.map((entry) => entry.id);
      return current.includes(row.id) ? current : [...current, row.id];
    });
  }

  function removeRouteStop(rowId: string) {
    setRoutePlanIds((prev) => (prev ?? routePlanRows.map((entry) => entry.id)).filter((id) => id !== rowId));
  }

  function moveRouteStop(rowId: string, direction: -1 | 1) {
    setRoutePlanIds((prev) => {
      const current = prev ?? routePlanRows.map((entry) => entry.id);
      const index = current.indexOf(rowId);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= current.length) return current;
      const next = [...current];
      const [item] = next.splice(index, 1);
      next.splice(nextIndex, 0, item);
      return next;
    });
  }

  function loadSuggestedRoute() {
    setRoutePlanIds(suggestedRouteRows.map((row) => row.id));
  }

  function clearRoutePlan() {
    setRoutePlanIds([]);
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
            <h3>Route planner</h3>
            <span>{routePlanRows.length} stop{routePlanRows.length === 1 ? '' : 's'} selected</span>
          </div>
          <div className="route-planner-controls">
            <label className="field">
              <span>Start address</span>
              <input
                placeholder="Shop, home base, or first departure point"
                value={routeStartAddress}
                onChange={(event) => setRouteStartAddress(event.target.value)}
              />
            </label>
            <label className="field field-short">
              <span>Route date</span>
              <input type="date" value={routeDateFilter} onChange={(event) => setRouteDateFilter(event.target.value)} />
            </label>
          </div>
          <div className="hero-actions">
            <button className={routeMode === 'active' ? '' : 'ghost'} onClick={() => setRouteMode('active')}>Active first</button>
            <button className={routeMode === 'schedule' ? '' : 'ghost'} onClick={() => setRouteMode('schedule')}>By schedule</button>
            <button className={routeMode === 'crew' ? '' : 'ghost'} onClick={() => setRouteMode('crew')}>By crew</button>
            <button className="ghost" onClick={loadSuggestedRoute}>Load suggested</button>
            <button className="ghost" onClick={clearRoutePlan}>Clear</button>
          </div>
          <div className="route-summary-strip">
            <div>
              <span>Total stops</span>
              <strong>{routePlanRows.length}</strong>
            </div>
            <div>
              <span>Crews</span>
              <strong>{new Set(routePlanRows.map((row) => row.crewName).filter(Boolean)).size}</strong>
            </div>
            <div>
              <span>High priority</span>
              <strong>{routePlanRows.filter((row) => row.priority === 'High').length}</strong>
            </div>
          </div>
          <div className="route-stop-list">
            {routePlanRows.length ? routePlanRows.map((row, index) => (
              <div key={`route-${row.id}`} className="route-stop-row route-plan-row">
                <button type="button" className="route-stop-main" onClick={() => selectLocation(row)}>
                  <strong>{index + 1}</strong>
                  <span>{row.name}</span>
                  <small>{row.appointmentTitle ? `${row.appointmentTitle} · ${row.address}` : row.address}</small>
                </button>
                <div className="route-stop-actions">
                  <button className="ghost" onClick={() => moveRouteStop(row.id, -1)} disabled={index === 0}>Up</button>
                  <button className="ghost" onClick={() => moveRouteStop(row.id, 1)} disabled={index === routePlanRows.length - 1}>Down</button>
                  <button className="ghost danger" onClick={() => removeRouteStop(row.id)}>Remove</button>
                </div>
              </div>
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
              <strong>{routePlanRows.length}</strong>
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
                  <button
                    type="button"
                    className="address-link"
                    onClick={(event) => {
                      event.stopPropagation();
                      addRouteStop(row);
                    }}
                  >
                    Add stop
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
