import React from "react";

export default function SubmitPromptView({ onSubmit }: { onSubmit: () => void }) {
  return (
    <div className="case-material-issue-dialog-resolved">
      <div className="case-material-issue-dialog-resolved-box">
        <span>需要立即提交到安全行政执法系统？</span>
        <button className="case-material-issue-dialog-btn primary" onClick={onSubmit}>立即提交</button>
      </div>
    </div>
  );
}

