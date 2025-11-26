import { useEffect, useRef, useState } from "react";

export function usePetExpression() {
  const [expression, setExpression] = useState<string>("normal");
  const timerRef = useRef<number | null>(null);

  const pulseExpression = (next: string, durationMs = 5000, fallback = "normal") => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setExpression(next);
    timerRef.current = window.setTimeout(() => {
      setExpression(fallback);
      timerRef.current = null;
    }, durationMs);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  return { expression, setExpression, pulseExpression };
}

