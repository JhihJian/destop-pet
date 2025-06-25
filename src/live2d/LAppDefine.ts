/**
 * Live2D应用配置定义
 */

import { LogLevel } from '../live2d-framework/live2dcubismframework';

// Canvas配置
export const CanvasSize: { width: number; height: number } | 'auto' = 'auto';

// 视图配置
export const ViewScale = 1.0;
export const ViewMaxScale = 2.0;
export const ViewMinScale = 0.8;

export const ViewLogicalLeft = -1.0;
export const ViewLogicalRight = 1.0;
export const ViewLogicalBottom = -1.0;
export const ViewLogicalTop = 1.0;

export const ViewLogicalMaxLeft = -2.0;
export const ViewLogicalMaxRight = 2.0;
export const ViewLogicalMaxBottom = -2.0;
export const ViewLogicalMaxTop = 2.0;

// 资源路径  
export const ResourcesPath = './src/models/';

// 模型定义 - 使用Haru模型，它有完整的动作系统
export const ModelDir: string[] = ['Haru'];
export const ModelDirSize: number = ModelDir.length;

// 动作组
export const MotionGroupIdle = 'Idle';
export const MotionGroupTapBody = 'TapBody';
// 注意：Haru模型只有Idle和TapBody动作组，没有TapHead和TapMouth
// export const MotionGroupTapHead = 'TapHead';
// export const MotionGroupTapMouth = 'TapMouth';

// 碰撞区域
export const HitAreaNameHead = 'Head';
export const HitAreaNameBody = 'Body';

// 动作优先级
export const PriorityNone = 0;
export const PriorityIdle = 1;
export const PriorityNormal = 2;
export const PriorityForce = 3;

// 验证选项
export const MOCConsistencyValidationEnable = true;
export const MotionConsistencyValidationEnable = true;

// 调试选项
export const DebugLogEnable = true;
export const DebugTouchLogEnable = false;

// 日志级别
export const CubismLoggingLevel: LogLevel = LogLevel.LogLevel_Verbose;

// 渲染目标大小
export const RenderTargetWidth = 1900;
export const RenderTargetHeight = 1000;

// 消息提醒配置
export const ReminderInterval = 30 * 60 * 1000; // 30分钟（毫秒）

// 提醒消息列表
export const ReminderMessages = [
  "该起来活动一下啦！💪",
  "记得喝水哦~ 💧",
  "休息一下，看看远方 👀",
  "该伸伸懒腰了~ 🤸‍♀️",
  "工作辛苦了，休息一下吧 ☕",
  "记得保护眼睛哦~ 👁️",
  "该换个姿势坐着了 🪑",
  "深呼吸，放松一下~ 🌸"
]; 