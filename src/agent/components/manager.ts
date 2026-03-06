/**
 * Component Manager API
 * 组件管理API - 提供组件的增删改查接口
 */

import { ComponentLoader } from './loader';
import { SkillComponent, InstalledComponent } from './types';
import { componentTemplates, getTemplates, getTemplateById, createFromTemplate } from './templates';
import { ToolRegistry } from '../tools/registry';

/**
 * 组件管理器
 */
export class ComponentManager {
  private loader: ComponentLoader;
  private toolRegistry: ToolRegistry;

  constructor() {
    this.toolRegistry = new ToolRegistry();
    this.loader = new ComponentLoader(this.toolRegistry);
  }

  /**
   * 初始化组件管理器
   */
  async initialize(): Promise<void> {
    await this.loader.loadInstalled();
  }

  // ============ 组件安装 ============

  /**
   * 从定义安装组件
   */
  async installFromDefinition(definition: SkillComponent): Promise<InstalledComponent> {
    return await this.loader.install(definition);
  }

  /**
   * 从模板安装组件
   */
  async installFromTemplate(
    templateId: string,
    config?: {
      id?: string;
      name?: string;
      description?: string;
      config?: Record<string, unknown>;
    }
  ): Promise<InstalledComponent> {
    const component = createFromTemplate(templateId, {
      id: config?.id,
      name: config?.name,
      description: config?.description,
    });
    
    const installed = await this.loader.install(component);
    
    if (config?.config) {
      installed.config = config.config;
    }
    
    return installed;
  }

  /**
   * 从JSON安装组件
   */
  async installFromJSON(json: string): Promise<InstalledComponent> {
    const definition = JSON.parse(json) as SkillComponent;
    return await this.loader.install(definition);
  }

  /**
   * 从URL安装组件
   */
  async installFromURL(url: string): Promise<InstalledComponent> {
    const response = await fetch(url);
    const definition = await response.json() as SkillComponent;
    return await this.loader.install(definition);
  }

  // ============ 组件管理 ============

  /**
   * 卸载组件
   */
  async uninstall(componentId: string): Promise<boolean> {
    return await this.loader.uninstall(componentId);
  }

  /**
   * 启用组件
   */
  async enable(componentId: string): Promise<boolean> {
    return await this.loader.toggle(componentId, true);
  }

  /**
   * 禁用组件
   */
  async disable(componentId: string): Promise<boolean> {
    return await this.loader.toggle(componentId, false);
  }

  /**
   * 获取已安装组件
   */
  getInstalled(componentId?: string): InstalledComponent | InstalledComponent[] | null {
    return this.loader.getInstalled(componentId);
  }

  /**
   * 检查组件是否已安装
   */
  isInstalled(componentId: string): boolean {
    const installed = this.loader.getInstalled(componentId);
    return installed !== null;
  }

  // ============ 模板管理 ============

  /**
   * 获取可用模板
   */
  getTemplates(category?: string): SkillComponent[] {
    return getTemplates(category);
  }

  /**
   * 获取模板详情
   */
  getTemplate(templateId: string): SkillComponent | undefined {
    return getTemplateById(templateId);
  }

  /**
   * 获取模板分类
   */
  getTemplateCategories(): Record<string, string[]> {
    const categories: Record<string, string[]> = {};
    
    for (const template of componentTemplates) {
      for (const tag of template.tags || []) {
        if (!categories[tag]) {
          categories[tag] = [];
        }
        categories[tag].push(template.id);
      }
    }
    
    return categories;
  }

  // ============ 组件创建辅助 ============

  /**
   * 创建HTTP API组件
   */
  createHTTPComponent(options: {
    id: string;
    name: string;
    description: string;
    url: string;
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    parameters: Array<{
      name: string;
      type: 'string' | 'number' | 'boolean' | 'object';
      description: string;
      required?: boolean;
      default?: unknown;
    }>;
    headers?: Record<string, string>;
    auth?: {
      type: 'bearer' | 'api_key' | 'none';
      key?: string;
      header?: string;
    };
  }): SkillComponent {
    return {
      id: options.id,
      name: options.name,
      version: '1.0.0',
      description: options.description,
      tool: {
        description: options.description,
        parameters: options.parameters.map(p => ({
          ...p,
          type: p.type as 'string' | 'number' | 'boolean' | 'object',
        })),
        required: options.parameters.filter(p => p.required).map(p => p.name),
      },
      executor: {
        type: 'http',
        http: {
          url: options.url,
          method: options.method || 'GET',
          headers: options.headers,
          auth: options.auth,
        },
      },
    };
  }

  /**
   * 创建LLM组件
   */
  createLLMComponent(options: {
    id: string;
    name: string;
    description: string;
    systemPrompt?: string;
    userPrompt: string;
    parameters: Array<{
      name: string;
      type: 'string' | 'number' | 'enum';
      description: string;
      required?: boolean;
      enum?: string[];
    }>;
    model?: string;
    temperature?: number;
  }): SkillComponent {
    return {
      id: options.id,
      name: options.name,
      version: '1.0.0',
      description: options.description,
      tool: {
        description: options.description,
        parameters: options.parameters.map(p => ({
          ...p,
          type: p.type as 'string' | 'number' | 'enum',
        })),
        required: options.parameters.filter(p => p.required).map(p => p.name),
      },
      executor: {
        type: 'llm',
        llm: {
          systemPrompt: options.systemPrompt,
          userPrompt: options.userPrompt,
          model: options.model,
          temperature: options.temperature,
        },
      },
    };
  }

  /**
   * 创建工具链组件
   */
  createChainComponent(options: {
    id: string;
    name: string;
    description: string;
    steps: Array<{
      name: string;
      tool: string;
      args: Record<string, string>;
    }>;
    parameters: Array<{
      name: string;
      type: 'string' | 'number' | 'object';
      description: string;
      required?: boolean;
    }>;
    parallel?: boolean;
  }): SkillComponent {
    return {
      id: options.id,
      name: options.name,
      version: '1.0.0',
      description: options.description,
      tool: {
        description: options.description,
        parameters: options.parameters.map(p => ({
          ...p,
          type: p.type as 'string' | 'number' | 'object',
        })),
        required: options.parameters.filter(p => p.required).map(p => p.name),
      },
      executor: {
        type: 'chain',
        chain: {
          steps: options.steps,
          parallel: options.parallel,
        },
      },
    };
  }

  // ============ 导出功能 ============

  /**
   * 导出组件为JSON
   */
  exportToJSON(componentId: string): string | null {
    const installed = this.loader.getInstalled(componentId);
    if (!installed) return null;
    
    return JSON.stringify(installed.component, null, 2);
  }

  /**
   * 导出所有组件
   */
  exportAll(): string {
    const installed = this.loader.getInstalled() as InstalledComponent[];
    const components = installed.map(i => i.component);
    return JSON.stringify(components, null, 2);
  }

  // ============ 统计功能 ============

  /**
   * 获取组件统计
   */
  getStats(): {
    total: number;
    enabled: number;
    disabled: number;
    byType: Record<string, number>;
  } {
    const installed = this.loader.getInstalled() as InstalledComponent[];
    
    const stats = {
      total: installed.length,
      enabled: installed.filter(i => i.enabled).length,
      disabled: installed.filter(i => !i.enabled).length,
      byType: {} as Record<string, number>,
    };
    
    for (const item of installed) {
      const type = item.component.executor.type;
      stats.byType[type] = (stats.byType[type] || 0) + 1;
    }
    
    return stats;
  }
}

// 导出单例
export const componentManager = new ComponentManager();

export default ComponentManager;
