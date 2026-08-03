/**
 * Swappable photo-based measurement estimation boundary. The mock provider
 * derives plausible values from height/weight/gender using simple ratios —
 * this is NOT a computer-vision model. Front/side photos are accepted and
 * stored (satisfying the upload flow and future training data needs) but
 * are not analyzed. Drop in a real CV/ML provider later by implementing
 * this interface; no call sites elsewhere need to change.
 */
export interface MeasurementEstimationRequest {
  heightCm: number;
  weightKg: number;
  gender: "MALE" | "FEMALE" | "OTHER" | "PREFER_NOT_TO_SAY";
  frontImageUrl: string;
  sideImageUrl: string;
}

export interface MeasurementEstimationResult {
  values: Record<string, number>;
  confidence: "low" | "mock";
}

export interface MeasurementEstimationProvider {
  name: string;
  estimate(req: MeasurementEstimationRequest): Promise<MeasurementEstimationResult>;
}

class MockMeasurementEstimationProvider implements MeasurementEstimationProvider {
  name = "mock";

  async estimate(req: MeasurementEstimationRequest): Promise<MeasurementEstimationResult> {
    const { heightCm, weightKg, gender } = req;

    // Rough build factor from BMI, clamped so estimates stay plausible.
    const bmi = weightKg / Math.pow(heightCm / 100, 2);
    const build = Math.min(1.25, Math.max(0.85, bmi / 22));
    const isFeminine = gender === "FEMALE";

    const values: Record<string, number> = {
      neck: round(heightCm * 0.21 * build),
      shoulder: round(heightCm * (isFeminine ? 0.225 : 0.235) * build),
      chest_bust: round(heightCm * (isFeminine ? 0.52 : 0.535) * build),
      waist: round(heightCm * (isFeminine ? 0.42 : 0.46) * build),
      hip: round(heightCm * (isFeminine ? 0.56 : 0.52) * build),
      sleeve_length: round(heightCm * 0.335),
      arm_length: round(heightCm * 0.19),
      inseam: round(heightCm * 0.45),
      thigh: round(heightCm * 0.31 * build),
      garment_length: round(heightCm * (isFeminine ? 0.58 : 0.42)),
    };

    return { values, confidence: "mock" };
  }
}

function round(value: number) {
  return Math.round(value * 10) / 10;
}

export function getMeasurementEstimationProvider(): MeasurementEstimationProvider {
  // A real CV/ML provider would be selected here based on env config.
  return new MockMeasurementEstimationProvider();
}
