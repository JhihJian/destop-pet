import React from "react";
import UploadCaseFlow from "../../dialogs/flows/UploadCaseFlow";
import ExtractFieldsFlow from "../../dialogs/flows/ExtractFieldsFlow";
import SummarizeDocFlow from "../../dialogs/flows/SummarizeDocFlow";

export interface MenuItem {
  key: string;
  label: string;
  create: () => React.ReactNode;
  onSelect?: () => void;
}

export function getFileDropMenuRegistry(): MenuItem[] {
  return [
    { key: "upload", label: "上传案件到安全行政执法系统", create: () => <UploadCaseFlow /> },
    { key: "extract", label: "提取文档关键字段", create: () => <ExtractFieldsFlow /> },
    { key: "summarize", label: "总结文档内容", create: () => <SummarizeDocFlow /> },
  ];
}

