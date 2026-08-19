import Redis from 'ioredis';

let redisInstance: Redis | null = null;
let connectionError = false;

function getRedis(): Redis | null {
  if (connectionError) return null;
  if (!redisInstance) {
    if (!process.env.REDIS_URL) {
      console.warn('[REDIS] REDIS_URL is not defined, cache disabled');
      connectionError = true;
      return null;
    }
    try {
      redisInstance = new Redis(process.env.REDIS_URL, {
        lazyConnect: true,
        retryStrategy: () => null,
      });

      redisInstance.on('error', (err) => {
        console.warn('[REDIS] Connection error:', err.message);
        connectionError = true;
      });

      redisInstance.on('connect', () => {
        console.log('[REDIS] Connected successfully');
        connectionError = false;
      });
    } catch (err) {
      console.warn('[REDIS] Failed to create client:', err);
      connectionError = true;
      return null;
    }
  }
  return redisInstance;
}

export const redis = new Proxy({} as Redis, {
  get(_target, prop) {
    const instance = getRedis();
    if (!instance) {
      return () => Promise.resolve(null);
    }
    return (instance as any)[prop];
  },
});

export async function getCached<T>(key: string): Promise<T | null> {
  const instance = getRedis();
  if (!instance) return null;

  try {
    const value = await instance.get(key);
    if (!value) return null;
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export async function setCached<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
  const instance = getRedis();
  if (!instance) return;

  try {
    await instance.setex(key, ttlSeconds, JSON.stringify(value));
  } catch {
    // ignore cache write errors
  }
}

export async function invalidateCache(key: string): Promise<void> {
  const instance = getRedis();
  if (!instance) return;

  try {
    await instance.del(key);
  } catch {
    // ignore cache delete errors
  }
}
