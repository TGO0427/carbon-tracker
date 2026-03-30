export const SITES = [
  {
    id: "site-klapmuts",
    name: "Klapmuts",
    location: "Klapmuts, Western Cape",
    units: [
      { id: "unit-allmark-groene-weide", name: "Allmark", number: "Groene Weide" },
      { id: "unit-allmark-k58", name: "Allmark", number: "K58" },
    ],
  },
  {
    id: "site-pretoria",
    name: "Pretoria",
    location: "Pretoria, Gauteng",
    units: [
      { id: "unit-sizwe-6", name: "Sizwe", number: "Unit 6" },
      { id: "unit-sizwe-7", name: "Sizwe", number: "Unit 7" },
      { id: "unit-sizwe-8", name: "Sizwe", number: "Unit 8" },
      { id: "unit-impilo-1", name: "Impilo", number: "Unit 1" },
      { id: "unit-impilo-2", name: "Impilo", number: "Unit 2" },
      { id: "unit-impilo-10", name: "Impilo", number: "Unit 10" },
      { id: "unit-allmark-p5", name: "Allmark", number: "P5" },
      { id: "unit-allmark-p6", name: "Allmark", number: "P6" },
      { id: "unit-iso-foods-3", name: "ISO Foods", number: "Unit 3" },
      { id: "unit-iso-foods-4", name: "ISO Foods", number: "Unit 4" },
      { id: "unit-afi-5", name: "AFI", number: "Unit 5" },
      { id: "unit-afi-9", name: "AFI", number: "Unit 9" },
    ],
  },
] as const;

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

export const MONTHS = [
  { value: 1, label: "Jan" }, { value: 2, label: "Feb" },
  { value: 3, label: "Mar" }, { value: 4, label: "Apr" },
  { value: 5, label: "May" }, { value: 6, label: "Jun" },
  { value: 7, label: "Jul" }, { value: 8, label: "Aug" },
  { value: 9, label: "Sep" }, { value: 10, label: "Oct" },
  { value: 11, label: "Nov" }, { value: 12, label: "Dec" },
];

export const ACTIVITY_BAR_COLORS = [
  "#052e16", "#064e3b", "#166534", "#15803d",
  "#16a34a", "#22c55e", "#4ade80", "#86efac",
];

export const SOURCE_CATEGORIES = [
  { value: "fuel", label: "Fuel" },
  { value: "refrigerant", label: "Refrigerant" },
  { value: "energy", label: "Energy" },
  { value: "travel", label: "Travel" },
  { value: "waste", label: "Waste" },
  { value: "water", label: "Water" },
  { value: "transport", label: "Transport" },
] as const;
