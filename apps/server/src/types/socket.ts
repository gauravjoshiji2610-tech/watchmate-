/**
 * Server-side Socket data type.
 *
 * This is what gets stored on socket.data after the auth middleware runs.
 * Access via: (socket.data as ServerSocketData).userToken
 *
 * This is intentionally server-internal — clients never see socket.data.
 * It lives in apps/server, not in packages/shared-types.
 *
 * Phase roadmap:
 *   Phase 3: userToken only (set by socketAuth middleware)
 *   Phase 4: roomId, displayName, role added (set by room join handler)
 *   Phase 5: reconnecting flag added (set by reconnect handler)
 */
export interface ServerSocketData {
  /** Stable user identity — set by socketAuth middleware at connection time */
  userToken: string;

  // Phase 4 will add:
  // roomId: string;
  // displayName: string;
  // role: 'host' | 'viewer';

  // Phase 5 will add:
  // reconnecting: boolean;
}
