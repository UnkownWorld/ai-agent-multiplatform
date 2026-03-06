/**
 * Tool Chain Orchestrator
 * 工具链编排系统 - 可视化编排和执行工具链
 */

import { ToolRegistry, getToolRegistry } from '../tools/registry';
import { PerformanceMonitor, getPerformanceMonitor } from './monitoring';

// ============ 类型定义 ============

export type ChainStepStatus = 'pending' | 'running' | 'success' | 'failed' | 'skipped';

export interface ChainStep {
  id: string;
  name: string;
  tool: string;
  args: Record<string, unknown>;
  condition?: string;           // 执行条件
  retryPolicy?: {
    maxRetries: number;
    delay: number;
  };
  timeout?: number;
  onError: 'stop' | 'continue' | 'fallback';
  fallback?: string;            // 失败时的替代工具
}

export interface ChainDefinition {
  id: string;
  name: string;
  description?: string;
  version: string;
  steps: ChainStep[];
  parallel?: boolean;           // 是否并行执行
  maxConcurrency?: number;      // 最大并发数
  timeout?: number;             // 整体超时
  onStepComplete?: string;      // 步骤完成回调
  onComplete?: string;          // 完成回调
  onError?: string;             // 错误回调
}

export interface ChainExecutionContext {
  chainId: string;
  executionId: string;
  startTime: number;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  stepResults: Map<string, StepResult>;
  variables: Record<string, unknown>;
}

export interface StepResult {
  stepId: string;
  status: ChainStepStatus;
  startTime: number;
  endTime?: number;
  duration?: number;
  output?: unknown;
  error?: string;
  retries: number;
}

export interface ChainExecutionResult {
  chainId: string;
  executionId: string;
  success: boolean;
  startTime: number;
  endTime: number;
  duration: number;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  stepResults: StepResult[];
  error?: string;
}

export interface ChainTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  template: ChainDefinition;
}

// ============ 变量解析器 ============

/**
 * 变量解析器 - 解析步骤中的变量引用
 */
export class VariableResolver {
  private context: ChainExecutionContext;

  constructor(context: ChainExecutionContext) {
    this.context = context;
  }

  /**
   * 解析值中的变量
   */
  resolve(value: unknown): unknown {
    if (typeof value === 'string') {
      return this.resolveString(value);
    }
    if (Array.isArray(value)) {
      return value.map(v => this.resolve(v));
    }
    if (typeof value === 'object' && value !== null) {
      const resolved: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value)) {
        resolved[k] = this.resolve(v);
      }
      return resolved;
    }
    return value;
  }

  /**
   * 解析字符串中的变量
   */
  private resolveString(str: string): unknown {
    // 匹配 {{variable}} 格式
    const varPattern = /\{\{([^}]+)\}\}/g;
    
    // 检查是否整个字符串就是一个变量
    const match = str.match(/^\{\{([^}]+)\}\}$/);
    if (match) {
      return this.getValue(match[1].trim());
    }

    // 替换所有变量
    return str.replace(varPattern, (_, path) => {
      const value = this.getValue(path.trim());
      return value !== undefined ? String(value) : '';
    });
  }

  /**
   * 根据路径获取值
   */
  private getValue(path: string): unknown {
    // 支持的变量前缀
    // input.xxx - 输入参数
    // steps.xxx.output - 步骤输出
    // variables.xxx - 自定义变量
    // context.xxx - 上下文信息

    const parts = path.split('.');
    const prefix = parts[0];

    switch (prefix) {
      case 'input':
        return this.getPathValue(this.context.input, parts.slice(1));
      
      case 'steps':
        const stepId = parts[1];
        const stepResult = this.context.stepResults.get(stepId);
        if (!stepResult) return undefined;
        if (parts[2] === 'output') {
          return this.getPathValue(stepResult.output, parts.slice(3));
        }
        return stepResult;
      
      case 'variables':
        return this.getPathValue(this.context.variables, parts.slice(1));
      
      case 'context':
        return this.getContextValue(parts.slice(1));
      
      default:
        return this.getPathValue(this.context.variables, parts);
    }
  }

  /**
   * 获取路径值
   */
  private getPathValue(obj: unknown, path: string[]): unknown {
    let current = obj;
    for (const key of path) {
      if (current === null || current === undefined) return undefined;
      
      // 处理数组索引
      const arrayMatch = key.match(/^(\w+)\[(\d+)\]$/);
      if (arrayMatch) {
        const [, arrKey, index] = arrayMatch;
        current = (current as Record<string, unknown[]>)?.[arrKey]?.[parseInt(index)];
      } else {
        current = (current as Record<string, unknown>)?.[key];
      }
    }
    return current;
  }

  /**
   * 获取上下文值
   */
  private getContextValue(path: string[]): unknown {
    switch (path[0]) {
      case 'chainId':
        return this.context.chainId;
      case 'executionId':
        return this.context.executionId;
      case 'startTime':
        return this.context.startTime;
      default:
        return undefined;
    }
  }

  /**
   * 设置变量
   */
  setVariable(name: string, value: unknown): void {
    this.context.variables[name] = value;
  }
}

// ============ 条件评估器 ============

/**
 * 条件评估器
 */
export class ConditionEvaluator {
  private resolver: VariableResolver;

  constructor(resolver: VariableResolver) {
    this.resolver = resolver;
  }

  /**
   * 评估条件
   */
  evaluate(condition: string): boolean {
    try {
      // 解析条件中的变量
      const resolved = this.resolver.resolve(condition);
      
      // 简单条件评估
      if (typeof resolved === 'boolean') return resolved;
      if (typeof resolved === 'string') {
        // 支持简单的比较表达式
        if (resolved.includes('==')) {
          const [left, right] = resolved.split('==').map(s => s.trim());
          return left === right;
        }
        if (resolved.includes('!=')) {
          const [left, right] = resolved.split('!=').map(s => s.trim());
          return left !== right;
        }
        return resolved === 'true';
      }
      
      return Boolean(resolved);
    } catch {
      return false;
    }
  }
}

// ============ 工具链执行器 ============

/**
 * 工具链执行器
 */
export class ChainExecutor {
  private toolRegistry: ToolRegistry;
  private monitor: PerformanceMonitor;

  constructor(
    toolRegistry?: ToolRegistry,
    monitor?: PerformanceMonitor
  ) {
    this.toolRegistry = toolRegistry || getToolRegistry();
    this.monitor = monitor || getPerformanceMonitor();
  }

  /**
   * 执行工具链
   */
  async execute(
    chain: ChainDefinition,
    input: Record<string, unknown>
  ): Promise<ChainExecutionResult> {
    const executionId = `${chain.id}_${Date.now()}`;
    const startTime = Date.now();

    const context: ChainExecutionContext = {
      chainId: chain.id,
      executionId,
      startTime,
      input,
      output: {},
      stepResults: new Map(),
      variables: { ...input },
    };

    const resolver = new VariableResolver(context);
    const evaluator = new ConditionEvaluator(resolver);

    try {
      if (chain.parallel) {
        await this.executeParallel(chain, context, resolver, evaluator);
      } else {
        await this.executeSequential(chain, context, resolver, evaluator);
      }

      // 收集输出
      for (const [stepId, result] of context.stepResults) {
        if (result.status === 'success') {
          context.output[stepId] = result.output;
        }
      }

      return {
        chainId: chain.id,
        executionId,
        success: true,
        startTime,
        endTime: Date.now(),
        duration: Date.now() - startTime,
        input,
        output: context.output,
        stepResults: Array.from(context.stepResults.values()),
      };

    } catch (error) {
      return {
        chainId: chain.id,
        executionId,
        success: false,
        startTime,
        endTime: Date.now(),
        duration: Date.now() - startTime,
        input,
        output: context.output,
        stepResults: Array.from(context.stepResults.values()),
        error: error instanceof Error ? error.message : '执行失败',
      };
    }
  }

  /**
   * 顺序执行
   */
  private async executeSequential(
    chain: ChainDefinition,
    context: ChainExecutionContext,
    resolver: VariableResolver,
    evaluator: ConditionEvaluator
  ): Promise<void> {
    for (const step of chain.steps) {
      const result = await this.executeStep(step, context, resolver, evaluator);
      context.stepResults.set(step.id, result);

      if (result.status === 'failed' && step.onError === 'stop') {
        throw new Error(`步骤 ${step.name} 失败: ${result.error}`);
      }
    }
  }

  /**
   * 并行执行
   */
  private async executeParallel(
    chain: ChainDefinition,
    context: ChainExecutionContext,
    resolver: VariableResolver,
    evaluator: ConditionEvaluator
  ): Promise<void> {
    const maxConcurrency = chain.maxConcurrency || 5;
    const steps = [...chain.steps];
    const executing: Promise<void>[] = [];

    while (steps.length > 0 || executing.length > 0) {
      // 填充执行队列
      while (executing.length < maxConcurrency && steps.length > 0) {
        const step = steps.shift()!;
        const promise = this.executeStepAsync(step, context, resolver, evaluator)
          .then(result => {
            context.stepResults.set(step.id, result);
            const index = executing.indexOf(promise);
            if (index > -1) executing.splice(index, 1);
          });
        executing.push(promise);
      }

      // 等待任意一个完成
      if (executing.length > 0) {
        await Promise.race(executing);
      }
    }
  }

  /**
   * 异步执行步骤
   */
  private executeStepAsync(
    step: ChainStep,
    context: ChainExecutionContext,
    resolver: VariableResolver,
    evaluator: ConditionEvaluator
  ): Promise<StepResult> {
    return this.executeStep(step, context, resolver, evaluator);
  }

  /**
   * 执行单个步骤
   */
  private async executeStep(
    step: ChainStep,
    context: ChainExecutionContext,
    resolver: VariableResolver,
    evaluator: ConditionEvaluator
  ): Promise<StepResult> {
    const startTime = Date.now();
    const result: StepResult = {
      stepId: step.id,
      status: 'pending',
      startTime,
      retries: 0,
    };

    try {
      // 检查条件
      if (step.condition && !evaluator.evaluate(step.condition)) {
        result.status = 'skipped';
        result.endTime = Date.now();
        result.duration = result.endTime - startTime;
        return result;
      }

      result.status = 'running';

      // 解析参数
      const resolvedArgs = resolver.resolve(step.args) as Record<string, unknown>;

      // 执行工具
      let toolResult;
      let retries = 0;
      const maxRetries = step.retryPolicy?.maxRetries || 0;

      while (true) {
        try {
          toolResult = await this.executeWithTimeout(
            step.tool,
            resolvedArgs,
            step.timeout
          );
          break;
        } catch (error) {
          retries++;
          result.retries = retries;

          if (retries <= maxRetries) {
            await this.delay(step.retryPolicy?.delay || 1000);
          } else {
            throw error;
          }
        }
      }

      if (!toolResult.success) {
        throw new Error(toolResult.error || '工具执行失败');
      }

      result.status = 'success';
      result.output = toolResult.result;

    } catch (error) {
      result.status = 'failed';
      result.error = error instanceof Error ? error.message : '执行失败';

      // 尝试fallback
      if (step.onError === 'fallback' && step.fallback) {
        try {
          const fallbackResult = await this.executeWithTimeout(
            step.fallback,
            resolver.resolve(step.args) as Record<string, unknown>,
            step.timeout
          );
          if (fallbackResult.success) {
            result.status = 'success';
            result.output = fallbackResult.result;
            result.error = undefined;
          }
        } catch {
          // fallback也失败
        }
      }
    }

    result.endTime = Date.now();
    result.duration = result.endTime - startTime;

    // 记录性能
    this.monitor.recordToolCall(
      step.tool,
      result.duration || 0,
      result.status === 'success'
    );

    return result;
  }

  /**
   * 带超时执行
   */
  private async executeWithTimeout(
    toolName: string,
    args: Record<string, unknown>,
    timeout?: number
  ): Promise<{ success: boolean; result?: unknown; error?: string }> {
    if (!timeout) {
      return this.toolRegistry.execute(toolName, args);
    }

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('执行超时'));
      }, timeout);

      this.toolRegistry.execute(toolName, args)
        .then(resolve)
        .catch(reject)
        .finally(() => clearTimeout(timer));
    });
  }

  /**
   * 延迟
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============ 预定义模板 ============

export const chainTemplates: ChainTemplate[] = [
  {
    id: 'research-chain',
    name: '研究助手',
    description: '搜索网络并生成研究报告',
    category: 'research',
    template: {
      id: 'research-chain',
      name: '研究助手',
      version: '1.0.0',
      steps: [
        {
          id: 'search',
          name: '搜索',
          tool: 'web_search',
          args: { query: '{{input.topic}}', num: 5 },
          onError: 'stop',
        },
        {
          id: 'read',
          name: '阅读',
          tool: 'web_reader',
          args: { url: '{{steps.search.output.results[0].url}}' },
          onError: 'continue',
        },
        {
          id: 'summarize',
          name: '总结',
          tool: 'translate',
          args: { text: '{{steps.read.output.text}}', target_lang: 'zh' },
          onError: 'continue',
        },
      ],
    },
  },
  {
    id: 'content-chain',
    name: '内容生成',
    description: '生成文本、图像和语音',
    category: 'content',
    template: {
      id: 'content-chain',
      name: '内容生成',
      version: '1.0.0',
      parallel: true,
      steps: [
        {
          id: 'text',
          name: '生成文本',
          tool: 'translate',
          args: { text: '{{input.prompt}}' },
          onError: 'continue',
        },
        {
          id: 'image',
          name: '生成图像',
          tool: 'image_generation',
          args: { prompt: '{{input.prompt}}' },
          onError: 'continue',
        },
        {
          id: 'audio',
          name: '生成语音',
          tool: 'text_to_speech',
          args: { text: '{{input.prompt}}' },
          onError: 'continue',
        },
      ],
    },
  },
];

// ============ 工具链管理器 ============

/**
 * 工具链管理器
 */
export class ChainManager {
  private chains: Map<string, ChainDefinition> = new Map();
  private executor: ChainExecutor;

  constructor() {
    this.executor = new ChainExecutor();
    this.loadTemplates();
  }

  /**
   * 加载模板
   */
  private loadTemplates(): void {
    for (const template of chainTemplates) {
      this.chains.set(template.id, template.template);
    }
  }

  /**
   * 注册工具链
   */
  register(chain: ChainDefinition): void {
    this.chains.set(chain.id, chain);
  }

  /**
   * 获取工具链
   */
  get(chainId: string): ChainDefinition | undefined {
    return this.chains.get(chainId);
  }

  /**
   * 获取所有工具链
   */
  getAll(): ChainDefinition[] {
    return Array.from(this.chains.values());
  }

  /**
   * 执行工具链
   */
  async execute(
    chainId: string,
    input: Record<string, unknown>
  ): Promise<ChainExecutionResult> {
    const chain = this.chains.get(chainId);
    if (!chain) {
      throw new Error(`工具链不存在: ${chainId}`);
    }
    return this.executor.execute(chain, input);
  }

  /**
   * 从JSON创建工具链
   */
  fromJSON(json: string): ChainDefinition {
    const chain = JSON.parse(json) as ChainDefinition;
    this.register(chain);
    return chain;
  }

  /**
   * 导出为JSON
   */
  toJSON(chainId: string): string | null {
    const chain = this.chains.get(chainId);
    if (!chain) return null;
    return JSON.stringify(chain, null, 2);
  }
}

// 全局实例
let chainManager: ChainManager | null = null;

export function getChainManager(): ChainManager {
  if (!chainManager) {
    chainManager = new ChainManager();
  }
  return chainManager;
}

export default {
  ChainExecutor,
  ChainManager,
  VariableResolver,
  ConditionEvaluator,
  chainTemplates,
  getChainManager,
};
