/**
 * Memory Manager
 * 记忆管理器 - 管理对话上下文和历史记忆
 */

import { Message, Conversation, MemoryConfig } from '../core/types';

export class MemoryManager {
  private config: MemoryConfig;
  private summaryCache: Map<string, string> = new Map();

  constructor(config: MemoryConfig) {
    this.config = config;
  }

  /**
   * 准备发送给LLM的上下文
   */
  async prepareContext(conversation: Conversation): Promise<Message[]> {
    if (!this.config.enabled) {
      return conversation.messages;
    }

    // 获取最近的消息
    let messages = this.getRecentMessages(conversation.messages);
    
    // 检查是否需要摘要
    if (this.needsSummary(messages)) {
      messages = await this.createSummary(messages);
    }

    // 确保不超过token限制
    messages = this.truncateMessages(messages);

    return messages;
  }

  /**
   * 获取最近的消息
   */
  private getRecentMessages(messages: Message[]): Message[] {
    if (messages.length <= this.config.maxMessages) {
      return messages;
    }

    // 保留系统消息和最近的N条消息
    const systemMessages = messages.filter(m => m.role === 'system');
    const recentMessages = messages.slice(-this.config.maxMessages);
    
    return [...systemMessages, ...recentMessages];
  }

  /**
   * 检查是否需要创建摘要
   */
  private needsSummary(messages: Message[]): boolean {
    const totalLength = messages.reduce((sum, m) => sum + m.content.length, 0);
    // 估算token数 (约4字符=1token)
    const estimatedTokens = totalLength / 4;
    return estimatedTokens > this.config.summaryThreshold;
  }

  /**
   * 创建对话摘要
   */
  private async createSummary(messages: Message[]): Promise<Message[]> {
    const conversationId = messages[0]?.id || 'default';
    
    // 检查缓存
    if (this.summaryCache.has(conversationId)) {
      const summary = this.summaryCache.get(conversationId)!;
      return [
        {
          id: `summary-${conversationId}`,
          role: 'system',
          content: `之前的对话摘要：\n${summary}`,
          timestamp: Date.now(),
        },
        ...messages.slice(-5), // 保留最近5条消息
      ];
    }

    // 创建摘要
    const summaryContent = await this.generateSummary(messages);
    this.summaryCache.set(conversationId, summaryContent);

    return [
      {
        id: `summary-${conversationId}`,
        role: 'system',
        content: `之前的对话摘要：\n${summaryContent}`,
        timestamp: Date.now(),
      },
      ...messages.slice(-5),
    ];
  }

  /**
   * 生成摘要
   */
  private async generateSummary(messages: Message[]): Promise<string> {
    // 简化实现：提取关键信息
    const userMessages = messages.filter(m => m.role === 'user');
    const assistantMessages = messages.filter(m => m.role === 'assistant');

    const topics = this.extractTopics(userMessages);
    const keyPoints = this.extractKeyPoints(assistantMessages);

    return `讨论主题：${topics.join('、')}\n关键要点：${keyPoints.join('；')}`;
  }

  /**
   * 提取主题
   */
  private extractTopics(messages: Message[]): string[] {
    const topics: Set<string> = new Set();
    const keywords = ['关于', '请问', '如何', '什么是', '为什么', '怎么'];

    messages.forEach(m => {
      const content = m.content.toLowerCase();
      keywords.forEach(kw => {
        if (content.includes(kw)) {
          const idx = content.indexOf(kw);
          const topic = m.content.substring(idx + kw.length, idx + kw.length + 20).trim();
          if (topic) topics.add(topic);
        }
      });
    });

    return Array.from(topics).slice(0, 5);
  }

  /**
   * 提取关键点
   */
  private extractKeyPoints(messages: Message[]): string[] {
    return messages
      .slice(-3)
      .map(m => m.content.substring(0, 100) + (m.content.length > 100 ? '...' : ''));
  }

  /**
   * 截断消息以符合token限制
   */
  private truncateMessages(messages: Message[]): Message[] {
    let totalTokens = 0;
    const result: Message[] = [];

    // 从最新消息开始，向前遍历
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];
      const tokens = this.estimateTokens(message.content);

      if (totalTokens + tokens <= this.config.maxTokens) {
        result.unshift(message);
        totalTokens += tokens;
      } else {
        break;
      }
    }

    // 确保包含系统消息
    const systemMessages = messages.filter(m => m.role === 'system');
    systemMessages.forEach(sm => {
      if (!result.includes(sm)) {
        result.unshift(sm);
      }
    });

    return result;
  }

  /**
   * 估算token数量
   */
  private estimateTokens(text: string): number {
    // 简化估算：中文约2字符/token，英文约4字符/token
    const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
    const otherChars = text.length - chineseChars;
    return Math.ceil(chineseChars / 2 + otherChars / 4);
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<MemoryConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 清除摘要缓存
   */
  clearCache(): void {
    this.summaryCache.clear();
  }

  /**
   * 获取配置
   */
  getConfig(): MemoryConfig {
    return { ...this.config };
  }
}

export default MemoryManager;
