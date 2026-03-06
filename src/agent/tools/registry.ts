/**
 * Tool Registry - Updated with Complete Tools
 * 工具注册表 - 包含所有完整工具（单例模式）
 */

import { ToolDefinition, ToolExecutor } from '../core/types';
import { allTools, toolCategories } from './definitions';
import { toolExecutors } from './executors';

/**
 * 工具注册表类
 */
export class ToolRegistry {
  private tools: Map<string, { definition: ToolDefinition; execute: ToolExecutor }> = new Map();
  private initialized = false;

  constructor() {
    // 延迟初始化，不在构造函数中立即注册
  }

  /**
   * 确保已初始化
   */
  private ensureInitialized(): void {
    if (this.initialized) return;
    this.initialized = true;
    this.registerAllTools();
  }

  /**
   * 注册所有工具
   */
  private registerAllTools(): void {
    for (const definition of allTools) {
      const executor = toolExecutors[definition.name];
      if (executor) {
        this.tools.set(definition.name, {
          definition,
          execute: executor,
        });
      }
    }
  }

  /**
   * 注册单个工具
   */
  register(name: string, tool: { definition: ToolDefinition; execute: ToolExecutor }): void {
    this.ensureInitialized();
    this.tools.set(name, tool);
  }

  /**
   * 注销工具
   */
  unregister(name: string): void {
    this.tools.delete(name);
  }

  /**
   * 获取工具定义
   */
  getDefinition(name: string): ToolDefinition | undefined {
    this.ensureInitialized();
    return this.tools.get(name)?.definition;
  }

  /**
   * 获取多个工具定义
   */
  getDefinitions(names?: string[]): ToolDefinition[] {
    this.ensureInitialized();
    
    if (!names || names.length === 0) {
      return Array.from(this.tools.values()).map(t => t.definition);
    }
    
    return names
      .map(name => this.tools.get(name)?.definition)
      .filter((def): def is ToolDefinition => def !== undefined);
  }

  /**
   * 执行工具
   */
  async execute(
    name: string,
    args: Record<string, unknown>
  ): Promise<{ result: unknown; success: boolean; error?: string }> {
    this.ensureInitialized();
    
    const tool = this.tools.get(name);
    
    if (!tool) {
      return {
        result: null,
        success: false,
        error: `工具 "${name}" 未注册`,
      };
    }

    try {
      const result = await tool.execute(args);
      return { result, success: true };
    } catch (error) {
      return {
        result: null,
        success: false,
        error: error instanceof Error ? error.message : '工具执行失败',
      };
    }
  }

  /**
   * 检查工具是否存在
   */
  has(name: string): boolean {
    this.ensureInitialized();
    return this.tools.has(name);
  }

  /**
   * 获取所有工具名称
   */
  getNames(): string[] {
    this.ensureInitialized();
    return Array.from(this.tools.keys());
  }

  /**
   * 获取工具分类
   */
  getCategories(): Record<string, string[]> {
    return toolCategories;
  }

  /**
   * 按分类获取工具
   */
  getToolsByCategory(category: string): ToolDefinition[] {
    const names = toolCategories[category as keyof typeof toolCategories];
    if (!names) return [];
    return this.getDefinitions(names);
  }

  /**
   * 清空所有工具
   */
  clear(): void {
    this.tools.clear();
    this.initialized = false;
  }

  /**
   * 获取工具数量
   */
  size(): number {
    this.ensureInitialized();
    return this.tools.size;
  }
}

// ============ 单例管理 ============

let _instance: ToolRegistry | null = null;

/**
 * 获取工具注册表单例
 */
export function getToolRegistry(): ToolRegistry {
  if (!_instance) {
    _instance = new ToolRegistry();
  }
  return _instance;
}

/**
 * 重置单例（仅用于测试）
 */
export function resetToolRegistry(): void {
  _instance = null;
}

// 导出单例（延迟初始化）
export const toolRegistry = new Proxy({} as ToolRegistry, {
  get(target, prop) {
    const instance = getToolRegistry();
    return instance[prop as keyof ToolRegistry];
  }
});

// 导出所有工具定义
export { allTools, toolCategories } from './definitions';
export { toolExecutors } from './executors';

export default ToolRegistry;
