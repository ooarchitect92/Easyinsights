import type { AiTask } from '@easyinsights/contracts';

export type ModelKind =
  'hosted' | 'checkpoint' | 'fitted_estimator' | 'component' | 'deterministic_baseline';
export type VerificationState =
  'verified' | 'identifier_verified' | 'unverified' | 'not_applicable';
export type ModelAssignment = {
  task: AiTask;
  kind: ModelKind;
  provider: string;
  requestedIdentifier: string;
  library?: string;
  documentation: VerificationState;
  documentationUrl?: string;
  note?: string;
};

export const modelAssignments: ModelAssignment[] = [
  {
    task: 'analyst',
    kind: 'hosted',
    provider: 'openai',
    requestedIdentifier: 'gpt-6-astra',
    documentation: 'identifier_verified',
    documentationUrl: 'https://platform.openai.com/pricing',
    note: 'Identifier verified in official pricing; Responses API capability verification remains an explicit live-enable gate.',
  },
  {
    task: 'recommendation_reviewer',
    kind: 'hosted',
    provider: 'anthropic',
    requestedIdentifier: 'claude-fable-5-1',
    documentation: 'unverified',
    documentationUrl: 'https://docs.anthropic.com/en/docs/about-claude/models',
    note: 'Exact requested identifier is not present in current official documentation. Adapter is implemented but live routing stays blocked; no silent substitution.',
  },
  {
    task: 'multimodal_extraction',
    kind: 'hosted',
    provider: 'google',
    requestedIdentifier: 'gemini-3.8-flash',
    documentation: 'verified',
    documentationUrl: 'https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash',
  },
  {
    task: 'embedding',
    kind: 'hosted',
    provider: 'voyage',
    requestedIdentifier: 'voyage-4-large',
    documentation: 'verified',
    documentationUrl: 'https://docs.voyageai.com/docs/embeddings',
  },
  {
    task: 'reranking',
    kind: 'hosted',
    provider: 'voyage',
    requestedIdentifier: 'rerank-2.5',
    documentation: 'verified',
    documentationUrl: 'https://docs.voyageai.com/docs/reranker',
  },
  {
    task: 'call_transcription',
    kind: 'hosted',
    provider: 'google',
    requestedIdentifier: 'gemini-3.5-transcribe',
    documentation: 'verified',
    documentationUrl: 'https://ai.google.dev/gemini-api/docs/models/gemini-3.5-transcribe',
  },
  {
    task: 'live_voice',
    kind: 'hosted',
    provider: 'google',
    requestedIdentifier: 'gemini-3.8-live-extended-thinking',
    documentation: 'verified',
    documentationUrl:
      'https://ai.google.dev/gemini-api/docs/models/gemini-3.8-live-extended-thinking',
  },
  {
    task: 'creative_image',
    kind: 'hosted',
    provider: 'google',
    requestedIdentifier: 'gemini-3-pro-image',
    documentation: 'verified',
    documentationUrl: 'https://ai.google.dev/gemini-api/docs/models/gemini-3-pro-image',
  },
  {
    task: 'lead_qualification',
    kind: 'fitted_estimator',
    provider: 'python-ml',
    requestedIdentifier: 'catboost.CatBoostClassifier',
    documentation: 'not_applicable',
  },
  {
    task: 'paid_conversion',
    kind: 'fitted_estimator',
    provider: 'python-ml',
    requestedIdentifier: 'catboost.CatBoostClassifier',
    documentation: 'not_applicable',
  },
  {
    task: 'customer_churn',
    kind: 'fitted_estimator',
    provider: 'python-ml',
    requestedIdentifier: 'catboost.CatBoostClassifier',
    documentation: 'not_applicable',
  },
  {
    task: 'future_customer_value',
    kind: 'fitted_estimator',
    provider: 'python-ml',
    requestedIdentifier: 'catboost.CatBoostRegressor',
    documentation: 'not_applicable',
  },
  {
    task: 'forecast_primary',
    kind: 'checkpoint',
    provider: 'python-ml',
    requestedIdentifier: 'amazon/chronos-2',
    library: 'chronos-forecasting',
    documentation: 'not_applicable',
  },
  {
    task: 'forecast_challenger',
    kind: 'fitted_estimator',
    provider: 'python-ml',
    requestedIdentifier: 'catboost.CatBoostRegressor',
    documentation: 'not_applicable',
  },
  {
    task: 'forecast_baseline',
    kind: 'deterministic_baseline',
    provider: 'internal',
    requestedIdentifier: 'seasonal-naive-v1',
    documentation: 'not_applicable',
  },
  {
    task: 'marketing_mix',
    kind: 'fitted_estimator',
    provider: 'python-ml',
    requestedIdentifier: 'meridian.model.model.Meridian',
    documentation: 'not_applicable',
  },
  {
    task: 'incrementality',
    kind: 'fitted_estimator',
    provider: 'python-ml',
    requestedIdentifier: 'econml.dml.CausalForestDML',
    documentation: 'not_applicable',
  },
  {
    task: 'anomaly_detection',
    kind: 'fitted_estimator',
    provider: 'python-ml',
    requestedIdentifier: 'sklearn.ensemble.IsolationForest',
    documentation: 'not_applicable',
  },
  {
    task: 'behavioral_segments',
    kind: 'fitted_estimator',
    provider: 'python-ml',
    requestedIdentifier: 'sklearn.cluster.HDBSCAN',
    documentation: 'not_applicable',
  },
  {
    task: 'offer_ranking',
    kind: 'fitted_estimator',
    provider: 'python-ml',
    requestedIdentifier: 'lightgbm.LGBMRanker',
    documentation: 'not_applicable',
  },
  {
    task: 'probability_calibration',
    kind: 'component',
    provider: 'python-ml',
    requestedIdentifier: 'sklearn.calibration.CalibratedClassifierCV',
    documentation: 'not_applicable',
  },
];

export function modelAssignment(task: AiTask): ModelAssignment {
  const found = modelAssignments.find((item) => item.task === task);
  if (!found) throw new Error('AI task is not registered: ' + task);
  return found;
}
