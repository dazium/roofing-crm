import { calcMaterialPlan, slopeFactorFromPitch, money } from '../lib';
import type { MaterialPriceSetting, Measurements } from '../types';

interface RoofMathPanelProps {
  measurements: Measurements;
  materialPrices: MaterialPriceSetting[];
  pitch?: string;
  title?: string;
  subtitle?: string;
}

export const RoofMathPanel: React.FC<RoofMathPanelProps> = ({
  measurements,
  materialPrices,
  pitch = '',
  title = 'Roof math',
  subtitle = 'Plan measurements are adjusted for pitch and waste to produce estimating quantities.'
}) => {
  const plan = calcMaterialPlan(measurements, pitch);
  const slopeFactor = slopeFactorFromPitch(pitch);
  const planSquareFeet = measurements.squares * 100;
  const slopeAdjustedSquareFeet = plan.slopeAdjustedSquares * 100;
  const estimatingSquareFeet = plan.effectiveSquares * 100;
  const prices = Object.fromEntries(materialPrices.map((item) => [item.id, item]));
  const shinglePrice = prices['mat-shingles']?.price ?? 0;
  const starterPrice = prices['mat-starter']?.price ?? 0;
  const ridgeCapPrice = prices['mat-ridge-cap']?.price ?? 0;
  const underlaymentPrice = prices['mat-underlayment']?.price ?? 0;
  const iceWaterPrice = prices['mat-ice-water']?.price ?? 0;
  const dripEdgePrice = prices['mat-drip-edge']?.price ?? 0;
  const ridgeVentPrice = prices['mat-ridge-vent']?.price ?? 0;

  const shingleCost = plan.bundles * shinglePrice;
  const starterCost = plan.starter * starterPrice;
  const ridgeCapCost = plan.ridgeCapBundles * ridgeCapPrice;
  const underlaymentCost = plan.underlaymentRolls * underlaymentPrice;
  const iceWaterCost = plan.iceWaterShieldRolls * iceWaterPrice;
  const dripEdgeCost = plan.dripEdgePieces * dripEdgePrice;
  const ridgeVentCost = measurements.ridgeLength * ridgeVentPrice;

  const totalMaterialCost = shingleCost + starterCost + ridgeCapCost + underlaymentCost + iceWaterCost + dripEdgeCost + ridgeVentCost;
  const latestPricingUpdate = materialPrices.reduce<string | null>((latest, item) => {
    if (!latest || item.updatedAt > latest) return item.updatedAt;
    return latest;
  }, null);

  return (
    <div className="card">
      <div className="section-head">
        <h3>{title}</h3>
        <span>{subtitle}</span>
        <div style={{ fontSize: '12px', marginTop: '4px', color: '#627285' }}>
          Manual pricing in use{latestPricingUpdate ? ` · updated ${new Date(latestPricingUpdate).toLocaleString()}` : ''}
        </div>
      </div>
      <div className="mini-stats-grid">
        <div className="mini-stat-card">
          <span>Plan squares</span>
          <strong>{measurements.squares.toFixed(1)}</strong>
        </div>
        <div className="mini-stat-card">
          <span>Roof squares after pitch</span>
          <strong>{plan.slopeAdjustedSquares.toFixed(1)}</strong>
        </div>
        <div className="mini-stat-card">
          <span>Estimating squares with waste</span>
          <strong>{plan.effectiveSquares.toFixed(1)}</strong>
        </div>
        <div className="mini-stat-card">
          <span>Pitch factor</span>
          <strong>{slopeFactor.toFixed(3)}</strong>
        </div>
      </div>
      <div className="roof-math-grid">
        <div className="planner-card">
          <span>Plan area (sq ft)</span>
          <strong>{Math.round(planSquareFeet)}</strong>
        </div>
        <div className="planner-card">
          <span>Roof area after pitch (sq ft)</span>
          <strong>{Math.round(slopeAdjustedSquareFeet)}</strong>
        </div>
        <div className="planner-card">
          <span>Estimating area with waste (sq ft)</span>
          <strong>{Math.round(estimatingSquareFeet)}</strong>
        </div>
        <div className="planner-card">
          <span>Shingle bundles</span>
          <strong>{plan.bundles}</strong>
          <small>{money(shingleCost)} total</small>
        </div>
        <div className="planner-card">
          <span>Starter bundles</span>
          <strong>{plan.starter}</strong>
          <small>{Math.round(plan.perimeterStarterFeet)} lf perimeter ÷ {plan.starterCoverageFeetPerBundle} lf/bundle</small>
          <small>{money(starterCost)}</small>
        </div>
        <div className="planner-card">
          <span>Ridge cap bundles</span>
          <strong>{plan.ridgeCapBundles}</strong>
          <small>{money(ridgeCapCost)}</small>
        </div>
        <div className="planner-card">
          <span>Underlayment rolls</span>
          <strong>{plan.underlaymentRolls}</strong>
          <small>{money(underlaymentCost)}</small>
        </div>
        <div className="planner-card">
          <span>Ice & water shield rolls</span>
          <strong>{plan.iceWaterShieldRolls}</strong>
          <small>{money(iceWaterCost)}</small>
        </div>
        <div className="planner-card">
          <span>Drip edge pieces</span>
          <strong>{plan.dripEdgePieces}</strong>
          <small>{Math.round(plan.perimeterDripEdgeFeet)} lf perimeter ÷ {plan.dripEdgeFeetPerPiece} lf/piece</small>
          <small>{money(dripEdgeCost)}</small>
        </div>
        <div className="planner-card">
          <span>Ridge vent length</span>
          <strong>{measurements.ridgeLength} lf</strong>
          <small>{money(ridgeVentCost)}</small>
        </div>
        <div className="planner-card highlight">
          <span>Estimated material total</span>
          <strong>{money(totalMaterialCost)}</strong>
        </div>
      </div>
    </div>
  );
};
