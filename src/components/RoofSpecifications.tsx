import { useState } from 'react';
import { calculateRoofEstimates, getComplexityDescription, type RoofSpecs, type RoofCalculations } from '../lib/roof-calculator';
import { Home, Zap, ShieldCheck } from 'lucide-react';

interface RoofSpecificationsProps {
  onApplyEstimates?: (calculations: RoofCalculations, specs: RoofSpecs) => void;
  defaultArea?: number;
  defaultPitch?: string;
}

const TEMPLATES: { name: string; desc: string; specs: Partial<RoofSpecs> }[] = [
  {
    name: 'Single Story Ranch',
    desc: 'Simple 4-pitch or 6-pitch gable with low cut-up complexity.',
    specs: { roofPitch: '4/12', numberOfValleys: 0, numberOfDormers: 0, numberOfChimneys: 1, numberOfSkyLights: 0, hasRidgeVent: true, tearOffRequired: true, wastePercentage: 10 }
  },
  {
    name: 'Two-Story Colonial / Split',
    desc: 'Standard 6/12 or 8/12 pitch with valleys and dormers.',
    specs: { roofPitch: '6/12', numberOfValleys: 2, numberOfDormers: 2, numberOfChimneys: 1, numberOfSkyLights: 0, hasRidgeVent: true, tearOffRequired: true, wastePercentage: 12 }
  },
  {
    name: 'Steep Architectural / Cape Cod',
    desc: 'Steep pitch, multiple dormers, valley flashing, and high labor complexity.',
    specs: { roofPitch: '10/12', numberOfValleys: 4, numberOfDormers: 3, numberOfChimneys: 1, numberOfSkyLights: 2, hasRidgeVent: true, tearOffRequired: true, wastePercentage: 15 }
  }
];

export const RoofSpecifications: React.FC<RoofSpecificationsProps> = ({
  onApplyEstimates,
  defaultArea = 2400,
  defaultPitch = '6/12',
}) => {
  const [specs, setSpecs] = useState<RoofSpecs>({
    roofArea: defaultArea,
    roofPitch: defaultPitch,
    numberOfValleys: 0,
    numberOfDormers: 0,
    numberOfChimneys: 1,
    numberOfSkyLights: 0,
    hasRidgeVent: true,
    tearOffRequired: true,
    roofType: 'asphalt_shingles',
    wastePercentage: 10,
  });

  const calculations: RoofCalculations = calculateRoofEstimates(specs);

  const applyTemplate = (tpl: typeof TEMPLATES[0]) => {
    setSpecs((prev) => ({
      ...prev,
      ...tpl.specs,
    }));
  };

  return (
    <div className="card blueprint-card" style={{ marginTop: '1rem', border: '1px solid var(--accent)' }}>
      <div className="section-head" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Zap size={20} className="text-accent" />
          <div>
            <h3 style={{ margin: 0 }}>Roof Specifications & Material Estimator</h3>
            <p className="subtext" style={{ margin: 0 }}>
              Calculates tear-off, ice & water shield, underlayment rolls, shingles, and labor difficulty factors.
            </p>
          </div>
        </div>
      </div>

      {/* Preset Quick Templates */}
      <div style={{ marginBottom: '1rem' }}>
        <span style={{ fontSize: '0.85rem', color: 'var(--muted)', display: 'block', marginBottom: '0.4rem' }}>
          Manus Quick Templates:
        </span>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {TEMPLATES.map((t) => (
            <button
              key={t.name}
              type="button"
              className="ghost"
              style={{ fontSize: '0.8rem', padding: '0.35rem 0.65rem' }}
              onClick={() => applyTemplate(t)}
            >
              {t.name}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
        <label className="field">
          <span>Plan Roof Area (sq ft)</span>
          <input
            type="number"
            min="100"
            step="50"
            value={specs.roofArea}
            onChange={(e) => setSpecs({ ...specs, roofArea: parseFloat(e.target.value) || 0 })}
          />
        </label>
        <label className="field">
          <span>Roof Pitch</span>
          <select value={specs.roofPitch} onChange={(e) => setSpecs({ ...specs, roofPitch: e.target.value })}>
            {['2/12', '4/12', '5/12', '6/12', '7/12', '8/12', '9/12', '10/12', '12/12'].map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Valleys</span>
          <input
            type="number"
            min="0"
            value={specs.numberOfValleys}
            onChange={(e) => setSpecs({ ...specs, numberOfValleys: parseInt(e.target.value, 10) || 0 })}
          />
        </label>
        <label className="field">
          <span>Dormers</span>
          <input
            type="number"
            min="0"
            value={specs.numberOfDormers}
            onChange={(e) => setSpecs({ ...specs, numberOfDormers: parseInt(e.target.value, 10) || 0 })}
          />
        </label>
        <label className="field">
          <span>Chimneys</span>
          <input
            type="number"
            min="0"
            value={specs.numberOfChimneys}
            onChange={(e) => setSpecs({ ...specs, numberOfChimneys: parseInt(e.target.value, 10) || 0 })}
          />
        </label>
        <label className="field">
          <span>Skylights</span>
          <input
            type="number"
            min="0"
            value={specs.numberOfSkyLights}
            onChange={(e) => setSpecs({ ...specs, numberOfSkyLights: parseInt(e.target.value, 10) || 0 })}
          />
        </label>
        <label className="field">
          <span>Waste %</span>
          <input
            type="number"
            min="5"
            max="30"
            value={specs.wastePercentage}
            onChange={(e) => setSpecs({ ...specs, wastePercentage: parseInt(e.target.value, 10) || 10 })}
          />
        </label>
      </div>

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={specs.hasRidgeVent}
            onChange={(e) => setSpecs({ ...specs, hasRidgeVent: e.target.checked })}
          />
          Has Continuous Ridge Vent
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={specs.tearOffRequired}
            onChange={(e) => setSpecs({ ...specs, tearOffRequired: e.target.checked })}
          />
          Tear-Off Existing Shingles Required
        </label>
      </div>

      {/* Calculated Metrics Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--line)' }}>
        <div>
          <span style={{ fontSize: '0.75rem', color: 'var(--muted)', display: 'block' }}>Effective Squares</span>
          <strong style={{ fontSize: '1.3rem', color: 'var(--accent)' }}>{calculations.estimatedSquares} sq</strong>
        </div>
        <div>
          <span style={{ fontSize: '0.75rem', color: 'var(--muted)', display: 'block' }}>Shingle Bundles</span>
          <strong style={{ fontSize: '1.3rem' }}>{calculations.estimatedShingles} bdls</strong>
        </div>
        <div>
          <span style={{ fontSize: '0.75rem', color: 'var(--muted)', display: 'block' }}>Underlayment</span>
          <strong style={{ fontSize: '1.3rem' }}>{calculations.estimatedUnderlayment} rolls</strong>
        </div>
        <div>
          <span style={{ fontSize: '0.75rem', color: 'var(--muted)', display: 'block' }}>Ice & Water Shield</span>
          <strong style={{ fontSize: '1.3rem' }}>{calculations.estimatedIceWater} rolls</strong>
        </div>
        <div>
          <span style={{ fontSize: '0.75rem', color: 'var(--muted)', display: 'block' }}>Est. Labor Hours</span>
          <strong style={{ fontSize: '1.3rem' }}>{calculations.estimatedLaborHours} hrs</strong>
        </div>
        <div>
          <span style={{ fontSize: '0.75rem', color: 'var(--muted)', display: 'block' }}>Complexity Rating</span>
          <strong style={{ fontSize: '1rem', color: 'var(--accent-2)' }}>{getComplexityDescription(calculations.complexityFactor)}</strong>
        </div>
      </div>

      {onApplyEstimates && (
        <div style={{ marginTop: '1rem', textAlign: 'right' }}>
          <button
            type="button"
            className="primary"
            onClick={() => onApplyEstimates(calculations, specs)}
          >
            Apply Calculations to Inspection
          </button>
        </div>
      )}
    </div>
  );
};
