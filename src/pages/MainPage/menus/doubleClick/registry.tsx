import React from "react";
import DifyIframeView from "../../dialogs/DifyAssistant";
import AITalkView from "../../dialogs/AITalk";

export interface MenuItem {
  key: string;
  label: string;
  create: () => React.ReactNode;
  onSelect?: () => void;
}

export function getDoubleClickMenuRegistry(onDifyOpen?: () => void): MenuItem[] {
  return [
    { key: "dify_assistant", label: "Dify对话", create: () => <DifyIframeView />, onSelect: onDifyOpen },
    { key: "ai_talk", label: "AI对话", create: () => <AITalkView />, onSelect: onDifyOpen },
  ];
}
