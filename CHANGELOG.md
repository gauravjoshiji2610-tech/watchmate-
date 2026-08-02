# CHANGELOG.md

All notable changes to AntiGravity are documented in this file.  
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [1.0.0] — 2026-08-02

### Added

#### Phase 1 — Monorepo Foundation
- pnpm workspace monorepo with TypeScript project references.
- `packages/shared-types`, `packages/shared-schemas`, `packages/shared-utils`.
- Architecture Decision Records (ADR-001 to ADR-007).
- `CONVENTIONS.md` coding standards document.

#### Phase 2 — Express Server & Infrastructure
- Express 4 + Pino structured logging backend.
- Zod environment variable validation on startup.
- CORS configuration with strict origin checking.
- `/api/health` REST endpoint.
- Graceful SIGTERM/SIGINT shutdown.

#### Phase 3 — Socket.IO Real-Time Namespaces
- Three Socket.IO namespaces: `/signaling`, `/presence`, `/chat`.
- Namespace-level `userToken` authentication middleware.
- `EventEnvelope` wrapper with Zod schema validation.
- 16 KB SDP payload hard limit.

#### Phase 4 — Redis State Engine & RoomService
- `RoomService`: `createRoom`, `joinRoom`, `leaveRoom`, `endRoom`, `getRoom`.
- Redis `SET NX` atomic host locking.
- 1-to-1 participant cap enforcement.
- 5-room active cap enforcement.
- nanoid collision retry on room ID generation.
- 2-hour safety TTL refresh on room access.

#### Phase 5 — Auto Reconnect & Session Restoration
- `ReconnectService` with 20-second grace period timers.
- Host slot priority and idempotent session restoration.
- Duplicate socket eviction on reconnect.

#### Phase 6 — ChatService, Rate Limiting & Security
- Room-scoped chat with Redis message buffer (last 50 messages).
- Token-based Redis rate limiting: 10 messages per 10 seconds.
- Server-side `displayName` authority (clients cannot spoof).
- `messageId` deduplication with 5-minute TTL.
- Zod schema: 1000 char max, control character rejection.

#### Phase 7 — Frontend Architecture
- React 18, Vite 6, Tailwind CSS 3, Framer Motion 11, Lucide icons, Sonner.
- React Router 6 routing (`/`, `/room/:roomId`, `*`).
- Zustand state stores: theme, connection, recent rooms, room state.
- Dark/Light/System theme toggle with `localStorage` persistence.
- Glassmorphic TopBar, ControlBar, VideoContainer, ChatPanel.
- Home page: Hero, Create/Join Room cards, Recent Rooms, Feature matrix, Browser compat matrix.

#### Phase 8A — WebRTC P2P Connection Foundation
- `PeerConnectionManager` encapsulating `RTCPeerConnection`.
- `SignalingService` wrapping `/signaling` Socket.IO namespace.
- `ConnectionState` state mapping.
- `useWebRTC` hook. `<ConnectionStatus />` UI badge.
- Client-side `logger.ts`.

#### Phase 8B — Screen Sharing
- `ScreenShareManager` with `getDisplayMedia()`, `track.onended`, browser support check.
- `useScreenShare` hook.
- `<VideoContainer />` HTML5 `<video autoPlay playsInline muted>` binding.
- iOS Safari Host fallback banner.

#### Phase 8C — Microphone, Webcam & Device Management
- `MediaDeviceManager`, `MicrophoneManager`, `CameraManager`.
- `useMicrophone`, `useCamera`, `useMediaDevices` hooks.
- Resolution presets: 480p (default), 720p, 1080p, Auto.
- Zero-renegotiation `RTCRtpSender.replaceTrack()` device switching.

#### Phase 8D — WebRTC TURN, ICE Restart & Telemetry
- `RTCConfig.ts` dynamic STUN/TURN server configuration factory.
- `WebRTCStatsMonitor.ts` live `getStats()` poller (RTT, bitrate, FPS, packet loss, candidate type).
- `PeerConnectionManager.restartIce()` auto-recovery on network disconnects.
- `lib/fullscreen.ts` cross-browser fullscreen helper.
- Live WebRTC telemetry overlay on `<VideoContainer />`.

#### Phase 10 — Production Infrastructure
- `apps/server/Dockerfile` multi-stage production container.
- `apps/client/Dockerfile` multi-stage Vite + Nginx container.
- `docker-compose.yml` orchestrating Backend, Frontend, Redis, Coturn, Nginx.
- `nginx/nginx.conf` HTTPS SSL termination, WebSocket upgrade, security headers.
- `coturn/turnserver.conf` STUN/TURN relay with TLS and long-term credentials.
- `.env.production.example` production environment template.
- `README.md`, `DEPLOYMENT.md`, `KNOWN_ISSUES.md`, `TEST_REPORT.md`, `CHANGELOG.md`.

### Fixed

- **Phase 9 — Bug #1**: Stale closure state in `recentRoomsStore.ts`. Updated `addRecentRoom` to use functional state updater `setRecentRoomsState(prev => ...)`.

### Changed

- **Phase 9 Audit**: Updated Auto quality label in `<QualitySelector />` from `"Auto (Adaptive)"` to `"Auto (Browser Default)"` to accurately reflect browser-delegated resolution selection.

---

## [Unreleased]

### Planned for v1.1
- Adaptive bitrate switching based on live `WebRTCStatsReport` packet loss threshold.
- HMAC dynamic time-limited TURN credentials (`use-auth-secret` Coturn mode).
- Backend telemetry ingestion endpoint (`POST /api/telemetry`).
- Physical cross-network test execution (Laptop WiFi ↔ Mobile 5G).
- Firefox, Android Chrome, iOS Safari physical device verification.
