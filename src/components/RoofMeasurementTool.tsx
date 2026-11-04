import React, { useState, useCallback } from 'react';
import { Calculator, Plus, Trash2, Layers, Check } from 'lucide-react';

export interface RoofSection {
  id: string;
  name: string;
  length: number;
  width: number;
  pitch: string;
  area: number;
  squares: number;
}

interface RoofMeasurementToolProps {
  onApplySquares?: (totalSquares: number, details: { length: number; width: number; pitch: string }) => void;
  initialPitch?: string;
}

const PITCH_OPTIONS = [
  { value: '2/12', label: '2/12 (Flat/Low Slope)' },
  { value: '4/12', label: '4/12 (Low Pitch)' },
  { value: '6/12', label: '6/12 (Standard)' },
  { value: '8/12', label: '8/12 (Steep)' },
  { value: '10/12', label: '10/12 (Very Steep)' },
  { value: '12/12', label: '12/12 (Extreme)' },
];

export const RoofMeasurementTool: React.FC<RoofMeasurementToolProps> = ({
  onApplySquares,
  initialPitch = '6/12',
}) => {
  const [sections, setSections] = useState<RoofSection[]>([]);
  const [currentLength, setCurrentLength] = useState<string>('');
  const [currentWidth, setCurrentWidth] = useState<string>('');
  const [currentPitch, setCurrentPitch] = useState<string>(initialPitch);
  const [sectionName, setSectionName] = useState<string>('');

  const calculatePitchFactor = (pitch: string) => {
    const [rise, run] = pitch.split('/').map(Number);
    if (!run || isNaN(run) || isNaN(rise)) return 1.0;
    return Math.sqrt(run * run + rise * rise) / run;
  };

  const addSection = useCallback(() => {
    const length = parseFloat(currentLength);
    const width = parseFloat(currentWidth);

    if (!length || !width || length <= 0 || width <= 0) {
      alert('Please enter a valid length and width');
      return;
    }

    const pitchFactor = calculatePitchFactor(currentPitch);
    const area = length * width * pitchFactor;
    const squares = area / 100;

    const newSection: RoofSection = {
      id: Date.now().toString(),
      name: sectionName.trim() || `Roof Plane ${sections.length + 1}`,
      length,
      width,
      pitch: currentPitch,
      area: Math.round(area * 10) / 10,
      squares: Math.round(squares * 10) / 10,
    };

    setSections((prev) => [...prev, newSection]);
    setCurrentLength('');
    setCurrentWidth('');
    setSectionName('');
  }, [currentLength, currentWidth, currentPitch, sectionName, sections]);

  const removeSection = (id: string) => {
    setSections((prev) => prev.filter((s) => s.id !== id));
  };

  const totalArea = Math.round(sections.reduce((sum, s) => sum + s.area, 0) * 10) / 10;
  const totalSquares = Math.round(sections.reduce((sum, s) => sum + s.squares, 0) * 10) / 10;

  return (
    <div className="card blueprint-card" style={{ marginTop: '1rem', border: '1px solid var(--accent)' }}>
      <div className="section-head" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Layers size={20} className="text-accent" />
          <div>
            <h3 style={{ margin: 0 }}>Interactive Roof Facet & Slope Calculator</h3>
            <p className="subtext" style={{ margin: 0 }}>
              Adapted from Manus CRM: Calculate individual roof planes, apply true slope geometry, and tally total squares.
            </p>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
        <label className="field">
          <span>Facet / Plane Name</span>
          <input
            type="text"
            placeholder="e.g. Front Gable"
            value={sectionName}
            onChange={(e) => setSectionName(e.target.value)}
          />
        </label>
        <label className="field">
          <span>Length (ft)</span>
          <input
            type="number"
            min="0"
            step="0.5"
            placeholder="e.g. 40"
            value={currentLength}
            onChange={(e) => setCurrentLength(e.target.value)}
          />
        </label>
        <label className="field">
          <span>Width / Slope Run (ft)</span>
          <input
            type="number"
            min="0"
            step="0.5"
            placeholder="e.g. 24"
            value={currentWidth}
            onChange={(e) => setCurrentWidth(e.target.value)}
          />
        </label>
        <label className="field">
          <span>Pitch</span>
          <select value={currentPitch} onChange={(e) => setCurrentPitch(e.target.value)}>
            {PITCH_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
          <button
            type="button"
            className="primary"
            style={{ width: '100%', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}
            onClick={addSection}
          >
            <Plus size={16} /> Add Facet
          </button>
        </div>
      </div>

      {sections.length > 0 && (
        <div style={{ marginBottom: '1rem', overflowX: 'auto' }}>
          <table className="table" style={{ width: '100%', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--line)' }}>
                <th style={{ padding: '0.5rem' }}>Facet</th>
                <th style={{ padding: '0.5rem' }}>Dimensions</th>
                <th style={{ padding: '0.5rem' }}>Pitch</th>
                <th style={{ padding: '0.5rem' }}>Area (sq ft)</th>
                <th style={{ padding: '0.5rem' }}>Squares</th>
                <th style={{ padding: '0.5rem', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {sections.map((sec) => (
                <tr key={sec.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '0.5rem', fontWeight: 600 }}>{sec.name}</td>
                  <td style={{ padding: '0.5rem' }}>{sec.length}' × {sec.width}'</td>
                  <td style={{ padding: '0.5rem' }}>{sec.pitch}</td>
                  <td style={{ padding: '0.5rem' }}>{sec.area.toLocaleString()} sq ft</td>
                  <td style={{ padding: '0.5rem', color: 'var(--accent)', fontWeight: 'bold' }}>{sec.squares} sq</td>
                  <td style={{ padding: '0.5rem', textAlign: 'right' }}>
                    <button
                      type="button"
                      className="ghost"
                      style={{ padding: '4px 8px', color: 'var(--danger)' }}
                      onClick={() => removeSection(sec.id)}
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ fontWeight: 'bold', background: 'rgba(255,255,255,0.03)' }}>
                <td style={{ padding: '0.5rem' }} colSpan={3}>Total Measured Facets ({sections.length})</td>
                <td style={{ padding: '0.5rem' }}>{totalArea.toLocaleString()} sq ft</td>
                <td style={{ padding: '0.5rem', color: 'var(--accent)', fontSize: '1rem' }}>{totalSquares} sq</td>
                <td style={{ padding: '0.5rem', textAlign: 'right' }}>
                  {onApplySquares && (
                    <button
                      type="button"
                      className="primary"
                      style={{ padding: '4px 10px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      onClick={() =>
                        onApplySquares(totalSquares, {
                          length: sections[0]?.length || 0,
                          width: sections[0]?.width || 0,
                          pitch: sections[0]?.pitch || currentPitch,
                        })
                      }
                    >
                      <Check size={14} /> Apply to Inspection
                    </button>
                  )}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
};
