import { useMemo } from 'react';
import type { AppData, Estimate, EstimateLineItem, Inspection } from '../types';
import { buildEstimateLineItemsFromPlan, buildEstimatePdfHtml, companyDisplayName, companyTagline, money, openAddressInMaps, openEmailClient, openPhoneDialer } from '../lib';
import { RoofMathPanel } from '../components/RoofMathPanel';

interface EstimatesProps {
  data: AppData;
  setData: React.Dispatch<React.SetStateAction<AppData>>;
  selectedCustomerId: string | null;
  selectCustomer: (customerId: string | null, nextData?: AppData) => void;
  selectedJobId: string | null;
  selectJob: (jobId: string | null, nextData?: AppData) => void;
  estimateForm: Estimate;
  setEstimateForm: React.Dispatch<React.SetStateAction<Estimate>>;
  selectedInspection: Inspection | null;
  goToJobs: () => void;
  goToBilling: () => void;
}

function uid() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function cleanMoneyInput(value: number) {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function cleanPercentInput(value: number) {
  return Number.isFinite(value) ? clamp(value, 0, 100) : 0;
}

export const Estimates: React.FC<EstimatesProps> = ({
  data,
  setData,
  selectedCustomerId,
  selectCustomer,
  selectedJobId,
  selectJob,
  estimateForm,
  setEstimateForm,
  selectedInspection,
  goToJobs,
  goToBilling
}) => {
  const selectedJob = data.jobs.find((j) => j.id === selectedJobId) || null;
  const selectedCustomer = data.customers.find((c) => c.id === selectedCustomerId) || null;
  const selectedEstimate = data.estimates.find((e) => e.jobId === selectedJobId) || null;
  const selectedInspectionSquares = selectedInspection?.measurements.squares ?? 0;

  const proposalTotals = useMemo(() => {
    const lineItemsSubtotal = estimateForm.lineItems.reduce((sum, item) => sum + cleanMoneyInput(Number(item.total || 0)), 0);
    const overhead = cleanMoneyInput(Number(estimateForm.overheadCost));
    const subtotal = lineItemsSubtotal + overhead;
    const marginPercent = cleanPercentInput(Number(estimateForm.profitMargin));
    const taxPercent = cleanPercentInput(Number(estimateForm.taxRate));
    const depositPercent = cleanPercentInput(Number(estimateForm.depositRequired));
    const marginAmount = subtotal * (marginPercent / 100);
    const pretax = subtotal + marginAmount;
    const tax = pretax * (taxPercent / 100);
    const grand = pretax + tax;
    const deposit = grand * (depositPercent / 100);
    return { lineItemsSubtotal, overhead, subtotal, marginPercent, marginAmount, pretax, taxPercent, tax, depositPercent, grand, deposit };
  }, [estimateForm]);

  function setNumberField<K extends 'squareFeet' | 'squares' | 'materialCost' | 'laborCost' | 'overheadCost' | 'profitMargin' | 'taxRate' | 'depositRequired'>(
    field: K,
    value: number
  ) {
    const cleaned = ['profitMargin', 'taxRate', 'depositRequired'].includes(field)
      ? cleanPercentInput(value)
      : cleanMoneyInput(value);

    setEstimateForm((prev) => ({
      ...prev,
      [field]: cleaned
    }));
  }

  function updateLineItem(id: string, field: keyof EstimateLineItem, value: string | number) {
    setEstimateForm((prev) => {
      const lineItems = prev.lineItems.map((item) => {
        if (item.id !== id) return item;
        const next = { ...item, [field]: value } as EstimateLineItem;
        if (field === 'quantity') next.quantity = cleanMoneyInput(Number(next.quantity));
        if (field === 'unitPrice') next.unitPrice = cleanMoneyInput(Number(next.unitPrice));
        if (field === 'quantity' || field === 'unitPrice') next.total = cleanMoneyInput(Number(next.quantity) * Number(next.unitPrice));
        return next;
      });

      const materialCost = lineItems
        .filter((item) => item.title.trim().toLowerCase() !== 'labour')
        .reduce((sum, item) => sum + cleanMoneyInput(Number(item.total || 0)), 0);
      const laborCost = lineItems
        .filter((item) => item.title.trim().toLowerCase() === 'labour')
        .reduce((sum, item) => sum + cleanMoneyInput(Number(item.total || 0)), 0);

      return {
        ...prev,
        lineItems,
        materialCost,
        laborCost
      };
    });
  }

  function addLineItem() {
    setEstimateForm((prev) => ({
      ...prev,
      lineItems: [...prev.lineItems, { id: uid(), title: '', quantity: 1, unit: 'lot', unitPrice: 0, total: 0 }]
    }));
  }

  function removeLineItem(id: string) {
    setEstimateForm((prev) => {
      const lineItems = prev.lineItems.filter((item) => item.id !== id);
      const materialCost = lineItems
        .filter((item) => item.title.trim().toLowerCase() !== 'labour')
        .reduce((sum, item) => sum + cleanMoneyInput(Number(item.total || 0)), 0);
      const laborCost = lineItems
        .filter((item) => item.title.trim().toLowerCase() === 'labour')
        .reduce((sum, item) => sum + cleanMoneyInput(Number(item.total || 0)), 0);

      return {
        ...prev,
        lineItems,
        materialCost,
        laborCost
      };
    });
  }

  function syncEstimateFromPlan() {
    if (!selectedInspection) return;
    const { plan, lineItems, materialCost, laborCost } = buildEstimateLineItemsFromPlan(
      selectedInspection.measurements,
      selectedInspection.pitch,
      data.materialPrices,
      uid,
    );

    setEstimateForm((prev) => ({
      ...prev,
      squareFeet: Math.round(plan.slopeAdjustedSquares * 100),
      squares: Number(plan.slopeAdjustedSquares.toFixed(1)),
      materialCost,
      laborCost,
      lineItems
    }));
  }

  function saveEstimate() {
    if (!selectedJobId) return;
    const record: Estimate = {
      ...estimateForm,
      profitMargin: proposalTotals.marginPercent,
      taxRate: proposalTotals.taxPercent,
      depositRequired: proposalTotals.depositPercent,
      overheadCost: proposalTotals.overhead,
      totalPrice: proposalTotals.grand,
      id: selectedEstimate?.id || estimateForm.id || uid(),
      jobId: selectedJobId
    };
    const nextData = { ...data, estimates: [...data.estimates.filter((estimate) => estimate.jobId !== selectedJobId), record] };
    setData(nextData);
    selectJob(selectedJobId, nextData);
  }

  async function exportEstimatePdf() {
    if (!selectedCustomer || !selectedJob) return;

    const record: Estimate = {
      ...estimateForm,
      profitMargin: proposalTotals.marginPercent,
      taxRate: proposalTotals.taxPercent,
      depositRequired: proposalTotals.depositPercent,
      overheadCost: proposalTotals.overhead,
      totalPrice: proposalTotals.grand,
      id: selectedEstimate?.id || estimateForm.id || uid(),
      jobId: selectedJob.id
    };

    const html = buildEstimatePdfHtml({
      companyProfile: data.companyProfile,
      customerName: selectedCustomer.name,
      customerAddress: selectedCustomer.address,
      customerPhone: selectedCustomer.phone,
      customerEmail: selectedCustomer.email,
      jobTitle: selectedJob.title,
      estimate: record,
      inspection: selectedInspection,
      totals: {
        lineItemsSubtotal: proposalTotals.lineItemsSubtotal,
        overhead: proposalTotals.overhead,
        subtotal: proposalTotals.subtotal,
        marginAmount: proposalTotals.marginAmount,
        tax: proposalTotals.tax,
        grand: proposalTotals.grand,
        deposit: proposalTotals.deposit,
      }
    });

    const suggestedName = `${selectedCustomer.name.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'estimate'}-${new Date().toISOString().slice(0, 10)}.pdf`;

    if (window.roofingcrmDesktop?.exportEstimatePdf) {
      await window.roofingcrmDesktop.exportEstimatePdf({ html, suggestedName });
      return;
    }

    const printWindow = window.open('', '_blank', 'noopener,noreferrer,width=900,height=1200');
    if (!printWindow) return;
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  function saveAndGoToJobs() {
    saveEstimate();
    goToJobs();
  }

  return (
    <section className="content-grid">
      <div className="column-stack">
        <div className="card">
          <div className="section-head">
            <h3>{selectedJob ? `Proposal Builder: ${selectedJob.title}` : 'Select a job'}</h3>
            <span>{selectedCustomer?.name ?? 'No customer selected'}</span>
          </div>
          {selectedJob ? (
            <div className="form-grid compact-grid">
              <div className="section-block selection-block">
                <div className="section-subhead">
                  <h4>Selection</h4>
                  <span>Pick a customer and jump straight into that customer’s proposal job.</span>
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
                    <span>Job</span>
                    <select value={selectedJobId ?? ''} onChange={(event) => selectJob(event.target.value || null)}>
                      <option value="">Select a job</option>
                      {data.jobs.filter((job) => !selectedCustomerId || job.customerId === selectedCustomerId).map((job) => {
                        const customer = data.customers.find((entry) => entry.id === job.customerId);
                        return (
                          <option key={job.id} value={job.id}>
                            {job.title} — {customer?.name ?? 'Unknown customer'}
                          </option>
                        );
                      })}
                    </select>
                  </label>
                </div>
              </div>
              <div className="estimate-overview">
                <div className="estimate-tip">
                  Inspection shows <strong>{selectedInspectionSquares.toFixed(1)}</strong> plan squares. Use <strong>Build from measurements</strong> to convert the inspection into a first-pass material list and labour estimate. Final proposal total is <strong>{money(proposalTotals.grand)}</strong>.
                </div>
                <div className="hero-actions">
                  <button className="ghost" onClick={syncEstimateFromPlan}>Build from measurements</button>
                  <button className="ghost" onClick={exportEstimatePdf}>Export PDF</button>
                </div>
              </div>
              <div className="workflow-callout">
                <strong>Step 3: price the job clearly.</strong>
                <span>This page should read like a real proposal: quantities first, overhead and markup second, then tax and deposit.</span>
              </div>

              <div className="mini-stats-grid">
                <div className="mini-stat-card">
                  <span>Proposal total</span>
                  <strong>{money(proposalTotals.grand)}</strong>
                </div>
                <div className="mini-stat-card">
                  <span>Requested deposit</span>
                  <strong>{money(proposalTotals.deposit)}</strong>
                </div>
                <div className="mini-stat-card">
                  <span>Visible price before markup</span>
                  <strong>{money(proposalTotals.subtotal)}</strong>
                </div>
              </div>

              <div className="section-block">
                <div className="section-subhead">
                  <h4>Measurement snapshot</h4>
                  <span>These numbers describe the roof size that pricing is based on. Starter and drip edge are both derived from the same perimeter edge math (eaves + rakes).</span>
                </div>
                <div className="split-grid">
                  <label className="field">
                    <span>Slope-adjusted roof area (sq ft)</span>
                    <input
                      type="number"
                      value={estimateForm.squareFeet}
                      onChange={(e) => setNumberField('squareFeet', Number(e.target.value))}
                    />
                  </label>
                  <label className="field">
                    <span>Slope-adjusted roof area (squares)</span>
                    <input
                      type="number"
                      value={estimateForm.squares}
                      onChange={(e) => setNumberField('squares', Number(e.target.value))}
                    />
                  </label>
                </div>
              </div>

              <div className="section-block">
                <div className="section-subhead">
                  <h4>Pricing controls</h4>
                  <span>Line items drive the subtotal. Overhead, markup, tax, and deposit are applied on top.</span>
                </div>
                <div className="split-grid">
                  <label className="field">
                    <span>Material total</span>
                    <input type="number" value={estimateForm.materialCost} readOnly />
                  </label>
                  <label className="field">
                    <span>Labour total</span>
                    <input type="number" value={estimateForm.laborCost} readOnly />
                  </label>
                </div>
                <div className="split-grid">
                  <label className="field">
                    <span>Overhead</span>
                    <input
                      type="number"
                      min={0}
                      value={estimateForm.overheadCost}
                      onChange={(e) => setNumberField('overheadCost', Number(e.target.value))}
                    />
                  </label>
                  <label className="field">
                    <span>Markup %</span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={estimateForm.profitMargin}
                      onChange={(e) => setNumberField('profitMargin', Number(e.target.value))}
                    />
                  </label>
                </div>
                <div className="split-grid">
                  <label className="field">
                    <span>Tax %</span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={estimateForm.taxRate}
                      onChange={(e) => setNumberField('taxRate', Number(e.target.value))}
                    />
                  </label>
                  <label className="field">
                    <span>Deposit %</span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={estimateForm.depositRequired}
                      onChange={(e) => setNumberField('depositRequired', Number(e.target.value))}
                    />
                  </label>
                </div>
              </div>

              <div className="section-block">
                <div className="section-subhead">
                  <h4>Scope and homeowner terms</h4>
                  <span>What is included, how long it takes, and what is covered.</span>
                </div>
                <label className="field compact-textarea">
                  <span>Scope of work</span>
                  <textarea
                    value={estimateForm.scopeOfWork}
                    onChange={(e) => setEstimateForm({ ...estimateForm, scopeOfWork: e.target.value })}
                  />
                </label>
                <div className="split-grid">
                  <label className="field">
                    <span>Warranty</span>
                    <input
                      value={estimateForm.warranty}
                      onChange={(e) => setEstimateForm({ ...estimateForm, warranty: e.target.value })}
                    />
                  </label>
                  <label className="field">
                    <span>Timeline</span>
                    <input
                      value={estimateForm.timeline}
                      onChange={(e) => setEstimateForm({ ...estimateForm, timeline: e.target.value })}
                    />
                  </label>
                </div>
              </div>

              <div className="section-block">
                <div className="section-subhead">
                  <h4>Line items</h4>
                  <span>These values now directly drive the proposal subtotal shown to the customer.</span>
                </div>
                <div className="proposal-table">
                  <div className="proposal-table-head">
                    <span>Item</span>
                    <span>Qty</span>
                    <span>Unit</span>
                    <span>Unit price</span>
                    <span>Total</span>
                    <span>Action</span>
                  </div>
                  {estimateForm.lineItems.map((item) => (
                    <div key={item.id} className="proposal-row">
                      <input
                        placeholder="Item"
                        value={item.title}
                        onChange={(e) => updateLineItem(item.id, 'title', e.target.value)}
                      />
                      <input
                        type="number"
                        min={0}
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => updateLineItem(item.id, 'quantity', Number(e.target.value))}
                      />
                      <input
                        placeholder="Unit"
                        value={item.unit}
                        onChange={(e) => updateLineItem(item.id, 'unit', e.target.value)}
                      />
                      <input
                        type="number"
                        min={0}
                        placeholder="Unit price"
                        value={item.unitPrice}
                        onChange={(e) => updateLineItem(item.id, 'unitPrice', Number(e.target.value))}
                      />
                      <div className="proposal-total-cell">
                        {money(item.total)}
                      </div>
                      <button className="ghost row-action-button" onClick={() => removeLineItem(item.id)}>Remove</button>
                    </div>
                  ))}
                </div>
                <div className="mini-stats-grid">
                  <div className="mini-stat-card">
                    <span>Line items subtotal</span>
                    <strong>{money(proposalTotals.lineItemsSubtotal)}</strong>
                  </div>
                  <div className="mini-stat-card">
                    <span>Overhead</span>
                    <strong>{money(proposalTotals.overhead)}</strong>
                  </div>
                  <div className="mini-stat-card">
                    <span>Subtotal before markup</span>
                    <strong>{money(proposalTotals.subtotal)}</strong>
                  </div>
                </div>
                <div className="hero-actions">
                  <button className="ghost" onClick={addLineItem}>Add line item</button>
                  <button onClick={saveAndGoToJobs}>Save and open job</button>
                  <button className="ghost" onClick={saveEstimate}>Save proposal only</button>
                </div>
              </div>
            </div>
          ) : (
            <div className="empty">Pick a job first from the Jobs page.</div>
          )}
        </div>
      </div>

      <div className="column-stack">
        <div className="card">
          <div className="section-head">
            <h3>Proposal preview</h3>
            <span>Homeowner-ready summary</span>
          </div>
          {selectedCustomer && selectedJob ? (
            <div className="proposal-preview">
              <div className="proposal-brand">
                <strong>{companyDisplayName(data.companyProfile)}</strong>
                <span>{companyTagline(data.companyProfile)}</span>
              </div>
              <div className="detail-stack">
                <div>
                  <span>Customer</span>
                  <strong>{selectedCustomer.name}</strong>
                </div>
                <div>
                  <span>Property</span>
                  <strong>
                    <button type="button" className="address-link" onClick={() => openAddressInMaps(selectedCustomer.address)}>
                      {selectedCustomer.address}
                    </button>
                  </strong>
                </div>
                <div>
                  <span>Phone</span>
                  <strong>
                    {selectedCustomer.phone ? (
                      <button type="button" className="address-link" onClick={() => openPhoneDialer(selectedCustomer.phone)}>
                        {selectedCustomer.phone}
                      </button>
                    ) : 'Not set'}
                  </strong>
                </div>
                <div>
                  <span>Email</span>
                  <strong>
                    {selectedCustomer.email ? (
                      <button type="button" className="address-link" onClick={() => openEmailClient(selectedCustomer.email)}>
                        {selectedCustomer.email}
                      </button>
                    ) : 'Not set'}
                  </strong>
                </div>
                <div>
                  <span>Job</span>
                  <strong>{selectedJob.title}</strong>
                </div>
                <div>
                  <span>Timeline</span>
                  <strong>{estimateForm.timeline}</strong>
                </div>
                <div>
                  <span>Warranty</span>
                  <strong>{estimateForm.warranty}</strong>
                </div>
              </div>
              <div className="proposal-preview-box">
                <h4>Scope of Work</h4>
                <p>{estimateForm.scopeOfWork}</p>
              </div>
              <div className="proposal-preview-box">
                <h4>Pricing Summary</h4>
                <div className="detail-stack">
                  <div>
                    <span>Line items</span>
                    <strong>{money(proposalTotals.lineItemsSubtotal)}</strong>
                  </div>
                  <div>
                    <span>Overhead</span>
                    <strong>{money(proposalTotals.overhead)}</strong>
                  </div>
                  <div>
                    <span>Subtotal</span>
                    <strong>{money(proposalTotals.subtotal)}</strong>
                  </div>
                  <div>
                    <span>Markup</span>
                    <strong>{money(proposalTotals.marginAmount)}</strong>
                  </div>
                  <div>
                    <span>Tax</span>
                    <strong>{money(proposalTotals.tax)}</strong>
                  </div>
                  <div>
                    <span>Total</span>
                    <strong>{money(proposalTotals.grand)}</strong>
                  </div>
                  <div>
                    <span>Deposit</span>
                    <strong>{money(proposalTotals.deposit)}</strong>
                  </div>
                </div>
              </div>
              <div className="hero-actions">
                <button className="ghost" onClick={exportEstimatePdf}>Export PDF</button>
                <button className="ghost" onClick={goToJobs}>Go to job</button>
                <button className="ghost" onClick={goToBilling}>Go to billing</button>
              </div>
            </div>
          ) : (
            <div className="empty">Select a lead and job to preview a proposal.</div>
          )}
        </div>

        {selectedInspection ? (
          <RoofMathPanel
            measurements={selectedInspection.measurements}
            pitch={selectedInspection.pitch}
            materialPrices={data.materialPrices}
            title="Roof measurement breakdown"
            subtitle="Use this as the estimating reference. Build from measurements copies these quantities into the proposal items."
          />
        ) : (
          <div className="card">
            <div className="section-head">
              <h3>Roof measurement breakdown</h3>
              <span>Needs inspection data</span>
            </div>
            <div className="empty">Save an inspection to generate the measurement-based material plan.</div>
          </div>
        )}
      </div>
    </section>
  );
};
