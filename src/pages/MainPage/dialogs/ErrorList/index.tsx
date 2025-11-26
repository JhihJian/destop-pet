import React from "react";

export default function ErrorListView({ onHandle }: { onHandle: () => void }) {
  return (
    <div className="action-buttons">
      <button onClick={onHandle}>
        <span className="action-button-text">一、涉案单位名称缺少行政区划</span>
        <span className="action-button-action">去处理</span>
      </button>
      <button onClick={onHandle}>
        <span className="action-button-text">二、案件附件存在问题</span>
        <span className="action-button-action">去处理</span>
      </button>
    </div>
  );
}

