#!/usr/bin/env bash
set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
mkdir -p artifacts/quality
REPORT_JSON=artifacts/quality/report.json
REPORT_MD=QUALITY_REPORT.md
steps=("validate:npm run validate" "format:npm run format:check" "lint:npm run lint" "typecheck:npm run typecheck" "test:npm run test" "build:npm run build")
json='[]'; overall=0
for entry in "${steps[@]}"; do
  name="${entry%%:*}"; command="${entry#*:}"; log="artifacts/quality/${name}.log"
  started="$(date -u +%Y-%m-%dT%H:%M:%SZ)"; start_epoch="$(date +%s)"
  bash -lc "$command" >"$log" 2>&1; code=$?
  duration=$(( $(date +%s)-start_epoch )); [ "$code" -eq 0 ] || overall=1
  status="passed"; [ "$code" -eq 0 ] || status="failed"
  json="$(node -e 'const a=JSON.parse(process.argv[1]);a.push({name:process.argv[2],command:process.argv[3],status:process.argv[4],exitCode:Number(process.argv[5]),startedAt:process.argv[6],durationSeconds:Number(process.argv[7]),log:process.argv[8]});process.stdout.write(JSON.stringify(a))' "$json" "$name" "$command" "$status" "$code" "$started" "$duration" "$log")"
done
if command -v docker >/dev/null 2>&1; then
  docker compose config >artifacts/quality/compose.log 2>&1; code=$?; [ "$code" -eq 0 ] || overall=1; status=passed; [ "$code" -eq 0 ] || status=failed
  json="$(node -e 'const a=JSON.parse(process.argv[1]);a.push({name:"compose",command:"docker compose config",status:process.argv[2],exitCode:Number(process.argv[3]),log:"artifacts/quality/compose.log"});process.stdout.write(JSON.stringify(a))' "$json" "$status" "$code")"
else
  json="$(node -e 'const a=JSON.parse(process.argv[1]);a.push({name:"compose",command:"docker compose config",status:"not_run",reason:"docker is unavailable"});process.stdout.write(JSON.stringify(a))' "$json")"
fi
if command -v kubectl >/dev/null 2>&1; then
  kubectl kustomize deploy/kubernetes/overlays/production >artifacts/quality/kustomize-rendered.yaml 2>artifacts/quality/kustomize.log; code=$?; [ "$code" -eq 0 ] || overall=1; status=passed; [ "$code" -eq 0 ] || status=failed
  json="$(node -e 'const a=JSON.parse(process.argv[1]);a.push({name:"kustomize",command:"kubectl kustomize deploy/kubernetes/overlays/production",status:process.argv[2],exitCode:Number(process.argv[3]),log:"artifacts/quality/kustomize.log"});process.stdout.write(JSON.stringify(a))' "$json" "$status" "$code")"
else
  json="$(node -e 'const a=JSON.parse(process.argv[1]);a.push({name:"kustomize",command:"kubectl kustomize deploy/kubernetes/overlays/production",status:"not_run",reason:"kubectl is unavailable"});process.stdout.write(JSON.stringify(a))' "$json")"
fi
node -e 'const fs=require("fs");const steps=JSON.parse(process.argv[1]);const overall=steps.some(s=>s.status==="failed")?"failed":"passed";fs.writeFileSync(process.argv[2],JSON.stringify({generatedAt:new Date().toISOString(),overall,steps},null,2)+"\n");let md="# Easyinsights Quality Report\n\nGenerated: "+new Date().toISOString()+"\n\nOverall: **"+overall.toUpperCase()+"**\n\n| Gate | Status | Exit | Evidence |\n|---|---:|---:|---|\n";for(const s of steps)md+=`| ${s.name} | ${s.status} | ${s.exitCode??"—"} | ${s.log??s.reason??"—"} |\n`;md+="\nThe report records commands actually executed in this workspace. Provider credentials and external API calls are outside this offline gate.\n";fs.writeFileSync(process.argv[3],md);' "$json" "$REPORT_JSON" "$REPORT_MD"
exit "$overall"
