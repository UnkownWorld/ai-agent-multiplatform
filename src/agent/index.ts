/**
 * Agent Entry Point
 * Agent入口文件 - 导出所有公共API
 */

// 核心类型
export * from './core/types';

// 核心引擎
export { AgentCore } from './core/engine';

// 平台适配器
export {
  createPlatformAdapter,
  createWebAdapter,
  createDesktopAdapter,
  createMobileAdapter,
} from './core/platform';

// 工具系统
export { ToolRegistry, builtInTools } from './tools/builtin';
export type { ToolDefinition, ToolExecutor, ToolResult } from './core/types';

// 记忆系统
export { MemoryManager } from './memory/manager';

// 工具函数
export * from './utils';

// 默认配置
export const defaultAgentConfig = {
  name: 'AI Agent',
  description: '智能助手',
  model: 'gpt-4o',
  systemPrompt: `你是一个智能助手，可以帮助用户完成各种任务。
你可以使用以下工具：
- web_search: 搜索互联网获取实时信息
- web_reader: 读取网页内容
- calculator: 执行数学计算
- get_time: 获取当前时间
- code_executor: 执行JavaScript代码
- json_processor: 处理JSON数据

请根据用户的需求选择合适的工具来完成任务。`,
  temperature: 0.7,
  maxTokens: 4096,
  tools: ['web_search', 'web_reader', 'calculator', 'get_time', 'code_executor', 'json_processor'],
  memory: {
    enabled: true,
    maxMessages: 50,
    maxTokens: 8000,
    summaryThreshold: 6000,
  },
};

import { AgentConfig } from './core/types';
export type { AgentConfig };
