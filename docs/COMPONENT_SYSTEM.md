# 组件系统使用指南

本文档介绍如何通过简单配置创建新的Skill（工具）。

## 目录

1. [快速开始](#快速开始)
2. [组件配置详解](#组件配置详解)
3. [执行器类型](#执行器类型)
4. [完整示例](#完整示例)
5. [API使用](#api使用)

---

## 快速开始

### 方式一：使用模板

```typescript
import { createFromTemplate } from '@/agent';

// 从预定义模板创建
const result = await createFromTemplate('template-weather-api', {
  id: 'my-weather',
  name: '我的天气查询',
});

if (result.success) {
  console.log('组件创建成功！', result.component);
}
```

### 方式二：使用JSON配置

```typescript
import { createFromJSON } from '@/agent';

const config = `{
  "id": "my-skill",
  "name": "我的工具",
  "version": "1.0.0",
  "description": "工具描述",
  "tool": {
    "description": "工具功能描述",
    "parameters": [
      { "name": "input", "type": "string", "description": "输入参数" }
    ]
  },
  "executor": {
    "type": "llm",
    "llm": {
      "userPrompt": "处理: {{input}}"
    }
  }
}`;

const result = await createFromJSON(config);
```

### 方式三：使用便捷函数

```typescript
import { createHTTPSkill, createLLMSkill } from '@/agent';

// 创建HTTP API工具
await createHTTPSkill({
  id: 'my-api',
  name: 'API调用',
  description: '调用外部API',
  url: 'https://api.example.com/data',
  method: 'GET',
  parameters: [
    { name: 'query', type: 'string', description: '查询参数' }
  ]
});

// 创建LLM工具
await createLLMSkill({
  id: 'my-ai',
  name: 'AI处理',
  description: '使用AI处理文本',
  userPrompt: '请处理: {{text}}',
  parameters: [
    { name: 'text', type: 'string', description: '输入文本' }
  ]
});
```

---

## 组件配置详解

### 基本结构

```json
{
  "id": "unique-skill-id",
  "name": "工具名称",
  "version": "1.0.0",
  "description": "工具描述",
  "author": "作者",
  "tags": ["tag1", "tag2"],
  "icon": "🔧",
  
  "tool": { ... },
  "executor": { ... },
  "ui": { ... }
}
```

### 字段说明

| 字段 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `id` | string | ✅ | 唯一标识符 |
| `name` | string | ✅ | 显示名称 |
| `version` | string | ✅ | 版本号 |
| `description` | string | ✅ | 功能描述 |
| `author` | string | ❌ | 作者信息 |
| `tags` | string[] | ❌ | 标签分类 |
| `icon` | string | ❌ | 图标（emoji） |
| `tool` | object | ✅ | 工具定义 |
| `executor` | object | ✅ | 执行器配置 |
| `ui` | object | ❌ | UI配置 |

### 工具定义 (tool)

```json
{
  "tool": {
    "description": "工具功能描述（LLM根据这个决定何时使用）",
    "parameters": [
      {
        "name": "param1",
        "type": "string",
        "description": "参数描述",
        "required": true,
        "label": "参数标签",
        "placeholder": "输入提示",
        "default": "默认值"
      }
    ],
    "required": ["param1"]
  }
}
```

### 参数类型

| 类型 | 说明 | 示例 |
|------|------|------|
| `string` | 字符串 | `"hello"` |
| `number` | 数字 | `123` |
| `boolean` | 布尔值 | `true` |
| `enum` | 枚举 | `["a", "b", "c"]` |
| `array` | 数组 | `[1, 2, 3]` |
| `object` | 对象 | `{"key": "value"}` |

---

## 执行器类型

### 1. HTTP执行器

调用REST API：

```json
{
  "executor": {
    "type": "http",
    "http": {
      "url": "https://api.example.com/endpoint",
      "method": "POST",
      "headers": {
        "Content-Type": "application/json"
      },
      "body": "{\"query\": \"{{query}}\"}",
      "query": {
        "param": "{{value}}"
      },
      "auth": {
        "type": "bearer",
        "key": "$API_KEY"
      },
      "response": {
        "path": "data.result",
        "transform": "data.map(item => item.name)"
      }
    },
    "timeout": 30000
  }
}
```

### 2. LLM执行器

使用AI处理：

```json
{
  "executor": {
    "type": "llm",
    "llm": {
      "model": "gpt-4o",
      "systemPrompt": "你是一个专业助手",
      "userPrompt": "请处理以下内容：\n{{input}}",
      "temperature": 0.7,
      "maxTokens": 1000
    }
  }
}
```

### 3. 工具链执行器

组合多个工具：

```json
{
  "executor": {
    "type": "chain",
    "chain": {
      "parallel": false,
      "steps": [
        {
          "name": "search",
          "tool": "web_search",
          "args": {
            "query": "{{topic}}"
          }
        },
        {
          "name": "process",
          "tool": "text_to_speech",
          "args": {
            "text": "{{search.results}}"
          }
        }
      ]
    }
  }
}
```

### 4. 脚本执行器

执行JavaScript代码：

```json
{
  "executor": {
    "type": "script",
    "script": {
      "language": "javascript",
      "code": "const result = args.input.toUpperCase(); return result;"
    }
  }
}
```

### 5. 模板执行器

渲染模板：

```json
{
  "executor": {
    "type": "template",
    "template": {
      "template": "# {{title}}\n\n{{content}}",
      "outputFormat": "markdown",
      "useLLM": false
    }
  }
}
```

---

## 完整示例

### 示例1：天气查询组件

```json
{
  "id": "weather-query",
  "name": "天气查询",
  "version": "1.0.0",
  "description": "查询城市天气信息",
  "tags": ["weather", "api"],
  "icon": "🌤️",
  
  "tool": {
    "description": "获取指定城市的当前天气和预报",
    "parameters": [
      {
        "name": "city",
        "type": "string",
        "description": "城市名称",
        "required": true,
        "label": "城市"
      },
      {
        "name": "days",
        "type": "number",
        "description": "预报天数",
        "default": 3,
        "min": 1,
        "max": 7
      }
    ]
  },
  
  "executor": {
    "type": "http",
    "http": {
      "url": "https://api.weather.com/v1/forecast",
      "method": "GET",
      "query": {
        "city": "{{city}}",
        "days": "{{days}}"
      }
    }
  }
}
```

### 示例2：AI翻译组件

```json
{
  "id": "ai-translate",
  "name": "AI翻译",
  "version": "1.0.0",
  "description": "使用AI进行翻译",
  "tags": ["ai", "translate"],
  "icon": "🌐",
  
  "tool": {
    "description": "将文本翻译为指定语言",
    "parameters": [
      {
        "name": "text",
        "type": "string",
        "description": "要翻译的文本",
        "required": true
      },
      {
        "name": "targetLang",
        "type": "enum",
        "description": "目标语言",
        "enum": ["英语", "中文", "日语", "韩语"],
        "default": "英语"
      }
    ]
  },
  
  "executor": {
    "type": "llm",
    "llm": {
      "systemPrompt": "你是一个专业翻译",
      "userPrompt": "将以下文本翻译为{{targetLang}}：\n{{text}}"
    }
  }
}
```

### 示例3：研究助手组件

```json
{
  "id": "research-assistant",
  "name": "研究助手",
  "version": "1.0.0",
  "description": "搜索并总结信息",
  "tags": ["automation", "research"],
  "icon": "📚",
  
  "tool": {
    "description": "搜索网络并生成研究报告",
    "parameters": [
      {
        "name": "topic",
        "type": "string",
        "description": "研究主题",
        "required": true
      }
    ]
  },
  
  "executor": {
    "type": "chain",
    "chain": {
      "steps": [
        {
          "name": "search",
          "tool": "web_search",
          "args": { "query": "{{topic}}" }
        },
        {
          "name": "summarize",
          "tool": "text_to_speech",
          "args": { "text": "{{search.results}}" }
        }
      ]
    }
  }
}
```

---

## API使用

### 安装组件

```typescript
import { componentManager } from '@/agent';

// 初始化
await componentManager.initialize();

// 从JSON安装
const component = await componentManager.installFromJSON(jsonConfig);

// 从模板安装
const component = await componentManager.installFromTemplate('template-id');

// 从URL安装
const component = await componentManager.installFromURL('https://example.com/skill.json');
```

### 管理组件

```typescript
// 获取已安装组件
const installed = componentManager.getInstalled();

// 启用/禁用
await componentManager.enable('skill-id');
await componentManager.disable('skill-id');

// 卸载
await componentManager.uninstall('skill-id');

// 导出
const json = componentManager.exportToJSON('skill-id');
```

### 获取模板

```typescript
// 获取所有模板
const templates = componentManager.getTemplates();

// 按分类获取
const apiTemplates = componentManager.getTemplates('api');

// 获取模板详情
const template = componentManager.getTemplate('template-id');
```

---

## 模板变量

在配置中使用 `{{变量名}}` 引用参数：

```json
{
  "userPrompt": "处理以下内容：{{input}}，数量：{{count}}"
}
```

支持的变量：
- `{{参数名}}` - 直接引用参数值
- `{{步骤名.字段}}` - 引用工具链中前序步骤的结果

---

## 文件位置

```
src/agent/components/
├── types.ts        # 类型定义
├── loader.ts       # 组件加载器
├── manager.ts      # 组件管理器
├── templates.ts    # 预定义模板
└── index.ts        # 入口文件

components/          # 用户组件配置
├── example-weather.json
├── example-translator.json
└── example-chain.json
```

---

## 总结

通过组件系统，您可以：

1. **使用模板** - 快速创建常用工具
2. **JSON配置** - 无需编码添加新能力
3. **多种执行器** - HTTP、LLM、工具链等
4. **灵活组合** - 将多个工具串联使用
5. **动态管理** - 运行时安装/卸载组件
