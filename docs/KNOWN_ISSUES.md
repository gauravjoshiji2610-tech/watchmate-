# KNOWN_ISSUES.md — WatchMate v1.0

This document tracks all known issues, limitations, and deferred items as of v1.0 release.

---

## Active Known Issues

### KI-001 — Physical Cross-Network Testing Pending
- **Component**: WebRTC ICE Restart / TURN Relay
- **Status**: Pending Physical Deployment
- **Description**: Physical multi-device cross-network testing (Laptop WiFi ↔ Mobile 5G) has not been performed. The `restartIce()` recovery path and Coturn TURN relay fallback are code-verified but require a live production deployment with a public IP and valid SSL certificates to physically test.
- **Workaround**: Test after Phase 10 production deployment using DEPLOYMENT.md guide.
- **Target**: Phase 10 physical test matrix execution.

### KI-002 — Firefox, Android Chrome, iOS Safari Physical Device Testing Pending
- **Component**: Browser Compatibility
- **Status**: Code Verified — Pending Physical Device Test
- **Description**: Firefox, Android Chrome, and iOS Safari have been verified at the code and local runtime level. Physical end-to-end testing on real devices has not been performed.
- **Workaround**: Test after production deployment per DEPLOYMENT.md.
- **Target**: Phase 10 physical test matrix execution.

---

## Deferred Features (Post v1.0)

### DF-001 — Adaptive Quality / Dynamic Bitrate Switching (v1.1)
- **Description**: The current "Auto" quality option delegates resolution choice to the browser's native default. True ABR (Adaptive Bitrate) that automatically downgrades resolution during packet loss > 5% is not implemented.
- **Target**: v1.1

### DF-002 — Multi-Party SFU Architecture (v2.0)
- **Description**: WatchMate v1.0 supports 1-to-1 P2P sessions only. Scaling to multi-party (3+ participants) requires an SFU (Selective Forwarding Unit) such as Mediasoup or LiveKit.
- **Target**: v2.0

### DF-003 — Background Blur / Virtual Backgrounds (v1.1)
- **Description**: Real-time webcam background blur using `@mediapipe/selfie_segmentation`.
- **Target**: v1.1

### DF-004 — Cloud Recording & Transcripts (v2.0)
- **Description**: Session recording to cloud storage and AI-generated transcripts.
- **Target**: v2.0

### DF-005 — Backend Telemetry Ingestion (v1.1)
- **Description**: WebRTC stats (RTT, bitrate, packet loss) are currently client-side only. A backend telemetry ingestion endpoint (`POST /api/telemetry`) is not implemented.
- **Target**: v1.1

### DF-006 — HMAC Dynamic TURN Credentials (v1.1)
- **Description**: TURN credentials are currently long-term static. Dynamic per-session HMAC time-limited TURN credentials via Coturn `use-auth-secret` are not implemented.
- **Target**: v1.1
