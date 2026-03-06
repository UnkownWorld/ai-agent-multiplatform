/**
 * Skill Component System - Types
 * 组件系统类型定义 - 让用户通过简单配置创建新Skill
 */

// ============ 组件定义类型 ============

/**
 * 组件定义 - 用户可配置的Skill模板
 */
export interface SkillComponent {
  // 基本信息
  id: string;
  name: string;
  version: string;
  description: string;
  author?: string;
  tags?: string[];
  icon?: string;
  
  // 工具定义
  tool: ComponentTool;
  
  // 执行配置
  executor: ComponentExecutor;
  
  // UI配置
  ui?: ComponentUI;
  
  // 元数据
  metadata?: Record<string, unknown>;
}

/**
 * 组件工具定义
 */
export interface ComponentTool {
  // 工具名称（默认使用组件id）
  name?: string;
  
  // 工具描述
  description: string;
  
  // 参数定义
  parameters: ComponentParameter[];
  
  // 必需参数
  required?: string[];
}

/**
 * 组件参数定义
 */
export interface ComponentParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'enum';
  description: string;
  required?: boolean;
  default?: unknown;
  
  // 枚举类型选项
  enum?: string[];
  
  // UI相关
  label?: string;
  placeholder?: string;
  
  // 验证
  min?: number;
  max?: number;
  pattern?: string;
  
  // 数组元素类型
  items?: {
    type: 'string' | 'number' | 'object';
  };
}

/**
 * 组件执行器配置
 */
export interface ComponentExecutor {
  // 执行器类型
  type: 
    | 'http'          // HTTP请求
    | 'function'      // 内置函数
    | 'template'      // 模板渲染
    | 'script'        // 脚本执行
    | 'chain'         // 工具链
    | 'llm';          // LLM调用
  
  // HTTP类型配置
  http?: HttpExecutorConfig;
  
  // 函数类型配置
  function?: FunctionExecutorConfig;
  
  // 模板类型配置
  template?: TemplateExecutorConfig;
  
  // 脚本类型配置
  script?: ScriptExecutorConfig;
  
  // 工具链类型配置
  chain?: ChainExecutorConfig;
  
  // LLM类型配置
  llm?: LLMExecutorConfig;
  
  // 超时设置（毫秒）
  timeout?: number;
  
  // 重试配置
  retry?: {
    count: number;
    delay: number;
  };
}

/**
 * HTTP执行器配置
 */
export interface HttpExecutorConfig {
  // 请求URL（支持模板变量）
  url: string;
  
  // 请求方法
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  
  // 请求头
  headers?: Record<string, string>;
  
  // 请求体模板
  body?: string;
  
  // 查询参数模板
  query?: Record<string, string>;
  
  // 认证配置
  auth?: {
    type: 'bearer' | 'basic' | 'api_key' | 'none';
    key?: string;           // 环境变量名或固定值
    header?: string;        // API Key的header名
  };
  
  // 响应处理
  response?: {
    // 响应数据路径（JSONPath）
    path?: string;
    // 错误判断
    errorPath?: string;
    // 转换函数
    transform?: string;
  };
}

/**
 * 函数执行器配置
 */
export interface FunctionExecutorConfig {
  // 内置函数名
  name: string;
  
  // 参数映射
  argsMapping?: Record<string, string>;
}

/**
 * 模板执行器配置
 */
export interface TemplateExecutorConfig {
  // 模板内容
  template: string;
  
  // 输出格式
  outputFormat: 'text' | 'json' | 'markdown' | 'html';
  
  // 是否使用LLM渲染
  useLLM?: boolean;
}

/**
 * 脚本执行器配置
 */
export interface ScriptExecutorConfig {
  // 脚本语言
  language: 'javascript' | 'typescript' | 'python';
  
  // 脚本代码
  code: string;
  
  // 环境变量
  env?: Record<string, string>;
}

/**
 * 工具链执行器配置
 */
export interface ChainExecutorConfig {
  // 执行步骤
  steps: ChainStep[];
  
  // 是否并行执行
  parallel?: boolean;
}

/**
 * 工具链步骤
 */
export interface ChainStep {
  // 步骤名称
  name: string;
  
  // 使用的工具
  tool: string;
  
  // 参数（支持引用前序步骤结果）
  args: Record<string, string>;
  
  // 条件执行
  condition?: string;
  
  // 错误处理
  onError?: 'continue' | 'stop' | 'retry';
}

/**
 * LLM执行器配置
 */
export interface LLMExecutorConfig {
  // 模型
  model?: string;
  
  // 系统提示词模板
  systemPrompt?: string;
  
  // 用户提示词模板
  userPrompt: string;
  
  // 温度
  temperature?: number;
  
  // 最大Token
  maxTokens?: number;
}

/**
 * 组件UI配置
 */
export interface ComponentUI {
  // 是否在UI中显示
  visible?: boolean;
  
  // 表单布局
  layout?: 'vertical' | 'horizontal' | 'grid';
  
  // 分组
  groups?: UIGroup[];
  
  // 自定义样式
  style?: Record<string, string>;
}

/**
 * UI分组
 */
export interface UIGroup {
  name: string;
  label: string;
  fields: string[];
  collapsible?: boolean;
  defaultExpanded?: boolean;
}

// ============ 组件实例类型 ============

/**
 * 已安装的组件实例
 */
export interface InstalledComponent {
  // 组件定义
  component: SkillComponent;
  
  // 安装信息
  installedAt: number;
  
  // 是否启用
  enabled: boolean;
  
  // 自定义配置
  config?: Record<string, unknown>;
  
  // 使用统计
  stats?: {
    callCount: number;
    lastUsed?: number;
    avgLatency?: number;
  };
}

// ============ 组件市场类型 ============

/**
 * 组件市场项
 */
export interface ComponentMarketItem {
  id: string;
  name: string;
  description: string;
  author: string;
  version: string;
  downloads: number;
  rating: number;
  tags: string[];
  icon?: string;
  preview?: string;
}

// ============ 工具定义转换类型 ============

import { ToolDefinition } from '../core/types';

/**
 * 将组件转换为工具定义
 */
export function componentToToolDefinition(component: SkillComponent): ToolDefinition {
  const properties: Record<string, {
    type: 'string' | 'number' | 'boolean' | 'array' | 'object';
    description: string;
    enum?: string[];
    default?: unknown;
  }> = {};
  
  for (const param of component.tool.parameters) {
    properties[param.name] = {
      type: param.type as 'string' | 'number' | 'boolean' | 'array' | 'object',
      description: param.description,
      ...(param.enum && { enum: param.enum }),
      ...(param.default !== undefined && { default: param.default }),
    };
  }
  
  return {
    name: component.tool.name || component.id,
    description: component.tool.description,
    parameters: {
      type: 'object',
      properties,
    },
    required: component.tool.required,
  };
}

export default SkillComponent;
