import { useMemo, useState } from 'react';
import type { AppData, ChecklistItem, ProjectTask, TaskPriority, TaskStatus, View } from '../types';
import { badgeTone, uid } from '../lib';

interface TaskForm {
  title: string;
  details: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string;
  assignee: string;
}

type TaskSortMode = 'due-date' | 'priority' | 'status' | 'updated';

interface TasksProps {
  data: AppData;
  setData: React.Dispatch<React.SetStateAction<AppData>>;
  selectedCustomerId: string | null;
  selectCustomer: (customerId: string | null, nextData?: AppData) => void;
  selectedJobId: string | null;
  selectJob: (jobId: string | null, nextData?: AppData) => void;
  setView: React.Dispatch<React.SetStateAction<View>>;
}

function defaultChecklist(): ChecklistItem[] {
  return [
    { id: uid(), label: 'First follow-up', done: false },
    { id: uid(), label: 'Materials or paperwork ready', done: false },
  ];
}

function priorityRank(priority: TaskPriority) {
  if (priority === 'High') return 0;
  if (priority === 'Normal') return 1;
  return 2;
}

function statusRank(status: TaskStatus) {
  if (status === 'To Do') return 0;
  if (status === 'In Progress') return 1;
  if (status === 'Blocked') return 2;
  return 3;
}

function createTaskForm(task?: ProjectTask): TaskForm {
  return {
    title: task?.title ?? '',
    details: task?.details ?? '',
    priority: task?.priority ?? 'Normal',
    status: task?.status ?? 'To Do',
    dueDate: task?.dueDate ?? '',
    assignee: task?.assignee ?? '',
  };
}

export const Tasks: React.FC<TasksProps> = ({
  data,
  setData,
  selectedCustomerId,
  selectCustomer,
  selectedJobId,
  selectJob,
  setView,
}) => {
  const [taskForm, setTaskForm] = useState<TaskForm>(createTaskForm());
  const [sortMode, setSortMode] = useState<TaskSortMode>('due-date');
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskForm, setEditingTaskForm] = useState<TaskForm>(createTaskForm());

  const selectedCustomer = data.customers.find((customer) => customer.id === selectedCustomerId) ?? null;
  const selectedJob = data.jobs.find((job) => job.id === selectedJobId) ?? null;

  const filteredTasks = useMemo(() => {
    return data.tasks.filter((task) => {
      if (selectedJobId) return task.jobId === selectedJobId;
      if (selectedCustomerId) return task.customerId === selectedCustomerId;
      return true;
    });
  }, [data.tasks, selectedCustomerId, selectedJobId]);

  const sortedTasks = useMemo(() => {
    const tasks = [...filteredTasks];

    tasks.sort((a, b) => {
      if (sortMode === 'priority') {
        return priorityRank(a.priority) - priorityRank(b.priority) || a.title.localeCompare(b.title);
      }

      if (sortMode === 'status') {
        return statusRank(a.status) - statusRank(b.status) || priorityRank(a.priority) - priorityRank(b.priority);
      }

      if (sortMode === 'updated') {
        return b.updatedAt.localeCompare(a.updatedAt);
      }

      const aDue = a.dueDate || '9999-12-31';
      const bDue = b.dueDate || '9999-12-31';
      return aDue.localeCompare(bDue) || priorityRank(a.priority) - priorityRank(b.priority);
    });

    return tasks;
  }, [filteredTasks, sortMode]);

  const openTasks = filteredTasks.filter((task) => task.status !== 'Done');
  const blockedTasks = filteredTasks.filter((task) => task.status === 'Blocked');
  const completedTasks = filteredTasks.filter((task) => task.status === 'Done');

  function createTask() {
    if (!selectedCustomerId || !taskForm.title.trim()) return;

    const newTask: ProjectTask = {
      id: uid(),
      customerId: selectedCustomerId,
      jobId: selectedJobId ?? undefined,
      title: taskForm.title.trim(),
      details: taskForm.details.trim(),
      priority: taskForm.priority,
      status: taskForm.status,
      dueDate: taskForm.dueDate || undefined,
      assignee: taskForm.assignee.trim() || undefined,
      checklist: defaultChecklist(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setData((prev) => ({
      ...prev,
      tasks: [newTask, ...prev.tasks],
    }));
    setTaskForm(createTaskForm());
  }

  function updateTask(taskId: string, updates: Partial<ProjectTask>) {
    setData((prev) => ({
      ...prev,
      tasks: prev.tasks.map((task) => task.id === taskId ? { ...task, ...updates, updatedAt: new Date().toISOString() } : task),
    }));
  }

  function beginTaskEdit(task: ProjectTask) {
    setEditingTaskId(task.id);
    setEditingTaskForm(createTaskForm(task));
  }

  function cancelTaskEdit() {
    setEditingTaskId(null);
    setEditingTaskForm(createTaskForm());
  }

  function saveTaskEdit(taskId: string) {
    const title = editingTaskForm.title.trim();
    if (!title) return;

    updateTask(taskId, {
      title,
      details: editingTaskForm.details.trim(),
      priority: editingTaskForm.priority,
      status: editingTaskForm.status,
      dueDate: editingTaskForm.dueDate || undefined,
      assignee: editingTaskForm.assignee.trim() || undefined,
    });
    cancelTaskEdit();
  }

  function toggleChecklist(taskId: string, checklistId: string) {
    setData((prev) => ({
      ...prev,
      tasks: prev.tasks.map((task) => task.id === taskId
        ? {
            ...task,
            checklist: task.checklist.map((item) => item.id === checklistId ? { ...item, done: !item.done } : item),
            updatedAt: new Date().toISOString(),
          }
        : task),
    }));
  }

  function removeTask(taskId: string) {
    const task = data.tasks.find((entry) => entry.id === taskId);
    const confirmed = window.confirm(`Delete task "${task?.title ?? 'this task'}"?`);
    if (!confirmed) return;

    setData((prev) => ({
      ...prev,
      tasks: prev.tasks.filter((task) => task.id !== taskId),
    }));
    if (editingTaskId === taskId) {
      cancelTaskEdit();
    }
  }

  return (
    <section className="content-grid two-col">
      <div className="column-stack">
        <div className="card">
          <div className="section-head">
            <h3>{selectedCustomer ? `Tasks for ${selectedCustomer.name}` : 'Select a customer'}</h3>
            <span>{selectedJob ? selectedJob.title : 'Track office follow-ups, material prep, and close-out steps.'}</span>
          </div>

          <div className="section-block selection-block">
            <div className="section-subhead">
              <h4>Selection</h4>
              <span>Choose a customer first, then optionally narrow tasks to one project.</span>
            </div>
            <div className="selection-grid">
              <label className="field">
                <span>Customer</span>
                <select value={selectedCustomerId ?? ''} onChange={(event) => selectCustomer(event.target.value || null)}>
                  <option value="">Select a customer</option>
                  {data.customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name} - {customer.address}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Project</span>
                <select value={selectedJobId ?? ''} onChange={(event) => selectJob(event.target.value || null)}>
                  <option value="">All projects for this customer</option>
                  {data.jobs.filter((job) => !selectedCustomerId || job.customerId === selectedCustomerId).map((job) => (
                    <option key={job.id} value={job.id}>
                      {job.title}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {selectedCustomer ? (
            <div className="form-grid compact-grid">
              <label className="field">
                <span>Task title</span>
                <input value={taskForm.title} onChange={(event) => setTaskForm({ ...taskForm, title: event.target.value })} placeholder="Call customer, order shingles, collect deposit..." />
              </label>
              <label className="field compact-textarea">
                <span>Details</span>
                <textarea value={taskForm.details} onChange={(event) => setTaskForm({ ...taskForm, details: event.target.value })} placeholder="Extra details for the office or crew" />
              </label>
              <div className="split-grid">
                <label className="field field-compact">
                  <span>Priority</span>
                  <select value={taskForm.priority} onChange={(event) => setTaskForm({ ...taskForm, priority: event.target.value as TaskPriority })}>
                    <option>Low</option>
                    <option>Normal</option>
                    <option>High</option>
                  </select>
                </label>
                <label className="field field-compact">
                  <span>Status</span>
                  <select value={taskForm.status} onChange={(event) => setTaskForm({ ...taskForm, status: event.target.value as TaskStatus })}>
                    <option>To Do</option>
                    <option>In Progress</option>
                    <option>Blocked</option>
                    <option>Done</option>
                  </select>
                </label>
              </div>
              <div className="split-grid">
                <label className="field field-compact">
                  <span>Due date</span>
                  <input type="date" value={taskForm.dueDate} onChange={(event) => setTaskForm({ ...taskForm, dueDate: event.target.value })} />
                </label>
                <label className="field field-compact">
                  <span>Assigned to</span>
                  <input value={taskForm.assignee} onChange={(event) => setTaskForm({ ...taskForm, assignee: event.target.value })} placeholder="Office, Crew Alpha, Matt..." />
                </label>
              </div>
              <div className="hero-actions">
                <button onClick={createTask}>Add task</button>
                <button className="ghost" onClick={() => setView('dashboard')}>Back to workspace</button>
              </div>
            </div>
          ) : (
            <div className="empty">Pick a customer first from the Customers page.</div>
          )}
        </div>

        <div className="card">
          <div className="section-head">
            <h3>Task summary</h3>
            <span>Quick view of what still needs movement</span>
          </div>
          <div className="mini-stats-grid">
            <div className="mini-stat-card">
              <span>Open</span>
              <strong>{openTasks.length}</strong>
            </div>
            <div className="mini-stat-card">
              <span>Blocked</span>
              <strong>{blockedTasks.length}</strong>
            </div>
            <div className="mini-stat-card">
              <span>Done</span>
              <strong>{completedTasks.length}</strong>
            </div>
          </div>
        </div>
      </div>

      <div className="column-stack">
        <div className="card">
          <div className="section-head">
            <h3>Task board</h3>
            <span>{selectedCustomer ? 'Follow-ups tied to the selected customer or project.' : 'Select a customer to start tracking tasks.'}</span>
          </div>
          <div className="inline-filter-row">
            <label className="field field-inline">
              <span>Sort by</span>
              <select value={sortMode} onChange={(event) => setSortMode(event.target.value as TaskSortMode)}>
                <option value="due-date">Due date</option>
                <option value="priority">Priority</option>
                <option value="status">Status</option>
                <option value="updated">Last updated</option>
              </select>
            </label>
          </div>
          <div className="list-grid">
            {sortedTasks.length ? sortedTasks.map((task) => {
              const completedChecklist = task.checklist.filter((item) => item.done).length;
              const isEditing = editingTaskId === task.id;

              return (
                <div key={task.id} className="stack-item inspection-card">
                  {isEditing ? (
                    <div className="task-edit-grid">
                      <label className="field">
                        <span>Task title</span>
                        <input value={editingTaskForm.title} onChange={(event) => setEditingTaskForm({ ...editingTaskForm, title: event.target.value })} />
                      </label>
                      <label className="field compact-textarea">
                        <span>Details</span>
                        <textarea value={editingTaskForm.details} onChange={(event) => setEditingTaskForm({ ...editingTaskForm, details: event.target.value })} />
                      </label>
                      <div className="split-grid">
                        <label className="field field-compact">
                          <span>Priority</span>
                          <select value={editingTaskForm.priority} onChange={(event) => setEditingTaskForm({ ...editingTaskForm, priority: event.target.value as TaskPriority })}>
                            <option>Low</option>
                            <option>Normal</option>
                            <option>High</option>
                          </select>
                        </label>
                        <label className="field field-compact">
                          <span>Status</span>
                          <select value={editingTaskForm.status} onChange={(event) => setEditingTaskForm({ ...editingTaskForm, status: event.target.value as TaskStatus })}>
                            <option>To Do</option>
                            <option>In Progress</option>
                            <option>Blocked</option>
                            <option>Done</option>
                          </select>
                        </label>
                      </div>
                      <div className="split-grid">
                        <label className="field field-compact">
                          <span>Due date</span>
                          <input type="date" value={editingTaskForm.dueDate} onChange={(event) => setEditingTaskForm({ ...editingTaskForm, dueDate: event.target.value })} />
                        </label>
                        <label className="field field-compact">
                          <span>Assigned to</span>
                          <input value={editingTaskForm.assignee} onChange={(event) => setEditingTaskForm({ ...editingTaskForm, assignee: event.target.value })} />
                        </label>
                      </div>
                      <div className="hero-actions">
                        <button onClick={() => saveTaskEdit(task.id)}>Save changes</button>
                        <button className="ghost" onClick={cancelTaskEdit}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="stack-item-top">
                        <strong>{task.title}</strong>
                        <span className={`pill pill-${badgeTone(task.priority)}`}>{task.priority}</span>
                      </div>
                      <p>{task.status}{task.assignee ? ` · ${task.assignee}` : ''}{task.dueDate ? ` · due ${task.dueDate}` : ''}</p>
                      <small>{task.details || 'No extra details yet.'}</small>
                      <div className="inspection-metrics">
                        <span>{completedChecklist}/{task.checklist.length} checklist items</span>
                        <span>Updated {new Date(task.updatedAt).toLocaleDateString()}</span>
                      </div>
                      <div className="inspection-flags">
                        <button className="ghost" onClick={() => updateTask(task.id, { status: 'To Do' })}>To do</button>
                        <button className="ghost" onClick={() => updateTask(task.id, { status: 'In Progress' })}>In progress</button>
                        <button className="ghost" onClick={() => updateTask(task.id, { status: 'Blocked' })}>Blocked</button>
                        <button className="ghost" onClick={() => updateTask(task.id, { status: 'Done' })}>Done</button>
                      </div>
                      <div className="linked-record-list">
                        {task.checklist.map((item) => (
                          <label key={item.id} className="linked-record-row" style={{ cursor: 'pointer' }}>
                            <strong>
                              <input type="checkbox" checked={item.done} onChange={() => toggleChecklist(task.id, item.id)} /> {item.label}
                            </strong>
                            <span>{item.done ? 'Completed' : 'Waiting'}</span>
                          </label>
                        ))}
                      </div>
                      <div className="hero-actions">
                        <button className="ghost" onClick={() => beginTaskEdit(task)}>Edit task</button>
                        <button className="ghost danger" onClick={() => removeTask(task.id)}>Delete task</button>
                      </div>
                    </>
                  )}
                </div>
              );
            }) : <div className="empty">No tasks yet for this customer or project.</div>}
          </div>
        </div>
      </div>
    </section>
  );
};
