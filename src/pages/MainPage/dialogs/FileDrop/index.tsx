import React from "react";

export default function FileContentView({ files }: { files: FileList }) {
  return (
    <div className="file-content">
      <div className="file-title">收到文件：{files[0].name}</div>
      <div className="file-progress">处理中...</div>
    </div>
  );
}

