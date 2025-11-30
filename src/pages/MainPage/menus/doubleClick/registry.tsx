import React from "react";
import DifyIframeView from "../../dialogs/DifyAssistant";
// import AITalkView from "../../dialogs/AITalk";
// import SettingsView from "../../dialogs/Settings/index";

export interface MenuItem {
  key: string;
  label: string;
  create: () => React.ReactNode;
  onSelect?: () => void;
}

export function getDoubleClickMenuRegistry(onDifyOpen?: () => void): MenuItem[] {
  return [
    { key: "dify_assistant", label: "案件查询", create: () => <DifyIframeView />, onSelect: onDifyOpen },
    // { key: "ai_talk", label: "AI对话", create: () => <AITalkView />, onSelect: onDifyOpen },
    // { key: "settings", label: "系统设置", create: () => <SettingsView /> },
    // { key: "dify_assistant", label: "上传文件", create: () => <DifyIframeView /> }
  ];
}
