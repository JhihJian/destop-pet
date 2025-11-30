import React, { useState, useEffect } from "react";
import styles from "./index.module.css";

export default function SettingsView() {
  const [key, setKey] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem("dify_api_key");
    if (stored) setKey(stored);
  }, []);

  const save = () => {
    localStorage.setItem("dify_api_key", key.trim());
    setMsg("保存成功！");
    setTimeout(() => setMsg(""), 2000);
  };

  return (
    <div className={styles.container}>
      <div className={styles.title}>系统设置</div>
      <div className={styles.field}>
        <label className={styles.label}>Dify API Key</label>
        <input 
          className={styles.input}
          value={key} 
          onChange={e => setKey(e.target.value)} 
          placeholder="请输入 Dify API Key"
          type="password"
        />
      </div>
      <div className={styles.actions}>
        <button className={styles.btn} onClick={save}>保存配置</button>
      </div>
      {msg && <div className={styles.msg}>{msg}</div>}
    </div>
  );
}
