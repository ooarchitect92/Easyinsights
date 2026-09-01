import Redis from 'ioredis';
import { LRUCache } from 'lru-cache';
import { config } from './config.js';
let redis: Redis | undefined;
const local = new LRUCache<string, string>({
  max: 1000,
  ttl: 30_000,
  allowStale: false,
  updateAgeOnGet: true,
});
const inflight = new Map<string, Promise<unknown>>();
export function getRedis(): Redis {
  redis ??= new Redis(config.redisUrl, {
    lazyConnect: false,
    enableOfflineQueue: true,
    maxRetriesPerRequest: 2,
    connectTimeout: 3000,
    retryStrategy: (times) => Math.min(times * 100, 2000),
  });
  return redis;
}
export async function closeRedis(): Promise<void> {
  if (redis) {
    await redis.quit().catch(() => redis?.disconnect());
    redis = undefined;
  }
}
export class RuntimeCache {
  constructor(private readonly prefix = 'ei') {}
  private key(key: string) {
    return `${this.prefix}:${key}`;
  }
  async get<T>(key: string): Promise<T | null> {
    const k = this.key(key);
    const localValue = local.get(k);
    if (localValue !== undefined) return JSON.parse(localValue) as T;
    try {
      const value = await getRedis().get(k);
      if (value !== null) {
        local.set(k, value, { ttl: 15_000 });
        return JSON.parse(value) as T;
      }
    } catch {
      // Redis is an optional acceleration layer; MongoDB remains authoritative.
    }
    return null;
  }
  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    const k = this.key(key);
    const encoded = JSON.stringify(value);
    local.set(k, encoded, { ttl: Math.min(ttlSeconds * 1000, 30_000) });
    try {
      await getRedis().set(k, encoded, 'EX', ttlSeconds);
    } catch {
      // Redis is an optional acceleration layer; MongoDB remains authoritative.
    }
  }
  async remove(key: string): Promise<void> {
    const k = this.key(key);
    local.delete(k);
    try {
      await getRedis().del(k);
    } catch {
      // Redis is an optional acceleration layer; MongoDB remains authoritative.
    }
  }
  async invalidatePrefix(prefix: string): Promise<number> {
    const full = this.key(prefix);
    for (const key of local.keys()) if (key.startsWith(full)) local.delete(key);
    let removed = 0;
    try {
      let cursor = '0';
      do {
        const [next, keys] = await getRedis().scan(cursor, 'MATCH', `${full}*`, 'COUNT', 200);
        cursor = next;
        if (keys.length) {
          removed += await getRedis().del(...keys);
        }
      } while (cursor !== '0');
    } catch {
      // Redis is an optional acceleration layer; MongoDB remains authoritative.
    }
    return removed;
  }
  async getOrLoad<T>(key: string, ttlSeconds: number, loader: () => Promise<T>): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;
    const k = this.key(key);
    const current = inflight.get(k);
    if (current) return current as Promise<T>;
    const promise = (async () => {
      try {
        const value = await loader();
        await this.set(key, value, ttlSeconds);
        return value;
      } finally {
        inflight.delete(k);
      }
    })();
    inflight.set(k, promise);
    return promise;
  }
}
let defaultCache: RuntimeCache | undefined;
export function getCache(): RuntimeCache {
  defaultCache ??= new RuntimeCache();
  return defaultCache;
}
