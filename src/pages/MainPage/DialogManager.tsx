import React, { useEffect, useImperativeHandle, useState, forwardRef } from "react";
import UnifiedDialog from "../../components/UnifiedDialog"; // 统一弹窗组件
import DoubleClickMenuView from "./menus/doubleClick/MenuView"; // 双击菜单弹窗组件
import FileDropMenuView from "./menus/fileDrop/MenuView"; // 文件上传菜单弹窗组件
import { getDoubleClickMenuRegistry } from "./menus/doubleClick/registry"; // 双击菜单注册器
import { getFileDropMenuRegistry } from "./menus/fileDrop/registry"; // 文件上传菜单注册器
import FileContentView from "./dialogs/FileDrop"; // 文件上传弹窗
import LoadingView from "./dialogs/Loading";  // 加载中弹窗

export interface DialogManagerHandle {
  showFileDrop: (files: FileList) => void;
  showMenu: () => void;
  showUserInputRequest: (message: string, options: string[], onResponse: (response: string) => void) => void;
  close: () => void;
}

interface DialogManagerProps {
  onDialogStateChange?: (open: boolean) => void;
  onFlowEvent?: (evt: { type: string; payload?: any }) => void;
}

const DialogManager = forwardRef<DialogManagerHandle, DialogManagerProps>(
  ({ onDialogStateChange, onFlowEvent }, ref) => {
    const [open, setOpen] = useState(false);
    const [title, setTitle] = useState<string | undefined>(undefined);
    const [content, setContent] = useState<React.ReactNode>("");
    const [actions, setActions] = useState<React.ReactNode>(null);
    const [loading, setLoading] = useState(false);

    const pickItem = (item: { key: string; label: string; create: () => React.ReactNode; onSelect?: () => void }) => {
      setTitle(item.label);
      if (item.onSelect) item.onSelect();
      setContent(item.create());
      setOpen(true);
    };

    const showFileDrop = (files: FileList) => {
      if (files.length === 0) return;
      setTitle("");
      setContent(<FileContentView files={files} />);
      setOpen(true);
      setTimeout(() => {
        setLoading(true);
        setTimeout(() => {
          setLoading(false);
          setTitle("您需要我做什么？");
          const items = getFileDropMenuRegistry();
          setContent(<FileDropMenuView items={items} onPick={pickItem} />);
          onFlowEvent?.({ type: "file-drop-dialog-ready" });
        }, 1000);
      }, 1000);
    };

    const showMenu = () => {
      setTitle("您需要我做什么？");
      const items = getDoubleClickMenuRegistry(() => onFlowEvent?.({ type: "dify-open" }));
      setContent(<DoubleClickMenuView items={items} onPick={pickItem} />);
      setOpen(true);
    };

    const showUserInputRequest = (message: string, options: string[], onResponse: (response: string) => void) => {
      setTitle("请求确认");
      setContent(
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div style={{ fontSize: '16px', color: '#333', lineHeight: '1.5' }}>{message}</div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'flex-end', marginTop: '10px' }}>
            {options.map(opt => (
              <button
                key={opt}
                onClick={() => {
                  onResponse(opt);
                  close();
                }}
                style={{
                  padding: '8px 16px',
                  borderRadius: '4px',
                  border: '1px solid #d9d9d9',
                  background: 'white',
                  cursor: 'pointer',
                  color: '#333',
                  fontSize: '14px',
                  minWidth: '80px'
                }}
                onMouseOver={(e) => e.currentTarget.style.borderColor = '#40a9ff'}
                onMouseOut={(e) => e.currentTarget.style.borderColor = '#d9d9d9'}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      );
      setOpen(true);
    };

    const close = () => {
      setTitle("");
      setContent("");
      setLoading(false);
      setOpen(false);
    };

    useImperativeHandle(ref, () => ({ showFileDrop, showMenu, showUserInputRequest, close }));

    useEffect(() => {
      onDialogStateChange?.(open);
    }, [open, onDialogStateChange]);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      const difyUrl = (import.meta as any).env?.VITE_DIFY_IFRAME_URL || "http://192.168.1.195:3000/chatbot/KBQbDCGd0mE7F3Eh";
      const difyOrigin = (() => { try { return new URL(difyUrl).origin; } catch { return ""; } })();
      const data: any = e.data || {};
      if (!data) return;
      if (data.type === "dify:close") {
        const ok = difyOrigin ? e.origin === difyOrigin : true;
        if (!ok) return;
        setTitle("");
        setContent("");
        setLoading(false);
        setOpen(false);
        onFlowEvent?.({ type: "dify:close" });
      } else if (data.type === "aitalk:assistant") {
        onFlowEvent?.({ type: "assistant-bubble", payload: { text: data.text } });
      } else if (data.type === "aitalk:user") {
        onFlowEvent?.({ type: "user-bubble", payload: { text: data.text } });
      }
    };
      window.addEventListener("message", onMessage);
      return () => window.removeEventListener("message", onMessage);
    }, [onFlowEvent]);

    return (
      <UnifiedDialog
        open={open}
        title={title}
        content={loading ? <LoadingView /> : content}
        actions={actions}
        onClose={() => {
          setTitle("");
          setContent("");
          setLoading(false);
          setOpen(false);
        }}
      />
    );
  }
);

export default DialogManager;
