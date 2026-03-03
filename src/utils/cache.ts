/**
 * Simple in-memory cache with TTL
 */

import type { CacheEntry } from "../types";

export class Cache<T> {
  private store = new Map<string, CacheEntry<T>>();

  constructor(private readonly ttlMs: number = 30_000) {}

  get(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.store.delete(key);
      return null;
    }
    return entry.data;
  }

  set(key: string, data: T): void {
    this.store.set(key, { data, timestamp: Date.now() });
  }

  invalidate(key?: string): void {
    if (key) {
      this.store.delete(key);
    } else {
      this.store.clear();
    }
  }
}
