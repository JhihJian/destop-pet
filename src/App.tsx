import React, { useState, useEffect } from 'react';
import Live2DViewer from './components/Live2DViewer';
import { useMcpSocket } from './hooks/useMcpSocket';
import { NotificationDialog } from './components/NotificationDialog';
import './App.css';

const App: React.FC = () => {
  const { isConnected, lastMessage, sendMessage, notificationDialog, closeNotificationDialog } = useMcpSocket();
  
  // 开发模式标志 - 可通过 Ctrl+Shift+D 切换
  const [isDevelopmentMode, setIsDevelopmentMode] = useState(false);

  // 监听快捷键切换开发模式
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key === 'D') {
        event.preventDefault();
        setIsDevelopmentMode(prev => !prev);
        console.log('Development mode:', !isDevelopmentMode ? 'enabled' : 'disabled');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDevelopmentMode]);

  const handleTestMessage = () => {
    sendMessage({
      type: 'ping',
      message: 'Test message from frontend',
      timestamp: new Date().toISOString()
    });
  };

  const handleTestNotification = () => {
    sendMessage({
      type: 'request-notification',
      title: 'Test Notification',
      message: 'This is a test notification from your desktop pet!',
      timestamp: new Date().toISOString()
    });
  };

  return (
    <div className="desktop-pet-container">
      {/* 开发模式下显示连接状态和测试按钮 */}
      {isDevelopmentMode && (
        <>
          <div className="connection-status">
            WebSocket: {isConnected ? 'Connected' : 'Disconnected'}
          </div>
          
          {isConnected && (
            <div className="dev-controls" style={{ padding: '10px', background: '#f0f0f0', margin: '10px' }}>
              <button onClick={handleTestMessage} style={{ marginRight: '10px' }}>
                Send Test Message
              </button>
              <button onClick={handleTestNotification}>
                Test Notification
              </button>
              {lastMessage && (
                <div style={{ marginTop: '10px' }}>
                  <strong>Last Message:</strong>
                  <pre>{JSON.stringify(lastMessage, null, 2)}</pre>
                </div>
              )}
            </div>
          )}
        </>
      )}
      
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        <Live2DViewer />
        
        {/* Live2D 模型上的通知对话框覆盖层 */}
        {notificationDialog && (
          <div className="live2d-notification-overlay">
            <NotificationDialog
              title={notificationDialog.title}
              message={notificationDialog.message}
              isVisible={true}
              onClose={closeNotificationDialog}
              autoCloseDelay={8000} // 8秒后自动关闭
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
