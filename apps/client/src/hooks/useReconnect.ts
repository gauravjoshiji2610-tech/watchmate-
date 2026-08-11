/**
 * Empty hook stub for 20-second auto-reconnect logic.
 * Business logic will be implemented in Phase 8+.
 */
export function useReconnect() {
  return {
    isReconnecting: false,
    reconnectAttempt: 0,
    attemptReconnect: () => {},
  };
}
