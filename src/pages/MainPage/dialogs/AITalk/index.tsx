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
  const [phase, setPhase] = useState<"welcomeKey" | "welcomeQuery" | "chat">("welcomeKey");
  const [apiKey, setApiKey] = useState<string>("");
  const [validating, setValidating] = useState(false);
  const [statusText, setStatusText] = useState<string>("");
  const [statusKind, setStatusKind] = useState<"info" | "error" | "success">("info");
  const listRef = useRef<HTMLDivElement | null>(null);
  const toText = (v: any) => (typeof v === "string" ? v : (v && (v.text ?? v.value)) || "");

  const baseUrl = (import.meta as any).env?.VITE_DIFY_API_BASE || "http://192.168.1.195:3000";
  const chatPath = (import.meta as any).env?.VITE_DIFY_CHAT_API || "/v1";
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
            body: JSON.stringify({ inputs: {}, query: "ping", response_mode: "blocking", user: "auth-check" })
          })
        : await window.fetch(chatUrl, {
            method: "POST",
            headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
            body: JSON.stringify({ inputs: {}, query: "ping", response_mode: "blocking", user: "auth-check" })
          });
      if (isTauriEnv()) { try { emit("http_debug", { phase: "validateKey", type: "response", status: (res as any).status ?? 0 }); } catch {} }
      const st = (res as any).status ?? 200;
      console.log(`[aitalk] validateKey status=${st}`);
      if (st === 401) {
        setStatusKind("error");
        setStatusText("API Key 无效或未授权");
        return;
      }
      setStatusKind("success");
      setStatusText("登录成功");
      setPhase("welcomeQuery");
    } catch {
      setStatusKind("error");
      setStatusText("验证失败，请检查网络或 Key");
      console.log(`[aitalk] validateKey error`);
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
            inputs: {},
            query: q,
            response_mode: "blocking",
            user: "tauri-pet",
            conversation_id: conversationId,
          }),
        });
        const st = (res as any).status ?? 0;
        console.log(`[aitalk] response status=${st}`);
        if (isTauriEnv()) { try { emit("http_debug", { phase: "chat", type: "response", status: st }); } catch {} }
        const data = await res.json();
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
          body: JSON.stringify({ inputs: {}, query: q, response_mode: "blocking", user: "web", conversation_id: conversationId }),
        });
        console.log(`[aitalk] web response status=${res.status}`);
        const data = await res.json();
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
