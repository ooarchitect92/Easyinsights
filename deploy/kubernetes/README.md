# Kubernetes deployment

The manifests deploy only stateless application workloads. Production MongoDB, Redis and Kafka are external managed services. Create `easyinsights-secrets` from a secret manager or External Secrets operator; never apply `secret.example.yaml` unchanged.

```bash
kubectl apply -f deploy/kubernetes/secret.example.yaml # only after replacing every value
kubectl apply -k deploy/kubernetes/overlays/production
```

Run the bootstrap Job for indexes and Kafka topics before routing traffic. Database seeding is intentionally excluded from production bootstrap.
