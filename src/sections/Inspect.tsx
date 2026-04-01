import type { AppData, DamageType, PhotoCategory, Urgency } from '../types';
import { badgeTone, formatBytes, openAddressInMaps, openEmailClient, openPhoneDialer } from '../lib';
import { RoofMathPanel } from '../components/RoofMathPanel';

interface InspectionForm {
  roofType: string;
  roofAge: string;
  pitch: string;
  stories: string;
  damageType: DamageType;
  urgency: Urgency;
  leakActive: boolean;
  deckingConcern: boolean;
  flashingConcern: boolean;
  ventilationConcern: boolean;
  insuranceClaim: boolean;
  summary: string;
  recommendation: string;
  calculatorLength: number;
  calculatorWidth: number;
  squares: number;
  ridgeLength: number;
  valleyLength: number;
  eavesLength: number;
  rakeLength: number;
  wasteFactor: number;
}

interface InspectProps {
  data: AppData;
  selectedCustomerId: string | null;
  selectCustomer: (customerId: string | null, nextData?: AppData) => void;
  photoCategory: PhotoCategory;
  setPhotoCategory: React.Dispatch<React.SetStateAction<PhotoCategory>>;
  photoLabel: string;
  setPhotoLabel: React.Dispatch<React.SetStateAction<string>>;
  inspectionForm: InspectionForm;
  setInspectionForm: React.Dispatch<React.SetStateAction<InspectionForm>>;
  handlePhotoUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  removeInspectionPhoto: (photoId: string) => void;
  saveInspection: () => void;
  goToProposal: () => void;
  galleryInputRef: React.RefObject<HTMLInputElement | null>;
  cameraInputRef: React.RefObject<HTMLInputElement | null>;
}

export const Inspect: React.FC<InspectProps> = ({
  data,
  selectedCustomerId,
  selectCustomer,
  photoCategory,
  setPhotoCategory,
  photoLabel,
  setPhotoLabel,
  inspectionForm,
  setInspectionForm,
  handlePhotoUpload,
  removeInspectionPhoto,
  saveInspection,
  goToProposal,
  galleryInputRef,
  cameraInputRef
}) => {
  const selectedCustomer = data.customers.find((customer) => customer.id === selectedCustomerId) || null;
  const lengthFeet = Number(inspectionForm.calculatorLength) || 0;
  const widthFeet = Number(inspectionForm.calculatorWidth) || 0;
  const basePlanSquareFeet = lengthFeet * widthFeet;
  const basePlanSquares = Number((basePlanSquareFeet / 100).toFixed(1));
  const selectedInspection = data.inspections.find((inspection) => inspection.customerId === selectedCustomerId) ?? null;
  const selectedInspectionPhotoBytes = selectedInspection?.photos.reduce((sum, photo) => sum + (photo.sizeBytes ?? 0), 0) ?? 0;

  function updateCalculator(nextLength: number, nextWidth: number) {
    const parsedLength = Number(nextLength) || 0;
    const parsedWidth = Number(nextWidth) || 0;
    const nextSquares = Number(((parsedLength * parsedWidth) / 100).toFixed(1));
    setInspectionForm({
      ...inspectionForm,
      calculatorLength: parsedLength,
      calculatorWidth: parsedWidth,
      squares: nextSquares
    });
  }

  function saveAndContinue() {
    saveInspection();
    goToProposal();
  }

  return (
    <section className="content-grid two-col">
      <div className="column-stack">
        <div className="card">
          <div className="section-head">
            <h3>{selectedCustomer ? `Inspection for ${selectedCustomer.name}` : 'Select a customer'}</h3>
            <span>
              {selectedCustomer?.address ? (
                <button type="button" className="address-link" onClick={() => openAddressInMaps(selectedCustomer.address)}>
                  {selectedCustomer.address}
                </button>
              ) : 'Choose a customer from Customers to begin'}
            </span>
          </div>
          {selectedCustomer ? (
            <div className="form-grid">
              <div className="section-block selection-block">
                <div className="section-subhead">
                  <h4>Selection</h4>
                  <span>Switch the customer here and the inspection context follows.</span>
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
                </div>
              </div>
              <div className="mini-stats-grid">
                <div className="mini-stat-card">
                  <span>Base plan squares</span>
                  <strong>{inspectionForm.squares || 0}</strong>
                </div>
                <div className="mini-stat-card">
                  <span>Urgency</span>
                  <strong>{inspectionForm.urgency}</strong>
                </div>
                <div className="mini-stat-card">
                  <span>Damage type</span>
                  <strong>{inspectionForm.damageType}</strong>
                </div>
              </div>
              <div className="summary-box">
                <div className="customer-detail-grid">
                  <div className="customer-detail-row">
                    <span>Phone</span>
                    <strong>
                      {selectedCustomer.phone ? (
                        <button type="button" className="address-link" onClick={() => openPhoneDialer(selectedCustomer.phone)}>
                          {selectedCustomer.phone}
                        </button>
                      ) : 'Not set'}
                    </strong>
                  </div>
                  <div className="customer-detail-row">
                    <span>Email</span>
                    <strong>
                      {selectedCustomer.email ? (
                        <button type="button" className="address-link" onClick={() => openEmailClient(selectedCustomer.email)}>
                          {selectedCustomer.email}
                        </button>
                      ) : 'Not set'}
                    </strong>
                  </div>
                </div>
              </div>

              <div className="section-block">
                <div className="section-subhead">
                  <h4>Roof details</h4>
                  <span>Basic site and roof information.</span>
                </div>
                <div className="split-grid">
                  <label className="field">
                    <span>Roof type</span>
                    <input
                      value={inspectionForm.roofType}
                      onChange={(event) => setInspectionForm({ ...inspectionForm, roofType: event.target.value })}
                    />
                  </label>
                  <label className="field">
                    <span>Roof age</span>
                    <input
                      value={inspectionForm.roofAge}
                      onChange={(event) => setInspectionForm({ ...inspectionForm, roofAge: event.target.value })}
                    />
                  </label>
                </div>
                <div className="split-grid">
                  <label className="field">
                    <span>Pitch</span>
                    <input
                      value={inspectionForm.pitch}
                      onChange={(event) => setInspectionForm({ ...inspectionForm, pitch: event.target.value })}
                    />
                  </label>
                  <label className="field">
                    <span>Stories</span>
                    <input
                      value={inspectionForm.stories}
                      onChange={(event) => setInspectionForm({ ...inspectionForm, stories: event.target.value })}
                    />
                  </label>
                </div>
                <div className="split-grid">
                  <label className="field">
                    <span>Damage type</span>
                    <select
                      value={inspectionForm.damageType}
                      onChange={(event) => setInspectionForm({ ...inspectionForm, damageType: event.target.value as DamageType })}
                    >
                      <option>Leak</option>
                      <option>Shingle Damage</option>
                      <option>Flashing</option>
                      <option>Ventilation</option>
                      <option>Animal Damage</option>
                      <option>Storm Damage</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>Urgency</span>
                    <select
                      value={inspectionForm.urgency}
                      onChange={(event) => setInspectionForm({ ...inspectionForm, urgency: event.target.value as Urgency })}
                    >
                      <option>Low</option>
                      <option>Medium</option>
                      <option>High</option>
                      <option>Emergency</option>
                    </select>
                  </label>
                </div>
              </div>

              <div className="section-block">
                <div className="section-subhead">
                  <h4>Measurements</h4>
                  <span>Enter base plan measurements. Pitch and waste are applied in roof math.</span>
                </div>
                <div className="calculator-row">
                  <label className="field">
                    <span>Length (ft)</span>
                    <input
                      type="number"
                      value={inspectionForm.calculatorLength || ''}
                      onChange={(event) => {
                        updateCalculator(Number(event.target.value) || 0, inspectionForm.calculatorWidth);
                      }}
                    />
                  </label>
                  <label className="field">
                    <span>Width (ft)</span>
                    <input
                      type="number"
                      value={inspectionForm.calculatorWidth || ''}
                      onChange={(event) => {
                        updateCalculator(inspectionForm.calculatorLength, Number(event.target.value) || 0);
                      }}
                    />
                  </label>
                  <div className="calculator-result">
                    <span>Calculator result</span>
                    <strong>{basePlanSquares.toFixed(1)} sq</strong>
                    <small>{Math.round(basePlanSquareFeet)} sq ft base plan area</small>
                  </div>
                </div>
                <div className="status-note">
                  Length x width fills the <strong>Base plan squares</strong> field automatically. The roof math panel then applies pitch and waste to produce roofing quantities.
                </div>
                <div className="measure-grid">
                  <label className="field">
                    <span>Base plan squares</span>
                    <input
                      type="number"
                      value={inspectionForm.squares}
                      onChange={(event) => setInspectionForm({ ...inspectionForm, squares: Number(event.target.value) })}
                    />
                  </label>
                  <label className="field">
                    <span>Ridge length</span>
                    <input
                      type="number"
                      value={inspectionForm.ridgeLength}
                      onChange={(event) => setInspectionForm({ ...inspectionForm, ridgeLength: Number(event.target.value) })}
                    />
                  </label>
                  <label className="field">
                    <span>Valley length</span>
                    <input
                      type="number"
                      value={inspectionForm.valleyLength}
                      onChange={(event) => setInspectionForm({ ...inspectionForm, valleyLength: Number(event.target.value) })}
                    />
                  </label>
                  <label className="field">
                    <span>Eaves length</span>
                    <input
                      type="number"
                      value={inspectionForm.eavesLength}
                      onChange={(event) => setInspectionForm({ ...inspectionForm, eavesLength: Number(event.target.value) })}
                    />
                  </label>
                  <label className="field">
                    <span>Rake length</span>
                    <input
                      type="number"
                      value={inspectionForm.rakeLength}
                      onChange={(event) => setInspectionForm({ ...inspectionForm, rakeLength: Number(event.target.value) })}
                    />
                  </label>
                  <label className="field">
                    <span>Waste factor %</span>
                    <input
                      type="number"
                      value={inspectionForm.wasteFactor}
                      onChange={(event) => setInspectionForm({ ...inspectionForm, wasteFactor: Number(event.target.value) })}
                    />
                  </label>
                </div>
              </div>

              <div className="section-block">
                <div className="section-subhead">
                  <h4>Inspection notes</h4>
                  <span>Flag site concerns and capture the field summary.</span>
                </div>
                <div className="check-grid">
                  <label>
                    <input
                      type="checkbox"
                      checked={inspectionForm.leakActive}
                      onChange={(event) => setInspectionForm({ ...inspectionForm, leakActive: event.target.checked })}
                    />
                    Active leak
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={inspectionForm.deckingConcern}
                      onChange={(event) => setInspectionForm({ ...inspectionForm, deckingConcern: event.target.checked })}
                    />
                    Decking concern
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={inspectionForm.flashingConcern}
                      onChange={(event) => setInspectionForm({ ...inspectionForm, flashingConcern: event.target.checked })}
                    />
                    Flashing concern
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={inspectionForm.ventilationConcern}
                      onChange={(event) => setInspectionForm({ ...inspectionForm, ventilationConcern: event.target.checked })}
                    />
                    Ventilation concern
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={inspectionForm.insuranceClaim}
                      onChange={(event) => setInspectionForm({ ...inspectionForm, insuranceClaim: event.target.checked })}
                    />
                    Insurance claim
                  </label>
                </div>
                <div className="split-grid">
                  <label className="field compact-textarea">
                    <span>Inspection summary</span>
                    <textarea
                      value={inspectionForm.summary}
                      onChange={(event) => setInspectionForm({ ...inspectionForm, summary: event.target.value })}
                    />
                  </label>
                  <label className="field compact-textarea">
                    <span>Recommended action</span>
                    <textarea
                      value={inspectionForm.recommendation}
                      onChange={(event) => setInspectionForm({ ...inspectionForm, recommendation: event.target.value })}
                    />
                  </label>
                </div>
                <div className="primary-actions">
                  <button onClick={saveAndContinue}>Save and go to proposal</button>
                  <button className="ghost" onClick={saveInspection}>Save inspection only</button>
                </div>
              </div>
            </div>
          ) : (
            <div className="empty">Pick a customer first from the Customers page.</div>
          )}
        </div>

        <RoofMathPanel
          measurements={{
            squares: inspectionForm.squares,
            ridgeLength: inspectionForm.ridgeLength,
            valleyLength: inspectionForm.valleyLength,
            eavesLength: inspectionForm.eavesLength,
            rakeLength: inspectionForm.rakeLength,
            wasteFactor: inspectionForm.wasteFactor,
          }}
          materialPrices={data.materialPrices}
          pitch={inspectionForm.pitch}
          title="Roof math"
          subtitle="Live quantities from the inspection measurements."
        />
      </div>

      <div className="column-stack">
        <div className="card">
          <div className="section-head">
            <h3>Field photos</h3>
            <span>Capture now or upload from the gallery</span>
          </div>
          {selectedCustomer ? (
            <div className="form-grid compact-grid">
              <div className="status-note">
                Mobile devices can open the camera directly. Uploaded photos are compressed before saving to keep Android backups and local storage smaller.
              </div>
              <div className="mini-stats-grid">
                <div className="mini-stat-card">
                  <span>Saved photos</span>
                  <strong>{selectedInspection?.photos.length ?? 0}</strong>
                </div>
                <div className="mini-stat-card">
                  <span>Stored photo size</span>
                  <strong>{formatBytes(selectedInspectionPhotoBytes)}</strong>
                </div>
                <div className="mini-stat-card">
                  <span>Current category</span>
                  <strong>{photoCategory}</strong>
                </div>
              </div>
              <div className="split-grid">
                <label className="field">
                  <span>Photo category</span>
                  <select
                    value={photoCategory}
                    onChange={(event) => setPhotoCategory(event.target.value as PhotoCategory)}
                  >
                    <option>Before</option>
                    <option>Damage</option>
                    <option>Progress</option>
                    <option>After</option>
                  </select>
                </label>
                <label className="field">
                  <span>Photo label</span>
                  <input
                    value={photoLabel}
                    onChange={(event) => setPhotoLabel(event.target.value)}
                    placeholder="Front slope leak, valley flashing, etc."
                  />
                </label>
              </div>
              <div className="hero-actions">
                <button className="ghost" onClick={() => cameraInputRef.current?.click()}>Open camera</button>
                <button className="ghost" onClick={() => galleryInputRef.current?.click()}>Upload from gallery</button>
              </div>
              <input
                ref={cameraInputRef}
                className="hidden-input"
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoUpload}
              />
              <input
                ref={galleryInputRef}
                className="hidden-input"
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
              />
            </div>
          ) : (
            <div className="empty">Select a customer to upload photos.</div>
          )}
        </div>

        <div className="card">
          <div className="section-head">
            <h3>Saved inspections</h3>
            <span>Most recent field reports</span>
          </div>
          <div className="list-grid">
            {data.inspections.map((inspection) => {
              const customer = data.customers.find((entry) => entry.id === inspection.customerId);
              return (
                <div key={inspection.id} className="stack-item inspection-card">
                  <div className="stack-item-top">
                    <strong>{customer?.name ?? 'Unknown customer'}</strong>
                    <span className={`pill pill-${badgeTone(inspection.urgency)}`}>
                      {inspection.urgency}
                    </span>
                  </div>
                  <p>{inspection.damageType} · {inspection.roofType} · {inspection.pitch || 'Pitch n/a'}</p>
                  <small>{inspection.summary || 'No summary entered yet.'}</small>
                  <div className="inspection-metrics">
                    <span>{inspection.measurements.squares} squares</span>
                    <span>{inspection.measurements.ridgeLength} ridge</span>
                    <span>{inspection.measurements.valleyLength} valley</span>
                    <span>{inspection.measurements.eavesLength} eaves</span>
                    <span>{inspection.measurements.rakeLength} rake</span>
                    <span>{inspection.measurements.wasteFactor}% waste</span>
                  </div>
                  <div className="inspection-flags">
                    {inspection.leakActive && <span className="mini-pill">Active leak</span>}
                    {inspection.flashingConcern && <span className="mini-pill">Flashing</span>}
                    {inspection.deckingConcern && <span className="mini-pill">Decking</span>}
                    {inspection.ventilationConcern && <span className="mini-pill">Ventilation</span>}
                    {inspection.insuranceClaim && <span className="mini-pill">Insurance</span>}
                  </div>
                  <div className="photo-grid">
                    {inspection.photos.length ? (
                      inspection.photos.map((photo) => (
                        <div key={photo.id} className="photo-card">
                          <img src={photo.dataUrl} alt={photo.label} />
                          <div className="photo-meta">
                            <strong>{photo.label}</strong>
                            <span>{photo.category}</span>
                            <span>{photo.width && photo.height ? `${photo.width} x ${photo.height}` : 'Optimized image'}</span>
                            <span>{formatBytes(photo.sizeBytes ?? 0)}</span>
                          </div>
                          {selectedCustomerId === inspection.customerId && (
                            <div className="photo-actions">
                              <button className="ghost danger" onClick={() => removeInspectionPhoto(photo.id)}>Remove photo</button>
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="empty">No photos uploaded yet.</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
