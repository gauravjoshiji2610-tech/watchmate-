import type { Room, Role, ChatMessage } from '@antigravity/shared-types';

export type { Room, Role, ChatMessage };

export interface UserSession {
  userToken: string;
  displayName: string;
}
