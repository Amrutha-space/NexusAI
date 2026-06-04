# NexusAI — Intelligent API Gateway & AI Observability Platform

Production-grade distributed API Gateway platform built with microservices architecture, adaptive rate limiting, AI-powered observability, and real-time operational analytics.

## Live Demo

Frontend Dashboard  
https://frontend-dashboard-iv8i.onrender.com

## Demo Credentials

```bash
Email: owner@example.com
Password: PlatformPass123!
```

---

## Features

- Intelligent API Gateway
- JWT Authentication & API Keys
- Distributed Rate Limiting with Redis
- AI-Powered Traffic Analytics
- Real-Time Observability Dashboard
- Circuit Breaker & Retry Mechanisms
- Multi-Service Cloud Deployment
- Operational Intelligence & Scaling Insights

---

## Architecture

```text
Frontend Dashboard (React)
        │
        ▼
API Gateway Service
        │
 ┌──────┼────────┐
 ▼      ▼        ▼
Auth  Logging  Rate Limiter
Service Service Service
        │
        ▼
 PostgreSQL + Redis
```

---

## Tech Stack

### Frontend
- React
- Vite
- Recharts

### Backend
- Node.js
- Express.js

### Infrastructure
- PostgreSQL
- Redis
- Docker
- Render

### Engineering Concepts
- Microservices Architecture
- Distributed Systems
- API Gateway Design
- Observability Pipelines
- AI-Assisted Analytics
- Circuit Breaker Pattern
- Adaptive Rate Limiting

---

## Example API Request

```bash
curl -X POST "https://gateway-service-c4g1.onrender.com/proxy/payments/payments/charge" \
  -H "Content-Type: application/json" \
  -H "x-api-key: ak_live_seed_platform_key" \
  -d '{"amount":299,"currency":"USD"}'
```

---

## Local Setup

```bash
git clone https://github.com/<your-username>/APIGateway.git
cd APIGateway

npm install
```

Create `.env`

```env
DATABASE_URL=
REDIS_URL=
JWT_SECRET=
OPENAI_API_KEY=
INTERNAL_SERVICE_TOKEN=
```

Run services:

```bash
npm run dev
```

---

## Project Highlights

- Built a production-style API infrastructure platform
- Implemented distributed Redis-backed rate limiting
- Designed AI-powered operational analytics system
- Deployed scalable microservices architecture on cloud infrastructure
- Developed intelligent gateway routing and observability pipelines

---

## Author

**Amrutha A**  
Backend Engineering • Distributed Systems • Platform Engineering • Software Developer