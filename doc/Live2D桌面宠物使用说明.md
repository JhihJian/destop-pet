# Live2D桌面宠物 - Mimi 使用说明

## 功能概述

这是一个基于 Tauri + React + Live2D 的桌面宠物应用，主要功能包括：

- 🎮 Live2D 模型展示（Mimi_Dog）
- ⏰ 每30分钟自动提醒休息
- 🖱️ 交互功能（点击、鼠标跟随）
- 📝 消息记录功能
- 🎨 美观的现代化界面

## 主要特性

### 1. Live2D 模型展示
- 使用 Live2D CubismSDK 进行模型渲染
- 支持鼠标交互，模型会跟随鼠标移动
- 点击可以触发模型动画

### 2. 定时提醒功能
- 每30分钟自动显示健康提醒消息
- 随机显示8种不同的提醒内容：
  - "该起来活动一下啦！💪"
  - "记得喝水哦~ 💧"
  - "休息一下，看看远方 👀"
  - "该伸伸懒腰了~ 🤸‍♀️"
  - "工作辛苦了，休息一下吧 ☕"
  - "记得保护眼睛哦~ 👁️"
  - "该换个姿势坐着了 🪑"
  - "深呼吸，放松一下~ 🌸"

### 3. 交互说明
- **点击模型**：与 Mimi 进行互动
- **鼠标移动**：模型会跟随鼠标方向
- **测试提醒**：手动触发提醒消息
- **清空记录**：清除所有消息记录

## 技术架构

### 前端技术栈
- **Tauri**: 跨平台桌面应用框架
- **React**: 用户界面库
- **TypeScript**: 类型安全的 JavaScript
- **Vite**: 快速构建工具

### Live2D 集成
- **CubismSDK for Web**: Live2D 官方 SDK
- **WebGL 渲染**: 硬件加速的图形渲染
- **模型资源**: Mimi_Dog 狗狗模型

## 项目结构

```
src/
├── live2d/                 # Live2D 相关代码
│   ├── LAppDefine.ts       # 配置定义
│   ├── LAppDelegate.ts     # 主委托类
│   ├── LAppGlManager.ts    # WebGL 管理器
│   ├── LAppModel.ts        # 模型管理类
│   └── LAppView.ts         # 视图管理类
├── components/             # React 组件
│   └── Live2DViewer.tsx    # Live2D 展示组件
├── models/                 # Live2D 模型资源
│   └── Mimi_Dog/          # 狗狗模型文件
├── pages/                  # 页面组件
│   └── MainPage.tsx        # 主页面
└── types/                  # TypeScript 类型声明
    └── live2d.d.ts         # Live2D 类型定义
```

## 开发说明

### 安装依赖
```bash
npm install
```

### 启动开发服务器
```bash
npm run dev
```

### 构建应用
```bash
npm run build
```

### 启动 Tauri 应用
```bash
npm run tauri dev
```

## 自定义配置

### 修改提醒间隔
在 `src/live2d/LAppDefine.ts` 中修改：
```typescript
export const ReminderInterval = 30 * 60 * 1000; // 30分钟（毫秒）
```

### 添加提醒消息
在 `src/live2d/LAppDefine.ts` 中的 `ReminderMessages` 数组中添加新消息：
```typescript
export const ReminderMessages = [
  "该起来活动一下啦！💪",
  "记得喝水哦~ 💧",
  // 在这里添加新的消息...
];
```

### 更换 Live2D 模型
1. 将新模型文件放入 `src/models/` 目录
2. 在 `LAppDefine.ts` 中修改 `ModelDir` 数组
3. 确保模型文件包含必要的资源文件（.model3.json, .moc3, 纹理等）

## 常见问题

### Q: Live2D 模型不显示？
A: 检查以下几点：
- 确保模型文件路径正确
- 检查浏览器控制台是否有错误信息
- 确认 Live2D Core 文件已正确加载

### Q: 提醒功能不工作？
A: 检查：
- 浏览器是否允许定时器运行
- 开发者工具中是否有 JavaScript 错误

### Q: 性能问题？
A: 可以尝试：
- 降低渲染帧率
- 优化模型复杂度
- 检查 WebGL 兼容性

## 更新日志

### v1.0.0 (当前版本)
- ✅ 基础 Live2D 模型展示功能
- ✅ 定时提醒系统
- ✅ 基础交互功能
- ✅ 消息记录功能
- ✅ 响应式界面设计

### 计划功能
- 🔄 更多 Live2D 模型支持
- 🔄 自定义提醒设置
- 🔄 声音提醒功能
- 🔄 系统托盘集成
- 🔄 主题切换功能

## 贡献指南

欢迎提交 Issue 和 Pull Request 来帮助改进这个项目！

## 许可证

本项目使用 MIT 许可证。Live2D SDK 部分遵循 Live2D 官方许可协议。 