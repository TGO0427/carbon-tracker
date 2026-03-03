export const SCOPES: Record<number, { label: string; color: string; bgColor: string; description: string }> = {
  1: {
    label: "Scope 1",
    color: "text-green-900",
    bgColor: "bg-green-100",
    description: "Direct emissions from owned/controlled sources",
  },
  2: {
    label: "Scope 2",
    color: "text-green-700",
    bgColor: "bg-green-50",
    description: "Indirect emissions from purchased energy",
  },
  3: {
    label: "Scope 3",
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
    description: "All other indirect emissions in the value chain",
  },
};

export const SCOPE_CHART_COLORS: Record<number, string> = {
  1: "#166534",
  2: "#22c55e",
  3: "#86efac",
};

export const EMISSION_SOURCES = [
  { name: "Diesel (Fleet)", scope: 1, category: "fuel", defaultUnit: "litres" },
  { name: "Petrol (Fleet)", scope: 1, category: "fuel", defaultUnit: "litres" },
  { name: "LPG (Boiler)", scope: 1, category: "fuel", defaultUnit: "kg" },
  { name: "Natural Gas", scope: 1, category: "fuel", defaultUnit: "GJ" },
  { name: "Refrigerant Loss", scope: 1, category: "refrigerant", defaultUnit: "kg" },
  { name: "Purchased Electricity", scope: 2, category: "energy", defaultUnit: "kWh" },
  { name: "Steam/Heat Purchased", scope: 2, category: "energy", defaultUnit: "GJ" },
  { name: "Business Travel - Air", scope: 3, category: "travel", defaultUnit: "passenger-km" },
  { name: "Business Travel - Car", scope: 3, category: "travel", defaultUnit: "km" },
  { name: "Employee Commuting", scope: 3, category: "travel", defaultUnit: "km" },
  { name: "Waste to Landfill", scope: 3, category: "waste", defaultUnit: "kg" },
  { name: "Water Supply", scope: 3, category: "water", defaultUnit: "m\u00B3" },
] as const;

export const TRANSPORT_MODES = [
  { mode: "road", label: "Road (Heavy Freight)", defaultFactor: 0.105 },
  { mode: "sea", label: "Sea Freight", defaultFactor: 0.015 },
  { mode: "air", label: "Air Freight", defaultFactor: 0.75 },
  { mode: "rail", label: "Rail Freight", defaultFactor: 0.028 },
] as const;

export const SOURCE_CATEGORIES = [
  { value: "fuel", label: "Fuel" },
  { value: "refrigerant", label: "Refrigerant" },
  { value: "energy", label: "Energy" },
  { value: "travel", label: "Travel" },
  { value: "waste", label: "Waste" },
  { value: "water", label: "Water" },
  { value: "transport", label: "Transport" },
] as const;
