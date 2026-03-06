/**
 * Tool Registry
 * 工具注册表 - 管理Agent可用的工具
 */

import { ToolDefinition, ToolExecutor, ToolResult } from '../core/types';

interface RegisteredTool {
  definition: ToolDefinition;
  execute: ToolExecutor;
}

export class ToolRegistry {
  private tools: Map<string, RegisteredTool> = new Map();

  /**
   * 注册工具
   */
  register(name: string, tool: RegisteredTool): void {
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
   * 清空所有工具
   */
  clear(): void {
    this.tools.clear();
  }
}

// ============ 内置工具 ============

/**
 * 网络搜索工具
 */
export const webSearchTool: ToolDefinition = {
  name: 'web_search',
  description: '在互联网上搜索信息，返回相关的搜索结果',
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: '搜索关键词',
      },
      num: {
        type: 'number',
        description: '返回结果数量，默认10',
        default: 10,
      },
    },
  },
  required: ['query'],
};

/**
 * 网页阅读工具
 */
export const pageReaderTool: ToolDefinition = {
  name: 'page_reader',
  description: '读取网页内容，提取主要文本信息',
  parameters: {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: '要读取的网页URL',
      },
    },
  },
  required: ['url'],
};

/**
 * 代码执行工具
 */
export const codeExecutorTool: ToolDefinition = {
  name: 'code_executor',
  description: '执行JavaScript/TypeScript代码片段',
  parameters: {
    type: 'object',
    properties: {
      code: {
        type: 'string',
        description: '要执行的代码',
      },
      language: {
        type: 'string',
        description: '编程语言',
        enum: ['javascript', 'typescript', 'python'],
        default: 'javascript',
      },
    },
  },
  required: ['code'],
};

/**
 * 文件操作工具
 */
export const fileOperationTool: ToolDefinition = {
  name: 'file_operation',
  description: '执行文件读写操作',
  parameters: {
    type: 'object',
    properties: {
      operation: {
        type: 'string',
        description: '操作类型',
        enum: ['read', 'write', 'list', 'delete'],
      },
      path: {
        type: 'string',
        description: '文件路径',
      },
      content: {
        type: 'string',
        description: '写入内容（仅write操作需要）',
      },
    },
  },
  required: ['operation', 'path'],
};

/**
 * 天气查询工具
 */
export const weatherTool: ToolDefinition = {
  name: 'get_weather',
  description: '获取指定城市的天气信息',
  parameters: {
    type: 'object',
    properties: {
      city: {
        type: 'string',
        description: '城市名称',
      },
      unit: {
        type: 'string',
        description: '温度单位',
        enum: ['celsius', 'fahrenheit'],
        default: 'celsius',
      },
    },
  },
  required: ['city'],
};

/**
 * 计算器工具
 */
export const calculatorTool: ToolDefinition = {
  name: 'calculator',
  description: '执行数学计算',
  parameters: {
    type: 'object',
    properties: {
      expression: {
        type: 'string',
        description: '数学表达式，如 "2 + 3 * 4"',
      },
    },
  },
  required: ['expression'],
};

/**
 * 时间工具
 */
export const timeTool: ToolDefinition = {
  name: 'get_time',
  description: '获取当前时间或指定时区的时间',
  parameters: {
    type: 'object',
    properties: {
      timezone: {
        type: 'string',
        description: '时区，如 "Asia/Shanghai"',
      },
      format: {
        type: 'string',
        description: '时间格式',
        enum: ['iso', 'locale', 'unix'],
        default: 'iso',
      },
    },
  },
};

export default ToolRegistry;
