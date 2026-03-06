/**
 * Result Cache System
 * 结果缓存系统 - 缓存工具执行结果，提升性能
 */

// ============ 类型定义 ============

export interface CacheEntry<T = unknown> {
  key: string;
  value: T;
  createdAt: number;
  expiresAt: number;
  hits: number;
  tags: string[];
  metadata?: Record<string, unknown>;
}

export interface CacheOptions {
  ttl: number;                    // 生存时间（毫秒）
  maxSize: number;                // 最大缓存条目数
  strategy: 'lru' | 'lfu' | 'fifo'; // 淘汰策略
  namespace?: string;             // 命名空间
  tags?: string[];                // 标签
}

export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  maxSize: number;
  hitRate: number;
  evictions: number;
}

// ============ 缓存键生成器 ============

/**
 * 缓存键生成器
 */
export class CacheKeyGenerator {
  /**
   * 生成工具执行缓存键
   */
  static forTool(toolName: string, args: Record<string, unknown>): string {
    const sortedArgs = this.sortObject(args);
    const argsStr = JSON.stringify(sortedArgs);
    return `tool:${toolName}:${this.hash(argsStr)}`;
  }

  /**
   * 生成LLM调用缓存键
   */
  static forLLM(messages: Array<{ role: string; content: string }>, model?: string): string {
    const messagesStr = JSON.stringify(messages);
    return `llm:${model || 'default'}:${this.hash(messagesStr)}`;
  }

  /**
   * 生成HTTP请求缓存键
   */
  static forHTTP(url: string, options?: RequestInit): string {
    const optionsStr = options ? JSON.stringify(options) : '';
    return `http:${url}:${this.hash(optionsStr)}`;
  }

  /**
   * 排序对象键
   */
  private static sortObject(obj: unknown): unknown {
    if (typeof obj !== 'object' || obj === null) return obj;
    if (Array.isArray(obj)) return obj.map(v => this.sortObject(v));
    
    const sorted: Record<string, unknown> = {};
    const keys = Object.keys(obj).sort();
    for (const key of keys) {
      sorted[key] = this.sortObject((obj as Record<string, unknown>)[key]);
    }
    return sorted;
  }

  /**
   * 简单哈希函数
   */
  private static hash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }
}

// ============ 内存缓存 ============

/**
 * 内存缓存实现
 */
export class MemoryCache {
  private cache: Map<string, CacheEntry> = new Map();
  private options: CacheOptions;
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    size: 0,
    maxSize: 1000,
    hitRate: 0,
    evictions: 0,
  };

  constructor(options: Partial<CacheOptions> = {}) {
    this.options = {
      ttl: 5 * 60 * 1000, // 默认5分钟
      maxSize: 1000,
      strategy: 'lru',
      ...options,
    };
    this.stats.maxSize = this.options.maxSize;
  }

  /**
   * 获取缓存
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    // 检查是否过期
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    // 更新命中
    entry.hits++;
    this.stats.hits++;
    this.updateHitRate();

    // LRU策略：移动到末尾
    if (this.options.strategy === 'lru') {
      this.cache.delete(key);
      this.cache.set(key, entry);
    }

    return entry.value as T;
  }

  /**
   * 设置缓存
   */
  set<T>(key: string, value: T, options?: Partial<CacheOptions>): void {
    const ttl = options?.ttl || this.options.ttl;
    const tags = options?.tags || this.options.tags || [];

    // 检查容量
    if (this.cache.size >= this.options.maxSize) {
      this.evict();
    }

    const entry: CacheEntry<T> = {
      key,
      value,
      createdAt: Date.now(),
      expiresAt: Date.now() + ttl,
      hits: 0,
      tags,
    };

    this.cache.set(key, entry);
    this.stats.size = this.cache.size;
  }

  /**
   * 检查是否存在
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.stats.size = this.cache.size;
      return false;
    }
    
    return true;
  }

  /**
   * 删除缓存
   */
  delete(key: string): boolean {
    const result = this.cache.delete(key);
    this.stats.size = this.cache.size;
    return result;
  }

  /**
   * 清空缓存
   */
  clear(): void {
    this.cache.clear();
    this.stats.size = 0;
  }

  /**
   * 按标签删除
   */
  deleteByTag(tag: string): number {
    let count = 0;
    for (const [key, entry] of this.cache.entries()) {
      if (entry.tags.includes(tag)) {
        this.cache.delete(key);
        count++;
      }
    }
    this.stats.size = this.cache.size;
    return count;
  }

  /**
   * 清理过期缓存
   */
  cleanup(): number {
    const now = Date.now();
    let count = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        count++;
      }
    }
    
    this.stats.size = this.cache.size;
    return count;
  }

  /**
   * 获取统计信息
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * 淘汰缓存
   */
  private evict(): void {
    if (this.cache.size === 0) return;

    let keyToEvict: string | null = null;

    switch (this.options.strategy) {
      case 'lru':
        // 淘汰最久未使用
        keyToEvict = this.cache.keys().next().value;
        break;

      case 'lfu':
        // 淘汰最少使用
        let minHits = Infinity;
        for (const [key, entry] of this.cache.entries()) {
          if (entry.hits < minHits) {
            minHits = entry.hits;
            keyToEvict = key;
          }
        }
        break;

      case 'fifo':
        // 先进先出
        keyToEvict = this.cache.keys().next().value;
        break;
    }

    if (keyToEvict) {
      this.cache.delete(keyToEvict);
      this.stats.evictions++;
      this.stats.size = this.cache.size;
    }
  }

  /**
   * 更新命中率
   */
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
  }
}

// ============ 缓存装饰器 ============

/**
 * 缓存装饰器 - 为函数添加缓存
 */
export function cached<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  options: {
    keyGenerator: (...args: TArgs) => string;
    cache?: MemoryCache;
    ttl?: number;
  }
): (...args: TArgs) => Promise<TResult> {
  const cache = options.cache || new MemoryCache({ ttl: options.ttl });

  return async (...args: TArgs): Promise<TResult> => {
    const key = options.keyGenerator(...args);
    
    // 尝试从缓存获取
    const cached = cache.get<TResult>(key);
    if (cached !== null) {
      return cached;
    }

    // 执行函数
    const result = await fn(...args);
    
    // 存入缓存
    cache.set(key, result, { ttl: options.ttl });
    
    return result;
  };
}

// ============ 工具执行缓存 ============

/**
 * 工具执行缓存包装器
 */
export class ToolCacheWrapper {
  private cache: MemoryCache;

  constructor(options?: Partial<CacheOptions>) {
    this.cache = new MemoryCache(options);
  }

  /**
   * 包装工具执行器
   */
  wrap<TArgs extends Record<string, unknown>, TResult>(
    executor: (args: TArgs) => Promise<TResult>,
    toolName: string,
    options?: { ttl?: number; cacheable?: (args: TArgs) => boolean }
  ): (args: TArgs) => Promise<TResult> {
    return async (args: TArgs): Promise<TResult> => {
      // 检查是否可缓存
      if (options?.cacheable && !options.cacheable(args)) {
        return executor(args);
      }

      const key = CacheKeyGenerator.forTool(toolName, args);
      
      // 尝试从缓存获取
      const cached = this.cache.get<TResult>(key);
      if (cached !== null) {
        return cached;
      }

      // 执行
      const result = await executor(args);
      
      // 缓存
      this.cache.set(key, result, { ttl: options?.ttl });
      
      return result;
    };
  }

  /**
   * 清除工具缓存
   */
  clearTool(toolName: string): void {
    this.cache.deleteByTag(toolName);
  }

  /**
   * 获取缓存统计
   */
  getStats(): CacheStats {
    return this.cache.getStats();
  }
}

// ============ 全局缓存实例 ============

let globalCache: MemoryCache | null = null;

export function getGlobalCache(): MemoryCache {
  if (!globalCache) {
    globalCache = new MemoryCache({
      ttl: 5 * 60 * 1000,
      maxSize: 1000,
      strategy: 'lru',
    });
  }
  return globalCache;
}

export default {
  MemoryCache,
  CacheKeyGenerator,
  ToolCacheWrapper,
  cached,
  getGlobalCache,
};
