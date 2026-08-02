// @antigravity/shared-types — barrel export
// Pure TypeScript interfaces and type definitions. Zero runtime dependencies.

export type { EventEnvelope, ServerErrorPayload } from './envelope.js';

export {
  SignalingEvents,
  PresenceEvents,
  ChatEvents,
  SystemEvents,
  ServerErrors,
} from './events.js';

export type {
  SignalingEventName,
  PresenceEventName,
  ChatEventName,
  ServerErrorCode,
} from './events.js';

export type { Role, Participant, Room, UserTokenBinding } from './room.js';
export type { ChatMessage } from './chat.js';
