/**
 * Agent Core Types
 * 三端Agent应用的核心类型定义
 */

// ============ 消息类型 ============

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp: number;
  metadata?: MessageMetadata;
}

export interface MessageMetadata {
  model?: string;
  tokens?: {
    prompt: number;
    completion: number;
    total: number;
  };
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
  latency?: number;
}

// ============ 工具类型 ============

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: ToolParameter;
  required?: string[];
}

export interface ToolParameter {
  type: 'object';
  properties: Record<string, ToolProperty>;
}

export interface ToolProperty {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  enum?: string[];
  default?: unknown;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ToolResult {
  toolCallId: string;
  name: string;
  result: unknown;
  success: boolean;
  error?: string;
}

export type ToolExecutor = (
  args: Record<string, unknown>
) => Promise<unknown>;

// ============ 会话类型 ============

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
  metadata?: ConversationMetadata;
}

export interface ConversationMetadata {
  model?: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  tools?: string[];
}

// ============ Agent配置 ============

export interface AgentConfig {
  name: string;
  description: string;
  model: string;
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  tools: string[];
  memory: MemoryConfig;
}

export interface MemoryConfig {
  enabled: boolean;
  maxMessages: number;
  maxTokens: number;
  summaryThreshold: number;
}

// ============ LLM提供者 ============

export interface LLMProvider {
  id: string;
  name: string;
  type: 'openai' | 'anthropic' | 'google' | 'custom';
  apiKey: string;
  baseUrl?: string;
  models: ModelInfo[];
}

export interface ModelInfo {
  id: string;
  name: string;
  contextWindow: number;
  supportsTools: boolean;
  supportsVision: boolean;
  supportsStreaming: boolean;
}

// ============ Agent状态 ============

export type AgentStatus = 'idle' | 'thinking' | 'executing' | 'error';

export interface AgentState {
  status: AgentStatus;
  currentConversation: Conversation | null;
  conversations: Conversation[];
  providers: LLMProvider[];
  activeProvider: string;
  activeModel: string;
  error: string | null;
}

// ============ 流式响应 ============

export interface StreamChunk {
  type: 'content' | 'tool_call' | 'tool_result' | 'done' | 'error';
  content?: string;
  toolCall?: ToolCall;
  toolResult?: ToolResult;
  error?: string;
}

export type StreamCallback = (chunk: StreamChunk) => void;

// ============ 平台适配 ============

export interface PlatformAdapter {
  platform: 'web' | 'desktop' | 'mobile';
  storage: StorageAdapter;
  clipboard: ClipboardAdapter;
  notification: NotificationAdapter;
  fileSystem?: FileSystemAdapter;
}

export interface StorageAdapter {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
}

export interface ClipboardAdapter {
  read(): Promise<string>;
  write(text: string): Promise<void>;
}

export interface NotificationAdapter {
  show(title: string, body: string): Promise<void>;
}

export interface FileSystemAdapter {
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  pickFile(): Promise<string | null>;
  pickDirectory(): Promise<string | null>;
}

// ============ 插件系统 ============

export interface AgentPlugin {
  id: string;
  name: string;
  version: string;
  description: string;
  tools: ToolDefinition[];
  onActivate?: (agent: AgentCore) => Promise<void>;
  onDeactivate?: () => Promise<void>;
  execute: ToolExecutor;
}

// ============ 事件系统 ============

export type AgentEventType = 
  | 'message:created'
  | 'message:updated'
  | 'conversation:created'
  | 'conversation:updated'
  | 'conversation:deleted'
  | 'tool:called'
  | 'tool:completed'
  | 'status:changed'
  | 'error';

export interface AgentEvent {
  type: AgentEventType;
  payload: unknown;
  timestamp: number;
}

export type AgentEventHandler = (event: AgentEvent) => void;
