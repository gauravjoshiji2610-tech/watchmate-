import { generateUserToken } from '@antigravity/shared-utils';

/**
 * Room service frontend helper placeholder.
 * Manages client userToken persistence in localStorage.
 */

const USER_TOKEN_KEY = 'antigravity_user_token';

export function getOrCreateUserToken(): string {
  let token = localStorage.getItem(USER_TOKEN_KEY);
  if (!token) {
    token = generateUserToken();
    localStorage.setItem(USER_TOKEN_KEY, token);
  }
  return token;
}
