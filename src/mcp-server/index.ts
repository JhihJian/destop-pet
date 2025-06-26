import { WebSocket, WebSocketServer } from 'ws';
// @ts-ignore
import { McpServer, StreamableWebSocketServerTransport } from '@modelcontextprotocol/sdk/dist/cjs/server';
import { showNotificationTool, askQuestionTool } from './tools';

// ... existing code ...