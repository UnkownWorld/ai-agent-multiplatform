/**
 * Predefined Component Templates
 * 预定义组件模板 - 用户可以基于这些模板快速创建新工具
 */

import { SkillComponent } from './types';

/**
 * 模板分类
 */
export const templateCategories = {
  'API集成': 'api',
  '数据处理': 'data',
  '文本处理': 'text',
  'AI增强': 'ai',
  '自动化': 'automation',
};

/**
 * 预定义模板列表
 */
export const componentTemplates: SkillComponent[] = [
  // ============ API集成模板 ============
  
  /**
   * REST API调用模板
   */
  {
    id: 'template-rest-api',
    name: 'REST API 调用',
    version: '1.0.0',
    description: '调用任意REST API并返回结果',
    tags: ['api', 'http', 'rest'],
    icon: '🌐',
    tool: {
      description: '调用指定的REST API端点',
      parameters: [
        {
          name: 'endpoint',
          type: 'string',
          description: 'API端点URL',
          required: true,
          label: 'API端点',
          placeholder: 'https://api.example.com/data',
        },
        {
          name: 'method',
          type: 'enum',
          description: 'HTTP方法',
          enum: ['GET', 'POST', 'PUT', 'DELETE'],
          default: 'GET',
          label: '请求方法',
        },
        {
          name: 'body',
          type: 'object',
          description: '请求体（JSON格式）',
          label: '请求体',
        },
      ],
      required: ['endpoint'],
    },
    executor: {
      type: 'http',
      http: {
        url: '{{endpoint}}',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: '{{body}}',
      },
      timeout: 30000,
    },
  },

  /**
   * 天气API模板
   */
  {
    id: 'template-weather-api',
    name: '天气查询',
    version: '1.0.0',
    description: '查询指定城市的天气信息',
    tags: ['api', 'weather'],
    icon: '🌤️',
    tool: {
      description: '获取城市的当前天气和预报信息',
      parameters: [
        {
          name: 'city',
          type: 'string',
          description: '城市名称',
          required: true,
          label: '城市',
          placeholder: '北京',
        },
        {
          name: 'days',
          type: 'number',
          description: '预报天数',
          default: 3,
          min: 1,
          max: 7,
          label: '预报天数',
        },
      ],
      required: ['city'],
    },
    executor: {
      type: 'http',
      http: {
        url: 'https://api.openweathermap.org/data/2.5/forecast',
        method: 'GET',
        query: {
          q: '{{city}}',
          cnt: '{{days}}',
          appid: '$OPENWEATHER_API_KEY',
          units: 'metric',
        },
        response: {
          path: 'list',
        },
      },
    },
  },

  // ============ 数据处理模板 ============

  /**
   * JSON处理模板
   */
  {
    id: 'template-json-transform',
    name: 'JSON转换',
    version: '1.0.0',
    description: '转换和处理JSON数据',
    tags: ['data', 'json'],
    icon: '📋',
    tool: {
      description: '对JSON数据进行转换、过滤、映射等操作',
      parameters: [
        {
          name: 'data',
          type: 'object',
          description: '输入的JSON数据',
          required: true,
          label: '输入数据',
        },
        {
          name: 'operation',
          type: 'enum',
          description: '操作类型',
          enum: ['extract', 'filter', 'map', 'reduce', 'merge'],
          default: 'extract',
          label: '操作类型',
        },
        {
          name: 'path',
          type: 'string',
          description: '数据路径（JSONPath）',
          label: '数据路径',
          placeholder: 'data.items[*].name',
        },
      ],
      required: ['data'],
    },
    executor: {
      type: 'script',
      script: {
        language: 'javascript',
        code: `
          const { data, operation, path } = args;
          
          // 简单的路径提取实现
          function extractPath(obj, pathStr) {
            if (!pathStr) return obj;
            const parts = pathStr.split('.');
            let result = obj;
            for (const part of parts) {
              if (result === null || result === undefined) return undefined;
              result = result[part];
            }
            return result;
          }
          
          let result;
          switch (operation) {
            case 'extract':
              result = extractPath(data, path);
              break;
            case 'filter':
              result = Array.isArray(data) ? data.filter(item => item) : data;
              break;
            case 'map':
              result = Array.isArray(data) ? data.map(item => extractPath(item, path)) : data;
              break;
            default:
              result = data;
          }
          
          return { success: true, result };
        `,
      },
    },
  },

  // ============ 文本处理模板 ============

  /**
   * 文本摘要模板
   */
  {
    id: 'template-text-summary',
    name: '文本摘要',
    version: '1.0.0',
    description: '使用AI生成文本摘要',
    tags: ['text', 'ai', 'summary'],
    icon: '📝',
    tool: {
      description: '对长文本进行智能摘要',
      parameters: [
        {
          name: 'text',
          type: 'string',
          description: '需要摘要的文本',
          required: true,
          label: '输入文本',
        },
        {
          name: 'maxLength',
          type: 'number',
          description: '摘要最大长度（字数）',
          default: 200,
          min: 50,
          max: 1000,
          label: '最大长度',
        },
        {
          name: 'style',
          type: 'enum',
          description: '摘要风格',
          enum: ['简洁', '详细', '要点'],
          default: '简洁',
          label: '摘要风格',
        },
      ],
      required: ['text'],
    },
    executor: {
      type: 'llm',
      llm: {
        systemPrompt: '你是一个专业的文本摘要助手。请根据用户要求的风格生成摘要。',
        userPrompt: `请用{{style}}的风格，将以下文本摘要为不超过{{maxLength}}字：

{{text}}

摘要：`,
        temperature: 0.5,
        maxTokens: 500,
      },
    },
  },

  /**
   * 文本翻译模板
   */
  {
    id: 'template-translate',
    name: '文本翻译',
    version: '1.0.0',
    description: '多语言文本翻译',
    tags: ['text', 'ai', 'translate'],
    icon: '🌐',
    tool: {
      description: '将文本翻译为指定语言',
      parameters: [
        {
          name: 'text',
          type: 'string',
          description: '需要翻译的文本',
          required: true,
          label: '输入文本',
        },
        {
          name: 'targetLang',
          type: 'enum',
          description: '目标语言',
          enum: ['英语', '中文', '日语', '韩语', '法语', '德语', '西班牙语'],
          default: '英语',
          label: '目标语言',
        },
        {
          name: 'sourceLang',
          type: 'enum',
          description: '源语言（可选，默认自动检测）',
          enum: ['自动检测', '中文', '英语', '日语', '韩语'],
          default: '自动检测',
          label: '源语言',
        },
      ],
      required: ['text', 'targetLang'],
    },
    executor: {
      type: 'llm',
      llm: {
        systemPrompt: '你是一个专业的翻译助手。请准确翻译用户提供的文本，保持原文的语气和风格。',
        userPrompt: `请将以下文本翻译为{{targetLang}}：
{{#if sourceLang !== '自动检测'}}源语言是{{sourceLang}}。{{/if}}

{{text}}

翻译结果：`,
        temperature: 0.3,
      },
    },
  },

  // ============ AI增强模板 ============

  /**
   * 智能问答模板
   */
  {
    id: 'template-qa',
    name: '智能问答',
    version: '1.0.0',
    description: '基于上下文的智能问答',
    tags: ['ai', 'qa'],
    icon: '🤖',
    tool: {
      description: '根据提供的上下文回答问题',
      parameters: [
        {
          name: 'question',
          type: 'string',
          description: '用户的问题',
          required: true,
          label: '问题',
        },
        {
          name: 'context',
          type: 'string',
          description: '相关上下文信息',
          required: true,
          label: '上下文',
        },
        {
          name: 'detail',
          type: 'enum',
          description: '回答详细程度',
          enum: ['简短', '适中', '详细'],
          default: '适中',
          label: '详细程度',
        },
      ],
      required: ['question', 'context'],
    },
    executor: {
      type: 'llm',
      llm: {
        systemPrompt: '你是一个智能问答助手。请根据提供的上下文准确回答问题。如果上下文中没有相关信息，请诚实说明。',
        userPrompt: `上下文信息：
{{context}}

问题：{{question}}

请用{{detail}}的方式回答：`,
        temperature: 0.3,
      },
    },
  },

  /**
   * 代码解释模板
   */
  {
    id: 'template-code-explain',
    name: '代码解释',
    version: '1.0.0',
    description: '解释代码的功能和逻辑',
    tags: ['ai', 'code'],
    icon: '💻',
    tool: {
      description: '分析并解释代码的功能',
      parameters: [
        {
          name: 'code',
          type: 'string',
          description: '需要解释的代码',
          required: true,
          label: '代码',
        },
        {
          name: 'language',
          type: 'enum',
          description: '编程语言',
          enum: ['JavaScript', 'TypeScript', 'Python', 'Java', 'Go', 'Rust', '自动检测'],
          default: '自动检测',
          label: '编程语言',
        },
        {
          name: 'detail',
          type: 'enum',
          description: '解释详细程度',
          enum: ['简要', '适中', '详细'],
          default: '适中',
          label: '详细程度',
        },
      ],
      required: ['code'],
    },
    executor: {
      type: 'llm',
      llm: {
        systemPrompt: '你是一个代码分析专家。请清晰地解释代码的功能、逻辑和关键点。',
        userPrompt: `请解释以下{{#if language !== '自动检测'}}{{language}}{{/if}}代码：

\`\`\`
{{code}}
\`\`\`

请用{{detail}}的方式解释：`,
        temperature: 0.3,
      },
    },
  },

  // ============ 自动化模板 ============

  /**
   * 工具链模板
   */
  {
    id: 'template-chain',
    name: '搜索并总结',
    version: '1.0.0',
    description: '搜索网络并总结结果',
    tags: ['automation', 'search', 'summary'],
    icon: '🔗',
    tool: {
      description: '搜索互联网获取信息并生成摘要',
      parameters: [
        {
          name: 'query',
          type: 'string',
          description: '搜索关键词',
          required: true,
          label: '搜索关键词',
        },
        {
          name: 'summaryLength',
          type: 'number',
          description: '摘要长度（字数）',
          default: 300,
          label: '摘要长度',
        },
      ],
      required: ['query'],
    },
    executor: {
      type: 'chain',
      chain: {
        steps: [
          {
            name: 'search',
            tool: 'web_search',
            args: {
              query: '{{query}}',
              num: '5',
            },
          },
          {
            name: 'summarize',
            tool: 'text_to_speech', // 这里简化，实际应该用LLM
            args: {
              text: '{{search.results}}',
            },
          },
        ],
      },
    },
  },
];

/**
 * 获取模板列表
 */
export function getTemplates(category?: string): SkillComponent[] {
  if (!category) return componentTemplates;
  
  return componentTemplates.filter(t => 
    t.tags?.includes(category)
  );
}

/**
 * 根据ID获取模板
 */
export function getTemplateById(id: string): SkillComponent | undefined {
  return componentTemplates.find(t => t.id === id);
}

/**
 * 从模板创建组件
 */
export function createFromTemplate(
  templateId: string,
  overrides: Partial<SkillComponent>
): SkillComponent {
  const template = getTemplateById(templateId);
  if (!template) {
    throw new Error(`模板不存在: ${templateId}`);
  }
  
  return {
    ...template,
    ...overrides,
    id: overrides.id || `${template.id}-${Date.now()}`,
  };
}

export default componentTemplates;
