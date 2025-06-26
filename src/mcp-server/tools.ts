// @ts-ignore
import { Tool } from '@modelcontextprotocol/sdk/dist/cjs/server';
import WebSocket from 'ws';

// 这是一个基础工具类，包含了与前端通信的通用逻辑
class FrontendTool extends Tool {
  public ws: WebSocket | null = null;

  // 设置 WebSocket 连接实例
  setWs(ws: WebSocket) {
    this.ws = ws;
  }

  // 向前端发送消息
  public sendToFrontend(message: object) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.error('WebSocket connection not available or not open.');
    }
  }
}

// 显示通知的工具
export const showNotificationTool = new (class ShowNotification extends FrontendTool {
  // MCP工具名称
  name = 'show_notification';
  // 工具描述
  description = 'Displays a notification on the desktop pet screen.';
  // 定义输入参数
  input_schema = {
    type: 'object',
    properties: {
      title: { type: 'string', description: 'The title of the notification.' },
      message: { type: 'string', description: 'The message body of the notification.' }
    },
    required: ['title', 'message']
  };

  // 工具的执行逻辑
  async run(args: { title: string; message: string }): Promise<any> {
    console.log(`Executing show_notification tool with args:`, args);
    this.sendToFrontend({
      type: 'show-notification',
      title: args.title,
      message: args.message,
      timestamp: new Date().toISOString()
    });
    return { success: true, message: 'Notification sent to frontend.' };
  }
})();

// 提问并获取选项的工具
export const askQuestionTool = new (class AskQuestion extends FrontendTool {
  name = 'ask_question';
  description = 'Asks the user a question with multiple choices and returns their answer.';
  input_schema = {
    type: 'object',
    properties: {
      question: { type: 'string', description: 'The question to ask the user.' },
      options: {
        type: 'array',
        items: { type: 'string' },
        description: 'A list of options for the user to choose from.'
      }
    },
    required: ['question', 'options']
  };

  // 工具的执行逻辑
  async run(args: { question: string; options: string[] }): Promise<any> {
    console.log(`Executing ask_question tool with args:`, args);

    return new Promise((resolve) => {
      // 构造发送给前端的消息
      const messagePayload = {
        type: 'ask-question',
        question: args.question,
        options: args.options,
        timestamp: new Date().toISOString()
      };

      this.sendToFrontend(messagePayload);

      // 监听前端返回的答案
      const onMessage = (message: Buffer) => {
        try {
          const parsedMessage = JSON.parse(message.toString());
          if (parsedMessage.type === 'question-response' && parsedMessage.question === args.question) {
            // 收到正确的回应，移除监听器并返回结果
            this.ws?.removeListener('message', onMessage);
            resolve({ success: true, answer: parsedMessage.answer });
          }
        } catch (error) {
          console.error('Error parsing message from frontend:', error);
          this.ws?.removeListener('message', onMessage);
          resolve({ success: false, error: 'Invalid response from frontend.' });
        }
      };
      
      this.ws?.on('message', onMessage);

      // 设置超时
      setTimeout(() => {
        this.ws?.removeListener('message', onMessage);
        resolve({ success: false, error: 'Question timed out.' });
      }, 30000); // 30秒超时
    });
  }
})(); 