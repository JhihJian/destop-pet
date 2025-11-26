import React, { useEffect, useState } from "react";
import ErrorListView from "../../ErrorList";
import SubmitPromptView from "../../SubmitPrompt";
import CaseMaterialIssueDialog from "../../../../../components/CaseMaterialIssueDialog";

export default function ProcessIssuesFlow({ label }: { label: string }) {
  const [stage, setStage] = useState<"processing" | "errors" | "dialog" | "resolved">("processing");

  useEffect(() => {
    const t = setTimeout(() => setStage("errors"), 1500);
    return () => clearTimeout(t);
  }, []);

  if (stage === "processing") {
    return <div>正在处理"{label}"...</div>;
  }

  if (stage === "errors") {
    return (
      <ErrorListView
        onHandle={() => {
          setStage("dialog");
        }}
      />
    );
  }

  if (stage === "dialog") {
    const data = {
      name: "万得信息技术股份有限公司",
      errorContent: [
        { content: "行政处罚决定书的涉案单位名称与案件信息中的名称不符", type: "errorUpload" as const },
        {
          content: "当前只上传了行政处罚决定书，是否需要上传其他附件，以下为常见附件：",
          type: "warningUpload" as const,
          hasType: "行政处罚决定书",
          missingType: [
            { type: "检查通知书", percent: 79 },
            { type: "限期整改通知书", percent: 83 },
            { type: "行政处罚决定书", percent: 79 },
            { type: "整改通知书", percent: 68 },
            { type: "受案登记表", percent: 65 },
            { type: "整改报告", percent: 61 },
            { type: "当场处罚决定书", percent: 57 },
          ],
        },
      ],
    };
    return (
      <CaseMaterialIssueDialog
        {...data}
        onResolved={() => {
          setStage("resolved");
        }}
      />
    );
  }

  return <SubmitPromptView onSubmit={() => {}} />;
}
