import React from 'react';
import * as tauriWindow from '@tauri-apps/api/window';

export interface CharacterImageProps {
  state: string; // 当前状态名
  statesMap: Record<string, string>; // 状态名到图片路径的映射
  width?: number | string;
  height?: number | string;
  alt?: string;
  style?: React.CSSProperties;
  onDoubleClick?: () => void;
  onDragEnd?: () => void; // 拖拽结束回调
  onDragStart?: () => void; // 拖拽开始回调
  onFileDrop?: (files: FileList) => void; // 文件拖放回调
  dragArea?: 'all' | 'bottom'; // 拖拽区域类型，默认 all
}

// 正确获取 Tauri 窗口对象
const appWindow = tauriWindow.getCurrentWindow();

/**
 * 小人物图片组件，支持状态切换、文件拖拽、双击和窗口拖动（支持自定义拖拽区域）
 */
const CharacterImage: React.FC<CharacterImageProps> = ({
  state,
  statesMap,
  width = 122,
  height = 180,
  alt = '',
  style,
  onDoubleClick,
  onDragStart,
  onFileDrop,
  dragArea = 'bottom',
}) => {
  const imgSrc = statesMap[state] || '';

  // 拖拽文件悬停时，阻止默认事件以允许 drop
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  // 文件被放下时
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (onFileDrop && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileDrop(e.dataTransfer.files);
    }
  };

  // 拖拽手柄鼠标事件，内部实现窗口拖动，外部仅做通知
  const handleMouseDown = async (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button === 0) {
      if (onDragStart) onDragStart();
      try {
        if (appWindow && typeof appWindow.startDragging === 'function') {
          await appWindow.startDragging();
        } else {
          console.warn('Tauri appWindow.startDragging 不可用，当前环境可能不是桌面端');
        }
      } catch (err) {
        console.error('窗口拖动失败:', err);
      }
    }
  };

  return (
    <div
      style={{
        display: 'inline-block',
        userSelect: 'none',
        position: 'relative',
        ...style,
      }}
      onDoubleClick={onDoubleClick}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <img
        src={imgSrc}
        width={width}
        height={height}
        alt={alt}
        draggable={false}
        style={{ pointerEvents: 'none', display: 'block' }}
      />
      {/* 拖拽手柄，仅底部区域可拖动窗口 */}
      {dragArea === 'bottom' && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            bottom: 0,
            width: '100%',
            height: 30,
            background: 'rgba(64,158,255,0.12)',
            cursor: 'grab',
            zIndex: 2,
            borderBottomLeftRadius: 8,
            borderBottomRightRadius: 8,
          }}
          onMouseDown={handleMouseDown}
        />
      )}
      {/* 全区域可拖动窗口 */}
      {dragArea === 'all' && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: '100%',
            height: '100%',
            cursor: 'grab',
            zIndex: 2,
            borderRadius: 8,
            background: 'transparent',
          }}
          onMouseDown={handleMouseDown}
        />
      )}
    </div>
  );
};

export default CharacterImage; 