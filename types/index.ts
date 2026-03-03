export interface ReportingPeriod {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

export interface EmissionFactor {
  id: string;
  name: string;
  category: string;
  scope: number;
  factor: number;
  unit: string;
  source: string;
  year: number;
}

export interface EmissionEntry {
  id: string;
  scope: number;
  sourceName: string;
  sourceCategory: string;
  activityData: number;
  activityUnit: string;
  emissionFactorId: string | null;
  emissionFactor?: EmissionFactor | null;
  customFactor: number | null;
  totalEmissions: number;
  notes: string | null;
  entryDate: string;
  reportingPeriodId: string | null;
  reportingPeriod?: ReportingPeriod | null;
}

export interface Supplier {
  id: string;
  name: string;
  type: string;
  country: string | null;
  city: string | null;
  address: string | null;
  contactName: string | null;
  contactEmail: string | null;
  notes: string | null;
  _count?: { shipments: number };
}

export interface TransportLeg {
  id: string;
  legOrder: number;
  mode: string;
  origin: string | null;
  destination: string | null;
  distanceKm: number;
  emissionFactor: number;
  emissions: number;
  notes: string | null;
  shipmentId: string;
}

export interface Shipment {
  id: string;
  reference: string | null;
  direction: string;
  productDescription: string | null;
  totalWeightTonnes: number;
  totalEmissions: number;
  notes: string | null;
  shipmentDate: string;
  supplierId: string | null;
  supplier?: Supplier | null;
  reportingPeriodId: string | null;
  legs?: TransportLeg[];
}

export interface DashboardStats {
  total: number;
  scope1: number;
  scope2: number;
  scope3: number;
  entryCount: number;
}

export interface ScopeBreakdown {
  scope: number;
  label: string;
  total: number;
  percentage: number;
}

export interface SourceBreakdown {
  sourceName: string;
  scope: number;
  total: number;
}

export interface TrendDataPoint {
  month: string;
  scope1: number;
  scope2: number;
  scope3: number;
  total: number;
}
