/**
 * Roof Calculation Engine ported from Manus rooftop-renovators-crm
 * Calculates material quantities, labor hours, and complexity factors based on roof specifications
 */

export interface RoofSpecs {
  roofArea: number; // Square feet
  roofPitch: string; // e.g., "6/12", "8/12", "12/12"
  numberOfValleys: number;
  numberOfDormers: number;
  numberOfChimneys: number;
  numberOfSkyLights: number;
  hasRidgeVent: boolean;
  tearOffRequired: boolean;
  roofType: "asphalt_shingles" | "metal" | "tile" | "slate" | "wood" | "flat" | "other";
  wastePercentage: number; // Material waste factor (e.g., 10 for 10%)
}

export interface RoofCalculations {
  estimatedSquares: number; // Roofing squares (100 sq ft = 1 square)
  estimatedShingles: number; // Number of shingle bundles
  estimatedUnderlayment: number; // Rolls of underlayment
  estimatedIceWater: number; // Rolls of ice and water shield
  estimatedPlywood: number; // Sheets of plywood
  estimatedFlashing: number; // Linear feet
  estimatedRidgeCaps: number; // Linear feet
  estimatedLaborHours: number; // Total labor hours
  complexityFactor: number; // 1.0 = simple, 1.5+ = complex
  wastePercentage: number; // Material waste factor applied
}

export function parsePitch(pitchStr: string): number {
  if (!pitchStr || !pitchStr.includes('/')) return 0.5;
  const [rise, run] = pitchStr.split("/").map(Number);
  return (run && !isNaN(run)) ? rise / run : 0.5;
}

export function calculatePitchMultiplier(pitchStr: string): number {
  if (!pitchStr || !pitchStr.includes('/')) return 1.0;
  const [rise, run] = pitchStr.split("/").map(Number);
  if (!run || isNaN(run) || isNaN(rise)) return 1.0;
  return Math.sqrt(run * run + rise * rise) / run;
}

export function calculateComplexityFactor(specs: RoofSpecs): number {
  let factor = 1.0;

  const pitch = parsePitch(specs.roofPitch);
  if (pitch > 0.5) factor += 0.1; // 6/12 or steeper
  if (pitch > 0.75) factor += 0.1; // 9/12 or steeper
  if (pitch > 1.0) factor += 0.1; // 12/12 or steeper

  factor += specs.numberOfValleys * 0.1;
  factor += specs.numberOfDormers * 0.15;
  factor += specs.numberOfChimneys * 0.1;
  factor += specs.numberOfSkyLights * 0.08;
  if (specs.hasRidgeVent) factor += 0.05;
  if (specs.tearOffRequired) factor += 0.2;

  return Math.max(1.0, factor);
}

export function calculateSquares(roofArea: number): number {
  return roofArea / 100;
}

export function calculateShingles(squares: number): number {
  return Math.ceil(squares * 3);
}

export function calculateUnderlayment(squares: number): number {
  return Math.ceil(squares / 4); // ~4 squares per standard synthetic roll
}

export function calculateIceWaterShield(specs: RoofSpecs): number {
  const valleyRolls = Math.ceil((specs.numberOfValleys * 20) / 65);
  const eavesRolls = Math.ceil((Math.sqrt(specs.roofArea) * 4) / 65);
  return Math.max(1, valleyRolls + eavesRolls);
}

export function calculateFlashing(specs: RoofSpecs): number {
  let linearFeet = 0;
  linearFeet += specs.numberOfChimneys * 16;
  linearFeet += specs.numberOfSkyLights * 12;
  linearFeet += specs.numberOfValleys * 20;
  return Math.ceil(linearFeet);
}

export function calculateRidgeCaps(specs: RoofSpecs): number {
  return Math.ceil(Math.sqrt(specs.roofArea));
}

export function calculateLaborHours(squares: number, complexityFactor: number): number {
  const baseHoursPerSquare = 1.25;
  return Math.round(squares * baseHoursPerSquare * complexityFactor * 10) / 10;
}

export function calculateRoofEstimates(specs: RoofSpecs): RoofCalculations {
  const pitchMultiplier = calculatePitchMultiplier(specs.roofPitch);
  const adjustedArea = specs.roofArea * pitchMultiplier;
  const wasteMultiplier = 1 + (specs.wastePercentage / 100);
  const effectiveArea = adjustedArea * wasteMultiplier;
  const squares = Math.round(calculateSquares(effectiveArea) * 10) / 10;
  const complexityFactor = calculateComplexityFactor(specs);

  return {
    estimatedSquares: squares,
    estimatedShingles: calculateShingles(squares),
    estimatedUnderlayment: calculateUnderlayment(squares),
    estimatedIceWater: calculateIceWaterShield(specs),
    estimatedPlywood: Math.ceil(squares * 0.1), // ~10% decking replacement allowance
    estimatedFlashing: calculateFlashing(specs),
    estimatedRidgeCaps: calculateRidgeCaps(specs),
    estimatedLaborHours: calculateLaborHours(squares, complexityFactor),
    complexityFactor: Math.round(complexityFactor * 100) / 100,
    wastePercentage: specs.wastePercentage,
  };
}

export function getComplexityDescription(factor: number): string {
  if (factor <= 1.1) return "Simple Gable/Hip";
  if (factor <= 1.3) return "Moderate Complexity";
  if (factor <= 1.5) return "Complex / Cut-up";
  return "High Complexity / Custom Architectural";
}
