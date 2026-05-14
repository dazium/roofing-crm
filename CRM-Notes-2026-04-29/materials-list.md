# Standard Roofing Materials List

This is the predefined materials list used in the contractor CRM. Customize unit prices based on your supplier costs.

## Materials Checklist Component

Use this list in `MaterialsChecklist.tsx`:

```typescript
const MATERIALS = [
  { id: "drip-edge", name: "Drip Edge", category: "Flashing" },
  { id: "vents", name: "Vents", category: "Vents" },
  { id: "ice-water", name: "Ice and Water", category: "Underlayment" },
  { id: "synthetic-underlay", name: "Synthetic Underlay", category: "Underlayment" },
  { id: "starter-shingle", name: "Starter Shingle", category: "Fasteners" },
  { id: "ridge-cap", name: "Ridge Cap", category: "Fasteners" },
  { id: "flashing-kit", name: "Flashing Kit", category: "Flashing" },
  { id: "roof-cement", name: "Roof Cement", category: "Sealants" },
  { id: "roofing-nails", name: "Roofing Nails", category: "Fasteners" },
  { id: "nails-box", name: "Nails by the Box", category: "Fasteners" },
  { id: "underlayment", name: "Underlayment", category: "Underlayment" },
];
```

## Materials for Estimates

Use this list in `Estimates.tsx` with unit prices:

```typescript
const MATERIALS = [
  { id: "drip-edge", name: "Drip Edge", unitPrice: 15.00 },
  { id: "vents", name: "Vents", unitPrice: 45.00 },
  { id: "ice-water", name: "Ice and Water", unitPrice: 35.00 },
  { id: "synthetic-underlay", name: "Synthetic Underlay", unitPrice: 50.00 },
  { id: "starter-shingle", name: "Starter Shingle", unitPrice: 25.00 },
  { id: "ridge-cap", name: "Ridge Cap", unitPrice: 30.00 },
  { id: "flashing-kit", name: "Flashing Kit", unitPrice: 65.00 },
  { id: "roof-cement", name: "Roof Cement", unitPrice: 20.00 },
  { id: "roofing-nails", name: "Roofing Nails", unitPrice: 8.00 },
  { id: "nails-box", name: "Nails by the Box", unitPrice: 40.00 },
  { id: "underlayment", name: "Underlayment", unitPrice: 55.00 },
];
```

## Material Categories

- **Flashing**: Drip Edge, Flashing Kit
- **Vents**: Vents
- **Underlayment**: Ice and Water, Synthetic Underlay, Underlayment
- **Fasteners**: Starter Shingle, Ridge Cap, Roofing Nails, Nails by the Box
- **Sealants**: Roof Cement

## Customization

To add new materials:

1. Add to `MATERIALS` array in both `MaterialsChecklist.tsx` and `Estimates.tsx`
2. Update the database schema if storing materials in database
3. Update unit prices based on your supplier costs
4. Test that materials appear in both Damages and Estimates pages

## Damage Categories

Common damage categories to use in the Damages form:

- Missing Shingles
- Damaged Flashing
- Leaking Vents
- Ice Dam
- Torn Underlayment
- Rotted Wood
- Moss/Algae Growth
- Hail Damage
- Wind Damage
- Sagging Roof
- Cracked Shingles
- Deteriorated Sealant
