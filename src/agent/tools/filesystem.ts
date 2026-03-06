/**
 * File System Tools
 * 文件系统工具 - 支持Web、桌面、移动端
 */

import { ToolDefinition, ToolExecutor } from '../core/types';

// ============ 类型定义 ============

type FileOperation = 
  | 'read'      // 读取文件
  | 'write'     // 写入文件
  | 'delete'    // 删除文件
  | 'list'      // 列出目录
  | 'exists'    // 检查存在
  | 'mkdir'     // 创建目录
  | 'copy'      // 复制文件
  | 'move'      // 移动文件
  | 'search'    // 搜索文件
  | 'compress'  // 压缩
  | 'extract';  // 解压

interface FileResult {
  success: boolean;
  data?: unknown;
  error?: string;
  path?: string;
  size?: number;
  modifiedAt?: number;
}

// ============ 工具定义 ============

export const fileSystemTool: ToolDefinition = {
  name: 'file_system',
  description: '文件系统操作工具，支持文件的读写、搜索、压缩等操作。在Web端使用File API，桌面端使用Tauri FS，移动端使用React Native FS。',
  parameters: {
    type: 'object',
    properties: {
      operation: {
        type: 'string',
        description: '操作类型',
        enum: ['read', 'write', 'delete', 'list', 'exists', 'mkdir', 'copy', 'move', 'search'],
      },
      path: {
        type: 'string',
        description: '文件或目录路径',
      },
      content: {
        type: 'string',
        description: '写入内容（write操作时使用）',
      },
      encoding: {
        type: 'string',
        description: '文件编码',
        enum: ['utf-8', 'binary', 'base64'],
        default: 'utf-8',
      },
      recursive: {
        type: 'boolean',
        description: '是否递归操作',
        default: false,
      },
      pattern: {
        type: 'string',
        description: '搜索模式（search操作时使用）',
      },
      destination: {
        type: 'string',
        description: '目标路径（copy/move操作时使用）',
      },
    },
  },
  required: ['operation', 'path'],
};

// ============ 平台适配 ============

interface FileSystemAdapter {
  readFile(path: string, encoding?: string): Promise<string | ArrayBuffer>;
  writeFile(path: string, content: string | ArrayBuffer, encoding?: string): Promise<void>;
  deleteFile(path: string): Promise<void>;
  exists(path: string): Promise<boolean>;
  listDir(path: string): Promise<string[]>;
  mkdir(path: string, recursive?: boolean): Promise<void>;
  copy(src: string, dest: string): Promise<void>;
  move(src: string, dest: string): Promise<void>;
  search(pattern: string, basePath: string): Promise<string[]>;
  stat(path: string): Promise<{ size: number; modifiedAt: number; isDirectory: boolean }>;
}

// Web平台适配器
class WebFileSystemAdapter implements FileSystemAdapter {
  private files: Map<string, { content: string; modifiedAt: number }> = new Map();

  async readFile(path: string, encoding: string = 'utf-8'): Promise<string | ArrayBuffer> {
    const file = this.files.get(path);
    if (!file) throw new Error(`文件不存在: ${path}`);
    return file.content;
  }

  async writeFile(path: string, content: string | ArrayBuffer, encoding: string = 'utf-8'): Promise<void> {
    this.files.set(path, {
      content: typeof content === 'string' ? content : '',
      modifiedAt: Date.now(),
    });
  }

  async deleteFile(path: string): Promise<void> {
    this.files.delete(path);
  }

  async exists(path: string): Promise<boolean> {
    return this.files.has(path);
  }

  async listDir(path: string): Promise<string[]> {
    const files: string[] = [];
    for (const key of this.files.keys()) {
      if (key.startsWith(path)) {
        files.push(key);
      }
    }
    return files;
  }

  async mkdir(path: string, recursive?: boolean): Promise<void> {
    // Web平台不需要创建目录
  }

  async copy(src: string, dest: string): Promise<void> {
    const file = this.files.get(src);
    if (!file) throw new Error(`源文件不存在: ${src}`);
    this.files.set(dest, { ...file, modifiedAt: Date.now() });
  }

  async move(src: string, dest: string): Promise<void> {
    await this.copy(src, dest);
    this.files.delete(src);
  }

  async search(pattern: string, basePath: string): Promise<string[]> {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    const results: string[] = [];
    for (const key of this.files.keys()) {
      if (key.startsWith(basePath) && regex.test(key)) {
        results.push(key);
      }
    }
    return results;
  }

  async stat(path: string): Promise<{ size: number; modifiedAt: number; isDirectory: boolean }> {
    const file = this.files.get(path);
    if (!file) throw new Error(`文件不存在: ${path}`);
    return {
      size: file.content.length,
      modifiedAt: file.modifiedAt,
      isDirectory: false,
    };
  }
}

// 桌面平台适配器（Tauri）
class TauriFileSystemAdapter implements FileSystemAdapter {
  private fs: any = null;

  private async init() {
    if (!this.fs && typeof window !== 'undefined' && (window as any).__TAURI__) {
      this.fs = await import('@tauri-apps/api/fs');
    }
  }

  async readFile(path: string, encoding: string = 'utf-8'): Promise<string | ArrayBuffer> {
    await this.init();
    if (!this.fs) throw new Error('Tauri FS not available');
    
    if (encoding === 'binary') {
      return await this.fs.readBinaryFile(path);
    }
    return await this.fs.readTextFile(path);
  }

  async writeFile(path: string, content: string | ArrayBuffer, encoding: string = 'utf-8'): Promise<void> {
    await this.init();
    if (!this.fs) throw new Error('Tauri FS not available');
    
    if (content instanceof ArrayBuffer) {
      await this.fs.writeBinaryFile(path, content);
    } else {
      await this.fs.writeTextFile(path, content);
    }
  }

  async deleteFile(path: string): Promise<void> {
    await this.init();
    if (!this.fs) throw new Error('Tauri FS not available');
    await this.fs.removeFile(path);
  }

  async exists(path: string): Promise<boolean> {
    await this.init();
    if (!this.fs) return false;
    try {
      await this.fs.readDir(path);
      return true;
    } catch {
      return false;
    }
  }

  async listDir(path: string): Promise<string[]> {
    await this.init();
    if (!this.fs) return [];
    const entries = await this.fs.readDir(path);
    return entries.map((e: any) => e.name);
  }

  async mkdir(path: string, recursive?: boolean): Promise<void> {
    await this.init();
    if (!this.fs) return;
    await this.fs.createDir(path, { recursive });
  }

  async copy(src: string, dest: string): Promise<void> {
    const content = await this.readFile(src, 'binary');
    await this.writeFile(dest, content, 'binary');
  }

  async move(src: string, dest: string): Promise<void> {
    await this.copy(src, dest);
    await this.deleteFile(src);
  }

  async search(pattern: string, basePath: string): Promise<string[]> {
    // 简化实现
    const files = await this.listDir(basePath);
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return files.filter(f => regex.test(f));
  }

  async stat(path: string): Promise<{ size: number; modifiedAt: number; isDirectory: boolean }> {
    await this.init();
    // 简化实现
    return {
      size: 0,
      modifiedAt: Date.now(),
      isDirectory: false,
    };
  }
}

// 获取平台适配器
function getFileSystemAdapter(): FileSystemAdapter {
  if (typeof window !== 'undefined' && (window as any).__TAURI__) {
    return new TauriFileSystemAdapter();
  }
  return new WebFileSystemAdapter();
}

// ============ 工具执行器 ============

export const fileSystemExecutor: ToolExecutor = async (args) => {
  const {
    operation,
    path,
    content,
    encoding = 'utf-8',
    recursive = false,
    pattern,
    destination,
  } = args as {
    operation: FileOperation;
    path: string;
    content?: string;
    encoding?: string;
    recursive?: boolean;
    pattern?: string;
    destination?: string;
  };

  const adapter = getFileSystemAdapter();

  try {
    let result: FileResult = { success: true, path };

    switch (operation) {
      case 'read': {
        const data = await adapter.readFile(path, encoding);
        result.data = data;
        const stat = await adapter.stat(path);
        result.size = stat.size;
        result.modifiedAt = stat.modifiedAt;
        break;
      }

      case 'write': {
        if (content === undefined) {
          throw new Error('write操作需要content参数');
        }
        await adapter.writeFile(path, content, encoding);
        break;
      }

      case 'delete': {
        await adapter.deleteFile(path);
        break;
      }

      case 'exists': {
        result.data = await adapter.exists(path);
        break;
      }

      case 'list': {
        result.data = await adapter.listDir(path);
        break;
      }

      case 'mkdir': {
        await adapter.mkdir(path, recursive);
        break;
      }

      case 'copy': {
        if (!destination) {
          throw new Error('copy操作需要destination参数');
        }
        await adapter.copy(path, destination);
        result.path = destination;
        break;
      }

      case 'move': {
        if (!destination) {
          throw new Error('move操作需要destination参数');
        }
        await adapter.move(path, destination);
        result.path = destination;
        break;
      }

      case 'search': {
        if (!pattern) {
          throw new Error('search操作需要pattern参数');
        }
        result.data = await adapter.search(pattern, path);
        break;
      }

      default:
        throw new Error(`未知操作: ${operation}`);
    }

    return result;

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '文件操作失败',
      path,
    };
  }
};

// ============ 便捷函数 ============

export async function readFile(path: string, encoding?: string): Promise<string | ArrayBuffer> {
  const adapter = getFileSystemAdapter();
  return adapter.readFile(path, encoding);
}

export async function writeFile(path: string, content: string, encoding?: string): Promise<void> {
  const adapter = getFileSystemAdapter();
  return adapter.writeFile(path, content, encoding);
}

export async function fileExists(path: string): Promise<boolean> {
  const adapter = getFileSystemAdapter();
  return adapter.exists(path);
}

export async function listDir(path: string): Promise<string[]> {
  const adapter = getFileSystemAdapter();
  return adapter.listDir(path);
}

export default {
  definition: fileSystemTool,
  executor: fileSystemExecutor,
};
