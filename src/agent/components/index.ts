/**
 * Skill Component System - Entry Point
 * 组件系统入口 - 导出所有组件相关API
 */

// 类型定义
export * from './types';

// 组件加载器
export { ComponentLoader } from './loader';

// 组件管理器
export { ComponentManager, componentManager } from './manager';

// 预定义模板
export { 
  componentTemplates, 
  templateCategories,
  getTemplates, 
  getTemplateById, 
  createFromTemplate 
} from './templates';

/**
 * 快速创建组件的便捷函数
 */

import { SkillComponent } from './types';
import { componentManager } from './manager';

/**
 * 快速创建HTTP API组件
 */
export async function createHTTPSkill(options: {
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
  };
}): Promise<{ success: boolean; component?: SkillComponent; error?: string }> {
  try {
    const component = componentManager.createHTTPComponent(options);
    await componentManager.installFromDefinition(component);
    return { success: true, component };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : '创建失败' 
    };
  }
}

/**
 * 快速创建LLM组件
 */
export async function createLLMSkill(options: {
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
}): Promise<{ success: boolean; component?: SkillComponent; error?: string }> {
  try {
    const component = componentManager.createLLMComponent(options);
    await componentManager.installFromDefinition(component);
    return { success: true, component };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : '创建失败' 
    };
  }
}

/**
 * 快速创建工具链组件
 */
export async function createChainSkill(options: {
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
}): Promise<{ success: boolean; component?: SkillComponent; error?: string }> {
  try {
    const component = componentManager.createChainComponent(options);
    await componentManager.installFromDefinition(component);
    return { success: true, component };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : '创建失败' 
    };
  }
}

/**
 * 从模板创建组件
 */
export async function createFromTemplate(
  templateId: string,
  config?: {
    id?: string;
    name?: string;
    description?: string;
  }
): Promise<{ success: boolean; component?: SkillComponent; error?: string }> {
  try {
    const installed = await componentManager.installFromTemplate(templateId, config);
    return { success: true, component: installed.component };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : '创建失败' 
    };
  }
}

/**
 * 从JSON创建组件
 */
export async function createFromJSON(
  json: string
): Promise<{ success: boolean; component?: SkillComponent; error?: string }> {
  try {
    const installed = await componentManager.installFromJSON(json);
    return { success: true, component: installed.component };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : '创建失败' 
    };
  }
}

/**
 * 获取所有已安装组件
 */
export function getInstalledComponents() {
  return componentManager.getInstalled();
}

/**
 * 获取可用模板
 */
export function getAvailableTemplates(category?: string) {
  return componentManager.getTemplates(category);
}

/**
 * 卸载组件
 */
export async function uninstallComponent(componentId: string): Promise<boolean> {
  return await componentManager.uninstall(componentId);
}

export default {
  createHTTPSkill,
  createLLMSkill,
  createChainSkill,
  createFromTemplate,
  createFromJSON,
  getInstalledComponents,
  getAvailableTemplates,
  uninstallComponent,
};
