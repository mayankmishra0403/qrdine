import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

function getRedis(): Redis {
  const globalForRedis = globalThis as unknown as { _redis?: Redis };
  if (!globalForRedis._redis) {
    globalForRedis._redis = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (times > 5) return null;
        return Math.min(times * 200, 3000);
      },
      lazyConnect: true,
    });
  }
  return globalForRedis._redis;
}

export const redis = getRedis();

export const CHANNELS = {
  KDS_NEW_ORDER: "kds:new-order",
  KDS_STATUS_UPDATE: "kds:status-update",
  KDS_ORDER_DELETED: "kds:order-deleted",
  POS_TABLE_UPDATE: "pos:table-update",
  WAITER_ORDER_READY: "waiter:order-ready",
  OWNER_ALERT: "owner:alert",
} as const;

export async function publish(channel: string, message: unknown) {
  try {
    await redis.publish(channel, JSON.stringify(message));
  } catch (err) {
    console.error(`[Redis] Publish error on ${channel}:`, err);
  }
}

export async function subscribe(
  channel: string,
  callback: (message: string) => void
) {
  const sub = redis.duplicate();
  await sub.subscribe(channel);
  sub.on("message", (_channel, message) => {
    callback(message);
  });
  return () => {
    sub.unsubscribe(channel);
    sub.disconnect();
  };
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const val = await redis.get(key);
    return val ? JSON.parse(val) : null;
  } catch {
    return null;
  }
}

export async function cacheSet(
  key: string,
  value: unknown,
  ttlSeconds: number = 300
) {
  try {
    await redis.setex(key, ttlSeconds, JSON.stringify(value));
  } catch (err) {
    console.error(`[Redis] Cache set error:`, err);
  }
}

export async function cacheDel(key: string) {
  try {
    await redis.del(key);
  } catch (err) {
    console.error(`[Redis] Cache del error:`, err);
  }
}

export async function cacheInvalidatePattern(pattern: string) {
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch (err) {
    console.error(`[Redis] Cache invalidate error:`, err);
  }
}
