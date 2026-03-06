/**
 * Tool Registry - Updated with Complete Tools
 * 工具注册表 - 包含所有完整工具
 */

import { ToolDefinition, ToolExecutor } from '../core/types';
import { allTools, toolCategories } from './definitions';
import { toolExecutors } from './executors';

export class ToolRegistry {
  private tools: Map<string, { definition: ToolDefinition; execute: ToolExecutor }> = new Map();

  constructor() {
    // 自动注册所有工具
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
    return this.tools.get(name)?.definition;
  }

  /**
   * 获取多个工具定义
   */
  getDefinitions(names?: string[]): ToolDefinition[] {
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
    return this.tools.has(name);
  }

  /**
   * 获取所有工具名称
   */
  getNames(): string[] {
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
  }

  /**
   * 获取工具数量
   */
  size(): number {
    return this.tools.size;
  }
}

// 导出单例
export const toolRegistry = new ToolRegistry();

// 导出所有工具定义
export { allTools, toolCategories } from './definitions';
export { toolExecutors } from './executors';

export default ToolRegistry;
