/**
 * Complete Agent Tools Definition
 * 完整的Agent工具定义 - 移植自AI助手的所有能力
 */

import { ToolDefinition } from '../core/types';

// ============ 信息检索类工具 ============

/**
 * 网络搜索工具
 */
export const webSearchTool: ToolDefinition = {
  name: 'web_search',
  description: '在互联网上搜索实时信息，获取最新的新闻、数据、教程等内容。支持设置搜索结果数量和时间过滤。',
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: '搜索关键词，建议使用具体、明确的搜索词',
      },
      num: {
        type: 'number',
        description: '返回结果数量，默认10条，最多20条',
        default: 10,
      },
      recency_days: {
        type: 'number',
        description: '只返回最近N天内的结果，可选参数',
      },
    },
  },
  required: ['query'],
};

/**
 * 网页阅读工具
 */
export const webReaderTool: ToolDefinition = {
  name: 'web_reader',
  description: '读取并提取网页内容，获取文章正文、标题、发布时间等信息。适用于阅读新闻、博客、文档等网页内容。',
  parameters: {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: '要读取的网页URL地址',
      },
    },
  },
  required: ['url'],
};

// ============ 内容生成类工具 ============

/**
 * 图像生成工具
 */
export const imageGenerationTool: ToolDefinition = {
  name: 'image_generation',
  description: '使用AI生成图像，支持多种风格和尺寸。可以根据文字描述创建插图、艺术作品、设计图等。',
  parameters: {
    type: 'object',
    properties: {
      prompt: {
        type: 'string',
        description: '图像描述，详细描述想要生成的图像内容、风格、氛围等',
      },
      style: {
        type: 'string',
        description: '图像风格',
        enum: ['realistic', 'artistic', 'anime', '3d', 'sketch', 'watercolor'],
        default: 'realistic',
      },
      size: {
        type: 'string',
        description: '图像尺寸',
        enum: ['256x256', '512x512', '1024x1024', '1024x1792', '1792x1024'],
        default: '1024x1024',
      },
      count: {
        type: 'number',
        description: '生成图像数量，默认1张',
        default: 1,
      },
    },
  },
  required: ['prompt'],
};

/**
 * 视频生成工具
 */
export const videoGenerationTool: ToolDefinition = {
  name: 'video_generation',
  description: '使用AI生成短视频，可以根据文字描述创建动画、特效视频等。',
  parameters: {
    type: 'object',
    properties: {
      prompt: {
        type: 'string',
        description: '视频内容描述',
      },
      duration: {
        type: 'number',
        description: '视频时长（秒），默认5秒',
        default: 5,
      },
      resolution: {
        type: 'string',
        description: '视频分辨率',
        enum: ['480p', '720p', '1080p'],
        default: '720p',
      },
    },
  },
  required: ['prompt'],
};

/**
 * 播客生成工具
 */
export const podcastGenerationTool: ToolDefinition = {
  name: 'podcast_generation',
  description: '根据文本内容生成播客音频，支持多种语音风格和语速。',
  parameters: {
    type: 'object',
    properties: {
      content: {
        type: 'string',
        description: '要转换为播客的文本内容',
      },
      voice_style: {
        type: 'string',
        description: '语音风格',
        enum: ['professional', 'casual', 'energetic', 'calm'],
        default: 'professional',
      },
      language: {
        type: 'string',
        description: '语言',
        enum: ['zh-CN', 'en-US', 'ja-JP', 'ko-KR'],
        default: 'zh-CN',
      },
    },
  },
  required: ['content'],
};

// ============ 语音处理类工具 ============

/**
 * 语音识别工具 (ASR)
 */
export const asrTool: ToolDefinition = {
  name: 'speech_recognition',
  description: '将语音转换为文字，支持多种语言和音频格式。适用于转录录音、会议记录等场景。',
  parameters: {
    type: 'object',
    properties: {
      audio_url: {
        type: 'string',
        description: '音频文件URL或本地路径',
      },
      language: {
        type: 'string',
        description: '音频语言',
        enum: ['zh-CN', 'en-US', 'ja-JP', 'ko-KR', 'auto'],
        default: 'auto',
      },
      format: {
        type: 'string',
        description: '输出格式',
        enum: ['text', 'json', 'srt'],
        default: 'text',
      },
    },
  },
  required: ['audio_url'],
};

/**
 * 语音合成工具 (TTS)
 */
export const ttsTool: ToolDefinition = {
  name: 'text_to_speech',
  description: '将文字转换为语音，支持多种语言、音色和语速。适用于有声读物、语音通知等场景。',
  parameters: {
    type: 'object',
    properties: {
      text: {
        type: 'string',
        description: '要转换为语音的文字内容',
      },
      voice: {
        type: 'string',
        description: '音色选择',
        enum: ['male-1', 'male-2', 'female-1', 'female-2', 'child'],
        default: 'female-1',
      },
      speed: {
        type: 'number',
        description: '语速，0.5-2.0，默认1.0',
        default: 1.0,
      },
      language: {
        type: 'string',
        description: '语言',
        enum: ['zh-CN', 'en-US', 'ja-JP', 'ko-KR'],
        default: 'zh-CN',
      },
    },
  },
  required: ['text'],
};

// ============ 视觉理解类工具 ============

/**
 * 视觉语言模型工具 (VLM)
 */
export const vlmTool: ToolDefinition = {
  name: 'image_understanding',
  description: '分析图像内容，支持图像描述、物体识别、文字提取、图表分析等功能。',
  parameters: {
    type: 'object',
    properties: {
      image_url: {
        type: 'string',
        description: '图像URL或Base64编码',
      },
      task: {
        type: 'string',
        description: '分析任务类型',
        enum: ['describe', 'ocr', 'detect', 'analyze_chart', 'compare'],
        default: 'describe',
      },
      prompt: {
        type: 'string',
        description: '具体的分析要求或问题',
      },
    },
  },
  required: ['image_url'],
};

/**
 * 视频理解工具
 */
export const videoUnderstandingTool: ToolDefinition = {
  name: 'video_understanding',
  description: '分析视频内容，支持视频摘要、关键帧提取、动作识别等功能。',
  parameters: {
    type: 'object',
    properties: {
      video_url: {
        type: 'string',
        description: '视频URL或本地路径',
      },
      task: {
        type: 'string',
        description: '分析任务类型',
        enum: ['summarize', 'extract_frames', 'detect_actions', 'transcribe'],
        default: 'summarize',
      },
      time_range: {
        type: 'string',
        description: '分析的时间范围，如 "0:00-1:30"',
      },
    },
  },
  required: ['video_url'],
};

// ============ 文档处理类工具 ============

/**
 * Word文档工具
 */
export const docxTool: ToolDefinition = {
  name: 'docx_processor',
  description: '处理Word文档，支持创建、读取、编辑、转换等操作。',
  parameters: {
    type: 'object',
    properties: {
      operation: {
        type: 'string',
        description: '操作类型',
        enum: ['create', 'read', 'edit', 'convert', 'merge'],
      },
      file_path: {
        type: 'string',
        description: '文件路径',
      },
      content: {
        type: 'string',
        description: '文档内容（创建/编辑时使用）',
      },
      output_format: {
        type: 'string',
        description: '输出格式（转换时使用）',
        enum: ['pdf', 'html', 'txt', 'md'],
      },
    },
  },
  required: ['operation'],
};

/**
 * PDF处理工具
 */
export const pdfTool: ToolDefinition = {
  name: 'pdf_processor',
  description: '处理PDF文档，支持读取、提取文本、填写表单、转换等操作。',
  parameters: {
    type: 'object',
    properties: {
      operation: {
        type: 'string',
        description: '操作类型',
        enum: ['read', 'extract_text', 'extract_images', 'fill_form', 'merge', 'split', 'convert'],
      },
      file_path: {
        type: 'string',
        description: 'PDF文件路径',
      },
      pages: {
        type: 'string',
        description: '页码范围，如 "1-5" 或 "1,3,5"',
      },
      form_data: {
        type: 'object',
        description: '表单数据（填写表单时使用）',
        properties: {},
      },
    },
  },
  required: ['operation', 'file_path'],
};

/**
 * Excel处理工具
 */
export const xlsxTool: ToolDefinition = {
  name: 'xlsx_processor',
  description: '处理Excel电子表格，支持读取、写入、数据分析、图表生成等操作。',
  parameters: {
    type: 'object',
    properties: {
      operation: {
        type: 'string',
        description: '操作类型',
        enum: ['read', 'write', 'analyze', 'chart', 'formula'],
      },
      file_path: {
        type: 'string',
        description: 'Excel文件路径',
      },
      sheet_name: {
        type: 'string',
        description: '工作表名称',
      },
      range: {
        type: 'string',
        description: '单元格范围，如 "A1:D10"',
      },
      data: {
        type: 'object',
        description: '数据内容（写入时使用）',
        properties: {},
      },
    },
  },
  required: ['operation', 'file_path'],
};

/**
 * PPT处理工具
 */
export const pptxTool: ToolDefinition = {
  name: 'pptx_processor',
  description: '处理PowerPoint演示文稿，支持创建、编辑、转换等操作。',
  parameters: {
    type: 'object',
    properties: {
      operation: {
        type: 'string',
        description: '操作类型',
        enum: ['create', 'read', 'edit', 'convert', 'extract_images'],
      },
      file_path: {
        type: 'string',
        description: 'PPT文件路径',
      },
      content: {
        type: 'string',
        description: '演示文稿内容描述（创建时使用）',
      },
      output_format: {
        type: 'string',
        description: '输出格式（转换时使用）',
        enum: ['pdf', 'images', 'html'],
      },
    },
  },
  required: ['operation'],
};

// ============ 数据分析类工具 ============

/**
 * 金融数据工具
 */
export const financeTool: ToolDefinition = {
  name: 'finance_data',
  description: '获取金融数据，包括股票行情、基金信息、汇率、财经新闻等。',
  parameters: {
    type: 'object',
    properties: {
      type: {
        type: 'string',
        description: '数据类型',
        enum: ['stock', 'fund', 'forex', 'crypto', 'news', 'economic'],
      },
      symbol: {
        type: 'string',
        description: '股票代码或交易对，如 "AAPL"、"BTC/USD"',
      },
      market: {
        type: 'string',
        description: '市场',
        enum: ['us', 'cn', 'hk', 'global'],
        default: 'us',
      },
      period: {
        type: 'string',
        description: '时间周期',
        enum: ['1d', '1w', '1m', '3m', '1y', '5y'],
        default: '1m',
      },
    },
  },
  required: ['type'],
};

/**
 * 代码执行工具
 */
export const codeExecutionTool: ToolDefinition = {
  name: 'code_execution',
  description: '执行代码并返回结果，支持Python、JavaScript等多种语言。适用于数据分析、计算、原型验证等场景。',
  parameters: {
    type: 'object',
    properties: {
      code: {
        type: 'string',
        description: '要执行的代码',
      },
      language: {
        type: 'string',
        description: '编程语言',
        enum: ['python', 'javascript', 'typescript', 'r', 'sql'],
        default: 'python',
      },
      timeout: {
        type: 'number',
        description: '执行超时时间（秒），默认30秒',
        default: 30,
      },
    },
  },
  required: ['code'],
};

// ============ 实用工具类 ============

/**
 * 计算器工具
 */
export const calculatorTool: ToolDefinition = {
  name: 'calculator',
  description: '执行数学计算，支持基本运算、科学计算、单位换算等。',
  parameters: {
    type: 'object',
    properties: {
      expression: {
        type: 'string',
        description: '数学表达式，如 "2 + 3 * 4"、"sin(30)"、"100km to miles"',
      },
    },
  },
  required: ['expression'],
};

/**
 * 时间工具
 */
export const timeTool: ToolDefinition = {
  name: 'get_time',
  description: '获取当前时间、时区转换、时间计算等功能。',
  parameters: {
    type: 'object',
    properties: {
      timezone: {
        type: 'string',
        description: '时区，如 "Asia/Shanghai"、"America/New_York"',
      },
      format: {
        type: 'string',
        description: '时间格式',
        enum: ['iso', 'locale', 'unix', 'custom'],
        default: 'locale',
      },
      custom_format: {
        type: 'string',
        description: '自定义格式，如 "YYYY-MM-DD HH:mm:ss"',
      },
    },
  },
};

/**
 * JSON处理工具
 */
export const jsonTool: ToolDefinition = {
  name: 'json_processor',
  description: '处理JSON数据，支持解析、格式化、提取、验证等操作。',
  parameters: {
    type: 'object',
    properties: {
      operation: {
        type: 'string',
        description: '操作类型',
        enum: ['parse', 'stringify', 'extract', 'validate', 'transform'],
      },
      data: {
        type: 'string',
        description: 'JSON字符串或对象路径',
      },
      path: {
        type: 'string',
        description: '提取路径，如 "data.items[0].name"',
      },
      indent: {
        type: 'number',
        description: '缩进空格数（格式化时使用）',
        default: 2,
      },
    },
  },
  required: ['operation', 'data'],
};

/**
 * 天气查询工具
 */
export const weatherTool: ToolDefinition = {
  name: 'get_weather',
  description: '获取指定城市的天气信息，包括当前天气、预报、空气质量等。',
  parameters: {
    type: 'object',
    properties: {
      city: {
        type: 'string',
        description: '城市名称，如 "北京"、"Shanghai"',
      },
      type: {
        type: 'string',
        description: '天气类型',
        enum: ['current', 'forecast', 'air_quality', 'all'],
        default: 'current',
      },
      days: {
        type: 'number',
        description: '预报天数（forecast类型时使用）',
        default: 3,
      },
    },
  },
  required: ['city'],
};

/**
 * 翻译工具
 */
export const translationTool: ToolDefinition = {
  name: 'translate',
  description: '翻译文本，支持多种语言之间的互译。',
  parameters: {
    type: 'object',
    properties: {
      text: {
        type: 'string',
        description: '要翻译的文本',
      },
      source_lang: {
        type: 'string',
        description: '源语言',
        enum: ['auto', 'zh', 'en', 'ja', 'ko', 'fr', 'de', 'es', 'ru'],
        default: 'auto',
      },
      target_lang: {
        type: 'string',
        description: '目标语言',
        enum: ['zh', 'en', 'ja', 'ko', 'fr', 'de', 'es', 'ru'],
        default: 'en',
      },
    },
  },
  required: ['text', 'target_lang'],
};

// ============ 工具集合导出 ============

export const allTools: ToolDefinition[] = [
  // 信息检索
  webSearchTool,
  webReaderTool,
  
  // 内容生成
  imageGenerationTool,
  videoGenerationTool,
  podcastGenerationTool,
  
  // 语音处理
  asrTool,
  ttsTool,
  
  // 视觉理解
  vlmTool,
  videoUnderstandingTool,
  
  // 文档处理
  docxTool,
  pdfTool,
  xlsxTool,
  pptxTool,
  
  // 数据分析
  financeTool,
  codeExecutionTool,
  
  // 实用工具
  calculatorTool,
  timeTool,
  jsonTool,
  weatherTool,
  translationTool,
];

// 工具分类
export const toolCategories = {
  '信息检索': ['web_search', 'web_reader'],
  '内容生成': ['image_generation', 'video_generation', 'podcast_generation'],
  '语音处理': ['speech_recognition', 'text_to_speech'],
  '视觉理解': ['image_understanding', 'video_understanding'],
  '文档处理': ['docx_processor', 'pdf_processor', 'xlsx_processor', 'pptx_processor'],
  '数据分析': ['finance_data', 'code_execution'],
  '实用工具': ['calculator', 'get_time', 'json_processor', 'get_weather', 'translate'],
};

export default allTools;
