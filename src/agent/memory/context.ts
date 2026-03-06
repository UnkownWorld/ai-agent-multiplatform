/**
 * Enhanced Context Manager
 * 增强的上下文管理器 - 智能压缩、摘要、滑动窗口
 */

import { Message, Conversation } from '../core/types';

// ============ 类型定义 ============

export interface ContextConfig {
  maxTokens: number;
  keepRecent: number;
  summaryThreshold: number;
  enableSummary: boolean;
  enableCompression: boolean;
}

export interface ContextStats {
  totalMessages: number;
  totalTokens: number;
  compressedTokens: number;
  summaryCount: number;
}

// ============ Token估算器 ============

/**
 * Token估算器 - 估算文本的token数量
 */
export class TokenEstimator {
  // 平均每个token约4个字符（英文）或1.5个字符（中文）
  private static readonly CHARS_PER_TOKEN_EN = 4;
  private static readonly CHARS_PER_TOKEN_ZH = 1.5;

  /**
   * 估算文本的token数量
   */
  static estimate(text: string): number {
    if (!text) return 0;

    // 分离中文和非中文字符
    const chineseChars = text.match(/[\u4e00-\u9fa5]/g) || [];
    const nonChineseText = text.replace(/[\u4e00-\u9fa5]/g, '');
    
    const chineseTokens = Math.ceil(chineseChars.length / this.CHARS_PER_TOKEN_ZH);
    const nonChineseTokens = Math.ceil(nonChineseText.length / this.CHARS_PER_TOKEN_EN);
    
    return chineseTokens + nonChineseTokens;
  }

  /**
   * 估算消息的token数量
   */
  static estimateMessage(message: Message): number {
    const roleTokens = 4; // role标记约4个token
    const contentTokens = this.estimate(message.content);
    return roleTokens + contentTokens;
  }

  /**
   * 估算消息列表的token数量
   */
  static estimateMessages(messages: Message[]): number {
    return messages.reduce((sum, msg) => sum + this.estimateMessage(msg), 0);
  }
}

// ============ 摘要生成器 ============

/**
 * 摘要生成器 - 为早期消息生成摘要
 */
export class SummaryGenerator {
  /**
   * 生成消息摘要
   */
  static async generateSummary(messages: Message[]): Promise<string> {
    if (messages.length === 0) return '';

    // 提取关键信息
    const userMessages = messages.filter(m => m.role === 'user');
    const assistantMessages = messages.filter(m => m.role === 'assistant');

    const topics = this.extractTopics(userMessages);
    const keyPoints = this.extractKeyPoints(assistantMessages);

    // 构建摘要
    const summary = [
      `对话共${messages.length}条消息`,
      topics.length > 0 ? `讨论主题：${topics.join('、')}` : '',
      keyPoints.length > 0 ? `关键内容：${keyPoints.join('；')}` : '',
    ].filter(Boolean).join('。');

    return summary;
  }

  private static extractTopics(messages: Message[]): string[] {
    const topics: string[] = [];
    const keywords = new Set<string>();

    for (const msg of messages) {
      // 简单的关键词提取
      const words = msg.content.split(/[\s,，。！？!?.]+/);
      for (const word of words) {
        if (word.length >= 2 && word.length <= 10) {
          keywords.add(word);
        }
      }
    }

    // 取前5个关键词作为主题
    return Array.from(keywords).slice(0, 5);
  }

  private static extractKeyPoints(messages: Message[]): string[] {
    const points: string[] = [];

    for (const msg of messages.slice(0, 5)) {
      // 取每条消息的前100字符
      const point = msg.content.slice(0, 100);
      if (point.trim()) {
        points.push(point + (msg.content.length > 100 ? '...' : ''));
      }
    }

    return points;
  }
}

// ============ 上下文管理器 ============

/**
 * 增强的上下文管理器
 */
export class EnhancedContextManager {
  private config: ContextConfig;
  private stats: ContextStats = {
    totalMessages: 0,
    totalTokens: 0,
    compressedTokens: 0,
    summaryCount: 0,
  };

  constructor(config: Partial<ContextConfig> = {}) {
    this.config = {
      maxTokens: 8000,
      keepRecent: 10,
      summaryThreshold: 6000,
      enableSummary: true,
      enableCompression: true,
      ...config,
    };
  }

  /**
   * 准备上下文
   */
  async prepareContext(conversation: Conversation): Promise<Message[]> {
    const messages = conversation.messages;
    this.stats.totalMessages = messages.length;
    this.stats.totalTokens = TokenEstimator.estimateMessages(messages);

    // 如果token数量在限制内，直接返回
    if (this.stats.totalTokens <= this.config.maxTokens) {
      return messages;
    }

    // 需要压缩
    let context = [...messages];

    // 策略1: 滑动窗口 - 保留最近的消息
    if (context.length > this.config.keepRecent) {
      context = this.applySlidingWindow(context);
    }

    // 策略2: 摘要压缩 - 对早期消息生成摘要
    if (this.config.enableSummary && TokenEstimator.estimateMessages(context) > this.config.summaryThreshold) {
      context = await this.applySummary(context);
    }

    // 策略3: 内容压缩 - 压缩长消息
    if (this.config.enableCompression && TokenEstimator.estimateMessages(context) > this.config.maxTokens) {
      context = this.applyCompression(context);
    }

    this.stats.compressedTokens = TokenEstimator.estimateMessages(context);
    return context;
  }

  /**
   * 应用滑动窗口
   */
  private applySlidingWindow(messages: Message[]): Message[] {
    // 保留系统消息和最近的消息
    const systemMessages = messages.filter(m => m.role === 'system');
    const recentMessages = messages.slice(-this.config.keepRecent);

    return [...systemMessages, ...recentMessages];
  }

  /**
   * 应用摘要压缩
   */
  private async applySummary(messages: Message[]): Promise<Message[]> {
    const systemMessages = messages.filter(m => m.role === 'system');
    const recentMessages = messages.slice(-this.config.keepRecent);
    const earlyMessages = messages.slice(systemMessages.length, -this.config.keepRecent);

    if (earlyMessages.length === 0) {
      return messages;
    }

    // 生成摘要
    const summary = await SummaryGenerator.generateSummary(earlyMessages);
    this.stats.summaryCount++;

    // 创建摘要消息
    const summaryMessage: Message = {
      id: 'summary',
      role: 'system',
      content: `【历史对话摘要】${summary}`,
      timestamp: Date.now(),
    };

    return [...systemMessages, summaryMessage, ...recentMessages];
  }

  /**
   * 应用内容压缩
   */
  private applyCompression(messages: Message[]): Message[] {
    return messages.map(msg => {
      const tokens = TokenEstimator.estimate(msg.content);
      
      // 如果消息过长，进行压缩
      if (tokens > 500) {
        return {
          ...msg,
          content: this.compressContent(msg.content),
        };
      }
      
      return msg;
    });
  }

  /**
   * 压缩内容
   */
  private compressContent(content: string): string {
    // 移除多余的空白
    let compressed = content.replace(/\s+/g, ' ').trim();
    
    // 如果仍然过长，截断
    const maxChars = 2000; // 约500 tokens
    if (compressed.length > maxChars) {
      compressed = compressed.slice(0, maxChars) + '...[内容已压缩]';
    }
    
    return compressed;
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<ContextConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 获取统计信息
   */
  getStats(): ContextStats {
    return { ...this.stats };
  }

  /**
   * 重置统计
   */
  resetStats(): void {
    this.stats = {
      totalMessages: 0,
      totalTokens: 0,
      compressedTokens: 0,
      summaryCount: 0,
    };
  }
}

// ============ 消息优先级管理 ============

/**
 * 消息优先级
 */
export enum MessagePriority {
  LOW = 0,
  NORMAL = 1,
  HIGH = 2,
  CRITICAL = 3,
}

/**
 * 优先级上下文管理器
 */
export class PriorityContextManager extends EnhancedContextManager {
  /**
   * 计算消息优先级
   */
  private calculatePriority(message: Message): MessagePriority {
    const content = message.content.toLowerCase();

    // 关键词检测
    const criticalKeywords = ['错误', 'error', '失败', 'fail', '重要', 'important'];
    const highKeywords = ['问题', 'question', '帮助', 'help', '请'];

    for (const keyword of criticalKeywords) {
      if (content.includes(keyword)) return MessagePriority.CRITICAL;
    }

    for (const keyword of highKeywords) {
      if (content.includes(keyword)) return MessagePriority.HIGH;
    }

    // 根据消息长度
    if (content.length > 500) return MessagePriority.HIGH;
    if (content.length < 50) return MessagePriority.LOW;

    return MessagePriority.NORMAL;
  }

  /**
   * 按优先级过滤消息
   */
  filterByPriority(messages: Message[], minPriority: MessagePriority): Message[] {
    return messages.filter(msg => this.calculatePriority(msg) >= minPriority);
  }
}

export default {
  TokenEstimator,
  SummaryGenerator,
  EnhancedContextManager,
  PriorityContextManager,
  MessagePriority,
};
