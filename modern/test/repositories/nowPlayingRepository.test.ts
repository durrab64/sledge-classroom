'use strict';

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Database } from 'firebase/database';

vi.mock('firebase/database', () => ({
  get: vi.fn(),
  onValue: vi.fn(),
  ref: vi.fn(),
}));

import { get, onValue, ref } from 'firebase/database';

import { NowPlayingRepository, mapNowPlaying } from '@/services/repositories/nowPlayingRepository';

beforeEach(() => {
  vi.clearAllMocks();
  (ref as any).mockReturnValue({} as never);
  (get as any).mockResolvedValue({} as never);
  (onValue as any).mockReturnValue(vi.fn() as never);
});

describe('mapNowPlaying', () => {
  it('maps a valid snapshot to NowPlaying', () => {
    const snapshot = { val: () => ({ title: 'Song A', artist: 'Artist B', artwork: 'img.png', ytLink: 'https://youtu.be/xyz', updatedAt: 12345 }) } as any;
    const result = mapNowPlaying(snapshot);

    expect(result).toEqual({
      title: 'Song A',
      artist: 'Artist B',
      artwork: 'img.png',
      ytLink: 'https://youtu.be/xyz',
      updatedAt: 12345,
    });
  });

  it('returns null for null/absent snapshots', () => {
    expect(mapNowPlaying({ val: () => null } as any)).toBeNull();
    expect(mapNowPlaying({ val: () => undefined } as any)).toBeNull();
  });

  it('returns null when the record has no title or artist', () => {
    expect(mapNowPlaying({ val: () => ({ updatedAt: 1 }) } as any)).toBeNull();
    expect(mapNowPlaying({ val: () => ({ title: '' }) } as any)).toBeNull();
  });

  it('defaults optional fields when missing', () => {
    const result = mapNowPlaying({ val: () => ({ title: 'Only Title' }) } as any);
    expect(result).not.toBeNull();
    expect(result!.artist).toBe('');
    expect(result!.artwork).toBeUndefined();
    expect(result!.ytLink).toBeUndefined();
    expect(result!.updatedAt).toBe(0);
  });

  it('returns null for non-object values', () => {
    expect(mapNowPlaying({ val: () => 'string' } as any)).toBeNull();
    expect(mapNowPlaying({ val: () => 42 } as any)).toBeNull();
  });
});

describe('NowPlayingRepository.getNowPlaying', () => {
  it('returns firebase-not-configured when database is null', async () => {
    const repo = new NowPlayingRepository({ database: null });
    const result = await repo.getNowPlaying();

    expect(result.data).toBeNull();
    expect(result.error!.code).toBe('firebase-not-configured');
    expect(get).not.toHaveBeenCalled();
  });

  it('maps a successful RTDB read', async () => {
    (get as any).mockResolvedValue({
      val: () => ({ title: 'T', artist: 'A', updatedAt: 99 }),
    } as any);

    const repo = new NowPlayingRepository({ database: {} as Database });
    const result = await repo.getNowPlaying();

    expect(ref).toHaveBeenCalledTimes(1);
    expect(get).toHaveBeenCalledTimes(1);
    expect(result.error).toBeNull();
    expect(result.data).toMatchObject({ title: 'T', artist: 'A', updatedAt: 99 });
  });

  it('returns null data when RTDB record is absent', async () => {
    (get as any).mockResolvedValue({ val: () => null } as any);

    const repo = new NowPlayingRepository({ database: {} as Database });
    const result = await repo.getNowPlaying();

    expect(result.error).toBeNull();
    expect(result.data).toBeNull();
  });

  it('propagates RTDB read errors', async () => {
    (get as any).mockRejectedValue(new Error('offline'));

    const repo = new NowPlayingRepository({ database: {} as Database });
    const result = await repo.getNowPlaying();

    expect(result.data).toBeNull();
    expect(result.error!.code).toBe('rtdb-read-failed');
    expect(result.error!.message).toBe('offline');
  });
});

describe('NowPlayingRepository.subscribeNowPlaying', () => {
  // The Realtime Database SDK is dynamically imported now, so subscription
  // attaches after a microtask/async resolution. Same behavior, awaited.
  const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

  it('subscribes and returns an unsubscribe function', async () => {
    const onChange = vi.fn();
    (onValue as any).mockReturnValue(vi.fn() as never);

    const repo = new NowPlayingRepository({ database: {} as Database });
    const unsubscribe = repo.subscribeNowPlaying(onChange);
    await flush();

    expect(ref).toHaveBeenCalled();
    expect(onValue).toHaveBeenCalledTimes(1);
    expect(typeof unsubscribe).toBe('function');
    unsubscribe();
  });

  it('invokes onChange with null when database is unconfigured', async () => {
    const onChange = vi.fn();
    const repo = new NowPlayingRepository({ database: null });
    const unsubscribe = repo.subscribeNowPlaying(onChange);
    await flush();

    expect(onChange).toHaveBeenCalledWith(null);
    expect(onValue).not.toHaveBeenCalled();
    expect(typeof unsubscribe).toBe('function');
    unsubscribe();
  });

  it('does not attach the subscription after an early unsubscribe', async () => {
    const onChange = vi.fn();
    (onValue as any).mockReturnValue(vi.fn() as never);

    const repo = new NowPlayingRepository({ database: {} as Database });
    const unsubscribe = repo.subscribeNowPlaying(onChange);
    unsubscribe();
    await flush();

    expect(onValue).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('NowPlayingRepository with lazy promise database', () => {
  // The production composition (`getRtdb()`) passes a promise resolving to
  // the RTDB instance, so these tests exercise the deferred-resolution path.
  const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

  it('getNowPlaying resolves the lazy promise and maps the read', async () => {
    (get as any).mockResolvedValue({
      val: () => ({ title: 'T', artist: 'A', updatedAt: 7 }),
    } as any);

    const database = {} as Database;
    const repo = new NowPlayingRepository({
      database: Promise.resolve(database),
    });
    const result = await repo.getNowPlaying();

    expect(result.data).toEqual({ title: 'T', artist: 'A', updatedAt: 7 });
    expect(result.error).toBeNull();
    expect(ref).toHaveBeenCalledWith(database, 'nowPlaying/current');
  });

  it('getNowPlaying returns firebase-not-configured when the promise resolves to null', async () => {
    const repo = new NowPlayingRepository({ database: Promise.resolve(null) });
    const result = await repo.getNowPlaying();

    expect(result.data).toBeNull();
    expect(result.error!.code).toBe('firebase-not-configured');
    expect(get).not.toHaveBeenCalled();
  });

  it('attaches the listener and delivers updates after the promise resolves', async () => {
    const onChange = vi.fn();
    let listener: (snapshot: unknown) => void = () => {
      /* replaced by the mock */
    };
    (onValue as any).mockImplementation((_ref: unknown, cb: typeof listener) => {
      listener = cb;
      return vi.fn() as never;
    });

    const repo = new NowPlayingRepository({
      database: Promise.resolve({} as Database),
    });
    repo.subscribeNowPlaying(onChange);
    await flush();

    expect(onValue).toHaveBeenCalledTimes(1);
    expect(ref).toHaveBeenCalled();
    listener({ val: () => ({ title: 'Song', artist: 'A', updatedAt: 1 }) });
    expect(onChange).toHaveBeenCalledWith({
      title: 'Song',
      artist: 'A',
      updatedAt: 1,
    });
  });

  it('does not attach the listener when unsubscribed before promise resolution', async () => {
    const onChange = vi.fn();
    (onValue as any).mockReturnValue(vi.fn() as never);

    let resolveDb!: (database: Database | null) => void;
    const deferred = new Promise<Database | null>((resolve) => {
      resolveDb = resolve;
    });
    const repo = new NowPlayingRepository({ database: deferred });
    const unsubscribe = repo.subscribeNowPlaying(onChange);
    unsubscribe();
    resolveDb({} as Database);
    await flush();

    expect(onValue).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('follows the unconfigured behavior when the promise resolves to null', async () => {
    const onChange = vi.fn();
    const repo = new NowPlayingRepository({
      database: Promise.resolve(null),
    });
    const unsubscribe = repo.subscribeNowPlaying(onChange);
    await flush();

    expect(onChange).toHaveBeenCalledWith(null);
    expect(onValue).not.toHaveBeenCalled();
    expect(typeof unsubscribe).toBe('function');
    unsubscribe();
  });

  it('invokes onError when the database promise rejects', async () => {
    const onChange = vi.fn();
    const onError = vi.fn();

    const repo = new NowPlayingRepository({
      database: Promise.reject(new Error('offline')),
    });
    const unsubscribe = repo.subscribeNowPlaying(onChange, onError);
    await flush();

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0].message).toBe('offline');
    expect(onValue).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
    unsubscribe();
  });
});
