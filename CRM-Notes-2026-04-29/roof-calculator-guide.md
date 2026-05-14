# Roof Calculator Implementation Guide

## Overview

The roof calculator converts roof dimensions and complexity into material quantities and labor hours. This guide documents the calculation logic for implementing roof-to-materials integration.

## Core Calculation Logic

### Roof Squares Calculation

A **roof square** is 100 square feet of roof area. This is the standard unit in roofing.

```
roofSquares = (totalRoofArea / 100)
```

**Example:**
- Roof dimensions: 40ft × 30ft = 1,200 sq ft
- Roof squares: 1,200 / 100 = 12 squares

### Material Quantities

#### Shingles (Bundles)

Standard asphalt shingles come in bundles. Each bundle covers approximately 33.3 square feet (1/3 square).

```
shingleBundles = roofSquares × 3
```

**Example:** 12 squares × 3 = 36 bundles

#### Underlayment (Rolls)

Underlayment rolls typically cover 400 square feet.

```
underlaymentRolls = ceil(totalRoofArea / 400)
```

**Example:** 1,200 sq ft ÷ 400 = 3 rolls

#### Ice and Water Shield (Rolls)

Ice and water shield is applied to vulnerable areas (eaves, valleys, penetrations). Typical coverage is 2-4 rolls per square, depending on climate and roof complexity.

```
iceWaterRolls = roofSquares × complexityFactor × 0.5
```

Where `complexityFactor` ranges from 1 (simple) to 2+ (complex).

**Example:** 12 squares × 1.5 complexity × 0.5 = 9 rolls

#### Plywood Sheathing (Sheets)

Only required for tear-off projects. Plywood sheets are 4' × 8' = 32 sq ft.

```
plywoodSheets = ceil(totalRoofArea / 32)
```

**Example:** 1,200 sq ft ÷ 32 = 37.5 → 38 sheets

#### Flashing (Linear Feet)

Flashing covers roof penetrations and valleys. Estimate based on roof complexity.

```
flashingLinearFeet = (roofPerimeter × complexityFactor) + (penetrationCount × 10)
```

**Example:** (140 ft perimeter × 1.5) + (4 penetrations × 10 ft) = 210 + 40 = 250 linear feet

#### Ridge Caps (Linear Feet)

Ridge caps cover the peak of the roof.

```
ridgeCapLinearFeet = roofLength (along ridge)
```

**Example:** 40 ft ridge = 40 linear feet of ridge caps

### Labor Hours Calculation

Labor hours depend on roof size, pitch, and complexity.

```
baseHours = roofSquares × 1.5
complexityAdjustment = baseHours × (complexityFactor - 1) × 0.5
totalLaborHours = baseHours + complexityAdjustment
```

**Complexity Factors:**
- **Simple** (1.0): Flat roof, no penetrations, easy access
- **Moderate** (1.5): Standard pitched roof, 2-4 penetrations
- **Complex** (2.0+): Steep pitch, multiple valleys, many penetrations, difficult access

**Example:**
- 12 squares, complexity 1.5
- Base hours: 12 × 1.5 = 18 hours
- Adjustment: 18 × (1.5 - 1) × 0.5 = 18 × 0.5 × 0.5 = 4.5 hours
- Total: 18 + 4.5 = 22.5 hours

## Integration with CRM

### Database Schema

```sql
-- Roof specifications for a project
CREATE TABLE roofSpecifications (
  id INT PRIMARY KEY AUTO_INCREMENT,
  projectId INT NOT NULL,
  roofLength DECIMAL(10, 2),
  roofWidth DECIMAL(10, 2),
  roofPitch VARCHAR(10),
  hasValleys BOOLEAN DEFAULT FALSE,
  penetrationCount INT DEFAULT 0,
  tearOff BOOLEAN DEFAULT FALSE,
  complexityFactor DECIMAL(3, 2) DEFAULT 1.0,
  estimatedSquares DECIMAL(10, 2),
  estimatedShingles INT,
  estimatedUnderlayment INT,
  estimatedIceWater INT,
  estimatedPlywood INT,
  estimatedFlashing DECIMAL(10, 2),
  estimatedRidgeCaps DECIMAL(10, 2),
  estimatedLaborHours DECIMAL(10, 2),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (projectId) REFERENCES projects(id)
);

-- Line items created from roof specs
CREATE TABLE estimateLineItems (
  id INT PRIMARY KEY AUTO_INCREMENT,
  estimateId INT NOT NULL,
  materialId INT,
  description VARCHAR(255) NOT NULL,
  quantity DECIMAL(10, 2) NOT NULL,
  unitPrice DECIMAL(10, 2) NOT NULL,
  roofSpecificationId INT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (estimateId) REFERENCES estimates(id),
  FOREIGN KEY (materialId) REFERENCES materials(id),
  FOREIGN KEY (roofSpecificationId) REFERENCES roofSpecifications(id)
);
```

### Workflow

1. **User enters roof dimensions** in RoofSpecifications UI
2. **Calculator computes material quantities and labor hours**
3. **User reviews calculations** in summary tab
4. **User clicks "Apply Materials to Estimate"**
5. **Mapper converts calculations to line items** using mapRoofToMaterials()
6. **Line items are inserted** into estimateLineItems table
7. **Estimate total updates** automatically

### Material Matching

The mapper matches calculated materials to the materials database:

```ts
const material = availableMaterials.find(m => 
  m.category.toLowerCase() === category.toLowerCase()
);
```

If a material is not found in the database, a fallback line item is created with `unitPrice: 0` for manual entry.

## Pricing Integration

### Material Pricing

Materials are stored with unit prices in the database:

```ts
interface Material {
  id: number;
  name: string;
  category: string;
  unit: string; // "bundle", "roll", "sheet", "linear feet", etc.
  unitPrice: number;
}
```

**Example materials (Home Depot Canada pricing):**

| Material | Unit | Price |
|----------|------|-------|
| Asphalt Shingles | bundle | $45.99 |
| Underlayment | roll | $89.99 |
| Ice & Water Shield | roll | $125.99 |
| Plywood 7/16" | sheet | $52.99 |
| Roof Flashing | linear foot | $2.50 |
| Ridge Caps | linear foot | $1.99 |

### Labor Pricing

Labor is typically charged at an hourly rate:

```ts
const laborCost = laborHours × hourlyRate;
// Example: 22.5 hours × $50/hour = $1,125
```

### Line Item Calculation

```
lineItemTotal = quantity × unitPrice
estimateSubtotal = sum of all line items
estimateTax = subtotal × taxRate (e.g., 13% HST in Ontario)
estimateTotal = subtotal + tax
```

## Validation Rules

- **Roof dimensions**: Must be positive numbers
- **Roof pitch**: Valid values (e.g., "4:12", "6:12", "8:12", "12:12")
- **Complexity factor**: Range 1.0 to 3.0
- **Penetration count**: Non-negative integer
- **Material quantities**: Must be positive; zero quantities are allowed (optional materials)

## Error Handling

**Scenario: Material not found in database**
- Create line item with description and quantity
- Set unitPrice to 0
- Display warning to user: "Material pricing not found; please enter manually"

**Scenario: Invalid roof dimensions**
- Show validation error: "Roof dimensions must be positive numbers"
- Prevent calculation until corrected

**Scenario: Extreme values**
- Warn if labor hours exceed 100 hours (very large roof)
- Warn if material quantities seem unrealistic
- Allow user to override with manual adjustments

## Testing

Test the mapper with these scenarios:

1. **Simple roof**: 20' × 30', flat pitch, no penetrations
   - Expected: ~6 squares, 18 bundles, minimal materials
2. **Complex roof**: 40' × 40', steep pitch, 6 penetrations, tear-off
   - Expected: ~16 squares, 48 bundles, high labor hours
3. **Missing materials**: Database has no "ice_water_shield" material
   - Expected: Fallback line item created with unitPrice 0
4. **Zero quantities**: Tear-off not selected
   - Expected: Plywood quantity = 0, not included in line items

## References

- Roofing Industry Standards: NRCA (National Roofing Contractors Association)
- Material Coverage: Manufacturer specifications (e.g., GAF, Owens Corning)
- Labor Estimates: RSMeans or regional contractor surveys
