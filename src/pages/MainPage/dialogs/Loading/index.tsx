import React from "react";
import styles from "./index.module.css";

export default function LoadingView() {
  return (
    <div className={styles.dialogLoading}>
      <span className={styles.loadingSpinner} />
      <div>处理中...</div>
    </div>
  );
}
