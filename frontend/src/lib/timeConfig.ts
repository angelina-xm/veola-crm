export const TEST_MODE = true;
export const TIME_MULTIPLIER = TEST_MODE ? 0.01 : 1;

export const DAY_MS = 24 * 60 * 60 * 1000;

export function scaleMs(ms: number): number {
  return ms * TIME_MULTIPLIER;
}
