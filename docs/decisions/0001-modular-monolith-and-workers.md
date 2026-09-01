# ADR 0001: Modular control plane with event-driven workers

Status: Accepted

## Decision

Use one Next.js modular application for the initial synchronous control plane and API, and separate outbox/consumer worker processes for asynchronous data-plane workloads.

## Rationale

The product requires strong shared tenant, governance and contract behavior. Splitting every domain into a network service at inception would multiply deployment and consistency failure modes. Kafka worker boundaries retain horizontal scale and permit later extraction based on measured load.

## Consequences

- One repository and shared contract package
- Independent web/outbox/consumer Kubernetes deployments
- Database collection boundaries act as domain boundaries
- A domain may become a service later without changing its Kafka contract
