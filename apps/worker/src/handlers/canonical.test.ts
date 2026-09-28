import { describe, expect, it } from 'vitest';
import { classifyCanonicalEvent } from './canonical.js';

describe('classifyCanonicalEvent', () => {
  it('uses exact qualification mappings instead of substring matching', () => {
    expect(classifyCanonicalEvent('qualified_lead').qualified).toBe(true);
    expect(classifyCanonicalEvent('lead_qualified').qualified).toBe(true);
    expect(classifyCanonicalEvent('unqualified_lead').qualified).toBe(false);
    expect(classifyCanonicalEvent('lead_disqualified').qualified).toBe(false);
  });

  it('separates observed conversions from estimated-value events', () => {
    expect(classifyCanonicalEvent('payment_completed').conversion).toBe(true);
    expect(classifyCanonicalEvent('purchase').conversion).toBe(true);
    expect(classifyCanonicalEvent('deal_created').conversion).toBe(false);
    expect(classifyCanonicalEvent('deal_created').estimatedValue).toBe(true);
  });

  it('does not infer conversion from arbitrary event-name substrings', () => {
    expect(classifyCanonicalEvent('payment_method_added').conversion).toBe(false);
    expect(classifyCanonicalEvent('purchase_intent').conversion).toBe(false);
  });
});
