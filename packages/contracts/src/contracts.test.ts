import { describe, expect, it } from 'vitest';
import { canonicalEventSchema, audienceRuleSchema, workflowSchema } from './index.js';
describe('contracts', () => {
  it('accepts a canonical event', () =>
    expect(
      canonicalEventSchema.parse({
        eventId: 'evt-1',
        eventName: 'qualified_lead',
        eventTime: new Date(),
        source: 'crm',
      }).eventId,
    ).toBe('evt-1'));
  it('supports nested audience rules', () =>
    expect(
      audienceRuleSchema.parse({
        combinator: 'and',
        rules: [{ field: 'leadScore', operator: 'gte', value: 75 }],
      }),
    ).toBeTruthy());
  it('requires workflow nodes', () =>
    expect(() => workflowSchema.parse({ name: 'x', nodes: [], edges: [] })).toThrow());
});
