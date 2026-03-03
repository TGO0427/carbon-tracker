/**
 * Calculate emissions in tCO2e from activity data and emission factor.
 * Formula: activityData * emissionFactor / 1000
 *
 * The emission factor is in kg CO2e per unit (litre, kWh, kg, etc.)
 * Dividing by 1000 converts kg CO2e to tCO2e (tonnes).
 */
export function calculateEmission(activityData: number, emissionFactor: number): number {
  return (activityData * emissionFactor) / 1000;
}

/**
 * Calculate transport leg emissions in tCO2e.
 * Formula: distanceKm * weightTonnes * emissionFactor / 1000
 *
 * The emission factor is in kg CO2e per tonne-km.
 * Dividing by 1000 converts kg CO2e to tCO2e.
 */
export function calculateTransportLegEmission(
  distanceKm: number,
  weightTonnes: number,
  emissionFactor: number
): number {
  return (distanceKm * weightTonnes * emissionFactor) / 1000;
}

/**
 * Calculate total shipment emissions across multiple transport legs.
 * Each leg is calculated separately and summed (multi-modal transport per GHG Protocol).
 */
export function calculateShipmentEmissions(
  weightTonnes: number,
  legs: { distanceKm: number; emissionFactor: number }[]
): { legEmissions: number[]; total: number } {
  const legEmissions = legs.map((leg) =>
    calculateTransportLegEmission(leg.distanceKm, weightTonnes, leg.emissionFactor)
  );
  const total = legEmissions.reduce((sum, e) => sum + e, 0);
  return { legEmissions, total };
}
