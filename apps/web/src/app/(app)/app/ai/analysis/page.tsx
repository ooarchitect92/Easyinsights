import {ApiActionButton} from '@/components/api-action-button';
import {CapabilityPage,StatusBadge} from '@/components/capability-page';
import {requireServerPrincipal} from '@/server/auth';
import {listDocuments,text} from '@/server/data';
export default async function AiAnalysis(){
  const principal=await requireServerPrincipal('ai:read');const rows=await listDocuments(principal,'ai_jobs',50,{createdAt:-1});
  return <CapabilityPage eyebrow="Grounded intelligence" title="AI analyst" description="Submit a tenant-scoped analysis job over an immutable workspace evidence snapshot. Provider execution happens outside database transactions." actions={<ApiActionButton endpoint="/api/v1/ai/analysis" label="Run workspace analysis" body={{task:'analyst',prompt:'Review current workspace performance. Separate observed facts from hypotheses and cite the supplied evidence identifiers.',context:{window:'current_workspace_snapshot'}}}/>} notice="Queued does not mean completed. Unconfigured, blocked, outcome-unknown and completed are separate states; no provider fallback silently replaces the requested analyst model." columns={[{key:'task',label:'Task'},{key:'requestedModel',label:'Requested model'},{key:'status',label:'Status',render:(r)=><StatusBadge value={r.status}/>},{key:'sourceSnapshotId',label:'Snapshot'},{key:'createdAt',label:'Created',render:(r)=>text(r.createdAt)}]} rows={rows}/>;
}
