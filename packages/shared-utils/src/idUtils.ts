import { nanoid } from 'nanoid';

/**
 * Generates a unique 21-character nanoid string for Room ID generation.
 * Entropy: ~126 bits (astronomically low collision probability).
 */
export function generateRoomId(): string {
  return nanoid();
}

/**
 * Generates a unique 21-character nanoid string for userToken identity.
 */
export function generateUserToken(): string {
  return nanoid();
}
