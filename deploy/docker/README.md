# Container images

`deploy/docker/Dockerfile` provides three targets:

- `web`: non-root Next.js standalone runtime.
- `worker`: non-root Kafka outbox or consumer runtime selected with `WORKER_MODE`.
- `tooling`: build/bootstrap image used by local Compose and deployment jobs.

Application containers use read-only root filesystems in Compose and Kubernetes. MongoDB is the authoritative store. Redis is configured as bounded `allkeys-lru` cache and intentionally has no durable persistence in local development.
