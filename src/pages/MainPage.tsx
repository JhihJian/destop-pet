import React, { useState, useEffect } from "react";
import { listen, emit } from '@tauri-apps/api/event';
import Live2DViewer from "../components/Live2DViewer";
import ErrorBoundary from "../components/ErrorBoundary";
import InteractiveDialog from "../components/InteractiveDialog";
import styles from './MainPage.module.css';

// 定义从后端接收的事件负载类型
interface UserInputEventPayload {
  correlation_id: string;
  message: string;
  options?: string[];
}

// 定义对话框的状态类型
interface DialogState {
  isOpen: boolean;
  message: string;
  options: string[];
  correlationId: string | null;
}

const MainPage: React.FC = () => {
  const [message, setMessage] = useState<string>('你好！欢迎来到这里。');
  const [dialogState, setDialogState] = useState<{
    isOpen: boolean;
    message: string;
    options: string[];
    correlationId: string | null;
    hasInputField: boolean;
  }>({
    isOpen: false,
    message: '',
    options: [],
    correlationId: null,
    hasInputField: false,
  });

  // 后端事件监听
  useEffect(() => {
    const unlisten = listen<UserInputEventPayload>('request_user_input', (event) => {
      const { correlation_id, message, options } = event.payload;
      console.log('Received request_user_input event:', event.payload);
      setDialogState({
        isOpen: true,
        message,
        options: options || [],
        correlationId: correlation_id,
        hasInputField: !options || options.length === 0,
      });
    });

    // 组件卸载时停止监听
    return () => {
      unlisten.then(f => f());
    };
  }, []);

  // 处理消息气泡的自动消失
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        setMessage(''); // 5秒后清空消息
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const handleDialogSelect = async (response: string) => {
    if (dialogState.correlationId) {
      console.log('Sending user_input_response:', { correlation_id: dialogState.correlationId, response });
      await emit('user_input_response', {
        correlation_id: dialogState.correlationId,
        response,
      });
    }
    setDialogState({ isOpen: false, message: '', options: [], correlationId: null, hasInputField: false });
  };
  
  const handleMessage = (newMessage: string) => {
    setMessage(newMessage);
  };

  return (
    <div className={styles.container}>
      {/* 上方消息区域 */}
      <div className={styles.messageContainer}>
        <InteractiveDialog
          isOpen={dialogState.isOpen}
          message={dialogState.message}
          options={dialogState.options}
          onSelect={handleDialogSelect}
          hasInputField={dialogState.hasInputField}
        />
        
        {!dialogState.isOpen && message && (
          <div className={styles.bubble}>
            {message}
          </div>
        )}
      </div>
      
      {/* 下方模型区域 */}
      <div className={styles.modelContainer}>
        <ErrorBoundary>
          <Live2DViewer onMessage={handleMessage} />
        </ErrorBoundary>
      </div>
    </div>
  );
};

export default MainPage;