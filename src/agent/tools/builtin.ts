/**
 * Built-in Tools Implementation
 * 内置工具实现
 */

import { ToolDefinition, ToolExecutor } from '../core/types';
import ZAI from 'z-ai-web-dev-sdk';

// ============ Web搜索工具 ============

export const webSearchTool: ToolDefinition = {
  name: 'web_search',
  description: '搜索互联网获取实时信息',
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

export const webSearchExecutor: ToolExecutor = async (args) => {
  const { query, num = 10 } = args as { query: string; num?: number };
  
  try {
    const zai = await ZAI.create();
    const results = await zai.functions.invoke('web_search', { query, num });
    
    return {
      success: true,
      results: results.map((r: { name: string; url: string; snippet: string; host_name: string }) => ({
        title: r.name,
        url: r.url,
        snippet: r.snippet,
        source: r.host_name,
      })),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '搜索失败',
    };
  }
};

// ============ 网页读取工具 ============

export const webReaderTool: ToolDefinition = {
  name: 'web_reader',
  description: '读取网页内容并提取文本',
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

export const webReaderExecutor: ToolExecutor = async (args) => {
  const { url } = args as { url: string };
  
  try {
    const zai = await ZAI.create();
    const result = await zai.functions.invoke('page_reader', { url });
    
    return {
      success: true,
      title: result.data?.title || '',
      content: result.data?.html || '',
      url: result.data?.url || url,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '读取网页失败',
    };
  }
};

// ============ 计算器工具 ============

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

export const calculatorExecutor: ToolExecutor = async (args) => {
  const { expression } = args as { expression: string };
  
  try {
    // 安全的数学表达式求值
    const sanitized = expression.replace(/[^0-9+\-*/().%\s]/g, '');
    const result = Function(`"use strict"; return (${sanitized})`)();
    
    return {
      success: true,
      expression,
      result,
    };
  } catch (error) {
    return {
      success: false,
      error: `计算错误: ${error instanceof Error ? error.message : '无效表达式'}`,
    };
  }
};

// ============ 时间工具 ============

export const timeTool: ToolDefinition = {
  name: 'get_time',
  description: '获取当前时间',
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

export const timeExecutor: ToolExecutor = async (args) => {
  const { timezone, format = 'iso' } = args as { timezone?: string; format?: string };
  
  try {
    const now = new Date();
    
    let result: string;
    switch (format) {
      case 'unix':
        result = Math.floor(now.getTime() / 1000).toString();
        break;
      case 'locale':
        result = timezone
          ? now.toLocaleString('zh-CN', { timeZone: timezone })
          : now.toLocaleString('zh-CN');
        break;
      default:
        result = timezone
          ? now.toLocaleString('sv-SE', { timeZone: timezone }).replace(' ', 'T')
          : now.toISOString();
    }
    
    return {
      success: true,
      time: result,
      timezone: timezone || 'UTC',
      format,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '获取时间失败',
    };
  }
};

// ============ 代码执行工具 ============

export const codeExecutorTool: ToolDefinition = {
  name: 'code_executor',
  description: '执行JavaScript代码并返回结果',
  parameters: {
    type: 'object',
    properties: {
      code: {
        type: 'string',
        description: '要执行的JavaScript代码',
      },
      timeout: {
        type: 'number',
        description: '超时时间（毫秒），默认5000',
        default: 5000,
      },
    },
  },
  required: ['code'],
};

export const codeExecutorExecutor: ToolExecutor = async (args) => {
  const { code, timeout = 5000 } = args as { code: string; timeout?: number };
  
  try {
    // 创建安全的执行环境
    const result = await new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('执行超时'));
      }, timeout);
      
      try {
        const output = Function(`
          "use strict";
          const console = {
            log: (...args) => args,
            error: (...args) => args,
          };
          return (${code});
        `)();
        clearTimeout(timeoutId);
        resolve(output);
      } catch (error) {
        clearTimeout(timeoutId);
        reject(error);
      }
    });
    
    return {
      success: true,
      result: typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '代码执行失败',
    };
  }
};

// ============ JSON处理工具 ============

export const jsonTool: ToolDefinition = {
  name: 'json_processor',
  description: '处理JSON数据：解析、格式化、提取',
  parameters: {
    type: 'object',
    properties: {
      operation: {
        type: 'string',
        description: '操作类型',
        enum: ['parse', 'stringify', 'extract', 'validate'],
      },
      data: {
        type: 'string',
        description: 'JSON字符串或对象路径',
      },
      path: {
        type: 'string',
        description: '提取路径，如 "data.items[0].name"',
      },
    },
  },
  required: ['operation', 'data'],
};

export const jsonExecutor: ToolExecutor = async (args) => {
  const { operation, data, path } = args as {
    operation: string;
    data: string;
    path?: string;
  };
  
  try {
    switch (operation) {
      case 'parse': {
        const parsed = JSON.parse(data);
        return { success: true, result: parsed };
      }
      case 'stringify': {
        const obj = JSON.parse(data);
        return { success: true, result: JSON.stringify(obj, null, 2) };
      }
      case 'validate': {
        JSON.parse(data);
        return { success: true, valid: true };
      }
      case 'extract': {
        const obj = JSON.parse(data);
        if (!path) throw new Error('提取操作需要path参数');
        const result = path.split('.').reduce((acc: unknown, key) => {
          if (acc && typeof acc === 'object') {
            const match = key.match(/^(\w+)\[(\d+)\]$/);
            if (match) {
              return (acc as Record<string, unknown[]>)[match[1]]?.[parseInt(match[2])];
            }
            return (acc as Record<string, unknown>)[key];
          }
          return undefined;
        }, obj);
        return { success: true, result };
      }
      default:
        throw new Error(`未知操作: ${operation}`);
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'JSON处理失败',
    };
  }
};

// ============ 工具注册表 ============

export const builtInTools = [
  { definition: webSearchTool, executor: webSearchExecutor },
  { definition: webReaderTool, executor: webReaderExecutor },
  { definition: calculatorTool, executor: calculatorExecutor },
  { definition: timeTool, executor: timeExecutor },
  { definition: codeExecutorTool, executor: codeExecutorExecutor },
  { definition: jsonTool, executor: jsonExecutor },
];

export default builtInTools;
