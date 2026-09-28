import { describe, expect, it } from 'vitest';
import { modelAssignment, routeReadiness } from '../index.js';
describe('multi-model registry', () => {
  it('preserves requested assignments', () => {
    expect(modelAssignment('analyst').requestedIdentifier).toBe('gpt-6-astra');
    expect(modelAssignment('recommendation_reviewer').requestedIdentifier).toBe('claude-fable-5-1');
    expect(modelAssignment('embedding').requestedIdentifier).toBe('voyage-4-large');
    expect(modelAssignment('reranking').requestedIdentifier).toBe('rerank-2.5');
  });
  it('blocks hosted execution without explicit qualification', () => {
    const state = routeReadiness('analyst', { AI_HOSTED_ROUTES_ENABLED: 'false' });
    expect(state.servingReady).toBe(false);
  });
});
