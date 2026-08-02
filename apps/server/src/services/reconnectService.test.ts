import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  startGraceTimer,
  cancelGraceTimer,
  isUserInGracePeriod,
} from './reconnectService.js';

describe('ReconnectService Unit Tests', () => {
  test('grace period timer starts and can be checked', () => {
    const roomId = 'test-room-1';
    const userToken = 'user-token-123';

    startGraceTimer(roomId, userToken);
    assert.equal(isUserInGracePeriod(roomId, userToken), true);

    const cancelled = cancelGraceTimer(roomId, userToken);
    assert.equal(cancelled, true);
    assert.equal(isUserInGracePeriod(roomId, userToken), false);
  });

  test('cancelling a non-existent grace period returns false', () => {
    const cancelled = cancelGraceTimer('non-existent-room', 'non-existent-user');
    assert.equal(cancelled, false);
  });

  test('starting a grace period timer twice replaces previous timer idempotently', () => {
    const roomId = 'test-room-2';
    const userToken = 'user-token-456';

    startGraceTimer(roomId, userToken);
    assert.equal(isUserInGracePeriod(roomId, userToken), true);

    // Second call should replace previous timer without throwing
    startGraceTimer(roomId, userToken);
    assert.equal(isUserInGracePeriod(roomId, userToken), true);

    cancelGraceTimer(roomId, userToken);
    assert.equal(isUserInGracePeriod(roomId, userToken), false);
  });
});
