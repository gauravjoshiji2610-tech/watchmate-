/**
 * Unified WebRTC Peer Connection States.
 */
export type WebRTCConnectionState =
  | 'new'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'disconnected'
  | 'failed'
  | 'closed';

/**
 * Maps RTCPeerConnectionState to unified WebRTCConnectionState.
 */
export function mapPeerConnectionState(state: RTCPeerConnectionState): WebRTCConnectionState {
  switch (state) {
    case 'new':
      return 'new';
    case 'connecting':
      return 'connecting';
    case 'connected':
      return 'connected';
    case 'disconnected':
      return 'disconnected';
    case 'failed':
      return 'failed';
    case 'closed':
      return 'closed';
    default:
      return 'new';
  }
}
