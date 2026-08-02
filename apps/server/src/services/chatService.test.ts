import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { sendMessagePayloadSchema } from '@antigravity/shared-schemas';

describe('Chat Message Validation Tests', () => {
  test('validates and trims normal chat message', () => {
    const input = {
      messageId: 'msg-123',
      roomId: 'room-abc',
      message: '  Hello WatchMate!  ',
    };

    const result = sendMessagePayloadSchema.safeParse(input);
    assert.equal(result.success, true);
    if (result.success) {
      assert.equal(result.data.message, 'Hello WatchMate!');
    }
  });

  test('rejects empty message after whitespace trimming', () => {
    const input = {
      messageId: 'msg-124',
      roomId: 'room-abc',
      message: '    ',
    };

    const result = sendMessagePayloadSchema.safeParse(input);
    assert.equal(result.success, false);
  });

  test('rejects message exceeding 1000 characters', () => {
    const input = {
      messageId: 'msg-125',
      roomId: 'room-abc',
      message: 'a'.repeat(1001),
    };

    const result = sendMessagePayloadSchema.safeParse(input);
    assert.equal(result.success, false);
  });

  test('rejects message with invalid control characters', () => {
    const input = {
      messageId: 'msg-126',
      roomId: 'room-abc',
      message: 'Hello \u0007 World', // ASCII 0x07 (bell)
    };

    const result = sendMessagePayloadSchema.safeParse(input);
    assert.equal(result.success, false);
  });
});
