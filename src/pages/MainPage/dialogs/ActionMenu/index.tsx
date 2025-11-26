import React from "react";

export default function ActionMenuView({ onSelect }: { onSelect: (key: string) => void }) {
  return (
    <div className="action-buttons">
      <button onClick={() => onSelect("upload")}>
        <span className="action-button-text">上传案件到安全行政执法系统</span>
        <span style={{ width: 60 }}></span>
      </button>
      <button onClick={() => onSelect("extract")}>
        <span className="action-button-text">提取文档关键字段</span>
        <span style={{ width: 60 }}></span>
      </button>
      <button onClick={() => onSelect("summarize")}>
        <span className="action-button-text">总结文档内容</span>
        <span style={{ width: 60 }}></span>
      </button>
      <button onClick={() => onSelect("ai_assistant")}>
        <span className="action-button-text">AI助手</span>
        <span style={{ width: 60 }}></span>
      </button>
    </div>
  );
}

