import { useMemo, useState } from 'react'
import type { AppData, SubcontractorAccount, SubcontractorContact, SubcontractorContactRole } from '../types'
import { createSubcontractorAccount, createSubcontractorContact, getSubcontractDashboardSummary, getSubcontractFinancialSummary, getSubcontractContacts } from '../subcontractor'

type CompaniesProps = {
  data: AppData
  setData: React.Dispatch<React.SetStateAction<AppData>>
}

const CONTACT_ROLES: SubcontractorContactRole[] = [
  'Owner', 'Project Manager', 'Site Supervisor', 'Dispatcher', 'Estimator', 'Accounts Payable', 'Accounts Receivable', 'Safety Coordinator', 'Other'
]

export const Companies: React.FC<CompaniesProps> = ({ data, setData }) => {
  const accounts = data.subcontractAccounts ?? []
  const [selectedId, setSelectedId] = useState(accounts[0]?.id ?? null)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [showContactForm, setShowContactForm] = useState(false)
  const [accountForm, setAccountForm] = useState<Partial<SubcontractorAccount>>({
    name: '', address: '', phone: '', email: '', paymentTerms: 'Net 30', status: 'Active',
  })
  const [contactForm, setContactForm] = useState<Partial<SubcontractorContact>>({ role: 'Other', active: true })

  const filteredAccounts = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return accounts
    return accounts.filter((account) => [account.name, account.legalName, account.address, account.email, account.phone, account.paymentTerms]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query)))
  }, [accounts, search])

  const selected = accounts.find((account) => account.id === selectedId) ?? null
  const contacts = selected ? getSubcontractContacts(data, selected.id) : []
  const accountSummary = selected ? getSubcontractFinancialSummary(data, selected.id) : null
  const dashboard = getSubcontractDashboardSummary(data)

  function saveAccount() {
    if (!accountForm.name?.trim()) return
    const account = createSubcontractorAccount(accountForm)
    const nextData = { ...data, subcontractAccounts: [account, ...accounts] }
    setData(nextData)
    setSelectedId(account.id)
    setShowForm(false)
    setAccountForm({ name: '', address: '', phone: '', email: '', paymentTerms: 'Net 30', status: 'Active' })
  }

  function saveContact() {
    if (!selected || !contactForm.name?.trim()) return
    const contact = createSubcontractorContact(selected.id, contactForm)
    setData((prev) => ({ ...prev, subcontractContacts: [contact, ...(prev.subcontractContacts ?? [])] }))
    setShowContactForm(false)
    setContactForm({ role: 'Other', active: true })
  }

  function updateAccount(field: keyof SubcontractorAccount, value: string) {
    if (!selected) return
    setData((prev) => ({
      ...prev,
      subcontractAccounts: (prev.subcontractAccounts ?? []).map((account) => account.id === selected.id
        ? { ...account, [field]: value, updatedAt: new Date().toISOString() }
        : account),
    }))
  }

  return (
    <section className="content-grid">
      <div className="column-stack">
        <div className="card">
          <div className="section-head">
            <div>
              <h3>Subcontractor & Partner Accounts</h3>
              <span>Primary operating accounts</span>
            </div>
            <button className="primary" onClick={() => setShowForm((value) => !value)}>New company</button>
          </div>

          <div className="metric-grid">
            <div className="metric-card"><span>Active companies</span><strong>{dashboard.accounts}</strong></div>
            <div className="metric-card"><span>Active work orders</span><strong>{dashboard.activeWorkOrders}</strong></div>
            <div className="metric-card"><span>Ready to invoice</span><strong>{dashboard.readyForInvoice}</strong></div>
            <div className="metric-card"><span>Outstanding</span><strong>${dashboard.outstanding.toLocaleString()}</strong></div>
          </div>

          {showForm && (
            <div className="card inset-card">
              <div className="section-head"><h4>Create subcontractor account</h4></div>
              <div className="form-grid">
                <label className="field"><span>Company name</span><input value={accountForm.name ?? ''} onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })} /></label>
                <label className="field"><span>Address</span><input value={accountForm.address ?? ''} onChange={(e) => setAccountForm({ ...accountForm, address: e.target.value })} /></label>
                <div className="split-grid">
                  <label className="field"><span>Phone</span><input value={accountForm.phone ?? ''} onChange={(e) => setAccountForm({ ...accountForm, phone: e.target.value })} /></label>
                  <label className="field"><span>Email</span><input value={accountForm.email ?? ''} onChange={(e) => setAccountForm({ ...accountForm, email: e.target.value })} /></label>
                </div>
                <label className="field"><span>Payment terms</span><input value={accountForm.paymentTerms ?? ''} onChange={(e) => setAccountForm({ ...accountForm, paymentTerms: e.target.value })} /></label>
                <button className="primary" onClick={saveAccount}>Save company</button>
              </div>
            </div>
          )}

          <label className="field"><span>Search companies</span><input placeholder="Company, contact, email, phone..." value={search} onChange={(e) => setSearch(e.target.value)} /></label>
          <div className="list-stack">
            {filteredAccounts.map((account) => {
              const summary = getSubcontractFinancialSummary(data, account.id)
              return (
                <button key={account.id} className={`list-row ${selectedId === account.id ? 'selected' : ''}`} onClick={() => setSelectedId(account.id)}>
                  <div><strong>{account.name}</strong><span>{account.paymentTerms} · {account.status}</span></div>
                  <div><strong>{summary.activeWorkOrders}</strong><span>active jobs</span></div>
                  <div><strong>${summary.outstanding.toLocaleString()}</strong><span>outstanding</span></div>
                </button>
              )
            })}
            {!filteredAccounts.length && <div className="empty-state">No subcontractor accounts yet.</div>}
          </div>
        </div>
      </div>

      <div className="column-stack">
        {selected ? (
          <>
            <div className="card">
              <div className="section-head">
                <div><h3>{selected.name}</h3><span>Subcontractor / Partner</span></div>
                  <select value={selected.status} onChange={(e) => updateAccount('status', e.target.value)}>
                    <option>Active</option><option>Inactive</option><option>On Hold</option>
                  </select>
              </div>
              <div className="detail-stack">
                <label className="field"><span>Address</span><input value={selected.address} onChange={(e) => updateAccount('address', e.target.value)} /></label>
                <div className="split-grid">
                  <label className="field"><span>Phone</span><input value={selected.phone} onChange={(e) => updateAccount('phone', e.target.value)} /></label>
                  <label className="field"><span>Email</span><input value={selected.email} onChange={(e) => updateAccount('email', e.target.value)} /></label>
                </div>
                <div className="split-grid">
                  <label className="field"><span>Payment terms</span><input value={selected.paymentTerms} onChange={(e) => updateAccount('paymentTerms', e.target.value)} /></label>
                  <label className="field"><span>Standard labour rate</span><input type="number" value={selected.standardLabourRate ?? ''} onChange={(e) => updateAccount('standardLabourRate', e.target.value)} /></label>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="section-head"><div><h3>Account performance</h3><span>Work and receivables</span></div></div>
              {accountSummary && <div className="metric-grid">
                <div className="metric-card"><span>Total work orders</span><strong>{accountSummary.workOrders}</strong></div>
                <div className="metric-card"><span>Completed</span><strong>{accountSummary.completedWorkOrders}</strong></div>
                <div className="metric-card"><span>Billed</span><strong>${accountSummary.billed.toLocaleString()}</strong></div>
                <div className="metric-card"><span>Paid</span><strong>${accountSummary.paid.toLocaleString()}</strong></div>
                <div className="metric-card"><span>Outstanding</span><strong>${accountSummary.outstanding.toLocaleString()}</strong></div>
                <div className="metric-card"><span>Overdue</span><strong>${accountSummary.overdue.toLocaleString()}</strong></div>
              </div>}
            </div>

            <div className="card">
              <div className="section-head"><div><h3>Contacts</h3><span>{contacts.length} saved contacts</span></div><button className="secondary" onClick={() => setShowContactForm((value) => !value)}>Add contact</button></div>
              {showContactForm && <div className="form-grid inset-card">
                <label className="field"><span>Name</span><input value={contactForm.name ?? ''} onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })} /></label>
                <label className="field"><span>Role</span><select value={contactForm.role ?? 'Other'} onChange={(e) => setContactForm({ ...contactForm, role: e.target.value as SubcontractorContactRole })}>{CONTACT_ROLES.map((role) => <option key={role}>{role}</option>)}</select></label>
                <div className="split-grid"><label className="field"><span>Phone</span><input value={contactForm.phone ?? ''} onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })} /></label><label className="field"><span>Email</span><input value={contactForm.email ?? ''} onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })} /></label></div>
                <button className="primary" onClick={saveContact}>Save contact</button>
              </div>}
              <div className="list-stack">{contacts.map((contact) => <div className="list-row" key={contact.id}><div><strong>{contact.name}</strong><span>{contact.role}</span></div><div><strong>{contact.phone || '—'}</strong><span>{contact.email || 'No email'}</span></div></div>)}{!contacts.length && <div className="empty-state">Add the people you actually deal with at this company.</div>}</div>
            </div>
          </>
        ) : <div className="card empty-state">Create or select a subcontractor company to manage the account.</div>}
      </div>
    </section>
  )
}
