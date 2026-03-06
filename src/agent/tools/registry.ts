/**
 * Tool Registry - Updated with Complete Tools
 * 工具注册表 - 包含所有完整工具（单例模式）
 */

import { ToolDefinition, ToolExecutor } from '../core/types';
import { allTools, toolCategories } from './definitions';
import { toolExecutors } from './executors';
import { fileSystemTool, fileSystemExecutor } from './filesystem';

// 合并所有工具定义
const completeTools = [...allTools, fileSystemTool];

// 合并所有执行器
const completeExecutors = {
  ...toolExecutors,
  file_system: fileSystemExecutor,
};

// 更新分类
const completeCategories = {
  ...toolCategories,
  '文件系统': ['file_system'],
};

/**
 * 工具注册表类
 */
export class ToolRegistry {
  private tools: Map<string, { definition: ToolDefinition; execute: ToolExecutor }> = new Map();
  private initialized = false;

  constructor() {
    // 延迟初始化
  }

  private ensureInitialized(): void {
    if (this.initialized) return;
    this.initialized = true;
    this.registerAllTools();
  }

  private registerAllTools(): void {
    for (const definition of completeTools) {
      const executor = completeExecutors[definition.name];
      if (executor) {
        this.tools.set(definition.name, {
          definition,
          execute: executor,
        });
      }
    }
  }

  register(name: string, tool: { definition: ToolDefinition; execute: ToolExecutor }): void {
    this.ensureInitialized();
    this.tools.set(name, tool);
  }

  unregister(name: string): void {
    this.tools.delete(name);
  }

  getDefinition(name: string): ToolDefinition | undefined {
    this.ensureInitialized();
    return this.tools.get(name)?.definition;
  }

  getDefinitions(names?: string[]): ToolDefinition[] {
    this.ensureInitialized();
    
    if (!names || names.length === 0) {
      return Array.from(this.tools.values()).map(t => t.definition);
    }
    
    return names
      .map(name => this.tools.get(name)?.definition)
      .filter((def): def is ToolDefinition => def !== undefined);
  }

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

  has(name: string): boolean {
    this.ensureInitialized();
    return this.tools.has(name);
  }

  getNames(): string[] {
    this.ensureInitialized();
    return Array.from(this.tools.keys());
  }

  getCategories(): Record<string, string[]> {
    return completeCategories;
  }

  getToolsByCategory(category: string): ToolDefinition[] {
    const names = completeCategories[category as keyof typeof completeCategories];
    if (!names) return [];
    return this.getDefinitions(names);
  }

  clear(): void {
    this.tools.clear();
    this.initialized = false;
  }

  size(): number {
    this.ensureInitialized();
    return this.tools.size;
  }
}

// 单例管理
let _instance: ToolRegistry | null = null;

export function getToolRegistry(): ToolRegistry {
  if (!_instance) {
    _instance = new ToolRegistry();
  }
  return _instance;
}

export function resetToolRegistry(): void {
  _instance = null;
}

export const toolRegistry = new Proxy({} as ToolRegistry, {
  get(target, prop) {
    const instance = getToolRegistry();
    return instance[prop as keyof ToolRegistry];
  }
});

export { allTools, toolCategories } from './definitions';
export { toolExecutors } from './executors';
export { fileSystemTool, fileSystemExecutor } from './filesystem';

export default ToolRegistry;
