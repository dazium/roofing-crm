import type { AppData, View } from '../types'
import { getSubcontractAccounts, getSubcontractDashboardSummary } from '../subcontractor'

type SubcontractorDashboardProps = {
  data: AppData
  setView: (view: View) => void
}

const money = (value: number) => value.toLocaleString(undefined, { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 })

export const SubcontractorDashboard: React.FC<SubcontractorDashboardProps> = ({ data, setView }) => {
  const summary = getSubcontractDashboardSummary(data)
  const accounts = getSubcontractAccounts(data)
  const workOrders = data.workOrders ?? []
  const activeOrders = workOrders.filter((order) => !['Completed', 'Ready for Invoice', 'Invoiced', 'Partially Paid', 'Paid', 'Closed', 'Cancelled', 'On Hold', 'Disputed'].includes(order.status))
  const readyOrders = workOrders.filter((order) => order.status === 'Ready for Invoice')
  const accountName = (accountId: string) => accounts.find((account) => account.id === accountId)?.name ?? 'Unknown company'
  const crewName = (crewId?: string) => crewId ? data.crews.find((crew) => crew.id === crewId)?.name ?? 'Crew unavailable' : 'Unassigned'

  return (
    <section className="content-grid">
      <div className="column-stack">
        <div className="card">
          <div className="section-head">
            <div><h3>Subcontractor Operations</h3><span>Incoming work, partner accounts, field execution and billing readiness</span></div>
            <button className="primary" onClick={() => setView('work-orders')}>Receive work order</button>
          </div>
          <div className="metric-grid">
            <div className="metric-card"><span>Active companies</span><strong>{summary.accounts}</strong></div>
            <div className="metric-card"><span>Active work orders</span><strong>{summary.activeWorkOrders}</strong></div>
            <div className="metric-card"><span>Ready to invoice</span><strong>{summary.readyForInvoice}</strong></div>
            <div className="metric-card"><span>Callbacks</span><strong>{summary.callbacks}</strong></div>
            <div className="metric-card"><span>Outstanding</span><strong>{money(summary.outstanding)}</strong></div>
            <div className="metric-card"><span>Overdue</span><strong>{money(summary.overdue)}</strong></div>
          </div>
          <div className="section-head">
            <div><h4>Quick actions</h4><span>Keep the subcontract workflow moving</span></div>
          </div>
          <div className="split-grid">
            <button className="secondary" onClick={() => setView('companies')}>Manage companies & contacts</button>
            <button className="secondary" onClick={() => setView('work-orders')}>View all work orders</button>
          </div>
        </div>
        <div className="card">
          <div className="section-head"><div><h3>Active work orders</h3><span>{activeOrders.length} currently open</span></div></div>
          <div className="list-stack">
            {activeOrders.slice(0, 8).map((order) => (
              <button className="list-row" key={order.id} onClick={() => setView('work-orders')}>
                <div><strong>{order.workOrderNumber}</strong><span>{accountName(order.accountId)} · {order.jobType}</span></div>
                <div><strong>{order.status}</strong><span>{order.scheduledDate || order.requestedStartDate || 'Not scheduled'}</span></div>
                <div><strong>{crewName(order.crewId)}</strong><span>{money(order.agreedPrice)}</span></div>
              </button>
            ))}
            {!activeOrders.length && <div className="empty-state">No active work orders yet. Receive the next subcontract order to get started.</div>}
          </div>
        </div>
      </div>
      <div className="column-stack">
        <div className="card">
          <div className="section-head"><div><h3>Partner accounts</h3><span>{accounts.length} saved companies</span></div><button className="secondary" onClick={() => setView('companies')}>Open accounts</button></div>
          <div className="list-stack">
            {accounts.slice(0, 8).map((account) => (
              <div className="list-row" key={account.id}>
                <div><strong>{account.name}</strong><span>{account.paymentTerms} · {account.status}</span></div>
                <div><strong>{workOrders.filter((order) => order.accountId === account.id).length}</strong><span>work orders</span></div>
              </div>
            ))}
            {!accounts.length && <div className="empty-state">Add the companies that send Munro & Sons subcontract work.</div>}
          </div>
        </div>
        <div className="card">
          <div className="section-head"><div><h3>Ready for invoicing</h3><span>{readyOrders.length} completed work orders awaiting billing</span></div><button className="secondary" onClick={() => setView('work-orders')}>Review work</button></div>
          <div className="list-stack">
            {readyOrders.slice(0, 6).map((order) => (
              <div className="list-row" key={order.id}>
                <div><strong>{order.workOrderNumber}</strong><span>{accountName(order.accountId)}</span></div>
                <div><strong>{money(order.agreedPrice)}</strong><span>{order.completionDate || 'Completion date not recorded'}</span></div>
              </div>
            ))}
            {!readyOrders.length && <div className="empty-state">No work orders are waiting for invoicing.</div>}
          </div>
        </div>
      </div>
    </section>
  )
}
