/**
 * 简化的Live2D演示组件
 * 当完整Live2D加载失败时的备选方案
 */

import React, { useEffect, useState } from 'react';
import { LAppDelegate } from '../lapp/lappdelegate';
import * as LAppDefine from '../lapp/lappdefine';

interface SimpleLive2DDemoProps {
  onMessage?: (message: string) => void;
}

const SimpleLive2DDemo: React.FC<SimpleLive2DDemoProps> = ({ onMessage }) => {
  const [currentMessage, setCurrentMessage] = useState<string>('');
  const [showMessage, setShowMessage] = useState(false);
  const [isWaving, setIsWaving] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

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

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
    const y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
    setMousePos({ x, y });
  };

  const handleClick = () => {
    setIsWaving(true);
    setTimeout(() => setIsWaving(false), 1000);
  };

  return (
    <div 
      style={{ 
        position: 'relative', 
        width: '100%', 
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
        borderRadius: '12px',
        cursor: 'pointer',
        overflow: 'hidden'
      }}
      onMouseMove={handleMouseMove}
      onClick={handleClick}
    >
      {/* 背景装饰 */}
      <div style={{
        position: 'absolute',
        top: '20px',
        right: '20px',
        fontSize: '24px',
        opacity: 0.3
      }}>
        ✨
      </div>
      <div style={{
        position: 'absolute',
        bottom: '20px',
        left: '20px',
        fontSize: '18px',
        opacity: 0.3
      }}>
        🌸
      </div>

      {/* 简化的"Live2D"角色 */}
      <div style={{
        transform: `translate(${mousePos.x * 20}px, ${mousePos.y * 20}px) ${isWaving ? 'scale(1.1)' : 'scale(1)'}`,
        transition: isWaving ? 'transform 0.3s ease' : 'transform 0.5s ease',
        textAlign: 'center'
      }}>
        <div style={{
          fontSize: '120px',
          marginBottom: '10px',
          transform: isWaving ? 'rotate(10deg)' : 'rotate(0deg)',
          transition: 'transform 0.3s ease'
        }}>
          🐕
        </div>
        <div style={{
          fontSize: '24px',
          color: '#667eea',
          fontWeight: 'bold',
          textShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          Mimi
        </div>
        <div style={{
          fontSize: '14px',
          color: '#888',
          marginTop: '5px'
        }}>
          {isWaving ? '你好！👋' : '移动鼠标与我互动'}
        </div>
      </div>

      {/* 状态指示 */}
      <div style={{
        position: 'absolute',
        top: '15px',
        left: '15px',
        background: 'rgba(102, 126, 234, 0.1)',
        padding: '8px 12px',
        borderRadius: '20px',
        fontSize: '12px',
        color: '#667eea',
        fontWeight: '500'
      }}>
        🎮 简化版Live2D
      </div>

      {/* 消息提醒气泡 */}
      {showMessage && (
        <div style={{
          position: 'absolute',
          top: '80px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(255, 255, 255, 0.95)',
          padding: '15px 20px',
          borderRadius: '20px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          fontSize: '16px',
          color: '#333',
          maxWidth: '300px',
          textAlign: 'center',
          animation: 'fadeInUp 0.3s ease-out',
          border: '2px solid #e3f2fd',
          zIndex: 10
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

      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default SimpleLive2DDemo; 