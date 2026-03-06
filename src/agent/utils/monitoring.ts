/**
 * Performance Monitoring System
 * 性能监控系统 - 监控Agent和工具的性能指标
 */

// ============ 类型定义 ============

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: 'ms' | 'bytes' | 'count' | 'percent' | 'rate';
  timestamp: number;
  tags?: Record<string, string>;
}

export interface ToolPerformance {
  name: string;
  calls: number;
  successes: number;
  failures: number;
  totalDuration: number;
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
  p50Duration: number;
  p95Duration: number;
  p99Duration: number;
  lastCallTime?: number;
  lastError?: string;
}

export interface AgentPerformance {
  messagesProcessed: number;
  toolCallsTotal: number;
  toolCallsSuccessful: number;
  toolCallsFailed: number;
  avgResponseTime: number;
  avgToolCallTime: number;
  tokensUsed: number;
  memoryUsage: number;
  uptime: number;
}

export interface PerformanceReport {
  timestamp: number;
  agent: AgentPerformance;
  tools: ToolPerformance[];
  alerts: PerformanceAlert[];
}

export interface PerformanceAlert {
  type: 'slow_tool' | 'high_failure_rate' | 'memory_high' | 'timeout';
  severity: 'warning' | 'critical';
  message: string;
  details: Record<string, unknown>;
  timestamp: number;
}

// ============ 性能监控器 ============

/**
 * 性能监控器
 */
export class PerformanceMonitor {
  private toolMetrics: Map<string, {
    durations: number[];
    successes: number;
    failures: number;
    lastCallTime?: number;
    lastError?: string;
  }> = new Map();

  private agentMetrics = {
    messagesProcessed: 0,
    toolCallsTotal: 0,
    toolCallsSuccessful: 0,
    toolCallsFailed: 0,
    totalResponseTime: 0,
    totalToolCallTime: 0,
    tokensUsed: 0,
    startTime: Date.now(),
  };

  private alerts: PerformanceAlert[] = [];
  private maxAlerts: number = 100;
  private maxDurations: number = 1000;

  // 阈值配置
  private thresholds = {
    slowToolMs: 5000,
    highFailureRate: 0.3,
    memoryHighMB: 500,
  };

  /**
   * 记录工具调用
   */
  recordToolCall(
    toolName: string,
    duration: number,
    success: boolean,
    error?: string
  ): void {
    // 更新工具指标
    let metrics = this.toolMetrics.get(toolName);
    if (!metrics) {
      metrics = { durations: [], successes: 0, failures: 0 };
      this.toolMetrics.set(toolName, metrics);
    }

    metrics.durations.push(duration);
    if (metrics.durations.length > this.maxDurations) {
      metrics.durations.shift();
    }

    if (success) {
      metrics.successes++;
      this.agentMetrics.toolCallsSuccessful++;
    } else {
      metrics.failures++;
      this.agentMetrics.toolCallsFailed++;
      metrics.lastError = error;
    }

    metrics.lastCallTime = Date.now();

    // 更新全局指标
    this.agentMetrics.toolCallsTotal++;
    this.agentMetrics.totalToolCallTime += duration;

    // 检查告警
    this.checkToolAlerts(toolName, duration, success);
  }

  /**
   * 记录消息处理
   */
  recordMessageProcessing(duration: number, tokens?: number): void {
    this.agentMetrics.messagesProcessed++;
    this.agentMetrics.totalResponseTime += duration;
    if (tokens) {
      this.agentMetrics.tokensUsed += tokens;
    }
  }

  /**
   * 获取工具性能
   */
  getToolPerformance(toolName: string): ToolPerformance | null {
    const metrics = this.toolMetrics.get(toolName);
    if (!metrics) return null;

    const durations = [...metrics.durations].sort((a, b) => a - b);
    const totalDuration = durations.reduce((a, b) => a + b, 0);

    return {
      name: toolName,
      calls: metrics.successes + metrics.failures,
      successes: metrics.successes,
      failures: metrics.failures,
      totalDuration,
      avgDuration: durations.length > 0 ? totalDuration / durations.length : 0,
      minDuration: durations[0] || 0,
      maxDuration: durations[durations.length - 1] || 0,
      p50Duration: this.percentile(durations, 50),
      p95Duration: this.percentile(durations, 95),
      p99Duration: this.percentile(durations, 99),
      lastCallTime: metrics.lastCallTime,
      lastError: metrics.lastError,
    };
  }

  /**
   * 获取所有工具性能
   */
  getAllToolPerformance(): ToolPerformance[] {
    const results: ToolPerformance[] = [];
    for (const name of this.toolMetrics.keys()) {
      const perf = this.getToolPerformance(name);
      if (perf) results.push(perf);
    }
    return results.sort((a, b) => b.calls - a.calls);
  }

  /**
   * 获取Agent性能
   */
  getAgentPerformance(): AgentPerformance {
    const messages = this.agentMetrics.messagesProcessed;
    const toolCalls = this.agentMetrics.toolCallsTotal;

    return {
      messagesProcessed: messages,
      toolCallsTotal: toolCalls,
      toolCallsSuccessful: this.agentMetrics.toolCallsSuccessful,
      toolCallsFailed: this.agentMetrics.toolCallsFailed,
      avgResponseTime: messages > 0 ? this.agentMetrics.totalResponseTime / messages : 0,
      avgToolCallTime: toolCalls > 0 ? this.agentMetrics.totalToolCallTime / toolCalls : 0,
      tokensUsed: this.agentMetrics.tokensUsed,
      memoryUsage: this.getMemoryUsage(),
      uptime: Date.now() - this.agentMetrics.startTime,
    };
  }

  /**
   * 生成性能报告
   */
  generateReport(): PerformanceReport {
    return {
      timestamp: Date.now(),
      agent: this.getAgentPerformance(),
      tools: this.getAllToolPerformance(),
      alerts: this.alerts.slice(-10),
    };
  }

  /**
   * 获取告警
   */
  getAlerts(severity?: 'warning' | 'critical'): PerformanceAlert[] {
    if (!severity) return [...this.alerts];
    return this.alerts.filter(a => a.severity === severity);
  }

  /**
   * 清除告警
   */
  clearAlerts(): void {
    this.alerts = [];
  }

  /**
   * 重置统计
   */
  reset(): void {
    this.toolMetrics.clear();
    this.agentMetrics = {
      messagesProcessed: 0,
      toolCallsTotal: 0,
      toolCallsSuccessful: 0,
      toolCallsFailed: 0,
      totalResponseTime: 0,
      totalToolCallTime: 0,
      tokensUsed: 0,
      startTime: Date.now(),
    };
    this.alerts = [];
  }

  /**
   * 设置阈值
   */
  setThresholds(thresholds: Partial<typeof this.thresholds>): void {
    this.thresholds = { ...this.thresholds, ...thresholds };
  }

  // ============ 私有方法 ============

  private percentile(sortedArray: number[], p: number): number {
    if (sortedArray.length === 0) return 0;
    const index = Math.ceil((p / 100) * sortedArray.length) - 1;
    return sortedArray[Math.max(0, index)];
  }

  private getMemoryUsage(): number {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
    }
    if (typeof performance !== 'undefined' && (performance as any).memory) {
      return Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024);
    }
    return 0;
  }

  private checkToolAlerts(toolName: string, duration: number, success: boolean): void {
    // 慢工具告警
    if (duration > this.thresholds.slowToolMs) {
      this.addAlert({
        type: 'slow_tool',
        severity: 'warning',
        message: `工具 ${toolName} 执行时间过长: ${duration}ms`,
        details: { toolName, duration },
        timestamp: Date.now(),
      });
    }

    // 高失败率告警
    const metrics = this.toolMetrics.get(toolName);
    if (metrics) {
      const total = metrics.successes + metrics.failures;
      if (total >= 5) {
        const failureRate = metrics.failures / total;
        if (failureRate > this.thresholds.highFailureRate) {
          this.addAlert({
            type: 'high_failure_rate',
            severity: 'critical',
            message: `工具 ${toolName} 失败率过高: ${(failureRate * 100).toFixed(1)}%`,
            details: { toolName, failureRate, successes: metrics.successes, failures: metrics.failures },
            timestamp: Date.now(),
          });
        }
      }
    }

    // 内存告警
    const memoryUsage = this.getMemoryUsage();
    if (memoryUsage > this.thresholds.memoryHighMB) {
      this.addAlert({
        type: 'memory_high',
        severity: 'warning',
        message: `内存使用过高: ${memoryUsage}MB`,
        details: { memoryUsage },
        timestamp: Date.now(),
      });
    }
  }

  private addAlert(alert: PerformanceAlert): void {
    this.alerts.push(alert);
    if (this.alerts.length > this.maxAlerts) {
      this.alerts.shift();
    }
  }
}

// ============ 性能计时器 ============

/**
 * 性能计时器
 */
export class PerformanceTimer {
  private startTime: number;
  private name: string;
  private monitor?: PerformanceMonitor;

  constructor(name: string, monitor?: PerformanceMonitor) {
    this.name = name;
    this.monitor = monitor;
    this.startTime = Date.now();
  }

  /**
   * 结束计时
   */
  end(success: boolean = true, error?: string): number {
    const duration = Date.now() - this.startTime;
    
    if (this.monitor) {
      this.monitor.recordToolCall(this.name, duration, success, error);
    }
    
    return duration;
  }

  /**
   * 获取已用时间
   */
  elapsed(): number {
    return Date.now() - this.startTime;
  }
}

// ============ 装饰器 ============

/**
 * 性能监控装饰器
 */
export function monitored(monitor: PerformanceMonitor, toolName?: string) {
  return function (
    target: unknown,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    const name = toolName || propertyKey;

    descriptor.value = async function (...args: unknown[]) {
      const timer = new PerformanceTimer(name, monitor);
      try {
        const result = await originalMethod.apply(this, args);
        timer.end(true);
        return result;
      } catch (error) {
        timer.end(false, error instanceof Error ? error.message : 'Unknown error');
        throw error;
      }
    };

    return descriptor;
  };
}

// ============ 全局实例 ============

let globalMonitor: PerformanceMonitor | null = null;

export function getPerformanceMonitor(): PerformanceMonitor {
  if (!globalMonitor) {
    globalMonitor = new PerformanceMonitor();
  }
  return globalMonitor;
}

export default {
  PerformanceMonitor,
  PerformanceTimer,
  monitored,
  getPerformanceMonitor,
};
