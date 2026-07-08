/**
 * Phase 3 architecture boundary for AI body-measurement estimation.
 *
 * This is intentionally NOT a real computer-vision model — training/integrating one is
 * a separate ML project. MockMeasurementEstimationProvider derives plausible values from
 * height/weight/gender using simple anthropometric ratios purely so the UI/approval flow
 * (upload -> estimate -> designer review -> approve) can be built and demoed end to end.
 * Swap in a real provider (a hosted CV model / third-party API) by implementing this
 * interface; no other code needs to change.
 */
export interface MeasurementEstimationInput {
  heightCm: number;
  weightKg: number;
  gender: string;
  frontImageUrl: string;
  sideImageUrl: string;
}

export interface MeasurementEstimationResult {
  neck: number;
  shoulder: number;
  chestBust: number;
  waist: number;
  hip: number;
  sleeveLength: number;
  armLength: number;
  inseam: number;
  thigh: number;
  garmentLength: number;
}

export interface MeasurementEstimationProvider {
  estimate(input: MeasurementEstimationInput): Promise<MeasurementEstimationResult>;
}

class MockMeasurementEstimationProvider implements MeasurementEstimationProvider {
  async estimate(input: MeasurementEstimationInput): Promise<MeasurementEstimationResult> {
    const { heightCm, weightKg } = input;
    const bmi = weightKg / Math.pow(heightCm / 100, 2);

    return {
      neck: round(heightCm * 0.21 + bmi * 0.15),
      shoulder: round(heightCm * 0.235),
      chestBust: round(heightCm * 0.52 + bmi * 0.6),
      waist: round(heightCm * 0.45 + bmi * 0.9),
      hip: round(heightCm * 0.53 + bmi * 0.7),
      sleeveLength: round(heightCm * 0.33),
      armLength: round(heightCm * 0.19),
      inseam: round(heightCm * 0.45),
      thigh: round(heightCm * 0.29 + bmi * 0.4),
      garmentLength: round(heightCm * 0.4),
    };
  }
}

function round(value: number) {
  return Math.round(value * 10) / 10;
}

export function getMeasurementEstimationProvider(): MeasurementEstimationProvider {
  return new MockMeasurementEstimationProvider();
}
