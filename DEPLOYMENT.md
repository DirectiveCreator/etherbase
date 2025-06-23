# Etherbase Production Deployment Guide

This guide explains how to deploy **Etherbase** (backend **reader** + **writer** services and the **Next.js** frontend) to a production environment using Docker containers.  
The steps assume you already:

* cloned & updated your fork with the latest changes from `msquared-io/etherbase`,
* have a running **Etherbase** smart-contract **and Multicall contract** on your target chain,
* installed **Docker** ≥ 24 and **Docker Compose** v2 on your workstation,
* have access to a container registry (Docker Hub, ECR, GAR, ACR, etc.).

---

## 1. Repository Layout Recap

```
├── backend
│   ├── Dockerfile.reader   # Go → reader binary
│   ├── Dockerfile.writer   # Go → writer binary
│   └── docker-compose.yml  # (added in previous step)
└── packages
    └── frontend
        └── Dockerfile      # builds production Next.js image
```

---

## 2. Configure Environment

Copy the provided template and edit as required:

```bash
cp .env.example .env
```

Key variables to review:

| Variable | Description |
|----------|-------------|
| `RPC_URL` | WSS/HTTPS endpoint for your chain |
| `CHAIN_ID` | Numeric chain ID |
| `PRIVATE_KEY` | **Writer** account private key (never commit this value) |
| `ETHERBASE_ADDRESS` | Address of your deployed `Etherbase` contract |
| `MULTICALL_ADDRESS` | Address of Multicall3 |
| `NEXT_PUBLIC_ENV` | `somnia`, `local`, etc. (used by frontend) |
| `NEXT_PUBLIC_USE_LOCAL_BACKEND` | `false` in production |

The backend binaries read these variables at runtime (see `backend/internal/config/config.go`).

---

## 3. Local Validation (optional)

Before pushing to the cloud:

```bash
docker compose up --build
```

Visit:

* Frontend → `http://localhost:3000`
* Writer WS → `ws://localhost:8081`
* Reader WS → `ws://localhost:8082`

When it works locally you’re ready for production.

---

## 4. Build & Push Images

Replace **`your-registry`** with your registry path.

```bash
# Backend
docker build -t your-registry/etherbase-writer:latest -f backend/Dockerfile.writer backend
docker build -t your-registry/etherbase-reader:latest -f backend/Dockerfile.reader backend

# Frontend
docker build -t your-registry/etherbase-frontend:latest -f packages/frontend/Dockerfile packages/frontend

# push
docker push your-registry/etherbase-writer:latest
docker push your-registry/etherbase-reader:latest
docker push your-registry/etherbase-frontend:latest
```

---

## 5. Deploying to Popular Cloud Providers

Below are minimal snippets; each platform provides a UI or IaC integration (CDK, Terraform).  
Secrets → store all sensitive ENV values such as `PRIVATE_KEY` in the provider’s secret manager.

### 5.1 AWS ECS + Fargate

1. Create an **ECR** repository and push images (done above).  
2. In the **ECS console** create a **task definition** with three containers:  
   * `writer` `8081` TCP  
   * `reader` `8082` TCP  
   * `frontend` `8080` TCP  
3. Enable **load balancer** listeners:  
   * `/ws(reader)` → reader 8082  
   * `/ws(writer)` → writer 8081  
   * `/` → frontend 8080  
4. Inject environment variables & secrets.  
5. Set desired count (≥ 2 for HA), enable auto-scaling on CPU / memory.  

### 5.2 Google Cloud Run

Cloud Run deploys each container separately:

```bash
gcloud run deploy etherbase-reader \
  --image your-registry/etherbase-reader:latest \
  --port 8082 --min-instances 1 --set-env-vars "file=.env"

gcloud run deploy etherbase-writer \
  --image your-registry/etherbase-writer:latest \
  --port 8081 --min-instances 1 --set-env-vars "file=.env"

gcloud run deploy etherbase-frontend \
  --image your-registry/etherbase-frontend:latest \
  --port 8080 --min-instances 1 \
  --set-env-vars NEXT_PUBLIC_ENV=somnia,NEXT_PUBLIC_USE_LOCAL_BACKEND=false
```

Use Cloud Load Balancing or Cloud Endpoints to combine the three public URLs under one domain.

### 5.3 Azure Container Apps

```bash
az containerapp create \
  --name etherbase-writer --image your-registry/etherbase-writer:latest \
  --registry-login-server your-registry --ingress external --target-port 8081 \
  --env-vars-file .env
# repeat for reader & frontend
```

### 5.4 DigitalOcean App Platform / Render / Railway

All three platforms support:

1. Connect to GitHub repo.  
2. Autodetect Dockerfiles.  
3. Configure build & run commands automatically.  
4. Add env vars / secrets in the dashboard.  

---

## 6. Domains, TLS & Reverse Proxy

Because writer & reader expose **WebSocket** endpoints you must:

* Use a proxy that supports **websocket upgrades** (`Connection: upgrade`).  
* Enable **sticky sessions** only if you store state in-memory (not required by Etherbase).  

Common setups:

| Proxy | Approach |
|-------|----------|
| **NGINX** | Forward `/api/ws/writer` → writer 8081 and `/api/ws/reader` → reader 8082. Serve frontend at `/`. |
| **Traefik** | Use Docker labels for automatic routing & Let’s Encrypt TLS. |
| **Cloudflare** | Point each sub-domain to its respective service, enable “WebSockets”. |

---

## 7. Scaling & Performance

| Component | Scaling dimension | Notes |
|-----------|-------------------|-------|
| Reader    | **CPU & network** | Increase replicas for >2k events/sec; stateless |
| Writer    | **CPU & network** | Sensitive to chain RPC latency; scale horizontally |
| Frontend  | **CPU & memory**  | Mostly static; CDN cache recommended |

Use provider auto-scalers (ECS Service Auto Scaling, Cloud Run concurrency, etc.).

---

## 8. Observability

* **Logs** → forward container logs to CloudWatch, Stackdriver, Azure Monitor, Loki.  
* **Metrics** → integrate with **Prometheus**; export Go runtime metrics with [`promhttp`](https://pkg.go.dev/github.com/prometheus/client_golang/prometheus/promhttp).  
* **Tracing** → optional OpenTelemetry instrumentation in Go.

---

## 9. CI/CD (GitHub Actions Example)

```yaml
name: Deploy Etherbase

on:
  push:
    branches: [main]

env:
  REGISTRY: ghcr.io/${{ github.repository_owner }}

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    permissions: { contents: read, packages: write }
    steps:
      - uses: actions/checkout@v4
      - uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - name: Build & push images
        run: |
          docker build -t $REGISTRY/etherbase-writer:sha-${{ github.sha }} -f backend/Dockerfile.writer backend
          docker build -t $REGISTRY/etherbase-reader:sha-${{ github.sha }} -f backend/Dockerfile.reader backend
          docker build -t $REGISTRY/etherbase-frontend:sha-${{ github.sha }} -f packages/frontend/Dockerfile packages/frontend
          docker push $REGISTRY/etherbase-*
```

Follow with a deploy stage using your provider’s CLI (e.g., `aws ecs update-service`).

---

## 10. Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| Writer connects but no transactions mined | `PRIVATE_KEY` lacks funds or is wrong chain | Verify key & fund with gas |
| WebSocket handshake fails through proxy | Upgrade headers stripped | Configure proxy `Connection: upgrade`, `Upgrade: websocket` |
| Frontend shows “No backend connected” | Wrong `NEXT_PUBLIC_*` or CORS | Check env vars; ensure reader/writer URLs reachable |

---

## 11. Summary

1. Configure `.env` with **contract addresses** and chain details.  
2. Build images → push to registry.  
3. Deploy three containers (writer 8081, reader 8082, frontend 8080).  
4. Point your domain(s) via a WebSocket-capable proxy and enable TLS.  
5. Scale out, add observability, wire into CI/CD — **your production Etherbase is live**.
