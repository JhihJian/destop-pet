# 🐾 Live2D 桌面宠物 - Mimi

基于 Tauri + React + Live2D 的可爱桌面宠物应用，让您的工作更有趣！

![Desktop Pet Preview](doc/preview.png)

## ✨ 主要功能

- 🎮 **Live2D 模型展示** - 使用 Mimi_Dog 模型，支持交互动画
- ⏰ **智能提醒** - 每30分钟自动提醒您休息和保持健康
- 🖱️ **鼠标交互** - 模型会跟随鼠标移动，点击有惊喜
- 📝 **消息记录** - 记录所有提醒消息，随时查看
- 🎨 **现代界面** - 美观的渐变背景和毛玻璃效果

## 🚀 快速开始

### 安装依赖
```bash
npm install
```

### 启动开发服务器
```bash
npm run dev
```

### 构建桌面应用
```bash
npm run tauri dev
```

## 📖 使用说明

1. **与 Mimi 互动**：点击模型或移动鼠标，Mimi 会有相应反应
2. **健康提醒**：每30分钟会弹出可爱的健康提醒消息
3. **快捷操作**：使用右侧面板的按钮进行测试和管理
4. **消息记录**：所有提醒消息都会被记录在侧边栏中

## 🛠️ 技术架构

- **Frontend**: React + TypeScript + Vite
- **Desktop**: Tauri (Rust)
- **Graphics**: Live2D CubismSDK + WebGL
- **Styling**: CSS Modules + 现代化设计

## 📁 项目结构

```
src/
├── live2d/          # Live2D 核心功能
├── components/      # React 组件
├── models/          # Live2D 模型资源
├── pages/           # 页面组件
└── types/           # TypeScript 类型定义
```

## 🎯 自定义配置

### 修改提醒间隔
编辑 `src/live2d/LAppDefine.ts`：
```typescript
export const ReminderInterval = 30 * 60 * 1000; // 改为您想要的间隔
```

### 添加新的提醒消息
在同一文件中的 `ReminderMessages` 数组中添加：
```typescript
export const ReminderMessages = [
  "您的自定义消息 😊",
  // ... 更多消息
];
```

## 📚 详细文档

- [使用说明](doc/Live2D桌面宠物使用说明.md)
- [开发记录](doc/研发记录.md)

## 🤝 贡献

欢迎提交 Issues 和 Pull Requests！

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

Live2D SDK 部分遵循 [Live2D 开源许可协议](https://www.live2d.com/eula/live2d-open-software-license-agreement_en.html)

---

💝 **享受与 Mimi 的美好时光！** 