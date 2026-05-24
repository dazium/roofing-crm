import { useEffect, useState } from 'react';
import type { AppData, TimeEntry } from '../types';
import { uid } from '../lib';

interface TimeTrackingProps {
  data: AppData;
  selectedCrewId: string | null;
  onUpdate: (nextData: AppData) => void;
}

export const TimeTracking: React.FC<TimeTrackingProps> = ({
  data,
  selectedCrewId,
  onUpdate,
}) => {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const today = new Date().toISOString().split('T')[0];
  const todayLog = data.timeLogs.find(
    (log) => log.crewId === selectedCrewId && log.date === today
  );
  const activeEntry = todayLog?.entries.find((entry) => !entry.punchOutTime);
  const isRunning = Boolean(activeEntry);

  // Timer effect
  useEffect(() => {
    if (!isRunning || !activeEntry) {
      return;
    }

    const punchIn = new Date(activeEntry.punchInTime);

    const interval = setInterval(() => {
      const diffMs = Date.now() - punchIn.getTime();
      setElapsedSeconds(Math.floor(diffMs / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, activeEntry]);

  function formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  function formatDuration(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  }

  function punchIn() {
    if (!selectedCrewId) return;
    const punchInTime = new Date().toISOString();

    const newEntry: TimeEntry = {
      id: uid(),
      crewId: selectedCrewId,
      date: today,
      punchInTime,
    };
    setElapsedSeconds(0);

    let updatedLog = todayLog;
    if (!updatedLog) {
      updatedLog = {
        id: uid(),
        crewId: selectedCrewId,
        date: today,
        entries: [newEntry],
        totalMinutes: 0,
      };
      onUpdate({
        ...data,
        timeLogs: [...data.timeLogs, updatedLog],
      });
    } else {
      const updatedEntries = [...updatedLog.entries, newEntry];
      onUpdate({
        ...data,
        timeLogs: data.timeLogs.map((log) =>
          log.id === updatedLog!.id
            ? { ...log, entries: updatedEntries }
            : log
        ),
      });
    }
  }

  function punchOut() {
    if (!selectedCrewId || !activeEntry || !todayLog) return;

    const punchOutTime = new Date().toISOString();
    const punchInTime = new Date(activeEntry.punchInTime);
    const durationMs = new Date(punchOutTime).getTime() - punchInTime.getTime();
    const durationMinutes = Math.round(durationMs / 60000);

    const updatedEntry: TimeEntry = {
      ...activeEntry,
      punchOutTime,
      durationMinutes,
    };

    const updatedEntries = todayLog.entries.map((entry) =>
      entry.id === activeEntry.id ? updatedEntry : entry
    );

    const totalMinutes = updatedEntries.reduce(
      (sum, entry) => sum + (entry.durationMinutes || 0),
      0
    );

    onUpdate({
      ...data,
      timeLogs: data.timeLogs.map((log) =>
        log.id === todayLog.id
          ? { ...log, entries: updatedEntries, totalMinutes }
          : log
      ),
    });
  }

  const totalDailyMinutes = todayLog?.totalMinutes || 0;
  const activeDuration = activeEntry ? elapsedSeconds : 0;

  return (
    <div className="time-tracking-panel">
      <div className="time-display">
        <div className="current-session">
          <span className="label">Current Session</span>
          <div className={`timer ${isRunning ? 'active' : ''}`}>
            {formatTime(activeDuration)}
          </div>
        </div>
        <div className="daily-total">
          <span className="label">Today's Total</span>
          <strong>{formatDuration(totalDailyMinutes + Math.floor(activeDuration / 60))}</strong>
        </div>
      </div>

      <div className="time-actions">
        {!isRunning ? (
          <button
            className="punch-button punch-in"
            onClick={punchIn}
            disabled={!selectedCrewId}
          >
            Punch In
          </button>
        ) : (
          <button className="punch-button punch-out" onClick={punchOut}>
            Punch Out
          </button>
        )}
      </div>

      {todayLog && todayLog.entries.length > 0 && (
        <div className="time-entries">
          <div className="section-head">
            <h4>Today's Sessions</h4>
            <span>{todayLog.entries.length} session(s)</span>
          </div>
          <div className="entries-list">
            {todayLog.entries.map((entry) => (
              <div key={entry.id} className="time-entry">
                <div className="entry-time">
                  <strong>
                    {new Date(entry.punchInTime).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </strong>
                  {entry.punchOutTime ? (
                    <>
                      <span>–</span>
                      <strong>
                        {new Date(entry.punchOutTime).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </strong>
                    </>
                  ) : (
                    <span className="active-badge">Active</span>
                  )}
                </div>
                <div className="entry-duration">
                  {entry.durationMinutes
                    ? formatDuration(entry.durationMinutes)
                    : 'In progress...'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
