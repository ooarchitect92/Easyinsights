import { modelAssignments, routeReadiness } from '@easyinsights/ai';

const live = process.env.AI_VERIFY_LIVE === 'true';
const rows = modelAssignments.map((assignment) => {
  const readiness = routeReadiness(assignment.task);
  return {
    task: assignment.task,
    provider: assignment.provider,
    requestedIdentifier: assignment.requestedIdentifier,
    documentation: assignment.documentation,
    documentationUrl: assignment.documentationUrl || null,
    credentialConfigured: readiness.credentialConfigured,
    liveAccessVerified: readiness.liveAccessVerified,
    implementation: readiness.implementation,
    servingReady: readiness.servingReady,
    reasons: readiness.reasons,
  };
});

if (live) {
  console.error(
    'Live verification is intentionally not implicit. Run an explicitly authorized bounded provider smoke test, then record provider-specific AI_*_ACCESS_VERIFIED state.',
  );
  process.exitCode = 2;
}
console.log(
  JSON.stringify(
    { generatedAt: new Date().toISOString(), liveRequested: live, routes: rows },
    null,
    2,
  ),
);
