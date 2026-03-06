/**
 * Error Recovery and Retry System
 * 错误恢复和重试系统
 */

// ============ 类型定义 ============

export interface RetryOptions {
  maxRetries: number;
  delay: number;
  backoff: 'fixed' | 'exponential' | 'linear';
  maxDelay?: number;
  retryOn?: (error: Error) => boolean;
  onRetry?: (attempt: number, error: Error) => void;
}

export interface CircuitBreakerOptions {
  failureThreshold: number;
  resetTimeout: number;
  halfOpenRequests: number;
}

type CircuitState = 'closed' | 'open' | 'half-open';

// ============ 重试装饰器 ============

/**
 * 重试装饰器
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  const {
    maxRetries,
    delay,
    backoff,
    maxDelay = 60000,
    retryOn,
    onRetry,
  } = options;

  let lastError: Error = new Error('Unknown error');

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt === maxRetries) {
        throw lastError;
      }

      if (retryOn && !retryOn(lastError)) {
        throw lastError;
      }

      let currentDelay: number;
      switch (backoff) {
        case 'exponential':
          currentDelay = Math.min(delay * Math.pow(2, attempt), maxDelay);
          break;
        case 'linear':
          currentDelay = Math.min(delay * (attempt + 1), maxDelay);
          break;
        default:
          currentDelay = delay;
      }

      if (onRetry) {
        onRetry(attempt + 1, lastError);
      }

      await sleep(currentDelay);
    }
  }

  throw lastError;
}

// ============ 熔断器 ============

export class CircuitBreaker {
  private state: CircuitState = 'closed';
  private failures: number = 0;
  private lastFailureTime: number = 0;
  private halfOpenSuccesses: number = 0;

  constructor(private options: CircuitBreakerOptions) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime >= this.options.resetTimeout) {
        this.state = 'half-open';
        this.halfOpenSuccesses = 0;
      } else {
        throw new Error('Circuit breaker is open');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    if (this.state === 'half-open') {
      this.halfOpenSuccesses++;
      if (this.halfOpenSuccesses >= this.options.halfOpenRequests) {
        this.state = 'closed';
        this.failures = 0;
      }
    } else {
      this.failures = 0;
    }
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.state === 'half-open') {
      this.state = 'open';
    } else if (this.failures >= this.options.failureThreshold) {
      this.state = 'open';
    }
  }

  getState(): CircuitState {
    return this.state;
  }

  reset(): void {
    this.state = 'closed';
    this.failures = 0;
  }
}

// ============ 降级策略 ============

export async function withFallback<T>(
  primary: () => Promise<T>,
  fallback: () => Promise<T>,
  condition?: (error: Error) => boolean
): Promise<T> {
  try {
    return await primary();
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    if (!condition || condition(err)) {
      return await fallback();
    }
    throw err;
  }
}

// ============ 超时控制 ============

export async function withTimeout<T>(
  fn: () => Promise<T>,
  timeout: number,
  message: string = 'Operation timed out'
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), timeout);
    fn().then(resolve).catch(reject).finally(() => clearTimeout(timer));
  });
}

// ============ 预设配置 ============

export const retryPresets = {
  network: {
    maxRetries: 3,
    delay: 1000,
    backoff: 'exponential' as const,
  },
  api: {
    maxRetries: 3,
    delay: 500,
    backoff: 'exponential' as const,
    maxDelay: 10000,
  },
  file: {
    maxRetries: 2,
    delay: 100,
    backoff: 'fixed' as const,
  },
};

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export default {
  withRetry,
  CircuitBreaker,
  withFallback,
  withTimeout,
  retryPresets,
};
