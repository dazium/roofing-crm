import { useMemo, useState } from 'react'
import type { AppData, SubcontractorAccount, WorkOrder, WorkOrderStatus } from '../types'
import { canAdvanceWorkOrderStatus, createSubcontractorAccount, getSubcontractAccounts, getWorkOrdersForAccount, WORK_ORDER_STATUS_FLOW } from '../subcontractor'

type WorkOrdersProps = {
  data: AppData
  setData: React.Dispatch<React.SetStateAction<AppData>>
  selectedJobId: string | null
  selectJob: (jobId: string | null) => void
  setView: (view: any) => void
}

const INITIAL_FORM: Partial<WorkOrder> = {
  workOrderNumber: '', purchaseOrderNumber: '', jobType: 'Roofing', dateReceived: new Date().toISOString().slice(0, 10),
  requestedStartDate: '', deadline: '', scopeOfWork: '', materials: '', labourRequirements: '', crewRequirements: '',
  specialInstructions: '', estimatedValue: 0, agreedPrice: 0, status: 'New',
}

export const WorkOrders: React.FC<WorkOrdersProps> = ({ data, setData, selectedJobId, selectJob, setView }) => {
  const accounts = getSubcontractAccounts(data)
  const workOrders = data.workOrders ?? []
  const [selectedId, setSelectedId] = useState(workOrders[0]?.id ?? null)
  const [accountFilter, setAccountFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState<WorkOrderStatus | 'all'>('all')
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<Partial<WorkOrder>>(INITIAL_FORM)

  const selected = workOrders.find((order) => order.id === selectedId) ?? null
  const filtered = useMemo(() => workOrders.filter((order) => {
    const matchesAccount = accountFilter === 'all' || order.accountId === accountFilter
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter
    const q = search.trim().toLowerCase()
    const matchesSearch = !q || [order.workOrderNumber, order.purchaseOrderNumber, order.jobType, order.scopeOfWork, order.specialInstructions]
      .filter(Boolean).some((value) => String(value).toLowerCase().includes(q))
    return matchesAccount && matchesStatus && matchesSearch
  }), [workOrders, accountFilter, statusFilter, search])

  function saveWorkOrder() {
    if (!form.accountId || !form.scopeOfWork?.trim()) return
    const now = new Date().toISOString()
    const generatedNumber = form.workOrderNumber?.trim() || `WO-${new Date().getFullYear()}-${String(workOrders.length + 1).padStart(4, '0')}`
    const order: WorkOrder = {
      id: crypto.randomUUID(),
      accountId: form.accountId,
      jobId: selectedJobId ?? undefined,
      jobSiteId: form.jobSiteId,
      workOrderNumber: generatedNumber,
      purchaseOrderNumber: form.purchaseOrderNumber,
      contactId: form.contactId,
      dateReceived: form.dateReceived || now.slice(0, 10),
      requestedStartDate: form.requestedStartDate,
      deadline: form.deadline,
      jobType: form.jobType || 'Roofing',
      scopeOfWork: form.scopeOfWork,
      materials: form.materials || '',
      labourRequirements: form.labourRequirements || '',
      crewRequirements: form.crewRequirements || '',
      specialInstructions: form.specialInstructions || '',
      estimatedValue: Number(form.estimatedValue || 0),
      agreedPrice: Number(form.agreedPrice || 0),
      status: 'New',
      createdAt: now,
      updatedAt: now,
    }
    setData((prev) => ({ ...prev, workOrders: [order, ...(prev.workOrders ?? [])] }))
    setSelectedId(order.id)
    setShowForm(false)
    setForm(INITIAL_FORM)
  }

  function updateOrder(patch: Partial<WorkOrder>) {
    if (!selected) return
    setData((prev) => ({ ...prev, workOrders: (prev.workOrders ?? []).map((order) => order.id === selected.id ? { ...order, ...patch, updatedAt: new Date().toISOString() } : order) }))
  }

  function advanceStatus(next: WorkOrderStatus) {
    if (!selected || !canAdvanceWorkOrderStatus(selected.status, next)) return
    updateOrder({ status: next })
  }

  const accountName = (accountId: string) => accounts.find((account) => account.id === accountId)?.name ?? 'Unknown company'
  const linkedJob = selected?.jobId ? data.jobs.find((job) => job.id === selected.jobId) : null

  return (
    <section className="content-grid">
      <div className="column-stack">
        <div className="card">
          <div className="section-head"><div><h3>Subcontract Work Orders</h3><span>Run incoming work from larger roofing companies</span></div><button className="primary" onClick={() => setShowForm((value) => !value)}>New work order</button></div>
          <div className="filter-grid">
            <label className="field"><span>Company</span><select value={accountFilter} onChange={(e) => setAccountFilter(e.target.value)}><option value="all">All companies</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label>
            <label className="field"><span>Status</span><select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as WorkOrderStatus | 'all')}><option value="all">All statuses</option>{WORK_ORDER_STATUS_FLOW.map((status) => <option key={status}>{status}</option>)}<option>Callback Required</option><option>Disputed</option><option>Cancelled</option><option>On Hold</option></select></label>
            <label className="field"><span>Search</span><input placeholder="WO, PO, scope, job type..." value={search} onChange={(e) => setSearch(e.target.value)} /></label>
          </div>
          {showForm && (
            <div className="card inset-card">
              <div className="section-head"><div><h4>Create work order</h4><span>Start with the incoming subcontract scope.</span></div></div>
              <div className="form-grid">
                <div className="split-grid"><label className="field"><span>Subcontractor</span><select value={form.accountId ?? ''} onChange={(e) => setForm({ ...form, accountId: e.target.value })}><option value="">Select company</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label><label className="field"><span>Work order #</span><input value={form.workOrderNumber ?? ''} onChange={(e) => setForm({ ...form, workOrderNumber: e.target.value })} placeholder="Auto-generated if blank" /></label></div>
                <div className="split-grid"><label className="field"><span>PO number</span><input value={form.purchaseOrderNumber ?? ''} onChange={(e) => setForm({ ...form, purchaseOrderNumber: e.target.value })} /></label><label className="field"><span>Job type</span><input value={form.jobType ?? ''} onChange={(e) => setForm({ ...form, jobType: e.target.value })} /></label></div>
                <div className="split-grid"><label className="field"><span>Requested start</span><input type="date" value={form.requestedStartDate ?? ''} onChange={(e) => setForm({ ...form, requestedStartDate: e.target.value })} /></label><label className="field"><span>Deadline</span><input type="date" value={form.deadline ?? ''} onChange={(e) => setForm({ ...form, deadline: e.target.value })} /></label></div>
                <label className="field"><span>Scope of work</span><textarea rows={5} value={form.scopeOfWork ?? ''} onChange={(e) => setForm({ ...form, scopeOfWork: e.target.value })} placeholder="Paste or enter the exact subcontract scope..." /></label>
                <div className="split-grid"><label className="field"><span>Materials</span><textarea rows={3} value={form.materials ?? ''} onChange={(e) => setForm({ ...form, materials: e.target.value })} /></label><label className="field"><span>Labour requirements</span><textarea rows={3} value={form.labourRequirements ?? ''} onChange={(e) => setForm({ ...form, labourRequirements: e.target.value })} /></label></div>
                <div className="split-grid"><label className="field"><span>Crew requirements</span><textarea rows={3} value={form.crewRequirements ?? ''} onChange={(e) => setForm({ ...form, crewRequirements: e.target.value })} /></label><label className="field"><span>Special instructions</span><textarea rows={3} value={form.specialInstructions ?? ''} onChange={(e) => setForm({ ...form, specialInstructions: e.target.value })} /></label></div>
                <div className="split-grid"><label className="field"><span>Estimated value</span><input type="number" value={form.estimatedValue ?? 0} onChange={(e) => setForm({ ...form, estimatedValue: Number(e.target.value) })} /></label><label className="field"><span>Agreed price</span><input type="number" value={form.agreedPrice ?? 0} onChange={(e) => setForm({ ...form, agreedPrice: Number(e.target.value) })} /></label></div>
                <button className="primary" onClick={saveWorkOrder}>Create work order</button>
              </div>
            </div>
          )}
          <div className="list-stack">
            {filtered.map((order) => <button key={order.id} className={`list-row ${selectedId === order.id ? 'selected' : ''}`} onClick={() => setSelectedId(order.id)}><div><strong>{order.workOrderNumber}</strong><span>{accountName(order.accountId)} · {order.jobType}</span></div><div><strong>{order.status}</strong><span>{order.requestedStartDate || 'No start date'}</span></div><div><strong>${order.agreedPrice.toLocaleString()}</strong><span>{order.purchaseOrderNumber ? `PO ${order.purchaseOrderNumber}` : 'No PO'}</span></div></button>)}
            {!filtered.length && <div className="empty-state">No work orders match these filters.</div>}
          </div>
        </div>
      </div>

      <div className="column-stack">
        {selected ? <>
          <div className="card">
            <div className="section-head"><div><h3>{selected.workOrderNumber}</h3><span>{accountName(selected.accountId)} · {selected.jobType}</span></div><span className="status-pill">{selected.status}</span></div>
            <div className="status-flow">{WORK_ORDER_STATUS_FLOW.map((status, index) => <button key={status} disabled={!canAdvanceWorkOrderStatus(selected.status, status)} className={selected.status === status ? 'active' : ''} onClick={() => advanceStatus(status)}>{index + 1}. {status}</button>)}</div>
            {selected.status !== 'Callback Required' && <button className="secondary" onClick={() => advanceStatus('Callback Required')}>Flag callback required</button>}
            <div className="detail-stack">
              <label className="field"><span>Scope of work</span><textarea rows={8} value={selected.scopeOfWork} onChange={(e) => updateOrder({ scopeOfWork: e.target.value })} /></label>
              <div className="split-grid"><label className="field"><span>Materials</span><textarea rows={5} value={selected.materials} onChange={(e) => updateOrder({ materials: e.target.value })} /></label><label className="field"><span>Labour requirements</span><textarea rows={5} value={selected.labourRequirements} onChange={(e) => updateOrder({ labourRequirements: e.target.value })} /></label></div>
              <div className="split-grid"><label className="field"><span>Crew requirements</span><textarea rows={4} value={selected.crewRequirements} onChange={(e) => updateOrder({ crewRequirements: e.target.value })} /></label><label className="field"><span>Special instructions</span><textarea rows={4} value={selected.specialInstructions} onChange={(e) => updateOrder({ specialInstructions: e.target.value })} /></label></div>
              <div className="split-grid"><label className="field"><span>Agreed price</span><input type="number" value={selected.agreedPrice} onChange={(e) => updateOrder({ agreedPrice: Number(e.target.value) })} /></label><label className="field"><span>Deadline</span><input type="date" value={selected.deadline ?? ''} onChange={(e) => updateOrder({ deadline: e.target.value })} /></label></div>
            </div>
          </div>
          <div className="card"><div className="section-head"><div><h3>Linked project</h3><span>Connect this subcontract order to existing production.</span></div></div>{linkedJob ? <div className="list-row"><div><strong>{linkedJob.title}</strong><span>{linkedJob.status}</span></div><button className="secondary" onClick={() => { selectJob(linkedJob.id); setView('jobs') }}>Open job</button></div> : <div className="empty-state">This work order is not linked to a CRM job yet. Select a current job above when creating the order, or link it during the next workflow pass.</div>}</div>
        </> : <div className="card empty-state">Create or select a subcontract work order.</div>}
      </div>
    </section>
  )
}
