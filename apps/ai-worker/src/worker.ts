import {Kafka,logLevel} from 'kafkajs';
import {executeHosted,ProviderExecutionError} from '@easyinsights/ai';
import {config,enqueueEvent,opaqueToken,retentionDate,tenantFilter,withTransaction} from '@easyinsights/core';
import type {AiTask,TenantScope} from '@easyinsights/contracts';

const topic='easyinsights.commands.ai';
const workerId='aiw_'+opaqueToken(8);

async function markExpiredRunningUnknown(job: any, scope: TenantScope) {
  await withTransaction(async (db, session) => {
    const now = new Date();
    const updated = await db.collection('ai_jobs').updateOne(
      {
        ...tenantFilter(scope),
        id: job.id,
        status: 'running',
        fencingToken: Number(job.fencingToken || 0),
        leaseUntil: { $lt: now },
      },
      {
        $set: {
          status: 'outcome_unknown',
          error:
            'Execution lease expired while an external model request may have been in flight. Manual or provider-aware reconciliation is required before retry.',
          completedAt: now,
          updatedAt: now,
        },
        $unset: { leaseUntil: '', workerId: '' },
      },
      { session },
    );
    if (updated.modifiedCount === 1) {
      await db.collection('ai_usage_reservations').updateOne(
        { ...tenantFilter(scope), jobId: job.id },
        { $set: { status: 'needs_reconciliation', reconciledAt: now } },
        { session },
      );
    }
  });
}

async function claim(jobId:string,scope:TenantScope){
  return withTransaction(async(db,session)=>{
    const now=new Date();
    const current:any=await db.collection('ai_jobs').findOne({...tenantFilter(scope),id:jobId},{session});
    if(!current)return null;
    if(['completed','blocked','failed','cancelled','outcome_unknown'].includes(String(current.status)))return null;
    if (
      current.status === 'running' &&
      current.leaseUntil instanceof Date &&
      current.leaseUntil < now
    ) {
      return { expiredRunning: current } as const;
    }
    const claimable =
      current.status === 'queued' ||
      (current.status === 'claimed' &&
        current.leaseUntil instanceof Date &&
        current.leaseUntil < now);
    if (!claimable) return null;
    const fencingToken=Number(current.fencingToken||0)+1;
    const leaseUntil=new Date(Date.now()+config.aiLeaseSeconds*1000);
    const update=await db.collection('ai_jobs').updateOne(
      {...tenantFilter(scope),id:jobId,status:current.status,fencingToken:Number(current.fencingToken||0)},
      {$set:{status:'running',workerId,leaseUntil,startedAt:current.startedAt||now,updatedAt:now},$inc:{fencingToken:1,attempt:1}},
      {session}
    );
    if(update.modifiedCount!==1)return null;
    const job:any=await db.collection('ai_jobs').findOne({...tenantFilter(scope),id:jobId,fencingToken},{session});
    return job?{job,fencingToken}:null;
  });
}

async function finalize(job:any,fencingToken:number,outcome:any){
  await withTransaction(async(db,session)=>{
    const filter={...tenantFilter({organizationId:job.organizationId,workspaceId:job.workspaceId}),id:job.id,status:'running',fencingToken};
    const now=new Date();
    if(outcome.status==='completed'){
      const updated=await db.collection('ai_jobs').updateOne(filter,{$set:{status:'completed',result:outcome.result,resolvedModel:outcome.result?.resolvedModel||job.requestedModel,completedAt:now,updatedAt:now},$unset:{leaseUntil:'',workerId:''}},{session});
      if(updated.modifiedCount!==1)throw new Error('AI job fencing check failed during completion.');
      await db.collection('ai_usage_reservations').updateOne({...tenantFilter({organizationId:job.organizationId,workspaceId:job.workspaceId}),jobId:job.id},{$set:{status:'reconciled',usage:outcome.result?.usage||null,reconciledAt:now}},{session});
      await enqueueEvent(db,{topic:'easyinsights.events.ai',key:job.id,type:'ai.job.completed',scope:{organizationId:job.organizationId,workspaceId:job.workspaceId},payload:{jobId:job.id,task:job.task},actorId:'system:ai-worker',correlationId:job.correlationId},session);
      return;
    }
    const updated=await db.collection('ai_jobs').updateOne(filter,{$set:{status:'blocked',blockReason:outcome.reason,completedAt:now,updatedAt:now},$unset:{leaseUntil:'',workerId:''}},{session});
    if(updated.modifiedCount!==1)throw new Error('AI job fencing check failed during block.');
    await db.collection('ai_usage_reservations').updateOne({...tenantFilter({organizationId:job.organizationId,workspaceId:job.workspaceId}),jobId:job.id},{$set:{status:'released',reconciledAt:now}},{session});
  });
}

async function markProviderOutcomeUnknown(job:any,fencingToken:number,error:ProviderExecutionError){
  await withTransaction(async(db,session)=>{
    const scope={organizationId:String(job.organizationId),workspaceId:String(job.workspaceId)};
    const now=new Date();
    await db.collection('ai_provider_requests').insertOne({id:'aipr_'+opaqueToken(12),...scope,jobId:job.id,provider:job.provider,requestedModel:job.requestedModel,providerRequestId:error.providerRequestId||null,outcome:'unknown',createdAt:now,expiresAt:retentionDate(config.runTtlDays)},{session});
    await db.collection('ai_jobs').updateOne({...tenantFilter(scope),id:job.id,status:'running',fencingToken},{$set:{status:'outcome_unknown',error:error.message,providerRequestId:error.providerRequestId||null,completedAt:now,updatedAt:now},$unset:{leaseUntil:'',workerId:''}},{session});
    await db.collection('ai_usage_reservations').updateOne({...tenantFilter(scope),jobId:job.id},{$set:{status:'needs_reconciliation',reconciledAt:now}},{session});
  });
}

async function processJob(jobId: string, scope: TenantScope) {
  const claimed = await claim(jobId, scope);
  if (!claimed) return;
  if ('expiredRunning' in claimed) {
    await markExpiredRunningUnknown(claimed.expiredRunning, scope);
    return;
  }
  const job: any = claimed.job;
  let leaseHeartbeat: ReturnType<typeof setInterval> | undefined;
  try {
    leaseHeartbeat = setInterval(() => {
      void withTransaction(async (db, session) => {
        await db.collection('ai_jobs').updateOne(
          {
            ...tenantFilter(scope),
            id: job.id,
            status: 'running',
            fencingToken: claimed.fencingToken,
          },
          {
            $set: {
              leaseUntil: new Date(Date.now() + config.aiLeaseSeconds * 1000),
              heartbeatAt: new Date(),
            },
          },
          { session },
        );
      }).catch(() => undefined);
    }, Math.max(5000, Math.floor((config.aiLeaseSeconds * 1000) / 3)));
    const outcome = await executeHosted({
      task: job.task as AiTask,
      prompt: String(job.inputSnapshot?.prompt || ''),
      context: (job.inputSnapshot?.context || {}) as Record<string, unknown>,
      evidence: (job.inputSnapshot?.evidence || {}) as Record<string, unknown>,
      timeoutMs: config.aiDeadlineSeconds * 1000,
    });
    await finalize(job, claimed.fencingToken, outcome);
  } catch (error) {
    if(error instanceof ProviderExecutionError&&error.outcomeUnknown){await markProviderOutcomeUnknown(job,claimed.fencingToken,error);return}
    await withTransaction(async(db,session)=>{
      const scope={organizationId:String(job.organizationId),workspaceId:String(job.workspaceId)};const now=new Date();
      await db.collection('ai_jobs').updateOne({...tenantFilter(scope),id:job.id,status:'running',fencingToken:claimed.fencingToken},{$set:{status:'failed',error:error instanceof Error?error.message:String(error),completedAt:now,updatedAt:now},$unset:{leaseUntil:'',workerId:''}},{session});
      await db.collection('ai_usage_reservations').updateOne({...tenantFilter(scope),jobId:job.id},{$set:{status:'released',reconciledAt:now}},{session});
    });
  } finally {
    if (leaseHeartbeat) clearInterval(leaseHeartbeat);
  }
}

export async function runAiWorker(signal:AbortSignal){
  const kafka=new Kafka({clientId:config.kafkaClientId+'-ai-worker',brokers:config.kafkaBrokers,logLevel:logLevel.NOTHING});
  const consumer=kafka.consumer({groupId:config.kafkaGroupId+'-ai',allowAutoTopicCreation:false,sessionTimeout:30000,heartbeatInterval:3000});
  await consumer.connect();await consumer.subscribe({topic,fromBeginning:false});
  signal.addEventListener('abort',()=>{void consumer.stop()},{once:true});
  try{
    await consumer.run({
      partitionsConsumedConcurrently: 2,
      eachMessage: async ({ message, heartbeat }) => {
        if (!message.value) return;
        const parsed = JSON.parse(message.value.toString('utf8')) as any;
        if (
          parsed.type !== 'ai.job.requested' ||
          !parsed.payload?.jobId ||
          !parsed.scope?.organizationId ||
          !parsed.scope?.workspaceId
        )
          return;
        let stopped = false;
        const kafkaHeartbeat = (async () => {
          while (!stopped) {
            await new Promise((resolve) => setTimeout(resolve, 2500));
            if (!stopped) await heartbeat();
          }
        })();
        try {
          await processJob(String(parsed.payload.jobId), {
            organizationId: String(parsed.scope.organizationId),
            workspaceId: String(parsed.scope.workspaceId),
          });
        } finally {
          stopped = true;
          await kafkaHeartbeat.catch(() => undefined);
        }
      },
    });
  }finally{await consumer.disconnect()}
}
