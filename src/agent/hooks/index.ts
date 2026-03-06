/**
 * Agent React Hooks
 * Agent的React Hook封装
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  AgentCore,
  AgentConfig,
  AgentState,
  Conversation,
  Message,
  StreamCallback,
  createPlatformAdapter,
  defaultAgentConfig,
} from '../index';

/**
 * useAgent - 主Agent Hook
 */
export function useAgent(config?: Partial<AgentConfig>) {
  const [agent, setAgent] = useState<AgentCore | null>(null);
  const [state, setState] = useState<AgentState>({
    status: 'idle',
    currentConversation: null,
    conversations: [],
    providers: [],
    activeProvider: '',
    activeModel: '',
    error: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 初始化Agent
  useEffect(() => {
    async function initAgent() {
      try {
        setIsLoading(true);
        const platform = await createPlatformAdapter();
        const agentConfig: AgentConfig = {
          ...defaultAgentConfig,
          ...config,
        };
        const agentInstance = new AgentCore(agentConfig, platform);
        
        // 加载历史会话
        await agentInstance.loadAllConversations();
        
        // 订阅状态变化
        agentInstance.on('status:changed', () => {
          setState(agentInstance.getState());
        });
        
        agentInstance.on('message:created', () => {
          setState(agentInstance.getState());
        });
        
        agentInstance.on('conversation:created', () => {
          setState(agentInstance.getState());
        });
        
        agentInstance.on('conversation:updated', () => {
          setState(agentInstance.getState());
        });
        
        agentInstance.on('error', (event) => {
          setError((event.payload as { error: string }).error);
        });
        
        setAgent(agentInstance);
        setState(agentInstance.getState());
      } catch (err) {
        setError(err instanceof Error ? err.message : '初始化失败');
      } finally {
        setIsLoading(false);
      }
    }
    
    initAgent();
  }, []);

  // 发送消息
  const sendMessage = useCallback(async (
    content: string,
    onStream?: StreamCallback
  ): Promise<Message | null> => {
    if (!agent) return null;
    
    try {
      setError(null);
      const message = await agent.sendMessage(content, onStream);
      setState(agent.getState());
      return message;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '发送失败';
      setError(errorMsg);
      return null;
    }
  }, [agent]);

  // 创建新会话
  const createConversation = useCallback(async (title?: string): Promise<Conversation | null> => {
    if (!agent) return null;
    
    try {
      const conversation = await agent.createConversation(title);
      setState(agent.getState());
      return conversation;
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建会话失败');
      return null;
    }
  }, [agent]);

  // 加载会话
  const loadConversation = useCallback(async (id: string): Promise<Conversation | null> => {
    if (!agent) return null;
    
    const conversation = await agent.loadConversation(id);
    setState(agent.getState());
    return conversation;
  }, [agent]);

  // 删除会话
  const deleteConversation = useCallback(async (id: string): Promise<void> => {
    if (!agent) return;
    
    await agent.deleteConversation(id);
    setState(agent.getState());
  }, [agent]);

  // 中止当前操作
  const abort = useCallback(() => {
    agent?.abort();
    setState(agent?.getState() || state);
  }, [agent]);

  // 更新配置
  const updateConfig = useCallback((newConfig: Partial<AgentConfig>) => {
    agent?.updateConfig(newConfig);
  }, [agent]);

  return {
    agent,
    state,
    isLoading,
    error,
    sendMessage,
    createConversation,
    loadConversation,
    deleteConversation,
    abort,
    updateConfig,
  };
}

/**
 * useConversation - 会话管理Hook
 */
export function useConversation(agent: AgentCore | null, conversationId?: string) {
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    if (!agent) return;

    const updateConversation = () => {
      const state = agent.getState();
      if (conversationId) {
        const conv = state.conversations.find(c => c.id === conversationId);
        if (conv) {
          setConversation(conv);
          setMessages(conv.messages);
        }
      } else {
        setConversation(state.currentConversation);
        setMessages(state.currentConversation?.messages || []);
      }
    };

    updateConversation();

    agent.on('message:created', updateConversation);
    agent.on('conversation:updated', updateConversation);

    return () => {
      agent.off('message:created', updateConversation);
      agent.off('conversation:updated', updateConversation);
    };
  }, [agent, conversationId]);

  return { conversation, messages };
}

/**
 * useMessages - 消息列表Hook
 */
export function useMessages(agent: AgentCore | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!agent) return;

    const updateMessages = () => {
      const state = agent.getState();
      setMessages(state.currentConversation?.messages || []);
    };

    updateMessages();
    agent.on('message:created', updateMessages);

    return () => {
      agent.off('message:created', updateMessages);
    };
  }, [agent]);

  // 自动滚动到底部
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  return { messages, messagesEndRef, scrollToBottom };
}

/**
 * useStreamingMessage - 流式消息Hook
 */
export function useStreamingMessage() {
  const [streamingContent, setStreamingContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);

  const startStreaming = useCallback(() => {
    setStreamingContent('');
    setIsStreaming(true);
  }, []);

  const appendContent = useCallback((content: string) => {
    setStreamingContent(prev => prev + content);
  }, []);

  const stopStreaming = useCallback(() => {
    setIsStreaming(false);
  }, []);

  const handleStream: StreamCallback = useCallback((chunk) => {
    if (chunk.type === 'content' && chunk.content) {
      appendContent(chunk.content);
    } else if (chunk.type === 'done' || chunk.type === 'error') {
      stopStreaming();
    }
  }, [appendContent, stopStreaming]);

  return {
    streamingContent,
    isStreaming,
    startStreaming,
    appendContent,
    stopStreaming,
    handleStream,
  };
}

/**
 * useLocalStorage - 本地存储Hook
 */
export function useAgentStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') return initialValue;
    
    try {
      const item = window.localStorage.getItem(`agent_${key}`);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(`agent_${key}`, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  }, [key, storedValue]);

  return [storedValue, setValue] as const;
}

export default useAgent;
