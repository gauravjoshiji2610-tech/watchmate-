# AntiGravity

> Ultra-low latency 1-to-1 real-time screen sharing, video conferencing, and room-isolated chat.

[![Build](https://img.shields.io/badge/build-passing-brightgreen)](.)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](.)
[![Node.js](https://img.shields.io/badge/Node.js-20.x-green)](.)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

---

## What is AntiGravity?

AntiGravity is a production-grade, 1-to-1 screen sharing and collaboration platform built on:

- **Pure WebRTC P2P** direct channels for sub-50ms latency.
- **Socket.IO** signaling with namespace isolation (`/signaling`, `/presence`, `/chat`).
- **Redis** for ephemeral room state, host locking, rate-limiting, and chat history.
- **React 18 + Vite** frontend with Tailwind CSS and Framer Motion.

---

## Architecture

```
Browser (Host / Viewer)
        │
   HTTPS (443) via Nginx
        │
 ┌──────┴──────────────┐
 │   Express Backend   │ ← Socket.IO Signaling, REST API
 │   + Socket.IO       │
 └──────┬──────────────┘
        │
     Redis (6379)         ← Room state, Chat history, Rate limits
        │
  Coturn TURN (3478/5349) ← NAT traversal relay fallback
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Monorepo | pnpm workspaces, TypeScript project references |
| Backend | Node.js 20, Express 4, Socket.IO 4, Pino, ioredis |
| Frontend | React 18, Vite 6, Tailwind CSS 3, Framer Motion |
| WebRTC | Pure W3C RTCPeerConnection, replaceTrack, getDisplayMedia |
| State | Redis 7 (ephemeral rooms, chat buffer, rate limiting) |
| Infrastructure | Docker, Docker Compose, Nginx, Coturn |
| Testing | Node.js native test runner (16/16 tests passing) |

---

## Quick Start (Local Development)

### Prerequisites
- Node.js 20+
- pnpm 9+
- Redis 7 (running locally or via Docker)

### 1. Clone
```bash
git clone https://github.com/your-org/antigravity.git
cd antigravity
```

### 2. Install dependencies
```bash
pnpm install
```

### 3. Environment setup
```bash
# Backend
cp apps/server/.env.example apps/server/.env
# Fill in REDIS_URL=redis://localhost:6379 and CLIENT_URL=http://localhost:5173

# Frontend
cp apps/client/.env.example apps/client/.env
# Fill in VITE_API_URL=http://localhost:3001 and VITE_SOCKET_URL=http://localhost:3001
```

### 4. Build shared packages
```bash
pnpm build:packages
```

### 5. Start development servers
```bash
# Terminal 1 — Backend
pnpm --filter @antigravity/server dev

# Terminal 2 — Frontend
pnpm --filter @antigravity/client dev
```

Open: http://localhost:5173

---

## Production Deployment

See [DEPLOYMENT.md](docs/DEPLOYMENT.md) for full production deployment guide including Docker, Nginx, Coturn TURN server, and SSL certificate setup.

---

## Running Tests

```bash
pnpm --filter @antigravity/server test
```

Expected output:
```
# tests 16
# pass  16
# fail  0
```

---

## Project Structure

```
antigravity/
├── apps/
│   ├── client/          # React 18 + Vite frontend
│   └── server/          # Express + Socket.IO backend
├── packages/
│   ├── shared-types/    # Shared TypeScript interfaces
│   ├── shared-schemas/  # Shared Zod validation schemas
│   └── shared-utils/    # Shared utility functions
├── docs/
│   ├── adr/             # Architecture Decision Records
│   ├── DEPLOYMENT.md
│   ├── KNOWN_ISSUES.md
│   └── TEST_REPORT.md
├── nginx/               # Nginx reverse proxy config
├── coturn/              # Coturn TURN server config
└── docker-compose.yml
```

---

## License

MIT License. See [LICENSE](LICENSE) for details.
