/**
 * Frontend Design Tools
 * 前端设计工具 - 生成UI组件、页面布局、样式
 */

import { ToolDefinition, ToolExecutor } from '../core/types';

// ============ 类型定义 ============

type DesignOperation = 
  | 'generate_component'  // 生成组件
  | 'generate_page'       // 生成页面
  | 'generate_style'      // 生成样式
  | 'generate_layout'     // 生成布局
  | 'optimize_design'     // 优化设计
  | 'analyze_design';     // 分析设计

interface ComponentSpec {
  type: string;
  name: string;
  props: Record<string, unknown>;
  children?: ComponentSpec[];
  style?: StyleSpec;
}

interface StyleSpec {
  colors?: Record<string, string>;
  typography?: Record<string, unknown>;
  spacing?: Record<string, string>;
  breakpoints?: Record<string, string>;
}

interface PageSpec {
  title: string;
  layout: string;
  sections: SectionSpec[];
  theme?: string;
}

interface SectionSpec {
  type: string;
  content: string;
  style?: Record<string, unknown>;
}

// ============ 设计系统 ============

/**
 * 预定义设计系统
 */
export const designSystems = {
  modern: {
    name: 'Modern',
    colors: {
      primary: '#3B82F6',
      secondary: '#6366F1',
      accent: '#F59E0B',
      background: '#FFFFFF',
      surface: '#F3F4F6',
      text: '#1F2937',
      textSecondary: '#6B7280',
    },
    typography: {
      fontFamily: 'Inter, system-ui, sans-serif',
      headingSizes: { h1: '3rem', h2: '2.25rem', h3: '1.5rem' },
      bodySize: '1rem',
      lineHeight: '1.6',
    },
    spacing: {
      unit: '0.25rem',
      gap: '1rem',
      padding: '1.5rem',
    },
    borderRadius: '0.5rem',
    shadows: {
      sm: '0 1px 2px rgba(0,0,0,0.05)',
      md: '0 4px 6px rgba(0,0,0,0.1)',
      lg: '0 10px 15px rgba(0,0,0,0.1)',
    },
  },

  minimal: {
    name: 'Minimal',
    colors: {
      primary: '#000000',
      secondary: '#333333',
      accent: '#666666',
      background: '#FFFFFF',
      surface: '#FAFAFA',
      text: '#000000',
      textSecondary: '#666666',
    },
    typography: {
      fontFamily: 'system-ui, sans-serif',
      headingSizes: { h1: '2.5rem', h2: '2rem', h3: '1.25rem' },
      bodySize: '1rem',
      lineHeight: '1.5',
    },
    spacing: {
      unit: '0.25rem',
      gap: '1.5rem',
      padding: '2rem',
    },
    borderRadius: '0',
    shadows: {
      sm: 'none',
      md: 'none',
      lg: 'none',
    },
  },

  colorful: {
    name: 'Colorful',
    colors: {
      primary: '#EC4899',
      secondary: '#8B5CF6',
      accent: '#10B981',
      background: '#FDF4FF',
      surface: '#FFFFFF',
      text: '#1F2937',
      textSecondary: '#6B7280',
    },
    typography: {
      fontFamily: 'Poppins, system-ui, sans-serif',
      headingSizes: { h1: '3.5rem', h2: '2.5rem', h3: '1.75rem' },
      bodySize: '1rem',
      lineHeight: '1.7',
    },
    spacing: {
      unit: '0.25rem',
      gap: '1.25rem',
      padding: '1.75rem',
    },
    borderRadius: '1rem',
    shadows: {
      sm: '0 2px 4px rgba(236,72,153,0.1)',
      md: '0 8px 16px rgba(236,72,153,0.15)',
      lg: '0 16px 32px rgba(236,72,153,0.2)',
    },
  },
};

// ============ 组件模板 ============

/**
 * 组件模板库
 */
export const componentTemplates = {
  button: {
    name: 'Button',
    variants: ['primary', 'secondary', 'outline', 'ghost'],
    generate: (variant: string, design: typeof designSystems.modern) => `
<button class="btn btn-${variant}">
  {{text}}
</button>

<style>
.btn {
  padding: 0.75rem 1.5rem;
  border-radius: ${design.borderRadius};
  font-family: ${design.typography.fontFamily};
  font-size: ${design.typography.bodySize};
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-primary {
  background: ${design.colors.primary};
  color: white;
  border: none;
}
.btn-primary:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}
.btn-secondary {
  background: ${design.colors.secondary};
  color: white;
  border: none;
}
.btn-outline {
  background: transparent;
  color: ${design.colors.primary};
  border: 2px solid ${design.colors.primary};
}
.btn-ghost {
  background: transparent;
  color: ${design.colors.text};
  border: none;
}
</style>`,
  },

  card: {
    name: 'Card',
    variants: ['default', 'elevated', 'outlined'],
    generate: (variant: string, design: typeof designSystems.modern) => `
<div class="card card-${variant}">
  <div class="card-header">
    <h3>{{title}}</h3>
  </div>
  <div class="card-body">
    {{content}}
  </div>
  <div class="card-footer">
    {{footer}}
  </div>
</div>

<style>
.card {
  background: ${design.colors.background};
  border-radius: ${design.borderRadius};
  overflow: hidden;
}
.card-elevated {
  box-shadow: ${design.shadows.md};
}
.card-outlined {
  border: 1px solid ${design.colors.surface};
}
.card-header {
  padding: ${design.spacing.padding};
  border-bottom: 1px solid ${design.colors.surface};
}
.card-header h3 {
  margin: 0;
  font-size: ${design.typography.headingSizes.h3};
  color: ${design.colors.text};
}
.card-body {
  padding: ${design.spacing.padding};
  color: ${design.colors.textSecondary};
}
.card-footer {
  padding: ${design.spacing.padding};
  border-top: 1px solid ${design.colors.surface};
}
</style>`,
  },

  navbar: {
    name: 'Navbar',
    variants: ['default', 'centered', 'split'],
    generate: (variant: string, design: typeof designSystems.modern) => `
<nav class="navbar navbar-${variant}">
  <div class="navbar-brand">{{brand}}</div>
  <div class="navbar-menu">
    <a href="#" class="navbar-item">首页</a>
    <a href="#" class="navbar-item">产品</a>
    <a href="#" class="navbar-item">关于</a>
    <a href="#" class="navbar-item">联系</a>
  </div>
  <div class="navbar-actions">
    <button class="btn btn-primary">开始使用</button>
  </div>
</nav>

<style>
.navbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 2rem;
  background: ${design.colors.background};
  border-bottom: 1px solid ${design.colors.surface};
}
.navbar-brand {
  font-size: 1.5rem;
  font-weight: 700;
  color: ${design.colors.text};
}
.navbar-menu {
  display: flex;
  gap: 2rem;
}
.navbar-item {
  color: ${design.colors.textSecondary};
  text-decoration: none;
  transition: color 0.2s;
}
.navbar-item:hover {
  color: ${design.colors.primary};
}
</style>`,
  },

  hero: {
    name: 'Hero',
    variants: ['centered', 'left', 'split'],
    generate: (variant: string, design: typeof designSystems.modern) => `
<section class="hero hero-${variant}">
  <div class="hero-content">
    <h1>{{title}}</h1>
    <p>{{subtitle}}</p>
    <div class="hero-actions">
      <button class="btn btn-primary">主要按钮</button>
      <button class="btn btn-outline">次要按钮</button>
    </div>
  </div>
  <div class="hero-image">
    {{image}}
  </div>
</section>

<style>
.hero {
  display: flex;
  align-items: center;
  min-height: 80vh;
  padding: 4rem 2rem;
  background: ${design.colors.background};
}
.hero-centered {
  flex-direction: column;
  text-align: center;
}
.hero-left {
  flex-direction: row;
}
.hero-split {
  flex-direction: row;
  justify-content: space-between;
}
.hero-content h1 {
  font-size: ${design.typography.headingSizes.h1};
  color: ${design.colors.text};
  margin-bottom: 1rem;
}
.hero-content p {
  font-size: 1.25rem;
  color: ${design.colors.textSecondary};
  margin-bottom: 2rem;
  max-width: 600px;
}
.hero-actions {
  display: flex;
  gap: 1rem;
}
</style>`,
  },

  form: {
    name: 'Form',
    variants: ['default', 'inline', 'card'],
    generate: (variant: string, design: typeof designSystems.modern) => `
<form class="form form-${variant}">
  <div class="form-group">
    <label>用户名</label>
    <input type="text" placeholder="请输入用户名" />
  </div>
  <div class="form-group">
    <label>邮箱</label>
    <input type="email" placeholder="请输入邮箱" />
  </div>
  <div class="form-group">
    <label>密码</label>
    <input type="password" placeholder="请输入密码" />
  </div>
  <button type="submit" class="btn btn-primary">提交</button>
</form>

<style>
.form {
  max-width: 400px;
}
.form-group {
  margin-bottom: 1.5rem;
}
.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  color: ${design.colors.text};
  font-weight: 500;
}
.form-group input {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1px solid ${design.colors.surface};
  border-radius: ${design.borderRadius};
  font-size: ${design.typography.bodySize};
  transition: border-color 0.2s;
}
.form-group input:focus {
  outline: none;
  border-color: ${design.colors.primary};
}
</style>`,
  },
};

// ============ 页面模板 ============

/**
 * 页面模板库
 */
export const pageTemplates = {
  landing: {
    name: '落地页',
    sections: ['hero', 'features', 'testimonials', 'cta', 'footer'],
    generate: (design: typeof designSystems.modern) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>{{title}}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: ${design.typography.fontFamily}; }
  </style>
</head>
<body>
  <nav class="navbar">{{navbar}}</nav>
  <section class="hero">{{hero}}</section>
  <section class="features">{{features}}</section>
  <section class="testimonials">{{testimonials}}</section>
  <section class="cta">{{cta}}</section>
  <footer>{{footer}}</footer>
</body>
</html>`,
  },

  dashboard: {
    name: '仪表盘',
    sections: ['sidebar', 'header', 'stats', 'charts', 'table'],
    generate: (design: typeof designSystems.modern) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>{{title}} - Dashboard</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: ${design.typography.fontFamily};
      display: flex;
      min-height: 100vh;
      background: ${design.colors.surface};
    }
    .sidebar { width: 250px; background: ${design.colors.background}; }
    .main { flex: 1; padding: 2rem; }
  </style>
</head>
<body>
  <aside class="sidebar">{{sidebar}}</aside>
  <main class="main">
    <header>{{header}}</header>
    <section class="stats">{{stats}}</section>
    <section class="charts">{{charts}}</section>
    <section class="table">{{table}}</section>
  </main>
</body>
</html>`,
  },

  blog: {
    name: '博客页',
    sections: ['header', 'hero', 'articles', 'sidebar', 'footer'],
    generate: (design: typeof designSystems.modern) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>{{title}}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: ${design.typography.fontFamily}; }
    .container { max-width: 1200px; margin: 0 auto; }
    .content { display: grid; grid-template-columns: 1fr 300px; gap: 2rem; }
  </style>
</head>
<body>
  <header>{{header}}</header>
  <main class="container">
    <section class="hero">{{hero}}</section>
    <div class="content">
      <section class="articles">{{articles}}</section>
      <aside class="sidebar">{{sidebar}}</aside>
    </div>
  </main>
  <footer>{{footer}}</footer>
</body>
</html>`,
  },
};

// ============ 工具定义 ============

export const frontendDesignTool: ToolDefinition = {
  name: 'frontend_design',
  description: `前端设计工具，支持：
1. 生成组件 - 按钮、卡片、导航栏、表单等
2. 生成页面 - 落地页、仪表盘、博客页等
3. 生成样式 - CSS样式、主题配置
4. 优化设计 - 改进现有设计
5. 分析设计 - 提取设计规范`,
  parameters: {
    type: 'object',
    properties: {
      operation: {
        type: 'string',
        description: '操作类型',
        enum: ['generate_component', 'generate_page', 'generate_style', 'optimize_design', 'analyze_design'],
      },
      component_type: {
        type: 'string',
        description: '组件类型',
        enum: ['button', 'card', 'navbar', 'hero', 'form'],
      },
      page_type: {
        type: 'string',
        description: '页面类型',
        enum: ['landing', 'dashboard', 'blog'],
      },
      design_system: {
        type: 'string',
        description: '设计系统',
        enum: ['modern', 'minimal', 'colorful'],
        default: 'modern',
      },
      variant: {
        type: 'string',
        description: '变体类型',
      },
      content: {
        type: 'string',
        description: '内容描述',
      },
      requirements: {
        type: 'string',
        description: '设计需求',
      },
    },
  },
  required: ['operation'],
};

// ============ 工具执行器 ============

export const frontendDesignExecutor: ToolExecutor = async (args) => {
  const {
    operation,
    component_type,
    page_type,
    design_system = 'modern',
    variant = 'default',
    content,
    requirements,
  } = args as {
    operation: DesignOperation;
    component_type?: keyof typeof componentTemplates;
    page_type?: keyof typeof pageTemplates;
    design_system?: keyof typeof designSystems;
    variant?: string;
    content?: string;
    requirements?: string;
  };

  try {
    const design = designSystems[design_system];
    let result: string;

    switch (operation) {
      case 'generate_component': {
        if (!component_type) {
          throw new Error('需要指定component_type');
        }
        const template = componentTemplates[component_type];
        if (!template) {
          throw new Error(`未知组件类型: ${component_type}`);
        }
        result = template.generate(variant, design);
        break;
      }

      case 'generate_page': {
        if (!page_type) {
          throw new Error('需要指定page_type');
        }
        const template = pageTemplates[page_type];
        if (!template) {
          throw new Error(`未知页面类型: ${page_type}`);
        }
        result = template.generate(design);
        break;
      }

      case 'generate_style': {
        result = generateStyleSystem(design);
        break;
      }

      case 'optimize_design': {
        result = await optimizeDesign(content || '', requirements || '', design);
        break;
      }

      case 'analyze_design': {
        result = analyzeDesign(content || '', design);
        break;
      }

      default:
        throw new Error(`未知操作: ${operation}`);
    }

    return {
      success: true,
      operation,
      code: result,
      designSystem: design.name,
    };

  } catch (error) {
    return {
      success: false,
      operation,
      error: error instanceof Error ? error.message : '设计生成失败',
    };
  }
};

// ============ 辅助函数 ============

function generateStyleSystem(design: typeof designSystems.modern): string {
  return `
/* Design System: ${design.name} */

:root {
  /* Colors */
  --color-primary: ${design.colors.primary};
  --color-secondary: ${design.colors.secondary};
  --color-accent: ${design.colors.accent};
  --color-background: ${design.colors.background};
  --color-surface: ${design.colors.surface};
  --color-text: ${design.colors.text};
  --color-text-secondary: ${design.colors.textSecondary};

  /* Typography */
  --font-family: ${design.typography.fontFamily};
  --font-size-body: ${design.typography.bodySize};
  --line-height: ${design.typography.lineHeight};
  --font-size-h1: ${design.typography.headingSizes.h1};
  --font-size-h2: ${design.typography.headingSizes.h2};
  --font-size-h3: ${design.typography.headingSizes.h3};

  /* Spacing */
  --spacing-unit: ${design.spacing.unit};
  --spacing-gap: ${design.spacing.gap};
  --spacing-padding: ${design.spacing.padding};

  /* Border Radius */
  --border-radius: ${design.borderRadius};

  /* Shadows */
  --shadow-sm: ${design.shadows.sm};
  --shadow-md: ${design.shadows.md};
  --shadow-lg: ${design.shadows.lg};
}

/* Base Styles */
body {
  font-family: var(--font-family);
  font-size: var(--font-size-body);
  line-height: var(--line-height);
  color: var(--color-text);
  background: var(--color-background);
}

h1 { font-size: var(--font-size-h1); }
h2 { font-size: var(--font-size-h2); }
h3 { font-size: var(--font-size-h3); }
`;
}

async function optimizeDesign(
  content: string,
  requirements: string,
  design: typeof designSystems.modern
): Promise<string> {
  // 简单的优化建议
  const suggestions: string[] = [];

  if (!content.includes('border-radius')) {
    suggestions.push(`建议添加圆角: border-radius: ${design.borderRadius}`);
  }

  if (!content.includes('transition')) {
    suggestions.push('建议添加过渡动画提升用户体验');
  }

  if (!content.includes('hover')) {
    suggestions.push('建议添加悬停状态样式');
  }

  return `
/* 优化建议 */
${suggestions.map((s, i) => `${i + 1}. ${s}`).join('\n')}

/* 优化后的代码 */
${content}

/* 添加的优化样式 */
.interactive {
  transition: all 0.2s ease;
}
.interactive:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}
`;
}

function analyzeDesign(content: string, design: typeof designSystems.modern): string {
  const analysis: string[] = [];

  // 分析颜色使用
  const colorMatches = content.match(/#[0-9A-Fa-f]{6}/g) || [];
  analysis.push(`检测到 ${colorMatches.length} 个颜色值`);

  // 分析字体
  if (content.includes('font-family')) {
    analysis.push('已定义字体');
  } else {
    analysis.push('未定义字体，建议添加');
  }

  // 分析响应式
  if (content.includes('@media')) {
    analysis.push('已包含响应式设计');
  } else {
    analysis.push('未包含响应式设计，建议添加');
  }

  // 分析动画
  if (content.includes('transition') || content.includes('animation')) {
    analysis.push('已包含动画效果');
  }

  return `
/* 设计分析报告 */

## 分析结果
${analysis.map((a, i) => `${i + 1}. ${a}`).join('\n')}

## 建议的设计系统配置
- 主色: ${design.colors.primary}
- 次色: ${design.colors.secondary}
- 强调色: ${design.colors.accent}
- 字体: ${design.typography.fontFamily}
- 圆角: ${design.borderRadius}
`;
}

export default {
  frontendDesignTool,
  frontendDesignExecutor,
  designSystems,
  componentTemplates,
  pageTemplates,
};
