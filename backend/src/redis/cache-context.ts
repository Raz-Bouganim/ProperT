import { AsyncLocalStorage } from 'async_hooks';

export const cacheHitStore = new AsyncLocalStorage<{ hit: boolean }>();
