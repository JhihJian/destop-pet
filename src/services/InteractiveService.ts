/**
 * @file InteractiveService.ts
 * @description 该模块封装了与用户进行交互的底层功能，
 * 例如显示对话框、发送通知、进行命令行聊天等。
 * React组件应通过调用此模块中的函数来执行这些操作，
 * 以实现与具体实现（Tauri命令、模拟工具等）的解耦。
 */

/**
 * 向用户弹出一个问题对话框，并等待用户输入。
 * @param message 要向用户显示的提问信息。
 * @param predefinedOptions (可选) 一个字符串数组，为用户提供预设的选项。
 * @returns 返回一个 Promise，解析为用户的回答字符串。如果用户取消，可能返回 null。
 */
export async function requestUserInput(
  message: string,
  predefinedOptions?: string[]
): Promise<string | null> {
  console.log(`Requesting user input: "${message}"`, predefinedOptions);
  // 在实际的Tauri应用中，这里会调用：
  // import { invoke } from '@tauri-apps/api/core';
  // return await invoke<string | null>('plugin:dialog|ask', { message, buttons: predefinedOptions });
  // 当前我们将在需要时调用模拟工具。
  // 此处仅为 API 定义。
  return Promise.resolve(null); // 返回一个模拟的空值
}

/**
 * 发送一个简单的操作系统通知。
 * @param message 通知的消息内容。
 * @returns 返回一个 Promise，在通知发送后解析。
 */
export async function sendNotification(message: string): Promise<void> {
  console.log(`Sending notification: "${message}"`);
  // 在实际的Tauri应用中，这里会调用：
  // import { invoke } from '@tauri-apps/api/core';
  // await invoke('plugin:notification|notify', { title: '通知', body: message });
  return Promise.resolve();
}

/**
 * 启动一个持久化的命令行聊天会话。
 * @param sessionTitle 聊天会话窗口的标题。
 * @returns 返回一个 Promise，解析为该会话的唯一ID。
 */
export async function startIntensiveChat(sessionTitle: string): Promise<string> {
  console.log(`Starting intensive chat: "${sessionTitle}"`);
  const sessionId = `session_${Date.now()}`;
  return Promise.resolve(sessionId); // 返回一个模拟的会话ID
}

/**
 * 在一个活动的密集聊天会话中提出问题。
 * @param sessionId `startIntensiveChat` 返回的会话ID。
 * @param question 要问的问题。
 * @param predefinedOptions (可选) 预设的回答选项。
 * @returns 返回一个 Promise，解析为用户的回答。
 */
export async function askIntensiveChat(
  sessionId: string,
  question: string,
  predefinedOptions?: string[]
): Promise<string | null> {
  console.log(`Asking in session ${sessionId}: "${question}"`, predefinedOptions);
  return Promise.resolve(null); // 返回一个模拟的空值
}

/**
 * 关闭一个正在进行的密集聊天会话。
 * @param sessionId `startIntensiveChat` 返回的会话ID。
 * @returns 返回一个 Promise，在会话关闭后解析。
 */
export async function stopIntensiveChat(sessionId: string): Promise<void> {
  console.log(`Stopping intensive chat: ${sessionId}`);
  return Promise.resolve();
} 