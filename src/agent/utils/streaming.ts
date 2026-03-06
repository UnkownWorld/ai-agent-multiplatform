/**
 * Enhanced Streaming System
 * 增强的流式响应系统 - 支持中断恢复、进度回调、错误处理
 */

// ============ 类型定义 ============

export interface StreamOptions {
  // 回调函数
  onChunk?: (chunk: string) => void;
  onProgress?: (progress: StreamProgress) => void;
  onComplete?: (result: StreamResult) => void;
  onError?: (error: Error) => void;
  
  // 控制选项
  signal?: AbortSignal;
  throttle?: number;
  timeout?: number;
  
  // 缓冲选项
  bufferSize?: number;
  flushInterval?: number;
}

export interface StreamProgress {
  chunksReceived: number;
  totalBytes: number;
  elapsedMs: number;
  bytesPerSecond: number;
  estimatedRemaining?: number;
}

export interface StreamResult {
  content: string;
  chunksReceived: number;
  totalBytes: number;
  elapsedMs: number;
  averageSpeed: number;
  wasAborted: boolean;
}

export interface StreamState {
  status: 'idle' | 'streaming' | 'completed' | 'error' | 'aborted';
  content: string;
  progress: StreamProgress;
  error?: Error;
}

export type StreamEventType = 
  | 'start' 
  | 'chunk' 
  | 'progress' 
  | 'complete' 
  | 'error' 
  | 'abort';

export interface StreamEvent {
  type: StreamEventType;
  data?: unknown;
  timestamp: number;
}

export type StreamEventHandler = (event: StreamEvent) => void;

// ============ 流式控制器 ============

/**
 * 流式控制器 - 管理流式响应的生命周期
 */
export class StreamController {
  private content: string = '';
  private chunksReceived: number = 0;
  private totalBytes: number = 0;
  private startTime: number = 0;
  private status: StreamState['status'] = 'idle';
  private error?: Error;
  private abortController?: AbortController;
  private eventHandlers: Map<StreamEventType, Set<StreamEventHandler>> = new Map();
  private throttleTimer?: NodeJS.Timeout;
  private lastChunkTime: number = 0;

  constructor(private options: StreamOptions = {}) {}

  // ============ 事件系统 ============

  on(event: StreamEventType, handler: StreamEventHandler): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);
  }

  off(event: StreamEventType, handler: StreamEventHandler): void {
    this.eventHandlers.get(event)?.delete(handler);
  }

  private emit(event: StreamEventType, data?: unknown): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      const streamEvent: StreamEvent = {
        type: event,
        data,
        timestamp: Date.now(),
      };
      handlers.forEach(handler => handler(streamEvent));
    }
  }

  // ============ 流控制 ============

  /**
   * 开始流式响应
   */
  start(): void {
    this.content = '';
    this.chunksReceived = 0;
    this.totalBytes = 0;
    this.startTime = Date.now();
    this.status = 'streaming';
    this.error = undefined;
    this.abortController = new AbortController();
    
    this.emit('start', { startTime: this.startTime });
  }

  /**
   * 接收数据块
   */
  append(chunk: string): void {
    if (this.status !== 'streaming') return;

    // 节流处理
    if (this.options.throttle && this.options.throttle > 0) {
      const now = Date.now();
      if (now - this.lastChunkTime < this.options.throttle) {
        return;
      }
      this.lastChunkTime = now;
    }

    this.content += chunk;
    this.chunksReceived++;
    this.totalBytes += chunk.length;

    // 触发回调
    if (this.options.onChunk) {
      this.options.onChunk(chunk);
    }

    // 更新进度
    const progress = this.getProgress();
    this.emit('chunk', { chunk, progress });

    if (this.options.onProgress) {
      this.options.onProgress(progress);
    }
  }

  /**
   * 完成流式响应
   */
  complete(): StreamResult {
    const elapsedMs = Date.now() - this.startTime;
    const result: StreamResult = {
      content: this.content,
      chunksReceived: this.chunksReceived,
      totalBytes: this.totalBytes,
      elapsedMs,
      averageSpeed: this.totalBytes / (elapsedMs / 1000),
      wasAborted: false,
    };

    this.status = 'completed';
    this.emit('complete', result);

    if (this.options.onComplete) {
      this.options.onComplete(result);
    }

    return result;
  }

  /**
   * 错误处理
   */
  fail(error: Error): void {
    this.status = 'error';
    this.error = error;
    this.emit('error', error);

    if (this.options.onError) {
      this.options.onError(error);
    }
  }

  /**
   * 中止流式响应
   */
  abort(): void {
    if (this.abortController) {
      this.abortController.abort();
    }
    this.status = 'aborted';
    this.emit('abort', { content: this.content });
  }

  /**
   * 检查是否已中止
   */
  isAborted(): boolean {
    return this.options.signal?.aborted || this.status === 'aborted';
  }

  /**
   * 获取中止信号
   */
  getSignal(): AbortSignal | undefined {
    return this.abortController?.signal || this.options.signal;
  }

  // ============ 状态查询 ============

  getState(): StreamState {
    return {
      status: this.status,
      content: this.content,
      progress: this.getProgress(),
      error: this.error,
    };
  }

  getProgress(): StreamProgress {
    const elapsedMs = Date.now() - this.startTime;
    return {
      chunksReceived: this.chunksReceived,
      totalBytes: this.totalBytes,
      elapsedMs,
      bytesPerSecond: elapsedMs > 0 ? this.totalBytes / (elapsedMs / 1000) : 0,
    };
  }

  getContent(): string {
    return this.content;
  }

  getStatus(): StreamState['status'] {
    return this.status;
  }
}

// ============ 流式处理器 ============

/**
 * 流式处理器 - 处理SSE和流式响应
 */
export class StreamProcessor {
  private controller: StreamController;
  private buffer: string = '';
  private flushTimer?: NodeJS.Timeout;

  constructor(private options: StreamOptions = {}) {
    this.controller = new StreamController(options);
  }

  /**
   * 处理SSE响应
   */
  async processSSE(response: Response): Promise<StreamResult> {
    this.controller.start();
    
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Response body is not readable');
    }

    const decoder = new TextDecoder();
    const signal = this.controller.getSignal();

    try {
      while (true) {
        if (signal?.aborted) {
          this.controller.abort();
          break;
        }

        const { done, value } = await reader.read();
        
        if (done) {
          this.flush();
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        this.processChunk(chunk);
      }

      return this.controller.complete();
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.controller.fail(err);
      throw err;
    }
  }

  /**
   * 处理普通流式响应
   */
  async processStream(response: Response): Promise<StreamResult> {
    this.controller.start();
    
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Response body is not readable');
    }

    const decoder = new TextDecoder();
    const signal = this.controller.getSignal();

    try {
      while (true) {
        if (signal?.aborted) {
          this.controller.abort();
          break;
        }

        const { done, value } = await reader.read();
        
        if (done) {
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        this.controller.append(chunk);
      }

      return this.controller.complete();
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.controller.fail(err);
      throw err;
    }
  }

  /**
   * 处理数据块
   */
  private processChunk(chunk: string): void {
    this.buffer += chunk;

    // 处理SSE格式
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        if (data === '[DONE]') {
          this.flush();
          return;
        }
        try {
          const parsed = JSON.parse(data);
          const content = this.extractContent(parsed);
          if (content) {
            this.controller.append(content);
          }
        } catch {
          // 非JSON格式，直接作为内容
          this.controller.append(data);
        }
      } else if (line.trim() && !line.startsWith(':')) {
        // 非SSE格式，直接作为内容
        this.controller.append(line);
      }
    }

    // 定期刷新缓冲区
    if (this.options.flushInterval && !this.flushTimer) {
      this.flushTimer = setTimeout(() => this.flush(), this.options.flushInterval);
    }
  }

  /**
   * 从解析的JSON中提取内容
   */
  private extractContent(data: unknown): string | null {
    if (typeof data === 'string') return data;
    if (typeof data !== 'object' || data === null) return null;

    // OpenAI格式
    const openai = data as { choices?: Array<{ delta?: { content?: string } }> };
    if (openai.choices?.[0]?.delta?.content) {
      return openai.choices[0].delta.content;
    }

    // Anthropic格式
    const anthropic = data as { content?: Array<{ text?: string }> };
    if (anthropic.content?.[0]?.text) {
      return anthropic.content[0].text;
    }

    // 通用格式
    const generic = data as { content?: string; text?: string };
    return generic.content || generic.text || null;
  }

  /**
   * 刷新缓冲区
   */
  private flush(): void {
    if (this.buffer.trim()) {
      this.controller.append(this.buffer);
      this.buffer = '';
    }
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = undefined;
    }
  }

  /**
   * 获取控制器
   */
  getController(): StreamController {
    return this.controller;
  }
}

// ============ 流式请求构建器 ============

/**
 * 流式请求构建器
 */
export class StreamRequestBuilder {
  private url: string = '';
  private method: string = 'POST';
  private headers: Record<string, string> = {};
  private body: unknown;
  private options: StreamOptions = {};

  setUrl(url: string): this {
    this.url = url;
    return this;
  }

  setMethod(method: string): this {
    this.method = method;
    return this;
  }

  setHeaders(headers: Record<string, string>): this {
    this.headers = { ...this.headers, ...headers };
    return this;
  }

  setBody(body: unknown): this {
    this.body = body;
    return this;
  }

  setOptions(options: StreamOptions): this {
    this.options = { ...this.options, ...options };
    return this;
  }

  setTimeout(timeout: number): this {
    this.options.timeout = timeout;
    return this;
  }

  setSignal(signal: AbortSignal): this {
    this.options.signal = signal;
    return this;
  }

  async execute(): Promise<StreamResult> {
    const controller = new AbortController();
    const timeoutId = this.options.timeout
      ? setTimeout(() => controller.abort(), this.options.timeout)
      : undefined;

    try {
      const response = await fetch(this.url, {
        method: this.method,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
          ...this.headers,
        },
        body: this.body ? JSON.stringify(this.body) : undefined,
        signal: this.options.signal || controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const processor = new StreamProcessor(this.options);
      return await processor.processSSE(response);
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }
}

// ============ 便捷函数 ============

/**
 * 创建流式请求
 */
export function createStreamRequest(): StreamRequestBuilder {
  return new StreamRequestBuilder();
}

/**
 * 流式获取
 */
export async function streamFetch(
  url: string,
  options?: {
    method?: string;
    headers?: Record<string, string>;
    body?: unknown;
    onChunk?: (chunk: string) => void;
    signal?: AbortSignal;
    timeout?: number;
  }
): Promise<StreamResult> {
  const builder = new StreamRequestBuilder()
    .setUrl(url)
    .setMethod(options?.method || 'GET')
    .setHeaders(options?.headers || {});

  if (options?.body) builder.setBody(options.body);
  if (options?.onChunk) builder.setOptions({ onChunk: options.onChunk });
  if (options?.signal) builder.setSignal(options.signal);
  if (options?.timeout) builder.setTimeout(options.timeout);

  return builder.execute();
}

export default {
  StreamController,
  StreamProcessor,
  StreamRequestBuilder,
  createStreamRequest,
  streamFetch,
};
