/**
 * Skill Component Loader
 * 组件加载器 - 加载、解析和执行组件
 */

import {
  SkillComponent,
  InstalledComponent,
  ComponentExecutor,
  componentToToolDefinition,
} from './types';
import { ToolDefinition, ToolExecutor } from '../core/types';
import { ToolRegistry } from '../tools/registry';
import { generateId } from '../utils';

/**
 * 安全的存储操作
 */
const safeStorage = {
  get(key: string): string | null {
    if (typeof window === 'undefined') return null;
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  
  set(key: string, value: string): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      console.error('Storage set error:', error);
    }
  },
  
  remove(key: string): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Storage remove error:', error);
    }
  },
};

/**
 * 组件加载器
 */
export class ComponentLoader {
  private components: Map<string, InstalledComponent> = new Map();
  private toolRegistry: ToolRegistry;
  private storageKey = 'skill_components';
  private initialized = false;

  constructor(toolRegistry: ToolRegistry) {
    this.toolRegistry = toolRegistry;
  }

  // ============ 组件管理 ============

  /**
   * 安装组件
   */
  async install(component: SkillComponent): Promise<InstalledComponent> {
    // 验证组件
    this.validateComponent(component);
    
    // 创建安装实例
    const installed: InstalledComponent = {
      component,
      installedAt: Date.now(),
      enabled: true,
      stats: {
        callCount: 0,
      },
    };
    
    // 存储组件
    this.components.set(component.id, installed);
    
    // 注册工具
    await this.registerComponentTool(installed);
    
    // 持久化
    await this.saveComponents();
    
    return installed;
  }

  /**
   * 卸载组件
   */
  async uninstall(componentId: string): Promise<boolean> {
    const installed = this.components.get(componentId);
    if (!installed) return false;
    
    // 注销工具
    const toolName = installed.component.tool.name || installed.component.id;
    this.toolRegistry.unregister(toolName);
    
    // 移除组件
    this.components.delete(componentId);
    
    // 持久化
    await this.saveComponents();
    
    return true;
  }

  /**
   * 启用/禁用组件
   */
  async toggle(componentId: string, enabled: boolean): Promise<boolean> {
    const installed = this.components.get(componentId);
    if (!installed) return false;
    
    installed.enabled = enabled;
    
    if (enabled) {
      await this.registerComponentTool(installed);
    } else {
      const toolName = installed.component.tool.name || installed.component.id;
      this.toolRegistry.unregister(toolName);
    }
    
    await this.saveComponents();
    return true;
  }

  /**
   * 获取已安装组件
   */
  getInstalled(componentId?: string): InstalledComponent | InstalledComponent[] | null {
    if (componentId) {
      return this.components.get(componentId) || null;
    }
    return Array.from(this.components.values());
  }

  /**
   * 加载所有已安装组件
   */
  async loadInstalled(): Promise<void> {
    // 防止重复加载
    if (this.initialized) return;
    this.initialized = true;
    
    try {
      // 从存储加载
      const stored = safeStorage.get(this.storageKey);
      if (stored) {
        const components: InstalledComponent[] = JSON.parse(stored);
        for (const installed of components) {
          this.components.set(installed.component.id, installed);
          if (installed.enabled) {
            await this.registerComponentTool(installed);
          }
        }
      }
    } catch (error) {
      console.error('加载组件失败:', error);
    }
  }

  /**
   * 保存组件到存储
   */
  private async saveComponents(): Promise<void> {
    const components = Array.from(this.components.values());
    safeStorage.set(this.storageKey, JSON.stringify(components));
  }

  // ============ 工具注册 ============

  /**
   * 注册组件工具
   */
  private async registerComponentTool(installed: InstalledComponent): Promise<void> {
    const { component } = installed;
    const toolName = component.tool.name || component.id;
    
    // 转换为工具定义
    const definition = componentToToolDefinition(component);
    
    // 创建执行器
    const executor = this.createExecutor(installed);
    
    // 注册到工具注册表
    this.toolRegistry.register(toolName, {
      definition,
      execute: executor,
    });
  }

  /**
   * 创建组件执行器
   */
  private createExecutor(installed: InstalledComponent): ToolExecutor {
    const { component } = installed;
    
    return async (args: Record<string, unknown>) => {
      const startTime = Date.now();
      
      try {
        // 根据执行器类型执行
        let result: unknown;
        
        switch (component.executor.type) {
          case 'http':
            result = await this.executeHttp(component.executor.http!, args);
            break;
          case 'function':
            result = await this.executeFunction(component.executor.function!, args);
            break;
          case 'template':
            result = await this.executeTemplate(component.executor.template!, args);
            break;
          case 'script':
            result = await this.executeScript(component.executor.script!, args);
            break;
          case 'chain':
            result = await this.executeChain(component.executor.chain!, args);
            break;
          case 'llm':
            result = await this.executeLLM(component.executor.llm!, args);
            break;
          default:
            throw new Error(`未知的执行器类型: ${component.executor.type}`);
        }
        
        // 更新统计
        this.updateStats(installed, Date.now() - startTime);
        
        return {
          success: true,
          result,
        };
        
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : '执行失败',
        };
      }
    };
  }

  // ============ 执行器实现 ============

  /**
   * HTTP执行器
   */
  private async executeHttp(
    config: NonNullable<ComponentExecutor['http']>,
    args: Record<string, unknown>
  ): Promise<unknown> {
    // 渲染URL模板
    const url = this.renderTemplate(config.url, args);
    
    // 构建请求选项
    const options: RequestInit = {
      method: config.method,
      headers: { ...config.headers },
    };
    
    // 处理认证
    if (config.auth && config.auth.type !== 'none') {
      const authValue = this.getAuthValue(config.auth);
      if (config.auth.type === 'bearer') {
        options.headers!['Authorization'] = `Bearer ${authValue}`;
      } else if (config.auth.type === 'api_key' && config.auth.header) {
        options.headers![config.auth.header] = authValue;
      } else if (config.auth.type === 'basic') {
        options.headers!['Authorization'] = `Basic ${btoa(authValue)}`;
      }
    }
    
    // 处理请求体
    if (config.body && ['POST', 'PUT', 'PATCH'].includes(config.method)) {
      options.body = this.renderTemplate(config.body, args);
      if (!options.headers!['Content-Type']) {
        options.headers!['Content-Type'] = 'application/json';
      }
    }
    
    // 处理查询参数
    let finalUrl = url;
    if (config.query) {
      const queryParams = new URLSearchParams();
      for (const [key, template] of Object.entries(config.query)) {
        const value = this.renderTemplate(template, args);
        if (value) queryParams.append(key, value);
      }
      finalUrl += `?${queryParams.toString()}`;
    }
    
    // 发送请求
    const response = await fetch(finalUrl, options);
    
    // 解析响应
    let data = await response.json();
    
    // 提取数据路径
    if (config.response?.path) {
      data = this.extractPath(data, config.response.path);
    }
    
    // 错误判断
    if (config.response?.errorPath) {
      const errorValue = this.extractPath(data, config.response.errorPath);
      if (errorValue) {
        throw new Error(typeof errorValue === 'string' ? errorValue : JSON.stringify(errorValue));
      }
    }
    
    // 转换
    if (config.response?.transform) {
      data = this.transformResponse(data, config.response.transform);
    }
    
    return data;
  }

  /**
   * 函数执行器
   */
  private async executeFunction(
    config: NonNullable<ComponentExecutor['function']>,
    args: Record<string, unknown>
  ): Promise<unknown> {
    // 内置函数映射
    const builtInFunctions: Record<string, (...args: unknown[]) => unknown> = {
      // 数学函数
      add: (a: number, b: number) => a + b,
      subtract: (a: number, b: number) => a - b,
      multiply: (a: number, b: number) => a * b,
      divide: (a: number, b: number) => a / b,
      
      // 字符串函数
      uppercase: (s: string) => s.toUpperCase(),
      lowercase: (s: string) => s.toLowerCase(),
      trim: (s: string) => s.trim(),
      split: (s: string, sep: string) => s.split(sep),
      join: (arr: string[], sep: string) => arr.join(sep),
      
      // 数组函数
      first: <T>(arr: T[]) => arr[0],
      last: <T>(arr: T[]) => arr[arr.length - 1],
      length: (arr: unknown[]) => arr.length,
      reverse: <T>(arr: T[]) => [...arr].reverse(),
      
      // 日期函数
      now: () => new Date().toISOString(),
      timestamp: () => Date.now(),
      
      // UUID
      uuid: () => generateId(),
    };
    
    const fn = builtInFunctions[config.name];
    if (!fn) {
      throw new Error(`未知的内置函数: ${config.name}`);
    }
    
    // 映射参数
    const fnArgs = config.argsMapping
      ? Object.values(config.argsMapping).map(key => args[key])
      : Object.values(args);
    
    return fn(...fnArgs);
  }

  /**
   * 模板执行器
   */
  private async executeTemplate(
    config: NonNullable<ComponentExecutor['template']>,
    args: Record<string, unknown>
  ): Promise<unknown> {
    const rendered = this.renderTemplate(config.template, args);
    
    return {
      format: config.outputFormat,
      content: rendered,
    };
  }

  /**
   * 脚本执行器
   */
  private async executeScript(
    config: NonNullable<ComponentExecutor['script']>,
    args: Record<string, unknown>
  ): Promise<unknown> {
    if (config.language === 'javascript' || config.language === 'typescript') {
      // 创建安全的执行环境
      const argKeys = Object.keys(args);
      const fn = new Function(
        'args',
        'env',
        `
        "use strict";
        const { ${argKeys.length > 0 ? argKeys.join(', ') : ''} } = args;
        ${config.code}
        `
      );
      
      return fn(args, config.env || {});
    }
    
    throw new Error(`不支持的脚本语言: ${config.language}`);
  }

  /**
   * 工具链执行器
   */
  private async executeChain(
    config: NonNullable<ComponentExecutor['chain']>,
    args: Record<string, unknown>
  ): Promise<unknown> {
    const results: Record<string, unknown> = { ...args };
    
    if (config.parallel) {
      // 并行执行
      const promises = config.steps.map(step => this.executeChainStep(step, results));
      const stepResults = await Promise.all(promises);
      
      config.steps.forEach((step, i) => {
        results[step.name] = stepResults[i];
      });
    } else {
      // 串行执行
      for (const step of config.steps) {
        results[step.name] = await this.executeChainStep(step, results);
      }
    }
    
    return results;
  }

  /**
   * 执行工具链步骤
   */
  private async executeChainStep(
    step: { tool: string; args: Record<string, string> },
    context: Record<string, unknown>
  ): Promise<unknown> {
    // 解析参数
    const args: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(step.args)) {
      args[key] = this.renderTemplate(value, context);
    }
    
    // 执行工具
    const result = await this.toolRegistry.execute(step.tool, args);
    
    if (!result.success) {
      throw new Error(result.error || '工具执行失败');
    }
    
    return result.result;
  }

  /**
   * LLM执行器
   */
  private async executeLLM(
    config: NonNullable<ComponentExecutor['llm']>,
    args: Record<string, unknown>
  ): Promise<unknown> {
    // 动态导入SDK
    const ZAI = (await import('z-ai-web-dev-sdk')).default;
    const zai = await ZAI.create();
    
    // 渲染提示词
    const userPrompt = this.renderTemplate(config.userPrompt, args);
    const systemPrompt = config.systemPrompt
      ? this.renderTemplate(config.systemPrompt, args)
      : undefined;
    
    // 构建消息
    const messages: Array<{ role: 'system' | 'user'; content: string }> = [];
    
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: userPrompt });
    
    // 调用LLM
    const completion = await zai.chat.completions.create({
      messages,
      model: config.model || 'gpt-4o',
      temperature: config.temperature ?? 0.7,
      max_tokens: config.maxTokens ?? 1024,
    });
    
    return {
      content: completion.choices[0]?.message?.content || '',
      model: completion.model,
      usage: completion.usage,
    };
  }

  // ============ 辅助方法 ============

  /**
   * 验证组件定义
   */
  private validateComponent(component: SkillComponent): void {
    if (!component.id) throw new Error('组件ID不能为空');
    if (!component.name) throw new Error('组件名称不能为空');
    if (!component.tool?.description) throw new Error('工具描述不能为空');
    if (!component.tool?.parameters?.length) throw new Error('至少需要一个参数');
    if (!component.executor?.type) throw new Error('执行器类型不能为空');
    
    // 验证执行器配置
    const { executor } = component;
    switch (executor.type) {
      case 'http':
        if (!executor.http?.url) throw new Error('HTTP执行器需要URL配置');
        break;
      case 'function':
        if (!executor.function?.name) throw new Error('函数执行器需要函数名');
        break;
      case 'template':
        if (!executor.template?.template) throw new Error('模板执行器需要模板内容');
        break;
      case 'script':
        if (!executor.script?.code) throw new Error('脚本执行器需要代码');
        break;
      case 'chain':
        if (!executor.chain?.steps?.length) throw new Error('工具链执行器需要步骤');
        break;
      case 'llm':
        if (!executor.llm?.userPrompt) throw new Error('LLM执行器需要用户提示词');
        break;
    }
  }

  /**
   * 渲染模板
   */
  private renderTemplate(template: string, context: Record<string, unknown>): string {
    return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (_, path) => {
      const value = this.extractPath(context, path);
      return value !== undefined ? String(value) : '';
    });
  }

  /**
   * 提取路径值
   */
  private extractPath(obj: unknown, path: string): unknown {
    const parts = path.split('.');
    let current = obj;
    
    for (const part of parts) {
      if (current === null || current === undefined) return undefined;
      
      const match = part.match(/^(\w+)\[(\d+)\]$/);
      if (match) {
        const [, key, index] = match;
        current = (current as Record<string, unknown[]>)?.[key]?.[parseInt(index)];
      } else {
        current = (current as Record<string, unknown>)?.[part];
      }
    }
    
    return current;
  }

  /**
   * 获取认证值
   */
  private getAuthValue(auth: { key?: string }): string {
    if (!auth.key) return '';
    
    // 检查是否是环境变量引用
    if (auth.key.startsWith('$')) {
      const envVar = auth.key.slice(1);
      // 浏览器环境：从 window.__ENV__ 或直接返回空
      if (typeof window !== 'undefined') {
        return (window as unknown as Record<string, unknown>).__ENV__?.[envVar] || '';
      }
      return '';
    }
    
    return auth.key;
  }

  /**
   * 转换响应
   */
  private transformResponse(data: unknown, transform: string): unknown {
    try {
      const fn = new Function('data', `return ${transform}`);
      return fn(data);
    } catch {
      return data;
    }
  }

  /**
   * 更新统计信息
   */
  private updateStats(installed: InstalledComponent, latency: number): void {
    if (!installed.stats) {
      installed.stats = { callCount: 0 };
    }
    
    installed.stats.callCount++;
    installed.stats.lastUsed = Date.now();
    
    // 计算平均延迟
    const prevAvg = installed.stats.avgLatency || 0;
    const prevCount = installed.stats.callCount - 1;
    installed.stats.avgLatency = (prevAvg * prevCount + latency) / installed.stats.callCount;
  }
}

export default ComponentLoader;
