/**
 * Code Execution Sandbox
 * 代码执行沙箱 - 安全执行JavaScript/Python代码
 */

import { ToolDefinition, ToolExecutor } from '../core/types';
import { withTimeout } from '../utils/recovery';

// ============ 类型定义 ============

export interface SandboxOptions {
  timeout: number;
  memoryLimit: number;
  allowNetwork: boolean;
  allowFileAccess: boolean;
  env?: Record<string, string>;
}

export interface ExecutionResult {
  success: boolean;
  output: string;
  error?: string;
  exitCode: number;
  executionTime: number;
  memoryUsed?: number;
}

export interface SandboxExecutor {
  execute(code: string, options: SandboxOptions): Promise<ExecutionResult>;
}

// ============ JavaScript沙箱 ============

/**
 * JavaScript沙箱执行器
 */
class JavaScriptSandbox implements SandboxExecutor {
  async execute(code: string, options: SandboxOptions): Promise<ExecutionResult> {
    const startTime = Date.now();
    
    try {
      // 创建安全的执行环境
      const safeGlobals = this.createSafeGlobals(options);
      
      // 包装代码
      const wrappedCode = `
        (function() {
          "use strict";
          const console = {
            log: (...args) => __output__.push(args.map(a => String(a)).join(' ')),
            error: (...args) => __output__.push('[ERROR] ' + args.map(a => String(a)).join(' ')),
            warn: (...args) => __output__.push('[WARN] ' + args.map(a => String(a)).join(' ')),
          };
          
          ${this.createRestrictedAPIs(options)}
          
          try {
            ${code}
          } catch (e) {
            __error__ = e.message || String(e);
          }
          
          return { output: __output__.join('\\n'), error: __error__ };
        })()
      `;

      // 执行代码
      const result = await withTimeout(
        async () => {
          const __output__: string[] = [];
          let __error__: string | null = null;
          
          // 创建执行函数
          const fn = new Function(
            '__output__',
            '__error__',
            ...Object.keys(safeGlobals),
            wrappedCode
          );
          
          const execResult = fn(
            __output__,
            __error__,
            ...Object.values(safeGlobals)
          );
          
          return execResult;
        },
        options.timeout
      );

      return {
        success: !result.error,
        output: result.output || '',
        error: result.error,
        exitCode: result.error ? 1 : 0,
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        output: '',
        error: error instanceof Error ? error.message : '执行失败',
        exitCode: 1,
        executionTime: Date.now() - startTime,
      };
    }
  }

  private createSafeGlobals(options: SandboxOptions): Record<string, unknown> {
    const globals: Record<string, unknown> = {};

    // 数学函数
    globals['Math'] = Math;
    
    // JSON
    globals['JSON'] = JSON;
    
    // 数组方法
    globals['Array'] = Array;
    globals['Object'] = Object;
    globals['String'] = String;
    globals['Number'] = Number;
    globals['Boolean'] = Boolean;
    globals['Date'] = Date;
    globals['RegExp'] = RegExp;
    
    // Map/Set
    globals['Map'] = Map;
    globals['Set'] = Set;
    globals['WeakMap'] = WeakMap;
    globals['WeakSet'] = WeakSet;
    
    // Promise
    globals['Promise'] = Promise;
    
    // 环境变量
    if (options.env) {
      globals['process'] = { env: options.env };
    }

    return globals;
  }

  private createRestrictedAPIs(options: SandboxOptions): string {
    let code = '';
    
    // 禁止网络访问
    if (!options.allowNetwork) {
      code += `
        const fetch = () => { throw new Error('网络访问被禁止'); };
        const XMLHttpRequest = undefined;
        const WebSocket = undefined;
      `;
    }
    
    // 禁止文件访问
    if (!options.allowFileAccess) {
      code += `
        const require = () => { throw new Error('require被禁止'); };
        const import = () => { throw new Error('import被禁止'); };
      `;
    }

    return code;
  }
}

// ============ Python沙箱 ============

/**
 * Python沙箱执行器（通过SDK调用）
 */
class PythonSandbox implements SandboxExecutor {
  async execute(code: string, options: SandboxOptions): Promise<ExecutionResult> {
    const startTime = Date.now();
    
    try {
      // 动态导入SDK
      const ZAI = (await import('z-ai-web-dev-sdk')).default;
      const zai = await ZAI.create();

      const result = await withTimeout(
        async () => {
          return await zai.functions.invoke('code_execution', {
            code,
            language: 'python',
            timeout: Math.floor(options.timeout / 1000),
          });
        },
        options.timeout + 5000 // 额外5秒缓冲
      );

      return {
        success: !result.error,
        output: result.output || '',
        error: result.error,
        exitCode: result.error ? 1 : 0,
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        output: '',
        error: error instanceof Error ? error.message : '执行失败',
        exitCode: 1,
        executionTime: Date.now() - startTime,
      };
    }
  }
}

// ============ 沙箱管理器 ============

/**
 * 沙箱管理器
 */
export class SandboxManager {
  private jsSandbox: JavaScriptSandbox;
  private pythonSandbox: PythonSandbox;
  private defaultOptions: SandboxOptions;

  constructor(defaultOptions?: Partial<SandboxOptions>) {
    this.jsSandbox = new JavaScriptSandbox();
    this.pythonSandbox = new PythonSandbox();
    this.defaultOptions = {
      timeout: 30000,
      memoryLimit: 128 * 1024 * 1024, // 128MB
      allowNetwork: false,
      allowFileAccess: false,
      ...defaultOptions,
    };
  }

  /**
   * 执行JavaScript代码
   */
  async executeJavaScript(
    code: string,
    options?: Partial<SandboxOptions>
  ): Promise<ExecutionResult> {
    return this.jsSandbox.execute(code, { ...this.defaultOptions, ...options });
  }

  /**
   * 执行Python代码
   */
  async executePython(
    code: string,
    options?: Partial<SandboxOptions>
  ): Promise<ExecutionResult> {
    return this.pythonSandbox.execute(code, { ...this.defaultOptions, ...options });
  }

  /**
   * 自动检测语言并执行
   */
  async execute(
    code: string,
    language: 'javascript' | 'typescript' | 'python',
    options?: Partial<SandboxOptions>
  ): Promise<ExecutionResult> {
    switch (language) {
      case 'javascript':
      case 'typescript':
        return this.executeJavaScript(code, options);
      case 'python':
        return this.executePython(code, options);
      default:
        return {
          success: false,
          output: '',
          error: `不支持的语言: ${language}`,
          exitCode: 1,
          executionTime: 0,
        };
    }
  }
}

// ============ 工具定义 ============

export const codeExecutionTool: ToolDefinition = {
  name: 'code_execution',
  description: '在安全沙箱中执行代码，支持JavaScript、TypeScript和Python。适用于数据分析、计算、脚本执行等场景。',
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
        enum: ['javascript', 'typescript', 'python'],
        default: 'javascript',
      },
      timeout: {
        type: 'number',
        description: '超时时间（毫秒）',
        default: 30000,
      },
      allowNetwork: {
        type: 'boolean',
        description: '是否允许网络访问',
        default: false,
      },
    },
  },
  required: ['code'],
};

// ============ 工具执行器 ============

let sandboxManager: SandboxManager | null = null;

function getSandboxManager(): SandboxManager {
  if (!sandboxManager) {
    sandboxManager = new SandboxManager();
  }
  return sandboxManager;
}

export const codeExecutionExecutor: ToolExecutor = async (args) => {
  const {
    code,
    language = 'javascript',
    timeout = 30000,
    allowNetwork = false,
  } = args as {
    code: string;
    language?: 'javascript' | 'typescript' | 'python';
    timeout?: number;
    allowNetwork?: boolean;
  };

  if (!code || code.trim() === '') {
    return {
      success: false,
      error: '代码不能为空',
    };
  }

  try {
    const manager = getSandboxManager();
    const result = await manager.execute(code, language, {
      timeout,
      allowNetwork,
    });

    return {
      success: result.success,
      output: result.output,
      error: result.error,
      exitCode: result.exitCode,
      executionTime: result.executionTime,
      language,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '代码执行失败',
    };
  }
};

// ============ 预设代码模板 ============

export const codeTemplates = {
  // 数据分析
  dataAnalysis: `
# 数据分析模板
import json

data = {{data}}
# 分析逻辑
result = {
  "count": len(data),
  "summary": "分析结果"
}
print(json.dumps(result, ensure_ascii=False))
`,

  // 数学计算
  mathCalculation: `
// 数学计算
const result = (() => {
  {{expression}}
})();
console.log('Result:', result);
`,

  // JSON处理
  jsonProcess: `
// JSON处理
const data = {{data}};
const result = {{operation}};
console.log(JSON.stringify(result, null, 2));
`,

  // 文本处理
  textProcess: `
# 文本处理
text = """{{text}}"""
# 处理逻辑
result = text.{{operation}}
print(result)
`,
};

export default {
  SandboxManager,
  codeExecutionTool,
  codeExecutionExecutor,
  codeTemplates,
};
