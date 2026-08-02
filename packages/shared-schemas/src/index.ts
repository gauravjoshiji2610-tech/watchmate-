// @antigravity/shared-schemas — barrel export
// Zod validation schemas. Only allowed runtime dependency: zod.

export { eventEnvelopeSchema } from './envelope.js';
export type { EventEnvelopeInput, EventEnvelopeParsed } from './envelope.js';

export { sdpPayloadSchema, iceCandidatePayloadSchema } from './signaling.js';
export type { SdpPayload, IceCandidatePayload } from './signaling.js';
