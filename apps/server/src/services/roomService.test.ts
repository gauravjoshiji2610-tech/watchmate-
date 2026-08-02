import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { Redis } from 'ioredis';
import { setRedisClient } from '../redis.js';
import {
  createRoom,
  joinRoom,
  leaveRoom,
  endRoom,
  getRoom,
  getUserBinding,
  countActiveRooms,
} from './roomService.js';
import { config } from '../config.js';

/**
 * In-memory Mock Redis Implementation for RoomService Unit Tests
 */
class MockRedis {
  public store = new Map<string, string>();
  public ttls = new Map<string, number>();

  async get(key: string): Promise<string | null> {
    return this.store.get(key) ?? null;
  }

  async set(key: string, value: string, ...args: (string | number)[]): Promise<'OK' | null> {
    const isNX = args.includes('NX');
    if (isNX && this.store.has(key)) {
      return null; // SET NX fails if key exists
    }

    this.store.set(key, value);

    const exIndex = args.indexOf('EX');
    if (exIndex !== -1 && typeof args[exIndex + 1] === 'number') {
      this.ttls.set(key, args[exIndex + 1] as number);
    }

    const pxIndex = args.indexOf('PX');
    if (pxIndex !== -1 && typeof args[pxIndex + 1] === 'number') {
      this.ttls.set(key, Math.ceil((args[pxIndex + 1] as number) / 1000));
    }

    return 'OK';
  }

  async del(...keys: string[]): Promise<number> {
    let deleted = 0;
    for (const key of keys) {
      if (this.store.delete(key)) {
        this.ttls.delete(key);
        deleted++;
      }
    }
    return deleted;
  }

  async exists(key: string): Promise<number> {
    return this.store.has(key) ? 1 : 0;
  }

  async keys(pattern: string): Promise<string[]> {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    const matched: string[] = [];
    for (const key of this.store.keys()) {
      if (regex.test(key)) {
        matched.push(key);
      }
    }
    return matched;
  }

  async expire(key: string, seconds: number): Promise<number> {
    if (this.store.has(key)) {
      this.ttls.set(key, seconds);
      return 1;
    }
    return 0;
  }
}

describe('RoomService Unit Tests', () => {
  let mockRedis: MockRedis;

  beforeEach(() => {
    mockRedis = new MockRedis();
    setRedisClient(mockRedis as unknown as Redis);
  });

  afterEach(() => {
    setRedisClient(null);
  });

  test('Room Creation: successfully creates room and sets Redis keys', async () => {
    const hostToken = 'host-token-111';
    const displayName = 'Alice Host';

    const room = await createRoom(hostToken, displayName);

    assert.ok(room.roomId);
    assert.equal(room.hostToken, hostToken);
    assert.equal(room.participants.length, 1);
    assert.equal(room.participants[0]?.role, 'host');
    assert.equal(room.participants[0]?.displayName, displayName);

    // Verify Redis keys created
    const fetchedRoom = await getRoom(room.roomId);
    assert.ok(fetchedRoom);
    assert.equal(fetchedRoom.roomId, room.roomId);

    // Verify token binding
    const binding = await getUserBinding(hostToken);
    assert.ok(binding);
    assert.equal(binding.roomId, room.roomId);
    assert.equal(binding.role, 'host');

    // Verify host lock
    const hostLock = await mockRedis.get(`lock:host:${room.roomId}`);
    assert.equal(hostLock, hostToken);
  });

  test('Room Join: viewer successfully joins room and gets viewer role', async () => {
    const hostToken = 'host-token-222';
    const viewerToken = 'viewer-token-333';

    const createdRoom = await createRoom(hostToken, 'Host User');
    const updatedRoom = await joinRoom(createdRoom.roomId, viewerToken, 'Viewer User');

    assert.equal(updatedRoom.participants.length, 2);
    assert.equal(updatedRoom.participants[1]?.role, 'viewer');
    assert.equal(updatedRoom.participants[1]?.userToken, viewerToken);

    // Verify viewer token binding
    const binding = await getUserBinding(viewerToken);
    assert.ok(binding);
    assert.equal(binding.role, 'viewer');
  });

  test('Room Limit Enforcement: rejects creation when MAX_ACTIVE_ROOMS limit reached', async () => {
    // Fill up active rooms to MAX_ACTIVE_ROOMS (5)
    for (let i = 0; i < config.MAX_ACTIVE_ROOMS; i++) {
      await createRoom(`host-${i}`, `Host ${i}`);
    }

    assert.equal(await countActiveRooms(), config.MAX_ACTIVE_ROOMS);

    // 6th room creation must throw ERR_ROOM_LIMIT_REACHED
    await assert.rejects(
      async () => {
        await createRoom('host-overflow', 'Overflow Host');
      },
      (err: Error & { code?: string }) => {
        assert.equal(err.code, 'ERR_ROOM_LIMIT_REACHED');
        return true;
      },
    );
  });

  test('1-to-1 Room Full Enforcement: rejects 3rd participant join attempt', async () => {
    const room = await createRoom('host-1', 'Host');
    await joinRoom(room.roomId, 'viewer-1', 'Viewer 1');

    // Attempting 3rd join must throw ERR_ROOM_FULL
    await assert.rejects(
      async () => {
        await joinRoom(room.roomId, 'viewer-2', 'Viewer 2');
      },
      (err: Error & { code?: string }) => {
        assert.equal(err.code, 'ERR_ROOM_FULL');
        return true;
      },
    );
  });

  test('Host Lock: acquired via Redis SET NX on room creation', async () => {
    const room = await createRoom('host-lock-test', 'Host Lock Test');
    const lockVal = await mockRedis.get(`lock:host:${room.roomId}`);
    assert.equal(lockVal, 'host-lock-test');

    // Direct SET NX attempt should return null (locked)
    const secondLockAttempt = await mockRedis.set(`lock:host:${room.roomId}`, 'other-user', 'NX');
    assert.equal(secondLockAttempt, null);
  });

  test('Room Deletion: empty room is deleted along with keys', async () => {
    const room = await createRoom('host-del', 'Host Del');
    await joinRoom(room.roomId, 'viewer-del', 'Viewer Del');

    // Viewer leaves
    const res1 = await leaveRoom(room.roomId, 'viewer-del');
    assert.equal(res1.isDeleted, false);
    assert.equal(res1.room?.participants.length, 1);

    // Host leaves -> room empty and deleted
    const res2 = await leaveRoom(room.roomId, 'host-del');
    assert.equal(res2.isDeleted, true);
    assert.equal(res2.room, null);

    // Verify keys removed
    assert.equal(await getRoom(room.roomId), null);
    assert.equal(await getUserBinding('host-del'), null);
    assert.equal(await mockRedis.get(`lock:host:${room.roomId}`), null);
  });

  test('Host End Room: server-enforced room end by host', async () => {
    const room = await createRoom('host-end', 'Host End');
    await joinRoom(room.roomId, 'viewer-end', 'Viewer End');

    // Non-host end attempt must throw ERR_UNAUTHORIZED
    await assert.rejects(
      async () => {
        await endRoom(room.roomId, 'viewer-end');
      },
      (err: Error & { code?: string }) => {
        assert.equal(err.code, 'ERR_UNAUTHORIZED');
        return true;
      },
    );

    // Host end attempt succeeds
    const ended = await endRoom(room.roomId, 'host-end');
    assert.equal(ended, true);

    // Verify room state deleted
    assert.equal(await getRoom(room.roomId), null);
    assert.equal(await getUserBinding('viewer-end'), null);
  });

  test('TTL Refresh Behavior: getRoom refreshes room key safety TTL in Redis', async () => {
    const room = await createRoom('host-ttl', 'Host TTL');
    const roomKeyStr = `room:${room.roomId}`;

    // Mutate TTL map directly to simulate aging
    mockRedis.ttls.set(roomKeyStr, 100);
    assert.equal(mockRedis.ttls.get(roomKeyStr), 100);

    // Reading room via getRoom should refresh TTL to config.ROOM_TTL_SECONDS
    await getRoom(room.roomId);
    assert.equal(mockRedis.ttls.get(roomKeyStr), config.ROOM_TTL_SECONDS);
  });

  test('Nanoid Collision Retry: retries generation if candidate key already exists', async () => {
    let existsCallCount = 0;
    // Mock exists to return 1 (exists) on first call, 0 (free) on second call
    mockRedis.exists = async () => {
      existsCallCount++;
      return existsCallCount === 1 ? 1 : 0;
    };

    const room = await createRoom('host-collision-test', 'Host Collision');
    assert.ok(room.roomId);
    assert.ok(existsCallCount >= 2); // Confirms retry loop executed
  });
});
