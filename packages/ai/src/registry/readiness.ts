import type {AiTask} from '@easyinsights/contracts';
import {modelAssignment,type ModelAssignment} from './catalog.js';
type Env=Record<string,string|undefined>;
export type RouteReadiness={
  task:AiTask;assignment:ModelAssignment;implementation:'implemented'|'planned';
  documentationVerified:boolean;credentialConfigured:boolean;liveAccessVerified:boolean;
  servingReady:boolean;state:'unconfigured'|'unavailable'|'blocked'|'ready';reasons:string[];
};
const truthy=(value:string|undefined)=>value==='true'||value==='1';
export function routeReadiness(task:AiTask,env:Env=process.env):RouteReadiness{
  const assignment=modelAssignment(task);const reasons:string[]=[];const hosted=assignment.kind==='hosted';
  const key=assignment.provider==='openai'?env.OPENAI_API_KEY:assignment.provider==='anthropic'?env.ANTHROPIC_API_KEY:assignment.provider==='google'?env.GOOGLE_API_KEY:assignment.provider==='voyage'?env.VOYAGE_API_KEY:undefined;
  const access=assignment.provider==='openai'?truthy(env.AI_OPENAI_ACCESS_VERIFIED):assignment.provider==='anthropic'?truthy(env.AI_ANTHROPIC_ACCESS_VERIFIED):assignment.provider==='google'?truthy(env.AI_GOOGLE_ACCESS_VERIFIED):assignment.provider==='voyage'?truthy(env.AI_VOYAGE_ACCESS_VERIFIED):false;
  const docs=assignment.provider==='openai'?(assignment.documentation==='verified'||(assignment.documentation==='identifier_verified'&&truthy(env.AI_OPENAI_DOCS_VERIFIED))):assignment.documentation==='verified';
  const implemented=task==='analyst'||task==='embedding'||task==='reranking';
  if(!implemented)reasons.push('Execution adapter is not implemented in this delivery slice.');
  if(hosted&&!docs)reasons.push('Exact documentation/endpoint capability verification is incomplete.');
  if(hosted&&!key)reasons.push('Provider credential is not configured.');
  if(hosted&&!access)reasons.push('Live account/project/region access has not been verified.');
  if(hosted&&!truthy(env.AI_HOSTED_ROUTES_ENABLED))reasons.push('Hosted model execution is disabled by deployment policy.');
  const servingReady=implemented&&(!hosted||(docs&&Boolean(key)&&access&&truthy(env.AI_HOSTED_ROUTES_ENABLED)));
  return {task,assignment,implementation:implemented?'implemented':'planned',documentationVerified:docs,credentialConfigured:Boolean(key),liveAccessVerified:access,servingReady,state:servingReady?'ready':!implemented?'unavailable':!key?'unconfigured':'blocked',reasons};
}
