import React, { useState, useRef, useEffect } from "react";
import Live2DModel from "../components/Live2DModel";
import ErrorBoundary from "../components/ErrorBoundary";
import DialogManager, { DialogManagerHandle } from "./MainPage/DialogManager";
import styles from "./MainPage.module.css";
//
import { isTauri as isTauriEnv } from "@tauri-apps/api/core";
import { emit } from "@tauri-apps/api/event";
import { usePetExpression } from "../hooks/usePetExpression";

const MainPage: React.FC = () => {
  // 页面核心：桌宠主视图与交互驱动的统一弹窗
  const [bubbleMessage, setBubbleMessage] = useState<string | null>(null);
  const lastOpenRef = useRef<boolean | null>(null); // 记录最近一次弹窗开关，防止重复触发
  const [dragHint, setDragHint] = useState(false);
  const dialogRef = useRef<DialogManagerHandle | null>(null);


  // 小人图片ref
  const imageRef = useRef<HTMLDivElement>(null);
  const { expression, setExpression, pulseExpression } = usePetExpression();
  

  const emitDialogState = (open: boolean) => {
    if (lastOpenRef.current === open) return;
    lastOpenRef.current = open;
    if (open) setDragHint(false);
    if (!isTauriEnv()) return;
    emit("ui_dialog_state", { open });
  };

  // 拖拽文件到小人物时的处理逻辑
  const handleFileDrop = (files: FileList) => {
    if (files.length > 0) {
      console.log(`[monitor] file-drop start name=${files[0].name} ts=${Date.now()}`);
      try { emit("ui_interaction", { type: "file-drop", name: files[0].name, ts: Date.now() }); } catch {}
      emitDialogState(true);
      setExpression("kaixin");
      dialogRef.current?.showFileDrop(files);
    }
  };

  // 操作按钮逻辑由 DialogManager 内部处理

  // 操作按钮渲染由 DialogManager 内部处理

  // Dify iframe 渲染由 DialogManager 内部处理

  const handleDoubleClick = () => {
    // 关键帧：双击桌宠，打开 AI 助手侧栏（Dify）
    try { emit("ui_interaction", { type: "dblclick", ts: Date.now() }); } catch {}
    emitDialogState(true);
    dialogRef.current?.showMenu();
    setExpression("kaixin");
  };

  // 拓展：可操作弹窗示例
  // const showActionDialog = () => {
  //   setDialogTitle("操作确认");
  //   setDialogContent("你确定要执行此操作吗？");
  //   setDialogActions(
  //     <>
  //       <button onClick={() => setDialogContent("")}>取消</button>
  //       <button onClick={() => setDialogContent("")}>确认</button>
  //     </>
  //   );
  // };

  // 拖拽窗口时切换小人状态
  const handleDragStart = () => {
    pulseExpression("kaixin", 5000, "normal");
  };

  // 提交成功由 DialogManager 内部触发

  useEffect(() => {
    try {
      if (imageRef.current) {
        const rect = imageRef.current.getBoundingClientRect();
        emit("ui_interactive_rects", [{ x: rect.left, y: rect.top, w: rect.width, h: rect.height }]);
      }
    } catch {}
  }, []);

  useEffect(() => {
    // 监听窗口尺寸变化并同步可交互区域，避免点击偏移
    const onResize = () => {
      try {
        if (imageRef.current) {
          const rect = imageRef.current.getBoundingClientRect();
          emit("ui_interactive_rects", [{ x: rect.left, y: rect.top, w: rect.width, h: rect.height }]);
        }
      } catch {}
    };
    window.addEventListener("resize", onResize);
    onResize();
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Dify 关闭消息由 DialogManager 处理

  useEffect(() => {
    // 全局拖拽态处理：仅在桌宠区域内接收 drop，外部则清除提示
    const onDragOver = (e: DragEvent) => {
      e.preventDefault();
    };
    const onDrop = (e: DragEvent) => {
      try {
        const el = imageRef.current;
        if (!el) {
          e.preventDefault();
          e.stopPropagation();
          setDragHint(false);
          return;
        }
        const rect = el.getBoundingClientRect();
        const x = e.clientX;
        const y = e.clientY;
        const inside = x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
        if (!inside) {
          e.preventDefault();
          e.stopPropagation();
          setDragHint(false);
        }
      } catch {
        e.preventDefault();
        setDragHint(false);
      }
    };
    const onDragEnd = () => {
      setDragHint(false);
    };
    const onDragLeave = () => {
      setDragHint(false);
    };
    window.addEventListener("dragover", onDragOver);
    window.addEventListener("drop", onDrop);
    window.addEventListener("dragend", onDragEnd);
    window.addEventListener("dragleave", onDragLeave);
    return () => {
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("drop", onDrop);
      window.removeEventListener("dragend", onDragEnd);
      window.removeEventListener("dragleave", onDragLeave);
    };
  }, []);

  

  return (
    <div className={styles.container}>
      <DialogManager
        ref={dialogRef}
        onDialogStateChange={emitDialogState}
        onFlowEvent={(evt) => {
          if (evt.type === "file-drop-dialog-ready") {
            try { emit("ui_interaction", { type: "file-drop-dialog-ready", ts: Date.now() }); } catch {}
          }
          if (evt.type === "dify-open") {
            try { emit("ui_interaction", { type: "dify-open", ts: Date.now() }); } catch {}
          }
          if (evt.type === "dify:close") {
            emitDialogState(false);
          }
          if (evt.type === "assistant-bubble") {
            const txt = (evt as any).payload?.text || "";
            const short = txt.length > 80 ? txt.slice(0, 80) + "…" : txt;
            setBubbleMessage(short);
            setTimeout(() => setBubbleMessage(null), 5000);
          }
          if (evt.type === "user-bubble") {
            const txt = (evt as any).payload?.text || "";
            const short = txt.length > 80 ? txt.slice(0, 80) + "…" : txt;
            setBubbleMessage(short);
            setTimeout(() => setBubbleMessage(null), 3000);
          }
        }}
      />
      {/* 下方模型区域 */}
      <div className={styles.modelContainer}>
        <ErrorBoundary>
          <div ref={imageRef} className={`${dragHint ? styles.dragHighlight : ""} ${styles.inlineBlock}`}>
              <Live2DModel
                width={120}
                height={180}
                modelPath="/AIPeople/jiqiren.model3.json"
                // 关键帧：页面状态驱动的表情传递给模型组件
                expressionName={expression}
                onDoubleClick={handleDoubleClick}
                onDragStart={handleDragStart}
                onFileDrop={handleFileDrop}
                onDragEnter={() => setDragHint(true)}
                onDragLeave={() => setDragHint(false)}
                dragArea="bottom"
              />
          </div>
        </ErrorBoundary>
        {bubbleMessage && (
          <div className={styles.bubbleOverlay}>
            <div className={styles.bubble}>{bubbleMessage}</div>
          </div>
        )}
      </div>
      {/* 示例：可操作弹窗按钮 */}
      {/* <button onClick={showActionDialog}>显示操作弹窗</button> */}
    </div>
  );
};

export default MainPage;
