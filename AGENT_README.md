# AI Agent - 三端智能助手应用

一个完整的跨平台AI Agent应用，支持Web、桌面和移动端。

## 项目结构

```
my-project/
├── src/                          # Web端源码 (Next.js)
│   ├── agent/                    # Agent核心代码 (共享)
│   │   ├── core/                 # 核心引擎
│   │   │   ├── types.ts          # 类型定义
│   │   │   ├── engine.ts         # Agent引擎
│   │   │   └── platform.ts       # 平台适配器
│   │   ├── tools/                # 工具系统
│   │   │   ├── registry.ts       # 工具注册表
│   │   │   └── builtin.ts        # 内置工具
│   │   ├── memory/               # 记忆系统
│   │   │   └── manager.ts        # 记忆管理器
│   │   ├── hooks/                # React Hooks
│   │   │   └── index.ts          # Agent Hooks
│   │   ├── plugins/              # 插件系统
│   │   ├── utils.ts              # 工具函数
│   │   └── index.ts              # 入口文件
│   ├── components/               # UI组件
│   │   ├── agent/                # Agent组件
│   │   │   └── AgentChat.tsx     # 聊天界面
│   │   └── ui/                   # 基础UI组件
│   └── app/                      # Next.js页面
│       ├── page.tsx              # 主页
│       └── layout.tsx            # 布局
│
├── desktop/                      # 桌面端 (Tauri)
│   ├── package.json              # 依赖配置
│   └── src-tauri/                # Tauri配置
│       ├── tauri.conf.json       # Tauri设置
│       ├── Cargo.toml            # Rust依赖
│       └── src/
│           └── main.rs           # Rust入口
│
└── mobile/                       # 移动端 (React Native + Expo)
    ├── App.tsx                   # 应用入口
    ├── package.json              # 依赖配置
    └── src/
        ├── screens/              # 屏幕
        │   ├── ChatScreen.tsx    # 聊天屏幕
        │   ├── ConversationListScreen.tsx  # 会话列表
        │   └── SettingsScreen.tsx # 设置屏幕
        └── components/           # 组件
```

## 技术栈

### Web端
- **框架**: Next.js 15 + React 19
- **UI**: Tailwind CSS + shadcn/ui
- **状态**: React Hooks
- **存储**: LocalStorage

### 桌面端
- **框架**: Tauri 2.0
- **前端**: 复用Web端代码
- **后端**: Rust
- **特性**: 文件系统、剪贴板、通知

### 移动端
- **框架**: React Native + Expo
- **导航**: React Navigation
- **存储**: AsyncStorage
- **平台**: iOS + Android

### 共享核心
- **语言**: TypeScript
- **LLM**: z-ai-web-dev-sdk
- **工具**: 网络搜索、网页读取、计算器等

## 快速开始

### Web端开发

```bash
# 安装依赖
bun install

# 启动开发服务器
bun run dev

# 构建生产版本
bun run build
```

访问 http://localhost:3000

### 桌面端开发

```bash
# 进入桌面目录
cd desktop

# 安装依赖
bun install

# 安装Rust (如果未安装)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# 启动开发模式
bun run tauri dev

# 构建生产版本
bun run tauri build
```

### 移动端开发

```bash
# 进入移动目录
cd mobile

# 安装依赖
bun install

# 安装Expo CLI
bun add -g expo-cli

# 启动开发服务器
bun start

# 运行在iOS模拟器
bun run ios

# 运行在Android模拟器
bun run android
```

## 核心功能

### 1. Agent引擎

```typescript
import { AgentCore, createPlatformAdapter, defaultAgentConfig } from '@/agent';

// 创建Agent实例
const platform = await createPlatformAdapter();
const agent = new AgentCore({
  ...defaultAgentConfig,
  name: 'My Agent',
  model: 'gpt-4o',
}, platform);

// 发送消息
const response = await agent.sendMessage('你好！');
```

### 2. 工具系统

```typescript
import { ToolRegistry, webSearchTool, webSearchExecutor } from '@/agent';

const registry = new ToolRegistry();
registry.register('web_search', {
  definition: webSearchTool,
  execute: webSearchExecutor,
});

// 执行工具
const result = await registry.execute('web_search', { query: 'AI news' });
```

### 3. 记忆管理

```typescript
import { MemoryManager } from '@/agent';

const memory = new MemoryManager({
  enabled: true,
  maxMessages: 50,
  maxTokens: 8000,
});

// 准备上下文
const context = await memory.prepareContext(conversation);
```

### 4. React Hooks

```typescript
import { useAgent, useMessages } from '@/agent/hooks';

function ChatComponent() {
  const { state, sendMessage, createConversation } = useAgent();
  const { messages } = useMessages(agent);

  return (
    // UI实现
  );
}
```

## 内置工具

| 工具 | 描述 |
|------|------|
| `web_search` | 搜索互联网获取实时信息 |
| `web_reader` | 读取网页内容 |
| `calculator` | 执行数学计算 |
| `get_time` | 获取当前时间 |
| `code_executor` | 执行JavaScript代码 |
| `json_processor` | 处理JSON数据 |

## 扩展开发

### 添加自定义工具

```typescript
import { ToolDefinition, ToolExecutor } from '@/agent';

const myTool: ToolDefinition = {
  name: 'my_tool',
  description: '自定义工具描述',
  parameters: {
    type: 'object',
    properties: {
      param1: {
        type: 'string',
        description: '参数描述',
      },
    },
  },
  required: ['param1'],
};

const myExecutor: ToolExecutor = async (args) => {
  // 实现工具逻辑
  return { result: 'success' };
};
```

### 添加插件

```typescript
import { AgentPlugin } from '@/agent';

const myPlugin: AgentPlugin = {
  id: 'my-plugin',
  name: 'My Plugin',
  version: '1.0.0',
  description: '自定义插件',
  tools: [myTool],
  execute: myExecutor,
  onActivate: async (agent) => {
    console.log('Plugin activated');
  },
};

await agent.registerPlugin(myPlugin);
```

## 平台特性

### Web端
- 响应式设计
- PWA支持
- 本地存储
- 剪贴板API

### 桌面端
- 原生窗口
- 文件系统访问
- 系统通知
- 系统托盘
- 自动更新

### 移动端
- 原生UI
- 推送通知
- 相机/相册
- 分享功能
- 深色模式

## 配置选项

```typescript
interface AgentConfig {
  name: string;           // Agent名称
  description: string;    // Agent描述
  model: string;          // LLM模型
  systemPrompt: string;   // 系统提示词
  temperature: number;    // 温度参数
  maxTokens: number;      // 最大Token数
  tools: string[];        // 可用工具列表
  memory: MemoryConfig;   // 记忆配置
}
```

## 部署

### Web端
```bash
# Vercel
vercel deploy

# Docker
docker build -t ai-agent .
docker run -p 3000:3000 ai-agent
```

### 桌面端
```bash
# 构建所有平台
bun run tauri build

# 输出位置
# macOS: src-tauri/target/release/bundle/dmg/
# Windows: src-tauri/target/release/bundle/msi/
# Linux: src-tauri/target/release/bundle/deb/
```

### 移动端
```bash
# iOS
eas build --platform ios

# Android
eas build --platform android
```

## 许可证

MIT License

## 贡献

欢迎提交Issue和Pull Request！
