/**
 * Agent Chat Interface - Updated with Complete Capabilities
 * Agent聊天界面组件 - 包含完整能力展示
 */

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useAgent, useMessages, useStreamingMessage } from '@/agent/hooks';
import { Message } from '@/agent/core/types';
import { agentCapabilities } from '@/agent';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  Send, 
  Plus, 
  Trash2, 
  Loader2, 
  Bot, 
  User, 
  Settings,
  Menu,
  X,
  Sparkles,
  ChevronDown
} from 'lucide-react';

// 消息气泡组件
function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';
  
  if (isSystem) {
    return (
      <div className="flex justify-center my-4">
        <div className="bg-muted/50 px-4 py-2 rounded-lg text-sm text-muted-foreground max-w-md text-center">
          {message.content}
        </div>
      </div>
    );
  }
  
  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'} mb-4`}>
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarFallback className={isUser ? 'bg-primary text-primary-foreground' : 'bg-secondary'}>
          {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
        </AvatarFallback>
      </Avatar>
      <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-[80%]`}>
        <div
          className={`rounded-2xl px-4 py-2 ${
            isUser
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary text-secondary-foreground'
          }`}
        >
          <div className="whitespace-pre-wrap break-words text-sm">
            {message.content}
          </div>
        </div>
        <span className="text-xs text-muted-foreground mt-1 px-2">
          {new Date(message.timestamp).toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
        {message.metadata?.toolCalls && message.metadata.toolCalls.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {message.metadata.toolCalls.map((tc, i) => (
              <Badge key={i} variant="outline" className="text-xs">
                {tc.name}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// 能力展示组件
function CapabilitiesPanel({ onClose }: { onClose: () => void }) {
  return (
    <div className="p-4 border-b bg-muted/30">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">我的能力</h3>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Object.entries(agentCapabilities).map(([name, cap]) => (
          <div
            key={name}
            className="p-3 rounded-lg bg-background border hover:border-primary/50 transition-colors cursor-pointer"
          >
            <div className="text-2xl mb-1">{cap.icon}</div>
            <div className="font-medium text-sm">{name}</div>
            <div className="text-xs text-muted-foreground mt-1">{cap.description}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 侧边栏会话列表
function ConversationList({
  conversations,
  currentId,
  onSelect,
  onCreate,
  onDelete,
}: {
  conversations: { id: string; title: string; updatedAt: number }[];
  currentId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <Button onClick={onCreate} className="w-full" variant="outline">
          <Plus className="h-4 w-4 mr-2" />
          新对话
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {conversations.map((conv) => (
            <div
              key={conv.id}
              className={`group flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                conv.id === currentId
                  ? 'bg-primary/10 text-primary'
                  : 'hover:bg-muted'
              }`}
              onClick={() => onSelect(conv.id)}
            >
              <div className="flex-1 truncate text-sm">{conv.title}</div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(conv.id);
                }}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

// 主聊天组件
export function AgentChat() {
  const [input, setInput] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showCapabilities, setShowCapabilities] = useState(true);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const {
    agent,
    state,
    isLoading,
    error,
    sendMessage,
    createConversation,
    loadConversation,
    deleteConversation,
    abort,
  } = useAgent();
  
  const { messages, messagesEndRef } = useMessages(agent);
  const { streamingContent, isStreaming, handleStream } = useStreamingMessage();

  // 自动滚动
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent, messagesEndRef]);

  // 发送消息
  const handleSend = async () => {
    if (!input.trim() || state.status === 'thinking') return;
    
    const messageContent = input.trim();
    setInput('');
    setShowCapabilities(false);
    
    await sendMessage(messageContent);
  };

  // 键盘事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // 创建新会话
  const handleNewConversation = async () => {
    await createConversation();
    setShowCapabilities(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-muted-foreground">正在初始化...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      {/* 侧边栏 */}
      <div
        className={`${
          sidebarOpen ? 'w-64' : 'w-0'
        } transition-all duration-300 border-r bg-muted/30 shrink-0 overflow-hidden`}
      >
        <ConversationList
          conversations={state.conversations.map((c) => ({
            id: c.id,
            title: c.title,
            updatedAt: c.updatedAt,
          }))}
          currentId={state.currentConversation?.id || null}
          onSelect={(id) => loadConversation(id)}
          onCreate={handleNewConversation}
          onDelete={(id) => deleteConversation(id)}
        />
      </div>

      {/* 主内容区 */}
      <div className="flex-1 flex flex-col">
        {/* 头部 */}
        <header className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <h1 className="text-lg font-semibold">
              {state.currentConversation?.title || 'AI Agent'}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {state.status === 'thinking' && (
              <Badge variant="secondary">
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                思考中
              </Badge>
            )}
            {state.status === 'executing' && (
              <Badge variant="secondary">
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                执行工具
              </Badge>
            )}
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setShowCapabilities(!showCapabilities)}
            >
              <Sparkles className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon">
              <Settings className="h-5 w-5" />
            </Button>
          </div>
        </header>

        {/* 能力展示面板 */}
        {showCapabilities && messages.length === 0 && (
          <CapabilitiesPanel onClose={() => setShowCapabilities(false)} />
        )}

        {/* 消息区域 */}
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          <div className="max-w-3xl mx-auto">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-20">
                <Bot className="h-16 w-16 text-muted-foreground mb-4" />
                <h2 className="text-xl font-semibold mb-2">欢迎使用 AI Agent</h2>
                <p className="text-muted-foreground text-center max-w-md mb-4">
                  我是一个全能智能助手，具备信息检索、内容生成、语音处理、视觉理解、文档处理等全方位能力。
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  <Badge variant="outline">🔍 网络搜索</Badge>
                  <Badge variant="outline">🎨 图像生成</Badge>
                  <Badge variant="outline">📄 文档处理</Badge>
                  <Badge variant="outline">📊 数据分析</Badge>
                </div>
              </div>
            ) : (
              <>
                {messages.map((msg) => (
                  <MessageBubble key={msg.id} message={msg} />
                ))}
                {isStreaming && streamingContent && (
                  <MessageBubble
                    message={{
                      id: 'streaming',
                      role: 'assistant',
                      content: streamingContent,
                      timestamp: Date.now(),
                    }}
                  />
                )}
              </>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* 错误提示 */}
        {error && (
          <div className="px-4 py-2 bg-destructive/10 text-destructive text-sm text-center">
            {error}
          </div>
        )}

        {/* 输入区域 */}
        <div className="p-4 border-t">
          <div className="max-w-3xl mx-auto">
            <div className="flex gap-2">
              <Textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="输入消息... 我可以帮你搜索信息、生成图像、处理文档等"
                className="min-h-[44px] max-h-32 resize-none"
                rows={1}
                disabled={state.status === 'thinking'}
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || state.status === 'thinking'}
                className="shrink-0"
              >
                {state.status === 'thinking' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
              <span>按 Enter 发送，Shift+Enter 换行</span>
              {state.status === 'thinking' && (
                <Button variant="ghost" size="sm" onClick={abort}>
                  停止生成
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AgentChat;
