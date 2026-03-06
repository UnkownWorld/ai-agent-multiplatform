/**
 * Agent Utility Functions
 */

/**
 * 生成唯一ID
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * 延迟执行
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 重试函数
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number;
    delay?: number;
    backoff?: boolean;
  } = {}
): Promise<T> {
  const { maxAttempts = 3, delay: delayMs = 1000, backoff = true } = options;
  
  let lastError: Error | undefined;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt < maxAttempts) {
        const waitTime = backoff ? delayMs * Math.pow(2, attempt - 1) : delayMs;
        await delay(waitTime);
      }
    }
  }
  
  throw lastError;
}

/**
 * 截断文本
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * 格式化日期
 */
export function formatDate(timestamp: number, format: string = 'YYYY-MM-DD HH:mm:ss'): string {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return format
    .replace('YYYY', String(year))
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds);
}

/**
 * 解析JSON安全
 */
export function safeJsonParse<T>(text: string, fallback: T): T {
  try {
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

/**
 * 深拷贝
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * 防抖函数
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      fn(...args);
      timeoutId = null;
    }, delay);
  };
}

/**
 * 节流函数
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

/**
 * 检测平台
 */
export function detectPlatform(): 'web' | 'desktop' | 'mobile' {
  if (typeof window === 'undefined') return 'web';
  
  const userAgent = navigator.userAgent.toLowerCase();
  
  // 检测Tauri桌面环境
  if (window.__TAURI__) return 'desktop';
  
  // 检测移动设备
  if (/android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent)) {
    return 'mobile';
  }
  
  return 'web';
}

/**
 * 本地存储封装
 */
export const storage = {
  get<T>(key: string, fallback: T): T {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : fallback;
    } catch {
      return fallback;
    }
  },
  
  set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Storage set error:', error);
    }
  },
  
  remove(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Storage remove error:', error);
    }
  },
  
  clear(): void {
    try {
      localStorage.clear();
    } catch (error) {
      console.error('Storage clear error:', error);
    }
  },
};

/**
 * 创建响应式状态
 */
export function createState<T extends object>(initialState: T): T & {
  subscribe: (callback: (state: T) => void) => () => void;
  setState: (newState: Partial<T>) => void;
} {
  const callbacks = new Set<(state: T) => void>();
  const state = { ...initialState } as T;

  return new Proxy({ ...state } as T & {
    subscribe: (callback: (state: T) => void) => () => void;
    setState: (newState: Partial<T>) => void;
  }, {
    set(target, property, value) {
      (target as Record<string, unknown>)[property as string] = value;
      callbacks.forEach(cb => cb({ ...state }));
      return true;
    },
  }) as T & {
    subscribe: (callback: (state: T) => void) => () => void;
    setState: (newState: Partial<T>) => void;
  };
}

// 扩展Window类型
declare global {
  interface Window {
    __TAURI__?: unknown;
  }
}
