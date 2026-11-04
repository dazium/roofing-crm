import React, { useState } from 'react';
import { Package, Plus, Trash2, Check, RefreshCw } from 'lucide-react';
import type { MaterialPriceSetting } from '../types';

export interface SelectedMaterial {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  unitPrice?: number;
}

interface MaterialsChecklistProps {
  onMaterialsChange?: (materials: SelectedMaterial[]) => void;
  materialPrices?: MaterialPriceSetting[];
  initialMaterials?: SelectedMaterial[];
}

export const DEFAULT_CATALOG_ITEMS = [
  { id: 'mat-shingles', name: 'Architectural Shingles (3-bundle/sq)', category: 'Shingles', unit: 'bdl', defaultQty: 30 },
  { id: 'mat-starter', name: 'Starter Strip Shingles', category: 'Accessories', unit: 'bdl', defaultQty: 3 },
  { id: 'mat-ridge-cap', name: 'Hip & Ridge Cap Shingles', category: 'Accessories', unit: 'bdl', defaultQty: 4 },
  { id: 'mat-underlayment', name: 'Synthetic Roof Underlayment (10 sq roll)', category: 'Underlayment', unit: 'roll', defaultQty: 3 },
  { id: 'mat-ice-water', name: 'Ice & Water Shield (2 sq roll)', category: 'Underlayment', unit: 'roll', defaultQty: 2 },
  { id: 'mat-drip-edge', name: 'Aluminum Drip Edge (10 ft)', category: 'Flashing', unit: 'pcs', defaultQty: 20 },
  { id: 'mat-ridge-vent', name: 'Continuous Ridge Vent (4 ft)', category: 'Ventilation', unit: 'pcs', defaultQty: 10 },
  { id: 'mat-roof-cement', name: 'Flashing Cement / Mastic', category: 'Sealants', unit: 'tube', defaultQty: 4 },
  { id: 'mat-nails-box', name: '1-1/4" Coil Roofing Nails (Box)', category: 'Fasteners', unit: 'box', defaultQty: 2 },
  { id: 'mat-plywood', name: '1/2" CDX Plywood Roof Decking', category: 'Decking', unit: 'sheet', defaultQty: 4 },
];

export const MaterialsChecklist: React.FC<MaterialsChecklistProps> = ({
  onMaterialsChange,
  materialPrices = [],
  initialMaterials = [],
}) => {
  const [selectedItems, setSelectedItems] = useState<SelectedMaterial[]>(() => {
    if (initialMaterials.length > 0) return initialMaterials;
    return DEFAULT_CATALOG_ITEMS.slice(0, 5).map((m) => {
      const priceRecord = materialPrices.find((p) => p.id === m.id);
      return {
        id: m.id,
        name: m.name,
        category: m.category,
        quantity: m.defaultQty,
        unit: m.unit,
        unitPrice: priceRecord?.price,
      };
    });
  });

  const [filterCategory, setFilterCategory] = useState<string>('All');

  const categories = ['All', ...Array.from(new Set(DEFAULT_CATALOG_ITEMS.map((i) => i.category)))];

  const handleToggle = (item: typeof DEFAULT_CATALOG_ITEMS[0]) => {
    setSelectedItems((prev) => {
      const exists = prev.some((i) => i.id === item.id);
      let next: SelectedMaterial[];
      if (exists) {
        next = prev.filter((i) => i.id !== item.id);
      } else {
        const priceRecord = materialPrices.find((p) => p.id === item.id);
        next = [
          ...prev,
          {
            id: item.id,
            name: item.name,
            category: item.category,
            quantity: item.defaultQty,
            unit: item.unit,
            unitPrice: priceRecord?.price,
          },
        ];
      }
      onMaterialsChange?.(next);
      return next;
    });
  };

  const handleQtyChange = (id: string, qty: number) => {
    setSelectedItems((prev) => {
      const next = prev.map((item) =>
        item.id === id ? { ...item, quantity: Math.max(1, qty) } : item
      );
      onMaterialsChange?.(next);
      return next;
    });
  };

  const totalCost = selectedItems.reduce((sum, item) => {
    const price = item.unitPrice ?? materialPrices.find((p) => p.id === item.id)?.price ?? 0;
    return sum + price * item.quantity;
  }, 0);

  const displayedCatalog = filterCategory === 'All'
    ? DEFAULT_CATALOG_ITEMS
    : DEFAULT_CATALOG_ITEMS.filter((i) => i.category === filterCategory);

  return (
    <div className="card blueprint-card" style={{ marginTop: '1rem', border: '1px solid var(--accent)' }}>
      <div className="section-head" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Package size={20} className="text-accent" />
          <div>
            <h3 style={{ margin: 0 }}>Materials Checklist & Takeoff</h3>
            <p className="subtext" style={{ margin: 0 }}>
              Adapted from Manus Materials Checklist: Quick selection, takeoff bundling, and live pricing rollup.
            </p>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            className={filterCategory === cat ? 'primary' : 'ghost'}
            style={{ fontSize: '0.8rem', padding: '0.25rem 0.65rem' }}
            onClick={() => setFilterCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
        {displayedCatalog.map((item) => {
          const selected = selectedItems.find((s) => s.id === item.id);
          const priceRecord = materialPrices.find((p) => p.id === item.id);
          return (
            <div
              key={item.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.6rem 0.75rem',
                borderRadius: '6px',
                border: selected ? '1px solid var(--accent)' : '1px solid var(--line)',
                background: selected ? 'rgba(245, 158, 11, 0.08)' : 'rgba(255, 255, 255, 0.02)',
              }}
            >
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', flex: 1 }}>
                <input
                  type="checkbox"
                  checked={Boolean(selected)}
                  onChange={() => handleToggle(item)}
                />
                <div>
                  <strong style={{ fontSize: '0.85rem', display: 'block' }}>{item.name}</strong>
                  <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                    {priceRecord ? `$${priceRecord.price.toFixed(2)} / ${item.unit}` : item.category}
                  </span>
                </div>
              </label>

              {selected && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginLeft: '0.5rem' }}>
                  <input
                    type="number"
                    min="1"
                    style={{ width: '65px', padding: '0.2rem 0.4rem', fontSize: '0.85rem' }}
                    value={selected.quantity}
                    onChange={(e) => handleQtyChange(item.id, parseInt(e.target.value, 10) || 1)}
                  />
                  <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{item.unit}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {selectedItems.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '0.75rem 1rem', borderRadius: '6px' }}>
          <div>
            <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
              {selectedItems.length} material categories staged for takeoff
            </span>
          </div>
          {totalCost > 0 && (
            <div>
              <span style={{ fontSize: '0.85rem', color: 'var(--muted)', marginRight: '0.5rem' }}>
                Estimated Materials Total:
              </span>
              <strong style={{ fontSize: '1.2rem', color: 'var(--accent)' }}>
                ${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </strong>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
