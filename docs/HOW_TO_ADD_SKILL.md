# 如何添加新的Skill（工具）

本文档详细说明如何为AI Agent添加新的工具能力。

## 目录

1. [快速开始](#快速开始)
2. [详细步骤](#详细步骤)
3. [完整示例](#完整示例)
4. [最佳实践](#最佳实践)
5. [常见问题](#常见问题)

---

## 快速开始

添加一个新工具只需3步：

```typescript
// 1. 定义工具
const myTool = {
  name: 'my_tool',
  description: '工具描述',
  parameters: { type: 'object', properties: {...} }
};

// 2. 实现执行器
const myExecutor = async (args) => {
  // 执行逻辑
  return { result: 'success' };
};

// 3. 注册到系统
toolRegistry.register('my_tool', {
  definition: myTool,
  execute: myExecutor
});
```

---

## 详细步骤

### 步骤1: 定义工具 (Tool Definition)

在 `src/agent/tools/definitions.ts` 中添加工具定义：

```typescript
/**
 * 我的自定义工具
 */
export const myCustomTool: ToolDefinition = {
  // 工具名称（唯一标识）
  name: 'my_custom_tool',
  
  // 工具描述（LLM会根据这个描述决定何时使用）
  description: '这是一个自定义工具，用于执行特定任务。详细描述工具的功能和使用场景。',
  
  // 参数定义
  parameters: {
    type: 'object',
    properties: {
      // 字符串参数
      input_text: {
        type: 'string',
        description: '输入文本的描述',
      },
      // 数字参数
      count: {
        type: 'number',
        description: '执行次数',
        default: 1,
      },
      // 布尔参数
      verbose: {
        type: 'boolean',
        description: '是否输出详细信息',
        default: false,
      },
      // 枚举参数
      mode: {
        type: 'string',
        description: '执行模式',
        enum: ['fast', 'normal', 'slow'],
        default: 'normal',
      },
      // 数组参数
      items: {
        type: 'array',
        description: '项目列表',
      },
    },
  },
  
  // 必需参数
  required: ['input_text'],
};
```

### 步骤2: 实现执行器 (Tool Executor)

在 `src/agent/tools/executors.ts` 中添加执行器：

```typescript
/**
 * 我的自定义工具执行器
 */
export const myCustomExecutor: ToolExecutor = async (args) => {
  // 1. 解析参数
  const { 
    input_text, 
    count = 1, 
    verbose = false,
    mode = 'normal',
    items 
  } = args as {
    input_text: string;
    count?: number;
    verbose?: boolean;
    mode?: string;
    items?: unknown[];
  };
  
  // 2. 参数验证
  if (!input_text || input_text.trim() === '') {
    return {
      success: false,
      error: 'input_text 参数不能为空',
    };
  }
  
  try {
    // 3. 执行核心逻辑
    let result = '';
    
    for (let i = 0; i < count; i++) {
      // 根据模式执行不同逻辑
      switch (mode) {
        case 'fast':
          result = processFast(input_text);
          break;
        case 'slow':
          result = await processSlow(input_text);
          break;
        default:
          result = processNormal(input_text);
      }
      
      if (verbose) {
        console.log(`第 ${i + 1} 次执行完成`);
      }
    }
    
    // 4. 返回成功结果
    return {
      success: true,
      input_text,
      count,
      mode,
      result,
      processedAt: new Date().toISOString(),
    };
    
  } catch (error) {
    // 5. 错误处理
    return {
      success: false,
      error: error instanceof Error ? error.message : '执行失败',
    };
  }
};
```

### 步骤3: 注册工具

#### 方法A: 添加到工具列表（推荐）

在 `src/agent/tools/definitions.ts` 的 `allTools` 数组中添加：

```typescript
export const allTools: ToolDefinition[] = [
  // ... 其他工具
  myCustomTool,  // 添加这行
];
```

在 `src/agent/tools/executors.ts` 的 `toolExecutors` 对象中添加：

```typescript
export const toolExecutors: Record<string, ToolExecutor> = {
  // ... 其他执行器
  my_custom_tool: myCustomExecutor,  // 添加这行
};
```

#### 方法B: 动态注册

在运行时动态注册：

```typescript
import { toolRegistry } from '@/agent';

// 注册新工具
toolRegistry.register('my_custom_tool', {
  definition: myCustomTool,
  execute: myCustomExecutor,
});

// 检查是否注册成功
if (toolRegistry.has('my_custom_tool')) {
  console.log('工具注册成功！');
}
```

### 步骤4: 更新配置

在 `src/agent/index.ts` 中更新默认配置：

```typescript
export const defaultAgentConfig = {
  // ...
  tools: [
    // ... 其他工具
    'my_custom_tool',  // 添加这行
  ],
};
```

---

## 完整示例

### 示例: 天气查询工具

```typescript
// === definitions.ts ===

export const weatherTool: ToolDefinition = {
  name: 'get_weather',
  description: '获取指定城市的天气信息，包括温度、湿度、风速等',
  parameters: {
    type: 'object',
    properties: {
      city: {
        type: 'string',
        description: '城市名称，如"北京"、"上海"',
      },
      unit: {
        type: 'string',
        description: '温度单位',
        enum: ['celsius', 'fahrenheit'],
        default: 'celsius',
      },
      days: {
        type: 'number',
        description: '预报天数，1-7天',
        default: 1,
      },
    },
  },
  required: ['city'],
};

// === executors.ts ===

export const weatherExecutor: ToolExecutor = async (args) => {
  const { city, unit = 'celsius', days = 1 } = args as {
    city: string;
    unit?: string;
    days?: number;
  };
  
  try {
    // 调用天气API
    const response = await fetch(
      `https://api.weather.com/v1/forecast?city=${encodeURIComponent(city)}&days=${days}`
    );
    
    if (!response.ok) {
      throw new Error('天气服务暂时不可用');
    }
    
    const data = await response.json();
    
    // 转换温度单位
    const temp = unit === 'fahrenheit' 
      ? data.temp * 9/5 + 32 
      : data.temp;
    
    return {
      success: true,
      city,
      unit,
      current: {
        temp: Math.round(temp),
        humidity: data.humidity,
        wind: data.wind_speed,
        condition: data.condition,
      },
      forecast: data.forecast,
      updatedAt: new Date().toISOString(),
    };
    
  } catch (error) {
    return {
      success: false,
      error: `获取天气失败: ${error instanceof Error ? error.message : '未知错误'}`,
    };
  }
};
```

---

## 最佳实践

### 1. 工具命名规范

```typescript
// ✅ 好的命名
name: 'get_weather'        // 动词_名词
name: 'image_generation'   // 名词_动作
name: 'pdf_processor'      // 名词_功能

// ❌ 不好的命名
name: 'weather'            // 不够具体
name: 'doSomething'        // 含义不清
```

### 2. 描述要详细

```typescript
// ✅ 好的描述
description: '获取指定城市的天气信息，包括当前温度、湿度、风速、空气质量以及未来几天的天气预报。'

// ❌ 不好的描述
description: '查天气'
```

### 3. 参数验证

```typescript
export const myExecutor: ToolExecutor = async (args) => {
  // 类型检查
  const { count } = args as { count?: number };
  if (count !== undefined && (count < 1 || count > 100)) {
    return {
      success: false,
      error: 'count 必须在 1-100 之间',
    };
  }
  
  // 必需参数检查
  const { required_param } = args as { required_param?: string };
  if (!required_param) {
    return {
      success: false,
      error: '缺少必需参数: required_param',
    };
  }
  
  // ... 执行逻辑
};
```

### 4. 错误处理

```typescript
export const myExecutor: ToolExecutor = async (args) => {
  try {
    const result = await riskyOperation();
    return { success: true, result };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : '未知错误' 
    };
  }
};
```

---

## 文件结构

```
src/agent/tools/
├── definitions.ts      # 工具定义
├── executors.ts        # 工具执行器
├── registry.ts         # 工具注册表
└── builtin.ts          # 内置工具
```

---

## 总结

添加新工具的流程：

1. **定义工具** → `definitions.ts`
2. **实现执行器** → `executors.ts`
3. **注册工具** → 添加到 `allTools` 和 `toolExecutors`
4. **更新配置** → 添加到 `defaultAgentConfig.tools`
5. **测试验证** → 确保工具正常工作

完成以上步骤后，Agent就能自动识别并使用新添加的工具了！
