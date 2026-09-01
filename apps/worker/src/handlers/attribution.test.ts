import { describe, expect, it } from 'vitest';
import { attributionWeights } from './attribution.js';
describe('attribution weights', () => {
  it('allocates linearly', () =>
    expect(attributionWeights('linear', 4)).toEqual([0.25, 0.25, 0.25, 0.25]));
  it('allocates first and last touch', () => {
    expect(attributionWeights('first_touch', 3)).toEqual([1, 0, 0]);
    expect(attributionWeights('last_touch', 3)).toEqual([0, 0, 1]);
  });
  it('always sums to one', () =>
    expect(attributionWeights('time_decay', 8).reduce((a, b) => a + b, 0)).toBeCloseTo(1));
});
