import {
  Inject,
  Injectable,
  Logger,
  OnApplicationShutdown,
} from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.constants';
import { cacheHitStore } from './cache-context';

@Injectable()
export class CacheService implements OnApplicationShutdown {
  private readonly logger = new Logger(CacheService.name);

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.get(key);
      if (value) {
        const store = cacheHitStore.getStore();
        if (store) store.hit = true;
        return JSON.parse(value) as T;
      }
      return null;
    } catch (err) {
      this.logger.warn(`Cache GET failed for key "${key}": ${err}`);
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    if (!Number.isFinite(ttlSeconds) || ttlSeconds <= 0) {
      throw new Error(`Invalid ttlSeconds: ${ttlSeconds}`);
    }
    try {
      await this.redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch (err) {
      this.logger.warn(`Cache SET failed for key "${key}": ${err}`);
    }
  }

  async del(...keys: string[]): Promise<void> {
    if (!keys.length) return;
    try {
      await this.redis.del(...keys);
    } catch (err) {
      this.logger.warn(`Cache DEL failed for keys ${keys.join(', ')}: ${err}`);
    }
  }

  async onApplicationShutdown() {
    await this.redis.quit();
  }

  /** Deletes all keys matching a glob pattern using SCAN + batched DEL (avoids loading the full keyspace into memory). */
  async invalidatePattern(pattern: string): Promise<void> {
    const BATCH_SIZE = 500;
    try {
      let cursor = '0';
      do {
        const [next, batch] = await this.redis.scan(
          cursor,
          'MATCH',
          pattern,
          'COUNT',
          100,
        );
        cursor = next;
        for (let i = 0; i < batch.length; i += BATCH_SIZE) {
          const chunk = batch.slice(i, i + BATCH_SIZE);
          if (chunk.length > 0) await this.redis.del(...chunk);
        }
      } while (cursor !== '0');
    } catch (err) {
      this.logger.warn(
        `Cache invalidatePattern failed for "${pattern}": ${err}`,
      );
    }
  }
}
