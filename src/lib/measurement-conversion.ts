// Part 17: values are always stored internally in centimeters, regardless
// of which unit was used to capture or display them — conversion only ever
// happens at the read/write edges, never to the stored value itself.
const CM_PER_INCH = 2.54;

export function cmToInches(cm: number) {
  return Math.round((cm / CM_PER_INCH) * 100) / 100;
}

export function inchesToCm(inches: number) {
  return Math.round(inches * CM_PER_INCH * 100) / 100;
}

export function valuesToCm(values: Record<string, number>, fromUnit: "METRIC" | "IMPERIAL"): Record<string, number> {
  if (fromUnit === "METRIC") return values;
  return Object.fromEntries(Object.entries(values).map(([k, v]) => [k, inchesToCm(v)]));
}

export function valuesForDisplay(values: Record<string, number>, toUnit: "METRIC" | "IMPERIAL"): Record<string, number> {
  if (toUnit === "METRIC") return values;
  return Object.fromEntries(Object.entries(values).map(([k, v]) => [k, cmToInches(v)]));
}
