import React, { useState, useEffect } from "react";
import Live2DViewer from "../components/Live2DViewer";
import ErrorBoundary from "../components/ErrorBoundary";
import styles from './MainPage.module.css';

const MainPage: React.FC = () => {
  const [message, setMessage] = useState<string>('你好！欢迎来到这里。'); // 初始欢迎消息
  
  // 使用useEffect处理消息的自动消失
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        setMessage(''); // 5秒后清空消息
      }, 5000);

      // 组件卸载或消息更新时清除计时器
      return () => clearTimeout(timer);
    }
  }, [message]);

  const handleMessage = (newMessage: string) => {
    setMessage(newMessage);
  };

  return (
    <div className={styles.container}>
      {/* 上方消息区域 */}
      <div className={styles.messageContainer}>
        {message && (
          <div className={styles.bubble}>
            {message}
          </div>
        )}
      </div>
      
      {/* 下方模型区域 */}
      <div className={styles.modelContainer}>
        <ErrorBoundary>
          {/* 简化模式切换已移除，默认使用完整模式 */}
          <Live2DViewer onMessage={handleMessage} />
        </ErrorBoundary>
      </div>
    </div>
  );
};

export default MainPage; 