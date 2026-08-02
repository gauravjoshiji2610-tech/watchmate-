# AntiGravity

A lightweight, real-time 1-to-1 screen sharing platform with audio/video quality, low latency, and clean architecture.

---

## Project Status

🔨 **Phase 1 — Monorepo Setup** — Complete  
⏳ Phase 2 — Backend (Express + Health Check) — Pending  
⏳ Phase 3 — Socket.IO (Three Namespaces) + Structured Logging — Pending  
⏳ Phase 4 — Room Service (Redis-backed) — Pending  
⏳ Phase 5 — Reconnect (userToken, grace period) — Pending  
⏳ Phase 6 — Chat + Rate Limiting + Validation — Pending  
⏳ Phase 7 — Frontend (React + Vite) — Pending  
⏳ Phase 8 — WebRTC (P2P, Quality Tiers, TURN) — Pending  
⏳ Phase 9 — Testing (Multi-device, disconnect/reconnect) — Pending  
⏳ Phase 10 — Deployment — Pending  

---

## Architecture

| Concern | Technology |
|---|---|
| Frontend | React, Vite, TypeScript, TailwindCSS |
| Backend | Node.js, Express, Socket.IO, TypeScript |
| Realtime | WebRTC (P2P for MVP) |
| State | Redis (room state, TTL-backed) |
| TURN | Self-hosted coturn or Metered.ca |
| Monorepo | pnpm workspaces |

For architectural decisions, see [`docs/architecture/`](./docs/architecture/).

---

## Monorepo Structure

```
antigravity/
├── apps/
│   ├── client/           # React + Vite + TypeScript + TailwindCSS
│   └── server/           # Node.js + Express + Socket.IO + TypeScript
├── packages/
│   ├── shared-types/     # Pure TS interfaces, zero runtime deps
│   ├── shared-schemas/   # Zod validation schemas (zod only)
│   └── shared-utils/     # Isomorphic utility functions
├── docs/
│   └── architecture/     # Architecture Decision Records (ADRs)
├── scripts/              # Monorepo-level tooling
├── CONVENTIONS.md        # Project conventions (read this first)
└── tsconfig.base.json    # Base TypeScript config
```

---

## Getting Started

### Prerequisites

- Node.js >= 22
- pnpm >= 11

### Install

```bash
pnpm install
```

### Development

```bash
# Start all apps in parallel (Phase 7+ only)
pnpm dev

# Start server only
pnpm --filter @antigravity/server dev

# Start client only
pnpm --filter @antigravity/client dev
```

### Type Check

```bash
pnpm typecheck
```

### Build

```bash
pnpm build
```

### Clean

```bash
node scripts/clean.mjs
```

---

## Git Workflow

```
main ← production releases (tagged)
 └── dev ← integration
      └── feature/* ← feature branches
      └── fix/*     ← bug fixes
      └── hotfix/*  ← critical patches (branch from main)
```

See [`CONVENTIONS.md`](./CONVENTIONS.md) for commit message format and full workflow rules.

---

## MVP Feature Set

- Create / Join Room (random Room ID via nanoid)
- Display Name only (no authentication)
- Chat scoped per room
- Screen Share, Mic Toggle, Webcam Toggle, Fullscreen
- Host End Room (server-enforced)
- Room auto-delete when empty (Redis TTL safety net)
- Auto reconnect via persistent userToken (20-second grace period)
- Last 5 rooms history
- Responsive UI — mobile + desktop
- Health/status endpoint
- Structured logging
- Explicit "room full" rejection for 1:1 model

---

## Platform Support

| Platform | Host | Viewer |
|---|---|---|
| Desktop Chrome | ✅ | ✅ |
| Desktop Firefox | ✅ | ✅ |
| Desktop Edge | ✅ | ✅ |
| Android Chrome | ✅ | ✅ |
| iPhone Safari | ❌ (OS limitation) | ✅ |

---

## License

Private — not for distribution.
