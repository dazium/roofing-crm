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
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [showStopConfirm, setShowStopConfirm] = useState(false);
  const [toast, setToast] = useState({ message: '', show: false });

  const today = new Date().toISOString().split('T')[0];
  const todayLog = data.timeLogs.find(
    (log) => log.crewId === selectedCrewId && log.date === today
  );
  const activeEntry = todayLog?.entries.find((entry) => !entry.punchOutTime);
  const isRunning = Boolean(activeEntry);
  const onBreak = Boolean(activeEntry?.breakStartTime);
  const dayStartedAt = todayLog?.dayStartedAt;
  const dayStoppedAt = todayLog?.dayStoppedAt;
  const dayActive = Boolean(todayLog?.dayActive);

  // Timer effect
  useEffect(() => {
    if (!isRunning || !activeEntry) {
      return;
    }

    const punchIn = new Date(activeEntry.punchInTime);

    const interval = setInterval(() => {
      const breakMs = activeEntry.breakStartTime ? Date.now() - new Date(activeEntry.breakStartTime).getTime() : 0;
      const diffMs = Date.now() - punchIn.getTime() - breakMs - (activeEntry.breakMinutes || 0) * 60000;
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

  function formatTimeStamp(timestamp?: string): string {
    if (!timestamp) return 'Unknown';
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function startDay() {
    if (!selectedCrewId || !crew || dayActive) return;
    const now = new Date().toISOString();
    const crewEntries = crew.members.map((member) => ({
      id: uid(),
      crewId: selectedCrewId,
      memberId: member.id,
      date: today,
      punchInTime: now,
      breakMinutes: 0,
    }));

    const updatedLog = todayLog
      ? {
          ...todayLog,
          dayStartedAt: now,
          dayStoppedAt: undefined,
          dayActive: true,
          entries: [...todayLog.entries, ...crewEntries],
        }
      : {
          id: uid(),
          crewId: selectedCrewId,
          date: today,
          entries: crewEntries,
          totalMinutes: 0,
          dayStartedAt: now,
          dayActive: true,
        };

    const nextLogs = todayLog
      ? data.timeLogs.map((log) =>
          log.id === todayLog.id ? updatedLog : log
        )
      : [...data.timeLogs, updatedLog];

    setElapsedSeconds(0);
    onUpdate({ ...data, timeLogs: nextLogs });
    setToast({ message: 'Day started', show: true });
    setTimeout(() => setToast({ message: '', show: false }), 3500);
  }

  function requestStopDay() {
    if (!selectedCrewId || !todayLog || !dayActive) return;
    setShowStopConfirm(true);
  }

  function cancelStop() {
    setShowStopConfirm(false);
  }

  function confirmStopDay() {
    if (!selectedCrewId || !todayLog || !dayActive) return;
    const now = new Date().toISOString();

    const updatedEntries = todayLog.entries.map((entry) => {
      if (entry.punchOutTime) return entry;
      const punchInTime = new Date(entry.punchInTime);
      const currentBreakMinutes = entry.breakStartTime
        ? Math.round(
            (Date.now() - new Date(entry.breakStartTime).getTime()) / 60000
          )
        : 0;
      const totalBreakMinutes = (entry.breakMinutes || 0) + currentBreakMinutes;
      const durationMs =
        new Date(now).getTime() - punchInTime.getTime() -
        totalBreakMinutes * 60000;
      const durationMinutes = Math.max(0, Math.round(durationMs / 60000));

      return {
        ...entry,
        punchOutTime: now,
        durationMinutes,
        breakMinutes: totalBreakMinutes,
        breakStartTime: undefined,
      };
    });

    const totalMinutes = updatedEntries.reduce(
      (sum, entry) => sum + (entry.durationMinutes || 0),
      0
    );

    const updatedLog = {
      ...todayLog,
      entries: updatedEntries,
      totalMinutes,
      dayStoppedAt: now,
      dayActive: false,
    };

    setShowStopConfirm(false);
    setElapsedSeconds(0);
    onUpdate({
      ...data,
      timeLogs: data.timeLogs.map((log) =>
        log.id === todayLog.id ? updatedLog : log
      ),
    });
    setToast({ message: 'Day stopped and active sessions closed', show: true });
    setTimeout(() => setToast({ message: '', show: false }), 3500);
  }

  function punchIn() {
    if (!selectedCrewId || !selectedMemberId) return;
    const punchInTime = new Date().toISOString();

    const newEntry: TimeEntry = {
      id: uid(),
      crewId: selectedCrewId,
      memberId: selectedMemberId,
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
    const punchOutMs = new Date(punchOutTime).getTime();
    const punchInTime = new Date(activeEntry.punchInTime);
    const currentBreakMinutes = activeEntry.breakStartTime
      ? Math.round((punchOutMs - new Date(activeEntry.breakStartTime).getTime()) / 60000)
      : 0;
    const totalBreakMinutes = (activeEntry.breakMinutes || 0) + currentBreakMinutes;
    const durationMs = punchOutMs - punchInTime.getTime() - totalBreakMinutes * 60000;
    const durationMinutes = Math.round(durationMs / 60000);

    const updatedEntry: TimeEntry = {
      ...activeEntry,
      punchOutTime,
      durationMinutes,
      breakMinutes: totalBreakMinutes,
      breakStartTime: undefined,
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

  function toggleBreak() {
    if (!activeEntry || !todayLog) return;
    const now = new Date().toISOString();
    const updatedEntry = onBreak
      ? { ...activeEntry, breakStartTime: undefined, breakMinutes: (activeEntry.breakMinutes || 0) + Math.round((Date.now() - new Date(activeEntry.breakStartTime!).getTime()) / 60000) }
      : { ...activeEntry, breakStartTime: now };
    onUpdate({ ...data, timeLogs: data.timeLogs.map((log) => log.id === todayLog.id ? { ...log, entries: log.entries.map((entry) => entry.id === activeEntry.id ? updatedEntry : entry) } : log) });
  }

  const crew = data.crews.find((item) => item.id === selectedCrewId);
  const activeMember = crew?.members.find((member) => member.id === activeEntry?.memberId);

  const totalDailyMinutes = todayLog?.totalMinutes || 0;
  const activeDuration = activeEntry ? elapsedSeconds : 0;

  return (
    <div className="time-tracking-panel">
      <div className="section-head">
        <div><h3>Time clock</h3><span>Track each crew member's site time</span></div>
        {activeMember ? <span className="active-badge">{activeMember.name} active</span> : null}
      </div>
      <div className="day-control">
        <button
          className={`punch-button ${dayActive ? 'ghost' : 'punch-in'}`}
          onClick={dayActive ? requestStopDay : startDay}
          disabled={!selectedCrewId || (!crew) || (dayActive ? false : false)}
        >
          {dayActive ? 'Stop Day' : 'Start Day'}
        </button>
        <div className="day-status">
          {dayStartedAt ? (
            dayActive ? (
              <span>Day started at {formatTimeStamp(dayStartedAt)}</span>
            ) : (
              <span>Day stopped at {formatTimeStamp(dayStoppedAt || dayStartedAt)}</span>
            )
          ) : (
            <span>Day not started</span>
          )}
        </div>
      </div>
      {!isRunning ? (
        <label className="field field-compact"><span>Crew member</span><select value={selectedMemberId} onChange={(event) => setSelectedMemberId(event.target.value)}>
          <option value="">Select who is starting</option>
          {crew?.members.map((member) => <option key={member.id} value={member.id}>{member.name}{member.role ? ` · ${member.role}` : ''}</option>) }
        </select></label>
      ) : null}
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
            disabled={!selectedCrewId || !selectedMemberId}
          >
            Punch In
          </button>
        ) : (
          <><button className={`punch-button ${onBreak ? 'punch-in' : 'ghost'}`} onClick={toggleBreak}>{onBreak ? 'Resume Work' : 'Start Break'}</button><button className="punch-button punch-out" onClick={punchOut}>Punch Out</button></>
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
                    {entry.durationMinutes ? formatDuration(entry.durationMinutes) : 'In progress...'}{entry.memberId ? ` · ${crew?.members.find((member) => member.id === entry.memberId)?.name ?? 'Crew member'}` : ''}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {showStopConfirm && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-box">
            <h4>Stop Day</h4>
            <p>Stop day and punch out all active sessions for this crew?</p>
            <div className="modal-actions">
              <button className="ghost" onClick={cancelStop}>Cancel</button>
              <button className="punch-button punch-out" onClick={confirmStopDay}>Stop Day</button>
            </div>
          </div>
        </div>
      )}
      {toast.show && <div className="toast">{toast.message}</div>}
    </div>
  );
};
