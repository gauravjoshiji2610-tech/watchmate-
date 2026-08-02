import { z } from 'zod';

/**
 * Zod schemas for WebRTC signaling payloads.
 *
 * These are the inner `payload` fields of signaling EventEnvelopes.
 * They are used in:
 *   - Phase 3: Middleware validates payload structure on /signaling events
 *   - Phase 8: Event handlers use these to process offer/answer/ICE
 *
 * SFU-agnostic design (ADR-005):
 * producerId and consumerId are userToken values — not socket IDs.
 * This survives a P2P → SFU migration without changing the wire format.
 *
 * Size context:
 * The 16 KB hard cap is enforced at the serialized envelope level in
 * sdpSizeLimit middleware BEFORE these Zod schemas run. A legitimate
 * SDP string is typically 1–4 KB. A 16 KB cap provides significant margin.
 */

// ── SDP Offer / Answer ────────────────────────────────────────────────────────

export const sdpPayloadSchema = z.object({
  /**
   * userToken of the participant sending the SDP.
   * For MVP P2P: always the host (offer) or viewer (answer).
   * SFU: becomes the SFU's producerId.
   */
  producerId: z.string().min(1).max(50),

  /**
   * userToken of the intended recipient.
   * For MVP P2P: always the other participant.
   * SFU: becomes the consumer's id.
   */
  consumerId: z.string().min(1).max(50),

  /** RTCSessionDescriptionInit — the SDP string and type */
  sdp: z.object({
    type: z.enum(['offer', 'answer', 'pranswer', 'rollback']),
    /** The SDP string itself. Optional per WebRTC spec (rollback has no sdp). */
    sdp: z.string().optional(),
  }),
});

export type SdpPayload = z.infer<typeof sdpPayloadSchema>;

// ── ICE Candidate ─────────────────────────────────────────────────────────────

export const iceCandidatePayloadSchema = z.object({
  /** userToken of the participant sending this candidate */
  producerId: z.string().min(1).max(50),
  /** userToken of the intended recipient */
  consumerId: z.string().min(1).max(50),

  /** RTCIceCandidateInit — mirrors the browser's RTCIceCandidateInit interface */
  candidate: z.object({
    /** The candidate string. Empty string signals end-of-candidates. */
    candidate: z.string(),
    /** Media stream identification tag. Null for end-of-candidates. */
    sdpMid: z.string().nullable().optional(),
    /** Index of the media description. Null for end-of-candidates. */
    sdpMLineIndex: z.number().int().nullable().optional(),
    /** ICE username fragment */
    usernameFragment: z.string().nullable().optional(),
  }),
});

export type IceCandidatePayload = z.infer<typeof iceCandidatePayloadSchema>;
