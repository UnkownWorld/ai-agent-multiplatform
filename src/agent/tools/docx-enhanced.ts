/**
 * Enhanced Word Document Processor
 * 增强的Word文档处理器 - 支持创建、编辑、批注、修订追踪
 */

import { ToolDefinition, ToolExecutor } from '../core/types';

// ============ 类型定义 ============

type WordOperation = 
  | 'create'      // 创建文档
  | 'read'        // 读取文档
  | 'edit'        // 编辑文档
  | 'add_comment' // 添加批注
  | 'track_changes' // 修订追踪
  | 'extract_text' // 提取文本
  | 'merge'       // 合并文档
  | 'convert';    // 格式转换

interface WordDocument {
  content: string;
  paragraphs: Paragraph[];
  tables: Table[];
  images: Image[];
  comments: Comment[];
  revisions: Revision[];
}

interface Paragraph {
  text: string;
  style: string;
  alignment: 'left' | 'center' | 'right' | 'justify';
}

interface Table {
  rows: string[][];
  headers?: string[];
}

interface Image {
  url: string;
  width: number;
  height: number;
  alt?: string;
}

interface Comment {
  id: string;
  author: string;
  text: string;
  targetText: string;
  createdAt: number;
}

interface Revision {
  id: string;
  type: 'insert' | 'delete';
  text: string;
  author: string;
  createdAt: number;
}

// ============ 工具定义 ============

export const docxTool: ToolDefinition = {
  name: 'docx_processor',
  description: `Word文档处理工具，支持：
1. 创建文档 - 支持标题、段落、表格、图片
2. 读取文档 - 提取文本、结构、批注
3. 编辑文档 - 修改内容、格式
4. 添加批注 - 在指定位置添加评论
5. 修订追踪 - 记录修改历史
6. 格式转换 - 转换为PDF、HTML等`,
  parameters: {
    type: 'object',
    properties: {
      operation: {
        type: 'string',
        description: '操作类型',
        enum: ['create', 'read', 'edit', 'add_comment', 'track_changes', 'extract_text', 'merge', 'convert'],
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
        description: '输出格式',
        enum: ['docx', 'pdf', 'html', 'markdown'],
        default: 'docx',
      },
      comment: {
        type: 'object',
        description: '批注信息',
        properties: {
          text: { type: 'string', description: '批注内容' },
          target: { type: 'string', description: '目标文本' },
          author: { type: 'string', description: '作者' },
        },
      },
      revision: {
        type: 'object',
        description: '修订信息',
        properties: {
          type: { type: 'string', enum: ['insert', 'delete'] },
          old_text: { type: 'string', description: '原文本' },
          new_text: { type: 'string', description: '新文本' },
        },
      },
      style: {
        type: 'object',
        description: '文档样式',
        properties: {
          font: { type: 'string', default: 'SimSun' },
          size: { type: 'number', default: 12 },
          line_spacing: { type: 'number', default: 1.5 },
          color_scheme: { type: 'string', enum: ['ink_zen', 'wilderness', 'terra_cotta', 'midnight'] },
        },
      },
    },
  },
  required: ['operation'],
};

// ============ 颜色方案 ============

export const colorSchemes = {
  ink_zen: {
    name: 'Ink & Zen',
    primary: '#0B1220',
    body: '#0F172A',
    secondary: '#2B2B2B',
    accent: '#9AA6B2',
    background: '#F1F5F9',
  },
  wilderness: {
    name: 'Wilderness Oasis',
    primary: '#1A1F16',
    body: '#2D3329',
    secondary: '#4A5548',
    accent: '#94A3B8',
    background: '#F8FAF7',
  },
  terra_cotta: {
    name: 'Terra Cotta Afterglow',
    primary: '#26211F',
    body: '#3D3735',
    secondary: '#6B6361',
    accent: '#C19A6B',
    background: '#FDFCFB',
  },
  midnight: {
    name: 'Midnight Code',
    primary: '#020617',
    body: '#1E293B',
    secondary: '#64748B',
    accent: '#94A3B8',
    background: '#F8FAFC',
  },
};

// ============ 文档模板 ============

export const documentTemplates = {
  report: {
    name: '报告模板',
    sections: ['封面', '目录', '摘要', '正文', '结论', '附录'],
    styles: {
      title: { font: 'SimHei', size: 22, bold: true },
      heading1: { font: 'SimHei', size: 16, bold: true },
      heading2: { font: 'SimHei', size: 14, bold: true },
      body: { font: 'SimSun', size: 12 },
    },
  },
  letter: {
    name: '信函模板',
    sections: ['抬头', '正文', '落款'],
    styles: {
      title: { font: 'SimHei', size: 14 },
      body: { font: 'SimSun', size: 12 },
    },
  },
  contract: {
    name: '合同模板',
    sections: ['标题', '当事人', '条款', '签署'],
    styles: {
      title: { font: 'SimHei', size: 18, bold: true, center: true },
      heading: { font: 'SimHei', size: 14, bold: true },
      body: { font: 'SimSun', size: 12 },
    },
  },
};

// ============ 工具执行器 ============

export const docxExecutor: ToolExecutor = async (args) => {
  const {
    operation,
    file_path,
    content,
    output_format = 'docx',
    comment,
    revision,
    style,
  } = args as {
    operation: WordOperation;
    file_path?: string;
    content?: string;
    output_format?: string;
    comment?: { text: string; target: string; author: string };
    revision?: { type: string; old_text: string; new_text: string };
    style?: { font?: string; size?: number; line_spacing?: number; color_scheme?: string };
  };

  try {
    // 动态导入SDK
    const ZAI = (await import('z-ai-web-dev-sdk')).default;
    const zai = await ZAI.create();

    let result: unknown;

    switch (operation) {
      case 'create': {
        // 创建文档
        const docContent = content || '';
        const docStyle = {
          font: style?.font || 'SimSun',
          size: style?.size || 12,
          lineSpacing: style?.line_spacing || 1.5,
          colorScheme: style?.color_scheme || 'ink_zen',
        };

        result = await zai.functions.invoke('docx', {
          operation: 'create',
          content: docContent,
          style: docStyle,
          output_format,
        });
        break;
      }

      case 'read': {
        if (!file_path) throw new Error('读取操作需要file_path参数');
        result = await zai.functions.invoke('docx', {
          operation: 'read',
          file_path,
        });
        break;
      }

      case 'edit': {
        if (!file_path) throw new Error('编辑操作需要file_path参数');
        if (!content) throw new Error('编辑操作需要content参数');
        
        result = await zai.functions.invoke('docx', {
          operation: 'edit',
          file_path,
          content,
        });
        break;
      }

      case 'add_comment': {
        if (!file_path) throw new Error('添加批注需要file_path参数');
        if (!comment) throw new Error('添加批注需要comment参数');

        result = await zai.functions.invoke('docx', {
          operation: 'add_comment',
          file_path,
          comment: {
            text: comment.text,
            target_text: comment.target,
            author: comment.author || 'AI Agent',
          },
        });
        break;
      }

      case 'track_changes': {
        if (!file_path) throw new Error('修订追踪需要file_path参数');
        if (!revision) throw new Error('修订追踪需要revision参数');

        result = await zai.functions.invoke('docx', {
          operation: 'track_changes',
          file_path,
          revision: {
            type: revision.type,
            old_text: revision.old_text,
            new_text: revision.new_text,
            author: 'AI Agent',
          },
        });
        break;
      }

      case 'extract_text': {
        if (!file_path) throw new Error('提取文本需要file_path参数');
        
        result = await zai.functions.invoke('docx', {
          operation: 'extract_text',
          file_path,
        });
        break;
      }

      case 'convert': {
        if (!file_path) throw new Error('格式转换需要file_path参数');
        
        result = await zai.functions.invoke('docx', {
          operation: 'convert',
          file_path,
          output_format,
        });
        break;
      }

      default:
        throw new Error(`未知操作: ${operation}`);
    }

    return {
      success: true,
      operation,
      data: result,
      output_format,
    };

  } catch (error) {
    return {
      success: false,
      operation,
      error: error instanceof Error ? error.message : 'Word文档处理失败',
    };
  }
};

// ============ 便捷函数 ============

/**
 * 创建Word文档
 */
export async function createWordDocument(
  content: string,
  options?: {
    style?: typeof style;
    template?: keyof typeof documentTemplates;
    outputPath?: string;
  }
): Promise<{ success: boolean; path?: string; error?: string }> {
  const result = await docxExecutor({
    operation: 'create',
    content,
    style: options?.style,
    file_path: options?.outputPath,
  });

  return {
    success: result.success,
    path: (result as { data?: { path?: string } }).data?.path,
    error: result.error,
  };
}

/**
 * 读取Word文档
 */
export async function readWordDocument(
  filePath: string
): Promise<{ success: boolean; content?: string; error?: string }> {
  const result = await docxExecutor({
    operation: 'read',
    file_path: filePath,
  });

  return {
    success: result.success,
    content: (result as { data?: { content?: string } }).data?.content,
    error: result.error,
  };
}

/**
 * 添加批注
 */
export async function addComment(
  filePath: string,
  targetText: string,
  commentText: string,
  author?: string
): Promise<{ success: boolean; error?: string }> {
  const result = await docxExecutor({
    operation: 'add_comment',
    file_path: filePath,
    comment: {
      text: commentText,
      target: targetText,
      author: author || 'AI Agent',
    },
  });

  return {
    success: result.success,
    error: result.error,
  };
}

export default {
  docxTool,
  docxExecutor,
  colorSchemes,
  documentTemplates,
  createWordDocument,
  readWordDocument,
  addComment,
};
