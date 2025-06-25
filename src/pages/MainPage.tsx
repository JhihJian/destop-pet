import React, { useState } from "react";
import Live2DViewer from "../components/Live2DViewer";
import SimpleLive2DDemo from "../components/SimpleLive2DDemo";
import ErrorBoundary from "../components/ErrorBoundary";
import styles from './MainPage.module.css';

const MainPage: React.FC = () => {
  const [messageHistory, setMessageHistory] = useState<string[]>([]);
  const [useSimpleMode, setUseSimpleMode] = useState<boolean>(false);

  const handleMessage = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const newMessage = `[${timestamp}] ${message}`;
    setMessageHistory(prev => [newMessage, ...prev].slice(0, 10)); // 保留最近10条消息
  };

  return (
    <div className={styles.container}>
      {/* 顶部状态栏 */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>桌面宠物 - Mimi</h1>
          <div className={styles.subtitle}>您的专属 Live2D 桌面伙伴</div>
        </div>
        <div className={styles.headerRight}>
          <button 
            className={styles.modeButton}
            onClick={() => setUseSimpleMode(!useSimpleMode)}
          >
            {useSimpleMode ? '🎮 简化模式' : '⚡ 完整模式'}
          </button>
          <div className={styles.statusIndicator}>
            <div className={styles.statusDot}></div>
            <span>在线</span>
          </div>
        </div>
      </header>

      {/* 主要内容区域 */}
      <main className={styles.main}>
        {/* Live2D 展示区域 */}
        <div className={styles.live2dContainer}>
          <ErrorBoundary>
            {useSimpleMode ? (
              <SimpleLive2DDemo onMessage={handleMessage} />
            ) : (
              <Live2DViewer onMessage={handleMessage} />
            )}
          </ErrorBoundary>
        </div>

        {/* 侧边信息面板 */}
        <aside className={styles.sidebar}>
          <div className={styles.infoCard}>
            <h3>互动说明</h3>
            <div className={styles.instructions}>
              <div className={styles.instruction}>
                <span className={styles.icon}>👆</span>
                <span>点击与 Mimi 互动</span>
              </div>
              <div className={styles.instruction}>
                <span className={styles.icon}>🖱️</span>
                <span>鼠标移动让 Mimi 跟随</span>
              </div>
              <div className={styles.instruction}>
                <span className={styles.icon}>⏰</span>
                <span>每30分钟会有提醒消息</span>
              </div>
              <div className={styles.instruction}>
                <span className={styles.icon}>🔄</span>
                <span>可切换简化/完整模式</span>
              </div>
            </div>
          </div>

          <div className={styles.messageCard}>
            <h3>消息记录</h3>
            <div className={styles.messageList}>
              {messageHistory.length === 0 ? (
                <div className={styles.emptyMessage}>暂无消息记录</div>
              ) : (
                messageHistory.map((message, index) => (
                  <div key={index} className={styles.messageItem}>
                    {message}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className={styles.controlCard}>
            <h3>快捷操作</h3>
            <div className={styles.controls}>
              <button 
                className={styles.controlButton}
                onClick={() => handleMessage(`手动测试消息 🎮 (${useSimpleMode ? '简化' : '完整'}模式)`)}
              >
                测试提醒
              </button>
              <button 
                className={styles.controlButton}
                onClick={() => setMessageHistory([])}
              >
                清空记录
              </button>
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
};

export default MainPage; 