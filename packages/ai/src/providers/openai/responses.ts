import {ProviderExecutionError} from '../errors.js';
export async function runOpenAiAnalyst(input:{model:string;prompt:string;context:Record<string,unknown>;evidence:Record<string,unknown>;timeoutMs:number;apiKey:string}){
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),input.timeoutMs);
  try{
    let response:Response;
    try{
      response=await fetch('https://api.openai.com/v1/responses',{method:'POST',signal:controller.signal,headers:{authorization:'Bearer '+input.apiKey,'content-type':'application/json'},body:JSON.stringify({model:input.model,input:[{role:'system',content:'You are the Easyinsights analyst. Use only supplied evidence. Distinguish observed facts from hypotheses. Return concise JSON with summary, findings, limitations and evidence_ids.'},{role:'user',content:JSON.stringify({prompt:input.prompt,context:input.context,evidence:input.evidence})}],text:{format:{type:'json_object'}}})});
    }catch(error){throw new ProviderExecutionError(error instanceof Error?error.message:'OpenAI request failed before acknowledgement.',true)}
    const requestId=response.headers.get('x-request-id')||undefined;const body:any=await response.json().catch(()=>null);
    if(!response.ok)throw new ProviderExecutionError(String(body?.error?.message||'OpenAI request failed.'),false,requestId,response.status);
    const raw=body?.output_text??body?.output?.flatMap((item:any)=>item?.content||[]).find((item:any)=>item?.type==='output_text')?.text;
    if(typeof raw!=='string'||!raw.trim())throw new ProviderExecutionError('OpenAI response did not contain validated text output.',false,requestId,response.status);
    let parsed:any;try{parsed=JSON.parse(raw)}catch{throw new ProviderExecutionError('OpenAI response was not valid JSON.',false,requestId,response.status)}
    return {providerRequestId:requestId,resolvedModel:String(body?.model||input.model),output:parsed,usage:body?.usage||null};
  }finally{clearTimeout(timer)}
}
