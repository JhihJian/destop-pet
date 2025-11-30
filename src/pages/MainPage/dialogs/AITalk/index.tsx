import React, { useEffect, useMemo, useRef, useState } from "react";
import styles from "./index.module.css";
import { isTauri as isTauriEnv } from "@tauri-apps/api/core";
import { fetch as httpFetch } from "@tauri-apps/plugin-http";
import { XProvider, Welcome, Sender, Bubble } from "@ant-design/x";
import { emit } from "@tauri-apps/api/event";
// 使用 Ant Design X 组件

export default function AITalkView() {
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);
  const [phase, setPhase] = useState<"welcomeKey" | "welcomeQuery" | "chat">(() => {
    return localStorage.getItem("dify_api_key") ? "welcomeQuery" : "welcomeKey";
  });
  const [apiKey, setApiKey] = useState<string>(() => localStorage.getItem("dify_api_key") || "");
  const [validating, setValidating] = useState(false);
  const [statusText, setStatusText] = useState<string>("");
  const [statusKind, setStatusKind] = useState<"info" | "error" | "success">("info");
  const listRef = useRef<HTMLDivElement | null>(null);
  const firstQueryRef = useRef<string>(""); // 用于存储第一次对话的内容作为 id
  const toText = (v: any) => (typeof v === "string" ? v : (v && (v.text ?? v.value)) || "");

  const baseUrl = (import.meta as any).env?.VITE_DIFY_API_BASE || "http://192.168.1.195:3000";
  // 默认为 Chat API，如果使用 Workflow 请改为 /v1/workflows/run 并调整请求参数
  const chatPath = (import.meta as any).env?.VITE_DIFY_CHAT_API || "/v1/chat-messages";
  const token = (import.meta as any).env?.VITE_DIFY_API_KEY || "";
  const chatUrl = useMemo(() => {
    try { return new URL(chatPath, baseUrl).toString(); } catch { return `${baseUrl}${chatPath}`; }
  }, [baseUrl, chatPath]);

  const scrollToBottom = () => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  };

  const typewriteAppend = (text: string) => {
    setMessages(prev => {
      const last = prev[prev.length - 1];
      if (!last || last.role !== "assistant") return [...prev, { role: "assistant", content: text }];
      return [...prev.slice(0, -1), { role: "assistant", content: last.content + text }];
    });
  };

  const currentToken = apiKey || ((import.meta as any).env?.VITE_DIFY_API_KEY || "");

  const getErrorMessage = (status: number, code?: string) => {
    if (status === 404) return "对话不存在";
    if (status === 500) return "服务内部异常";
    if (status === 400) {
      if (code === "invalid_param") return "传入参数异常";
      if (code === "app_unavailable") return "App 配置不可用";
      if (code === "provider_not_initialize") return "无可用模型凭据配置";
      if (code === "provider_quota_exceeded") return "模型调用额度不足";
      if (code === "model_currently_not_support") return "当前模型不可用";
      if (code === "completion_request_error") return "文本生成失败";
      return "请求无效 (400)";
    }
    return `请求失败 (${status})`;
  };

  const validateKey = async (keyOverride?: string) => {
    const key = (keyOverride ?? apiKey).trim();
    if (!key) { setStatusKind("error"); setStatusText("请输入 API Key"); return; }
    console.log(`[aitalk] validateKey begin len=${key.length}`);
    setValidating(true);
    try {
      if (isTauriEnv()) { try { emit("http_debug", { phase: "validateKey", type: "request", url: chatUrl }); } catch {} }
      // 以一次最小请求校验权限
      const res = isTauriEnv()
        ? await httpFetch(chatUrl, {
            method: "POST",
            headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
            body: JSON.stringify({ inputs: { id: "auth-bypass" }, query: "ping", response_mode: "blocking", user: "auth-check" })
          })
        : await window.fetch(chatUrl, {
            method: "POST",
            headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
            body: JSON.stringify({ inputs: { id: "auth-bypass" }, query: "ping", response_mode: "blocking", user: "auth-check" })
          });
      if (isTauriEnv()) { try { emit("http_debug", { phase: "validateKey", type: "response", status: (res as any).status ?? 0 }); } catch {} }
      const st = (res as any).status ?? 200;
      console.log(`[aitalk] validateKey status=${st}`);
      
      if (st !== 200) {
        let errCode = "";
        try {
          const data = await res.json();
          if (isTauriEnv()) { try { emit("http_debug", { phase: "validateKey", type: "response_data", status: st, data }); } catch {} }
          errCode = data?.code || "";
        } catch {}
        
        setStatusKind("error");
        if (st === 401) {
          console.log(`[aitalk] validateKey status=${st} 401`);
          setStatusText("API Key 无效或未授权");
        } else {
          setStatusText(getErrorMessage(st, errCode));
        }
        return;
      }

      setStatusKind("success");
      setStatusText("登录成功");
      localStorage.setItem("dify_api_key", key);
      setApiKey(key);
      setPhase("welcomeQuery");
    } catch (e: any) {
      setStatusKind("error");
      setStatusText("验证失败，请检查网络或 Key");
      console.error(`[aitalk] validateKey error:`, e);
      if (isTauriEnv()) { 
        try { 
          emit("http_debug", { 
            phase: "validateKey", 
            type: "error", 
            url: chatUrl,
            error: e instanceof Error ? e.message : String(e) 
          }); 
        } catch {} 
      }
    } finally {
      setValidating(false);
      console.log(`[aitalk] validateKey end`);
    }
  };

  const send = async (override?: string) => {
    const raw = toText(override ?? input);
    console.log("[aitalk] send begin phase=", phase, "override=", override, "input=", input);
    const q = raw.trim();
    if (!q || loading) return;
    if (phase === "welcomeKey") {
      setApiKey(q);
      setInput("");
      console.log("[aitalk] first message used as apiKey len=", q.length);
      await validateKey(q);
      return;
    }
    setMessages(prev => [...prev, { role: "user", content: q }]);
    setInput(override ? input : "");
    setLoading(true);

    // 如果是新会话（无 conversationId），则使用当前 query 作为 id
    if (!conversationId && !firstQueryRef.current) {
      firstQueryRef.current = q;
    }
    const currentId = firstQueryRef.current || q; // 兜底使用当前 query

    try { window.postMessage({ type: "aitalk:user", text: q }, "*" ); } catch {}
    try {
      const env = isTauriEnv() ? "tauri" : "web";
      console.log(`[aitalk] request env=${env} url=${chatUrl}`);
      if (isTauriEnv()) { try { emit("http_debug", { phase: "chat", type: "request", url: chatUrl, headers: { Authorization: !!currentToken } }); } catch {} }
      if (isTauriEnv()) {
        const res = await httpFetch(chatUrl, {
          method: "POST",
          headers: {
            "Authorization": currentToken ? `Bearer ${currentToken}` : "",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            inputs: {
              // 第一次对话作为id传入
              id: currentId
            },
            query: q,
            response_mode: "blocking",
            user: "tauri-pet",
            // 只有当 conversationId 有值时才包含该字段
            ...(conversationId ? { conversation_id: conversationId } : {}),
          }),
        });
        const st = (res as any).status ?? 0;
        console.log(`[aitalk] response status=${st}`);
        if (isTauriEnv()) { try { emit("http_debug", { phase: "chat", type: "response", status: st }); } catch {} }
        
        const data = await res.json();
        if (isTauriEnv()) { try { emit("http_debug", { phase: "chat", type: "response_data", status: st, data }); } catch {} }
        
        if (st !== 200) {
          const errCode = data?.code || "";
          const msg = getErrorMessage(st, errCode);
          typewriteAppend(`(请求失败: ${msg})`);
          return;
        }

        const answer = data?.answer ?? "";
        const cid = data?.conversation_id ?? conversationId;
        setConversationId(cid);
        console.log(`[aitalk] parsed answerLen=${answer.length} cid=${cid ?? "-"}`);
        if (answer) {
          for (let i = 0; i < answer.length; i += 3) {
            typewriteAppend(answer.slice(i, i + 3));
            await new Promise(r => setTimeout(r, 10));
          }
          try { window.postMessage({ type: "aitalk:assistant", text: answer }, "*" ); } catch {}
        } else {
          typewriteAppend("(无响应)");
        }
      } else {
        const res = await window.fetch(chatUrl, {
          method: "POST",
          headers: {
            "Authorization": currentToken ? `Bearer ${currentToken}` : "",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
             inputs: { id: currentId }, 
             query: q, 
             response_mode: "blocking", 
             user: "web",
             // 只有当 conversationId 有值时才包含该字段
             ...(conversationId ? { conversation_id: conversationId } : {}),
          }),
        });
        console.log(`[aitalk] web response status=${res.status}`);
        const data = await res.json();
        
        if (res.status !== 200) {
          const errCode = data?.code || "";
          const msg = getErrorMessage(res.status, errCode);
          typewriteAppend(`(请求失败: ${msg})`);
          return;
        }

        const answer = data?.answer ?? "";
        const cid = data?.conversation_id ?? conversationId;
        setConversationId(cid);
        console.log(`[aitalk] parsed answerLen=${answer.length} cid=${cid ?? "-"}`);
        if (answer) {
          for (let i = 0; i < answer.length; i += 3) {
            typewriteAppend(answer.slice(i, i + 3));
            await new Promise(r => setTimeout(r, 10));
          }
          try { window.postMessage({ type: "aitalk:assistant", text: answer }, "*" ); } catch {}
        } else {
          typewriteAppend("(无响应)");
        }
      }
    } catch (e) {
      console.log(`[aitalk] request error`, e);
      typewriteAppend("(请求失败)");
    } finally {
      setLoading(false);
      scrollToBottom();
      if (phase !== "chat") setPhase("chat");
      console.log(`[aitalk] send end`);
    }
  };

  useEffect(() => { scrollToBottom(); }, [messages.length]);

  return (
    <XProvider>
      <div className={styles.container}>
        {phase === "welcomeKey" && (
          <Welcome title="欢迎使用 AI 对话" description="请输入您的 API Key 作为首次消息" />
        )}

        {phase !== "welcomeKey" && (
          <Welcome title="欢迎回来" description="请输入您要查询的内容" />
        )}

        {phase === "chat" && (
          <>
            <div ref={listRef} className={styles.list}>
              {messages.map((m, idx) => (
                <Bubble key={idx} role={m.role} content={m.content} />
              ))}
            </div>
            <div className={styles.inputRow}>
              <Sender
                placeholder="请输入问题，回车发送"
                onSubmit={(v: any) => send(toText(v))}
                disabled={loading}
              />
            </div>
          </>
        )}

        {phase !== "chat" && (
          <div className={styles.inputRow}>
            <Sender
              placeholder={phase === "welcomeKey" ? "请输入 API Key，回车发送" : "请输入问题，回车发送"}
              onSubmit={(v: any) => send(toText(v))}
              disabled={validating || loading}
            />
          </div>
        )}
      </div>
    </XProvider>
  );
}
