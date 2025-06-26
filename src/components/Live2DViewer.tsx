/**
 * Live2D桌面宠物组件
 */

import React, { useEffect, useRef, useState } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { LAppDelegate } from '../live2d/LAppDelegate';
import * as LAppDefine from '../live2d/LAppDefine';

interface Live2DViewerProps {
  onMessage?: (message: string) => void;
}

const Live2DViewer: React.FC<Live2DViewerProps> = ({ onMessage }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const delegateRef = useRef<LAppDelegate | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentMessage, setCurrentMessage] = useState<string>('');
  const [showMessage, setShowMessage] = useState(false);
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const initializeLive2D = async () => {
      if (!canvasRef.current) return;

      try {
        const delegate = LAppDelegate.getInstance();
        delegateRef.current = delegate;

        const success = await delegate.initialize(canvasRef.current);
        if (success) {
          delegate.startRenderLoop();
          setIsLoaded(true);
          console.log('Live2D initialized successfully');
        } else {
          console.error('Failed to initialize Live2D');
        }
      } catch (error) {
        console.error('Error initializing Live2D:', error);
      }
    };

    initializeLive2D();

    // 清理函数
    return () => {
      try {
        if (delegateRef.current) {
          delegateRef.current.stopRenderLoop();
          delegateRef.current = null;
        }
      } catch (error) {
        console.warn('Error during cleanup:', error);
      }
    };
  }, []);

  // 定时提醒功能
  useEffect(() => {
    const showReminder = () => {
      const messages = LAppDefine.ReminderMessages;
      const randomMessage = messages[Math.floor(Math.random() * messages.length)];
      
      setCurrentMessage(randomMessage);
      setShowMessage(true);
      
      // 触发外部回调
      if (onMessage) {
        onMessage(randomMessage);
      }

      // 3秒后隐藏消息
      setTimeout(() => {
        setShowMessage(false);
      }, 3000);
    };

    // 立即显示第一条消息（测试用）
    setTimeout(showReminder, 2000);

    // 设置定时器
    const intervalId = setInterval(showReminder, LAppDefine.ReminderInterval);

    return () => {
      clearInterval(intervalId);
    };
  }, [onMessage]);

  // 处理拖拽开始
  const handleDragStart = async (event: React.MouseEvent) => {
    setIsDragging(true);
    try {
      const window = getCurrentWindow();
      await window.startDragging();
    } catch (error) {
      console.error('Failed to start dragging:', error);
    }
  };

  // 检查点击位置是否在模型上（更精确的区域检测）
  const isClickOnModel = (x: number, y: number, canvasWidth: number, canvasHeight: number): boolean => {
    // 更精确的模型区域检测 - 减小检测区域，避免误触
    const modelCenterX = canvasWidth / 2;
    const modelCenterY = canvasHeight * 0.55; // 模型稍微偏下
    const modelWidth = canvasWidth * 0.35; // 减小到35%宽度，更精确
    const modelHeight = canvasHeight * 0.5; // 减小到50%高度
    
    const left = modelCenterX - modelWidth / 2;
    const right = modelCenterX + modelWidth / 2;
    const top = modelCenterY - modelHeight / 2;
    const bottom = modelCenterY + modelHeight / 2;
    
    return x >= left && x <= right && y >= top && y <= bottom;
  };

  // 处理画布点击事件
  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement | HTMLDivElement>) => {
    if (isDragging) {
      setIsDragging(false);
      return;
    }

    if (!delegateRef.current || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // 检查是否点击在模型区域
    if (!isClickOnModel(x, y, canvasRef.current.width, canvasRef.current.height)) {
      // 如果不在模型区域，让事件穿透
      return;
    }

    console.log(`Canvas clicked at: ${x}, ${y}`);
    delegateRef.current.onTap(x, y);

    // 显示点击反馈
    setCurrentMessage('喵~ 🐱');
    setShowMessage(true);
    setTimeout(() => setShowMessage(false), 1500);
  };

  // 处理右键菜单
  const handleContextMenu = (event: React.MouseEvent<HTMLCanvasElement | HTMLDivElement>) => {
    event.preventDefault();
    setContextMenuPos({ x: event.clientX, y: event.clientY });
    setShowContextMenu(true);
  };

  // 隐藏右键菜单
  const hideContextMenu = () => {
    setShowContextMenu(false);
  };

  // 处理鼠标按下事件
  const handleMouseDown = (event: React.MouseEvent<HTMLCanvasElement | HTMLDivElement>) => {
    if (!canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // 检查是否在模型区域
    if (!isClickOnModel(x, y, canvasRef.current.width, canvasRef.current.height)) {
      return;
    }
    
    setIsMouseDown(true);
    hideContextMenu();
    
    // 如果按下的是左键且在模型上部区域，启动拖拽
    if (event.button === 0 && y < 100) {
      handleDragStart(event);
    }
  };

  // 处理鼠标抬起事件
  const handleMouseUp = (event: React.MouseEvent<HTMLCanvasElement | HTMLDivElement>) => {
    setIsMouseDown(false);
    setIsDragging(false);
  };

  // 处理鼠标移动事件
  const handleCanvasMouseMove = (event: React.MouseEvent<HTMLCanvasElement | HTMLDivElement>) => {
    if (!delegateRef.current || !canvasRef.current || isDragging) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // 检查是否在模型区域
    if (!isClickOnModel(x, y, canvasRef.current.width, canvasRef.current.height)) {
      return;
    }

    // 只有在鼠标按下时才进行拖拽，否则只是跟随
    if (isMouseDown) {
      delegateRef.current.onDrag(x, y);
    } else {
      // 鼠标跟随效果（更轻微的影响）
      delegateRef.current.onDrag(x * 0.3, y * 0.3);
    }
  };

  // 处理鼠标离开事件
  const handleMouseLeave = () => {
    if (!delegateRef.current) return;
    
    setIsMouseDown(false);
    setIsDragging(false);
    // 鼠标离开时返回中心位置
    delegateRef.current.onDrag(0, 0);
  };

  // 处理双击事件
  const handleDoubleClick = (event: React.MouseEvent<HTMLCanvasElement | HTMLDivElement>) => {
    if (!delegateRef.current || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // 检查是否在模型区域
    if (!isClickOnModel(x, y, canvasRef.current.width, canvasRef.current.height)) {
      return;
    }

    console.log('Double clicked Live2D model');
    
    // 显示特殊消息
    setCurrentMessage('主人好棒！✨');
    setShowMessage(true);
    setTimeout(() => setShowMessage(false), 2000);

    // 触发特殊动作
    const model = delegateRef.current.getModel();
    if (model) {
      model.startRandomMotion(LAppDefine.MotionGroupIdle, LAppDefine.PriorityNormal);
    }
  };

  // 退出应用
  const handleExit = async () => {
    try {
      const window = getCurrentWindow();
      await window.close();
    } catch (error) {
      console.error('Failed to close window:', error);
    }
  };

  // 播放动作
  const handlePlayMotion = () => {
    if (!delegateRef.current) return;
    const model = delegateRef.current.getModel();
    if (model) {
      model.startRandomMotion(LAppDefine.MotionGroupTapBody, LAppDefine.PriorityNormal);
    }
    hideContextMenu();
  };

  // 显示消息
  const handleShowMessage = () => {
    setCurrentMessage('你好！我是你的桌面小助手~ 😊');
    setShowMessage(true);
    setTimeout(() => setShowMessage(false), 2000);
    hideContextMenu();
  };

  // 切换置顶状态
  const handleToggleAlwaysOnTop = async () => {
    try {
      const window = getCurrentWindow();
      const isOnTop = await window.isAlwaysOnTop();
      await window.setAlwaysOnTop(!isOnTop);
      setCurrentMessage(!isOnTop ? '已设置置顶' : '已取消置顶');
      setShowMessage(true);
      setTimeout(() => setShowMessage(false), 1500);
    } catch (error) {
      console.error('Failed to toggle always on top:', error);
    }
    hideContextMenu();
  };

  return (
    <div className="live2d-desktop-container" onClick={hideContextMenu}>
      {/* 拖拽提示区域 */}
      <div 
        style={{
          position: 'absolute',
          top: 0,
          left: '20%',
          right: '20%',
          height: '80px',
          background: isDragging ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
          cursor: 'move',
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '12px',
          color: isDragging ? '#fff' : 'transparent',
          transition: 'all 0.2s ease',
          pointerEvents: 'all' // 拖拽区域可以交互
        }}
        onMouseDown={handleDragStart}
      >
        {isDragging && '拖拽移动'}
      </div>
      
      <canvas
        id="live2d-canvas"
        ref={canvasRef}
        width={400}
        height={500}
        style={{
          width: '100%',
          height: '100%',
          background: 'transparent',
          display: 'block',
          opacity: 1,
          pointerEvents: 'none' // Canvas本身不响应鼠标事件
        }}
      />
      
      {/* 透明覆盖层用于处理鼠标事件 */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'transparent',
          pointerEvents: 'none', // 默认穿透
          zIndex: 5
        }}
        onClick={handleCanvasClick}
        onDoubleClick={handleDoubleClick}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseMove={handleCanvasMouseMove}
        onMouseLeave={handleMouseLeave}
        onContextMenu={handleContextMenu}
      >
        {/* 模型交互区域 */}
        <div
          style={{
            position: 'absolute',
            left: '32.5%', // (100% - 35%) / 2
            top: '30%',   // 55% - 25%
            width: '35%',
            height: '50%',
            background: process.env.NODE_ENV === 'development' ? 'rgba(255, 0, 0, 0.1)' : 'transparent',
            pointerEvents: 'all', // 只有这个区域响应鼠标事件
            cursor: isDragging ? 'grabbing' : (isMouseDown ? 'grabbing' : 'pointer'),
            borderRadius: '50%' // 椭圆形区域更自然
          }}
        />
      </div>
      
      {/* 加载状态 */}
      {!isLoaded && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(255, 255, 255, 0.9)',
          padding: '15px 20px',
          borderRadius: '8px',
          textAlign: 'center',
          fontSize: '14px',
          color: '#333',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
        }}>
          正在加载宠物...
        </div>
      )}

      {/* 消息提醒气泡 */}
      {showMessage && (
        <div className="desktop-message-bubble" style={{
          top: '60px',
          left: '50%',
          transform: 'translateX(-50%)'
        }}>
          {currentMessage}
          <div style={{
            position: 'absolute',
            bottom: '-8px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '0',
            height: '0',
            borderLeft: '10px solid transparent',
            borderRight: '10px solid transparent',
            borderTop: '8px solid rgba(255, 255, 255, 0.95)'
          }} />
        </div>
      )}

      {/* 右键菜单 */}
      {showContextMenu && (
        <div 
          className="context-menu"
          style={{
            left: contextMenuPos.x,
            top: contextMenuPos.y
          }}
        >
          <button className="context-menu-item" onClick={handlePlayMotion}>
            🎭 播放动作
          </button>
          <button className="context-menu-item" onClick={handleShowMessage}>
            💬 说句话
          </button>
          <button className="context-menu-item" onClick={handleToggleAlwaysOnTop}>
            📌 切换置顶
          </button>
          <hr style={{ margin: '4px 0', border: 'none', borderTop: '1px solid #eee' }} />
          <button className="context-menu-item" onClick={handleExit}>
            ❌ 退出
          </button>
        </div>
      )}
    </div>
  );
};

export default Live2DViewer; 