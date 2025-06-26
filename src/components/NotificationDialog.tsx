import React, { useState, useEffect } from 'react';
import './NotificationDialog.css';

interface NotificationDialogProps {
    title: string;
    message: string;
    isVisible: boolean;
    onClose: () => void;
    autoCloseDelay?: number; // 自动关闭延迟（毫秒）
}

export const NotificationDialog: React.FC<NotificationDialogProps> = ({
    title,
    message,
    isVisible,
    onClose,
    autoCloseDelay = 5000 // 默认5秒后自动关闭
}) => {
    const [isAnimating, setIsAnimating] = useState(false);

    useEffect(() => {
        if (isVisible) {
            setIsAnimating(true);
            
            // 自动关闭定时器
            const timer = setTimeout(() => {
                handleClose();
            }, autoCloseDelay);

            return () => clearTimeout(timer);
        }
    }, [isVisible, autoCloseDelay]);

    const handleClose = () => {
        setIsAnimating(false);
        // 等待动画完成后再触发 onClose
        setTimeout(() => {
            onClose();
        }, 300);
    };

    if (!isVisible) return null;

    return (
        <div className={`notification-dialog ${isAnimating ? 'show' : 'hide'}`}>
            <div className="notification-dialog-content">
                <div className="notification-dialog-header">
                    <h3 className="notification-dialog-title">{title}</h3>
                    <button 
                        className="notification-dialog-close"
                        onClick={handleClose}
                        aria-label="关闭通知"
                    >
                        ×
                    </button>
                </div>
                <div className="notification-dialog-body">
                    <p className="notification-dialog-message">{message}</p>
                </div>
                <div className="notification-dialog-progress">
                    <div 
                        className="notification-dialog-progress-bar"
                        style={{ animationDuration: `${autoCloseDelay}ms` }}
                    ></div>
                </div>
            </div>
        </div>
    );
}; 