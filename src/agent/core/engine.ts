/**
 * Agent Core Engine
 * Agent核心引擎 - 处理消息、工具调用、记忆管理
 */

import {
  Message,
  Conversation,
  AgentConfig,
  AgentState,
  AgentStatus,
  StreamCallback,
  StreamChunk,
  ToolCall,
  ToolResult,
  ToolDefinition,
  ToolExecutor,
  AgentEventHandler,
  AgentEvent,
  AgentEventType,
  PlatformAdapter,
  AgentPlugin,
} from './types';
import { MemoryManager } from '../memory/manager';
import { getToolRegistry, ToolRegistry } from '../tools/registry';
import { generateId } from '../utils';

export class AgentCore {
  private state: AgentState;
  private config: AgentConfig;
  private memory: MemoryManager;
  private tools: ToolRegistry;
  private platform: PlatformAdapter;
  private plugins: Map<string, AgentPlugin> = new Map();
  private eventHandlers: Map<AgentEventType, Set<AgentEventHandler>> = new Map();
  private abortController: AbortController | null = null;

  constructor(
    config: AgentConfig,
    platform: PlatformAdapter
  ) {
    this.config = config;
    this.platform = platform;
    this.memory = new MemoryManager(config.memory);
    
    // 使用单例 ToolRegistry，而不是创建新实例
    this.tools = getToolRegistry();
    
    this.state = {
      status: 'idle',
      currentConversation: null,
      conversations: [],
      providers: [],
      activeProvider: '',
      activeModel: config.model,
      error: null,
    };
  }

  // ============ 状态管理 ============

  getState(): AgentState {
    return { ...this.state };
  }

  setStatus(status: AgentStatus): void {
    const oldStatus = this.state.status;
    this.state.status = status;
    this.emit('status:changed', { from: oldStatus, to: status });
  }

  // ============ 会话管理 ============

  async createConversation(title?: string): Promise<Conversation> {
    const conversation: Conversation = {
      id: generateId(),
      title: title || `新对话 ${this.state.conversations.length + 1}`,
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      metadata: {
        model: this.config.model,
        systemPrompt: this.config.systemPrompt,
        temperature: this.config.temperature,
        maxTokens: this.config.maxTokens,
        tools: this.config.tools,
      },
    };

    this.state.conversations.push(conversation);
    this.state.currentConversation = conversation;
    
    await this.saveConversation(conversation);
    this.emit('conversation:created', conversation);
    
    return conversation;
  }

  async loadConversation(id: string): Promise<Conversation | null> {
    const conversation = this.state.conversations.find(c => c.id === id);
    if (conversation) {
      this.state.currentConversation = conversation;
      this.emit('conversation:updated', conversation);
      return conversation;
    }
    return null;
  }

  async deleteConversation(id: string): Promise<void> {
    const index = this.state.conversations.findIndex(c => c.id === id);
    if (index !== -1) {
      this.state.conversations.splice(index, 1);
      if (this.state.currentConversation?.id === id) {
        this.state.currentConversation = null;
      }
      await this.platform.storage.remove(`conversation:${id}`);
      this.emit('conversation:deleted', { id });
    }
  }

  async saveConversation(conversation: Conversation): Promise<void> {
    await this.platform.storage.set(
      `conversation:${conversation.id}`,
      conversation
    );
  }

  async loadAllConversations(): Promise<void> {
    // 从存储中加载所有会话
    const keys = await this.getAllConversationKeys();
    const conversations: Conversation[] = [];
    
    for (const key of keys) {
      const conversation = await this.platform.storage.get<Conversation>(key);
      if (conversation) {
        conversations.push(conversation);
      }
    }
    
    this.state.conversations = conversations.sort(
      (a, b) => b.updatedAt - a.updatedAt
    );
  }

  private async getAllConversationKeys(): Promise<string[]> {
    // 简化实现，实际需要根据平台存储实现
    return [];
  }

  // ============ 消息处理 ============

  async sendMessage(
    content: string,
    onStream?: StreamCallback
  ): Promise<Message> {
    if (!this.state.currentConversation) {
      await this.createConversation();
    }

    const conversation = this.state.currentConversation!;
    
    // 创建用户消息
    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content,
      timestamp: Date.now(),
    };

    conversation.messages.push(userMessage);
    conversation.updatedAt = Date.now();
    this.emit('message:created', userMessage);

    // 准备上下文
    const context = await this.memory.prepareContext(conversation);
    
    // 调用LLM
    this.setStatus('thinking');
    
    try {
      const response = await this.callLLM(context, onStream);
      
      const assistantMessage: Message = {
        id: generateId(),
        role: 'assistant',
        content: response.content,
        timestamp: Date.now(),
        metadata: {
          model: this.config.model,
          tokens: response.tokens,
          toolCalls: response.toolCalls,
          latency: response.latency,
        },
      };

      conversation.messages.push(assistantMessage);
      conversation.updatedAt = Date.now();
      
      // 处理工具调用
      if (response.toolCalls && response.toolCalls.length > 0) {
        await this.executeToolCalls(response.toolCalls, conversation, onStream);
      }

      await this.saveConversation(conversation);
      this.emit('message:created', assistantMessage);
      
      this.setStatus('idle');
      return assistantMessage;
    } catch (error) {
      this.setStatus('error');
      this.state.error = error instanceof Error ? error.message : '未知错误';
      throw error;
    }
  }

  // ============ LLM调用 ============

  private async callLLM(
    context: Message[],
    onStream?: StreamCallback
  ): Promise<{
    content: string;
    tokens?: { prompt: number; completion: number; total: number };
    toolCalls?: ToolCall[];
    latency: number;
  }> {
    const startTime = Date.now();
    
    // 构建请求
    const systemPrompt = this.config.systemPrompt;
    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...context.map(m => ({ role: m.role, content: m.content })),
    ];

    // 获取可用工具
    const availableTools = this.tools.getDefinitions(this.config.tools);

    // 调用API (使用z-ai-web-dev-sdk)
    const response = await this.invokeLLMAPI(messages, availableTools, onStream);
    
    const latency = Date.now() - startTime;
    
    return {
      content: response.content,
      tokens: response.tokens,
      toolCalls: response.toolCalls,
      latency,
    };
  }

  private async invokeLLMAPI(
    messages: Array<{ role: string; content: string }>,
    tools: ToolDefinition[],
    onStream?: StreamCallback
  ): Promise<{
    content: string;
    tokens?: { prompt: number; completion: number; total: number };
    toolCalls?: ToolCall[];
  }> {
    // 动态导入z-ai-web-dev-sdk
    const ZAI = (await import('z-ai-web-dev-sdk')).default;
    const zai = await ZAI.create();

    // 构建工具定义
    const toolDefinitions = tools.map(tool => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    }));

    try {
      const completion = await zai.chat.completions.create({
        messages: messages.map(m => ({
          role: m.role as 'system' | 'user' | 'assistant',
          content: m.content,
        })),
        tools: toolDefinitions.length > 0 ? toolDefinitions : undefined,
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens,
      });

      const choice = completion.choices[0];
      const content = choice?.message?.content || '';
      
      // 解析工具调用
      let toolCalls: ToolCall[] | undefined;
      if (choice?.message?.tool_calls) {
        toolCalls = choice.message.tool_calls.map((tc: { id: string; function: { name: string; arguments: string } }) => ({
          id: tc.id,
          name: tc.function.name,
          arguments: JSON.parse(tc.function.arguments),
        }));
      }

      return {
        content,
        tokens: completion.usage ? {
          prompt: completion.usage.prompt_tokens,
          completion: completion.usage.completion_tokens,
          total: completion.usage.total_tokens,
        } : undefined,
        toolCalls,
      };
    } catch (error) {
      throw new Error(`LLM调用失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  // ============ 工具执行 ============

  private async executeToolCalls(
    toolCalls: ToolCall[],
    conversation: Conversation,
    onStream?: StreamCallback
  ): Promise<void> {
    this.setStatus('executing');

    for (const toolCall of toolCalls) {
      this.emit('tool:called', toolCall);
      
      const result = await this.tools.execute(toolCall.name, toolCall.arguments);
      
      const toolResult: ToolResult = {
        toolCallId: toolCall.id,
        name: toolCall.name,
        result: result.result,
        success: result.success,
        error: result.error,
      };

      this.emit('tool:completed', toolResult);

      // 添加工具结果消息
      const toolMessage: Message = {
        id: generateId(),
        role: 'tool',
        content: JSON.stringify(result.result),
        timestamp: Date.now(),
        metadata: {
          toolResults: [toolResult],
        },
      };

      conversation.messages.push(toolMessage);
      this.emit('message:created', toolMessage);

      // 流式回调
      if (onStream) {
        onStream({
          type: 'tool_result',
          toolResult,
        });
      }
    }

    // 如果有工具调用，继续对话
    if (toolCalls.length > 0) {
      const context = await this.memory.prepareContext(conversation);
      const response = await this.callLLM(context, onStream);
      
      const assistantMessage: Message = {
        id: generateId(),
        role: 'assistant',
        content: response.content,
        timestamp: Date.now(),
        metadata: {
          model: this.config.model,
          tokens: response.tokens,
          latency: response.latency,
        },
      };

      conversation.messages.push(assistantMessage);
      this.emit('message:created', assistantMessage);
    }
  }

  // ============ 插件管理 ============

  async registerPlugin(plugin: AgentPlugin): Promise<void> {
    this.plugins.set(plugin.id, plugin);
    
    // 注册工具
    for (const tool of plugin.tools) {
      this.tools.register(tool.name, {
        definition: tool,
        execute: plugin.execute,
      });
    }

    // 激活插件
    if (plugin.onActivate) {
      await plugin.onActivate(this);
    }
  }

  async unregisterPlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (plugin) {
      // 移除工具
      for (const tool of plugin.tools) {
        this.tools.unregister(tool.name);
      }

      // 停用插件
      if (plugin.onDeactivate) {
        await plugin.onDeactivate();
      }

      this.plugins.delete(pluginId);
    }
  }

  // ============ 事件系统 ============

  on(event: AgentEventType, handler: AgentEventHandler): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);
  }

  off(event: AgentEventType, handler: AgentEventHandler): void {
    this.eventHandlers.get(event)?.delete(handler);
  }

  private emit(event: AgentEventType, payload: unknown): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      const agentEvent: AgentEvent = {
        type: event,
        payload,
        timestamp: Date.now(),
      };
      handlers.forEach(handler => handler(agentEvent));
    }
  }

  // ============ 中止控制 ============

  abort(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
      this.setStatus('idle');
    }
  }

  // ============ 配置更新 ============

  updateConfig(config: Partial<AgentConfig>): void {
    this.config = { ...this.config, ...config };
    if (config.memory) {
      this.memory.updateConfig(config.memory);
    }
  }

  getConfig(): AgentConfig {
    return { ...this.config };
  }
}

export default AgentCore;
