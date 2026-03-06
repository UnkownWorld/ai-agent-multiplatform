/**
 * Agent Entry Point - Complete with Component System
 * Agent入口文件 - 包含完整工具集和组件系统
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
export { 
  ToolRegistry, 
  getToolRegistry, 
  resetToolRegistry,
  toolRegistry, 
  allTools, 
  toolCategories 
} from './tools/registry';
export { toolExecutors } from './tools/executors';
export type { ToolDefinition, ToolExecutor, ToolResult } from './core/types';

// 记忆系统
export { MemoryManager } from './memory/manager';

// 组件系统
export * from './components';
export { ComponentLoader } from './components/loader';
export { 
  ComponentManager, 
  getComponentManager,
  resetComponentManager,
  componentManager 
} from './components/manager';
export type { 
  SkillComponent, 
  InstalledComponent,
  ComponentTool,
  ComponentParameter,
  ComponentExecutor,
} from './components/types';

// 工具函数
export * from './utils';

// ============ 默认配置 ============

export const defaultAgentConfig = {
  name: 'AI Agent',
  description: '全能智能助手 - 具备信息检索、内容生成、语音处理、视觉理解、文档处理等全方位能力',
  model: 'gpt-4o',
  systemPrompt: `你是一个全能的AI智能助手，具备以下核心能力：

## 🔍 信息检索
- **网络搜索**: 搜索互联网获取最新信息、新闻、教程等
- **网页阅读**: 读取并提取网页内容，获取文章正文

## 🎨 内容生成
- **图像生成**: 根据文字描述生成各种风格的图像
- **视频生成**: 创建短视频内容
- **播客生成**: 将文本转换为播客音频

## 🎤 语音处理
- **语音识别**: 将语音转换为文字
- **语音合成**: 将文字转换为自然语音

## 👁️ 视觉理解
- **图像理解**: 分析图像内容、识别物体、提取文字
- **视频理解**: 分析视频内容、提取关键帧、生成摘要

## 📄 文档处理
- **Word文档**: 创建、读取、编辑Word文档
- **PDF处理**: 读取PDF、提取文本、填写表单
- **Excel表格**: 数据分析、图表生成
- **PPT演示**: 创建和编辑演示文稿

## 📊 数据分析
- **金融数据**: 获取股票、基金、汇率等金融信息
- **代码执行**: 执行Python、JavaScript等代码

## 🛠️ 实用工具
- **计算器**: 数学计算和科学计算
- **时间查询**: 获取时间、时区转换
- **天气查询**: 获取城市天气信息
- **翻译**: 多语言翻译
- **JSON处理**: JSON数据解析和处理

## 🧩 组件扩展
- 支持用户自定义组件
- 可通过简单配置添加新能力
- 支持HTTP API、LLM、工具链等多种执行器

请根据用户的具体需求，灵活运用这些能力来帮助他们解决问题。`,
  temperature: 0.7,
  maxTokens: 4096,
  tools: [
    'web_search', 'web_reader',
    'image_generation', 'video_generation', 'podcast_generation',
    'speech_recognition', 'text_to_speech',
    'image_understanding', 'video_understanding',
    'docx_processor', 'pdf_processor', 'xlsx_processor', 'pptx_processor',
    'finance_data', 'code_execution',
    'calculator', 'get_time', 'json_processor', 'get_weather', 'translate',
  ],
  memory: {
    enabled: true,
    maxMessages: 50,
    maxTokens: 8000,
    summaryThreshold: 6000,
  },
};

export const agentCapabilities = {
  '信息检索': {
    icon: '🔍',
    tools: ['web_search', 'web_reader'],
    description: '搜索网络信息，读取网页内容',
  },
  '内容生成': {
    icon: '🎨',
    tools: ['image_generation', 'video_generation', 'podcast_generation'],
    description: '生成图像、视频、播客等内容',
  },
  '语音处理': {
    icon: '🎤',
    tools: ['speech_recognition', 'text_to_speech'],
    description: '语音识别与语音合成',
  },
  '视觉理解': {
    icon: '👁️',
    tools: ['image_understanding', 'video_understanding'],
    description: '理解图像和视频内容',
  },
  '文档处理': {
    icon: '📄',
    tools: ['docx_processor', 'pdf_processor', 'xlsx_processor', 'pptx_processor'],
    description: '处理Word、PDF、Excel、PPT文档',
  },
  '数据分析': {
    icon: '📊',
    tools: ['finance_data', 'code_execution'],
    description: '金融数据查询与代码执行',
  },
  '实用工具': {
    icon: '🛠️',
    tools: ['calculator', 'get_time', 'json_processor', 'get_weather', 'translate'],
    description: '计算器、时间、天气、翻译等工具',
  },
  '组件扩展': {
    icon: '🧩',
    tools: [],
    description: '用户自定义组件和扩展能力',
  },
};

import { AgentConfig } from './core/types';
export type { AgentConfig };
