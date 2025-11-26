import React, { useRef } from "react";
import styles from "./index.module.css";

export default function DifyIframeView() {
  const difyIframeRef = useRef<HTMLIFrameElement | null>(null);
  const difyUrl = (import.meta as any).env?.VITE_DIFY_IFRAME_URL || "http://192.168.1.195:3000/chatbot/KBQbDCGd0mE7F3Eh";
  const difyOrigin = (() => { try { return new URL(difyUrl).origin; } catch { return ""; } })();
  return (
    <div className={styles.container}>
      <iframe
        ref={difyIframeRef}
        src={difyUrl}
        className={styles.iframe}
        frameBorder="0"
        allow="microphone"
        sandbox="allow-scripts allow-forms allow-same-origin"
        onLoad={() => {
          const w = difyIframeRef.current?.contentWindow;
          if (!w) return;
          const init = { type: "host:init", ts: Date.now() };
          try { w.postMessage(init, difyOrigin || "*"); } catch {}
        }}
      />
    </div>
  );
}
