import { useState, useEffect, useRef } from 'react';
import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification';

const WEBSOCKET_URL = 'ws://localhost:3001';

interface SimpleMessage {
    type: string;
    [key: string]: any;
}

interface NotificationData {
    title: string;
    message: string;
    timestamp: string;
}

export function useMcpSocket() {
    const [isConnected, setIsConnected] = useState(false);
    const [lastMessage, setLastMessage] = useState<SimpleMessage | null>(null);
    const [notificationDialog, setNotificationDialog] = useState<NotificationData | null>(null);
    const socketRef = useRef<WebSocket | null>(null);

    useEffect(() => {
        const connect = () => {
            const socket = new WebSocket(WEBSOCKET_URL);
            socketRef.current = socket;

            socket.onopen = () => {
                console.log('WebSocket connected');
                setIsConnected(true);
                
                // Send a test message
                socket.send(JSON.stringify({
                    type: 'test',
                    message: 'Hello from frontend!'
                }));
            };

            socket.onmessage = async (event) => {
                try {
                    const message: SimpleMessage = JSON.parse(event.data);
                    console.log('Received message from server:', message);
                    setLastMessage(message);

                    // Handle different message types
                    switch (message.type) {
                        case 'welcome':
                            console.log('Server welcome:', message.message);
                            break;
                        case 'response':
                            console.log('Server response to our message:', message);
                            break;
                        case 'show-notification':
                            // Handle notification request from server
                            console.log('Processing show-notification message:', message);
                            
                            // 显示 Live2D 对话框通知
                            const dialogData: NotificationData = {
                                title: message.title || 'Desktop Pet Message',
                                message: message.message || message.body || 'Hello from your desktop pet!',
                                timestamp: message.timestamp || new Date().toISOString()
                            };
                            setNotificationDialog(dialogData);
                            console.log('Live2D notification dialog shown:', dialogData);
                            
                            // 同时发送桌面通知
                            let permissionGranted = await isPermissionGranted();
                            console.log('Notification permission granted:', permissionGranted);
                            if (!permissionGranted) {
                                const permission = await requestPermission();
                                permissionGranted = permission === 'granted';
                                console.log('Requested permission, result:', permission);
                            }
                            if (permissionGranted) {
                                const notificationData = {
                                    title: dialogData.title,
                                    body: dialogData.message,
                                };
                                console.log('Sending desktop notification:', notificationData);
                                sendNotification(notificationData);
                                console.log('Desktop notification sent successfully');
                            } else {
                                console.warn('Desktop notification permission denied');
                            }
                            break;
                        default:
                            console.log('Unknown message type:', message.type);
                    }
                } catch (error) {
                    console.error('Failed to process message from server:', error);
                }
            };

            socket.onclose = () => {
                console.log('WebSocket disconnected. Reconnecting...');
                setIsConnected(false);
                // Simple reconnect logic
                setTimeout(connect, 3000);
            };

            socket.onerror = (err) => {
                console.error('WebSocket error:', err);
                socket.close();
            };
        };

        connect();

        return () => {
            if (socketRef.current) {
                socketRef.current.close();
            }
        };
    }, []);

    const sendMessage = (message: SimpleMessage) => {
        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
            socketRef.current.send(JSON.stringify(message));
        }
    };

    const closeNotificationDialog = () => {
        setNotificationDialog(null);
    };

    return { 
        isConnected, 
        lastMessage, 
        sendMessage, 
        notificationDialog, 
        closeNotificationDialog 
    };
} 