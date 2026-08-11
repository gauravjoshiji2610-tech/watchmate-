# v1.0.0 Release Notes — WatchMate
**Release Date:** August 2, 2026

---

## Overview

WatchMate v1.0.0 is the initial production release of a real-time 1-to-1 screen sharing, video conferencing, and room-isolated chat platform built entirely on pure WebRTC P2P direct channels with Redis-backed state orchestration.

---

## What's Included in v1.0.0

### Core Features
- **1-to-1 screen sharing** (up to 1080p/60fps, host only, `getDisplayMedia()`)
- **Camera streaming** with resolution presets: 480p (default), 720p, 1080p, Auto
- **Microphone** with echo cancellation, noise suppression, and auto gain control
- **Seamless device switching** via `RTCRtpSender.replaceTrack()` (no re-negotiation)
- **Room-isolated live chat** with Redis message buffer (last 50 messages)
- **WebRTC live telemetry overlay**: RTT, bitrate, FPS, packet loss %, candidate type
- **TURN relay fallback** via Coturn for NAT traversal across restrictive networks
- **ICE restart auto-recovery** on WiFi ↔ Mobile network handoffs
- **Auto-reconnect** with 20-second grace period session restoration
- **Cross-browser fullscreen** (W3C + WebKit APIs)

### Security
- High-entropy `userToken` (nanoid, 21 chars) for zero-trust identity
- Server-enforced display name authority (clients cannot spoof)
- Redis token rate limiting: 10 messages per 10 seconds
- 16 KB SDP hard payload cap before Zod parsing
- `messageId` deduplication with 5-minute Redis TTL

### Infrastructure
- Multi-stage Docker containers for server and client
- Docker Compose orchestration with health checks and restart policies
- Nginx HTTPS reverse proxy with HTTP → HTTPS redirect, security headers
- Coturn TURN relay server configuration (TLS + long-term auth)
- Complete production deployment guide in `DEPLOYMENT.md`

---

## Platforms Supported

| Platform | Support Level |
|----------|--------------|
| Desktop Chrome | Full Host + Viewer |
| Desktop Edge | Full Host + Viewer |
| Desktop Firefox | Full Host + Viewer (code-verified) |
| Android Chrome | Camera Host + Viewer (code-verified) |
| iOS Safari | Viewer only |

---

## Known Limitations

See [KNOWN_ISSUES.md](docs/KNOWN_ISSUES.md) for the complete list.  
Key deferred items:
- Physical cross-network multi-device testing (blocked by live deployment)
- Adaptive bitrate switching (deferred to v1.1)
- Multi-party SFU architecture (deferred to v2.0)

---

## Upgrade / Rollback

See `DEPLOYMENT.md` for rollback instructions.

---

## What's Next (v1.1 Roadmap)
- Physical cross-network tests after production deployment
- Adaptive bitrate switching (RTT/packet loss based)
- HMAC dynamic TURN credentials
- Backend telemetry ingestion API
