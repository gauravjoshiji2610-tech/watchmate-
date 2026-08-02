// @antigravity/shared-schemas — barrel export
// Zod validation schemas. Only allowed runtime dependency: zod.

export { eventEnvelopeSchema } from './envelope.js';
export type { EventEnvelopeInput, EventEnvelopeParsed } from './envelope.js';

export { sdpPayloadSchema, iceCandidatePayloadSchema } from './signaling.js';
export type { SdpPayload, IceCandidatePayload } from './signaling.js';

export {
  joinRoomPayloadSchema,
  leaveRoomPayloadSchema,
  hostEndRoomPayloadSchema,
  reconnectPayloadSchema,
} from './presence.js';

export type {
  JoinRoomPayload,
  LeaveRoomPayload,
  HostEndRoomPayload,
  ReconnectPayload,
} from './presence.js';

export { sendMessagePayloadSchema } from './chat.js';
export type { SendMessagePayload } from './chat.js';
