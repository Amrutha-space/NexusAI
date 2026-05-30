# NexusAI Gateway Kubernetes Manifests

These manifests are portfolio-ready deployment examples for the API platform:

- stateless service deployments for gateway, auth, logging, and rate limiting
- internal services for service discovery
- Redis/PostgreSQL backing services for local cluster demos
- HPA examples for gateway and rate-limiter horizontal scaling
- config/secrets split for production-style environment management

Apply order:

```bash
kubectl apply -f namespace.yaml
kubectl apply -f configmap.yaml
kubectl apply -f secrets.example.yaml
kubectl apply -f postgres-redis.yaml
kubectl apply -f services.yaml
kubectl apply -f hpa.yaml
```

For production, replace the in-cluster PostgreSQL and Redis deployments with managed services, publish versioned images, and run migrations as a Kubernetes Job before rollout.
