import React, { useEffect, useRef, useState } from "react";
import { Application, Ticker } from "pixi.js";
import { Live2DModel } from "pixi-live2d-display/cubism4";
import * as tauriWindow from "@tauri-apps/api/window";
import * as tauriWebviewWindow from "@tauri-apps/api/webviewWindow";
import { emit } from "@tauri-apps/api/event";

export interface Live2DModelProps {
  width?: number;
  height?: number;
  modelPath?: string;
  // 外部传入的表情标识，使用模型 Expressions 的文件名（去掉 .exp3.json）
  expressionName?: string;
  // 行为优先级：当为 true 时，禁止进入空闲态覆盖为 normal
  suppressIdle?: boolean;
  style?: React.CSSProperties;
  onDoubleClick?: () => void;
  onDragStart?: () => void;
  onFileDrop?: (files: FileList) => void;
  dragArea?: "all" | "bottom";
  onDragEnter?: () => void;
  onDragLeave?: () => void;
}

const isTauri = typeof window !== "undefined" && !!(window as any).__TAURI__;

const safeRegisterInteraction = () => {
  const proto: any = (Live2DModel as any).prototype;
  const orig = proto.registerInteraction;
  if (typeof orig !== "function") return;
  proto.registerInteraction = function (..._args: any[]) {
    return;
  };
};
safeRegisterInteraction();
try {
  (Live2DModel as any).registerTicker?.(Ticker);
} catch {}

const Live2DModelView: React.FC<Live2DModelProps> = ({
  width = 120,
  height = 180,
  modelPath = "/Resources/Haru/Haru.model3.json",
  expressionName,
  suppressIdle = false,
  style,
  onDoubleClick,
  onDragStart,
  onFileDrop,
  onDragEnter,
  onDragLeave,
  dragArea = "all",
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  // 表情列表（用于可读显示）
  const [expressionNames, setExpressionNames] = useState<string[]>([]);
  // 原始 Expressions 定义（保留以便扩展）
  const [expressionDefs, setExpressionDefs] = useState<any[]>([]);
  // 文件名到索引的映射（小写），用于快速定位具体表情
  const [expressionMap, setExpressionMap] = useState<Record<string, number>>(
    {}
  );
  const modelRef = useRef<any>(null);
  const pointerRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const lastActivityRef = useRef<number>(Date.now());
  const idleRef = useRef<boolean>(false);
  const normalAppliedRef = useRef<boolean>(false);
  const draggingRef = useRef<boolean>(false);
  const pointerInWindowRef = useRef<boolean>(true);
  const updatePointerByClient = (clientX: number, clientY: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width - 0.5) * 2;
    const y = ((clientY - rect.top) / rect.height - 0.5) * 2;
    const nx = Math.max(-1, Math.min(1, x));
    const ny = Math.max(-1, Math.min(1, y));
    pointerRef.current = { x: nx, y: ny };
  };

  useEffect(() => {
    if (!containerRef.current) return;
    const app = new Application({
      width,
      height,
      backgroundAlpha: 0,
      antialias: true,
    });
    appRef.current = app;
    containerRef.current.appendChild(app.view as unknown as HTMLCanvasElement);
    let disposed = false;
    (async () => {
      try {
        const model = await Live2DModel.from(modelPath);
        modelRef.current = model;
        const manager: any = (model as any).internalModel?.motionManager;
        if (manager && typeof manager.on !== "function") {
          manager.on = () => {};
          manager.off = () => {};
          manager.once = () => {};
          manager.emit = () => {};
        }
        model.width = width;
        model.height = height;
        model.x = 0;
        model.y = height;
        (model as any).anchor?.set?.(0, 1);
        app.stage.addChild(model as any);
        const ticker = app.ticker;
        ticker.add(() => {
          const m = modelRef.current;
          const core = m?.internalModel?.coreModel;
          if (!core) return;
          const now = Date.now();
          const idleCandidate = idleRef.current || now - lastActivityRef.current >= 60000;
          const idle = !suppressIdle && idleCandidate;
          idleRef.current = idle;
          const k = 0.15;
          let tx: number;
          let ty: number;
          let tz: number;
          let eyeX: number;
          let eyeY: number;
          const t = performance.now() * 0.001;
          if (idle) {
            tx = Math.sin(t) * 8;
            ty = Math.sin(t * 1.2) * 6;
            tz = Math.sin(t * 0.8) * 4;
            eyeX = Math.sin(t * 1.5) * 0.5;
            eyeY = Math.sin(t * 1.7) * 0.5;
            const currentIsNormal = !expressionName || (String(expressionName).toLowerCase() === "normal");
            if (currentIsNormal && !normalAppliedRef.current) {
              const idx = expressionMap["normal"];
              try {
                if (typeof idx === "number") (m as any).expression(idx);
                else (m as any).expression("normal");
              } catch {}
              normalAppliedRef.current = true;
            }
          } else {
            if (pointerInWindowRef.current) {
              tx = pointerRef.current.x * 30;
              ty = -pointerRef.current.y * 30;
              tz = pointerRef.current.x * 10;
              eyeX = pointerRef.current.x;
              eyeY = -pointerRef.current.y;
            } else {
              tx = 0;
              ty = 0;
              tz = 0;
              eyeX = 0;
              eyeY = 0;
            }
            if (draggingRef.current) {
              tx = 0;
              ty = 0;
              tz = 0;
              eyeX = 0;
              eyeY = 0;
            }
          }
          const mod = t % 4;
          let eyeOpen = 1;
          if (mod < 0.06) eyeOpen = 1 - (mod / 0.06);
          else if (mod < 0.12) eyeOpen = (mod - 0.06) / 0.06;
          else eyeOpen = 1;
          const cx = (core as any).getParameterValueById?.("ParamAngleX") ?? 0;
          const cy = (core as any).getParameterValueById?.("ParamAngleY") ?? 0;
          const cz = (core as any).getParameterValueById?.("ParamAngleZ") ?? 0;
          const cbx =
            (core as any).getParameterValueById?.("ParamBodyAngleX") ?? 0;
          const nex = cx + (tx - cx) * k;
          const ney = cy + (ty - cy) * k;
          const nez = cz + (tz - cz) * k;
          const nbx = cbx + (tx * 0.3 - cbx) * k;
          (core as any).setParameterValueById?.("ParamAngleX", nex);
          (core as any).setParameterValueById?.("ParamAngleY", ney);
          (core as any).setParameterValueById?.("ParamAngleZ", nez);
          (core as any).setParameterValueById?.("ParamBodyAngleX", nbx);
          (core as any).setParameterValueById?.("ParamEyeBallX", eyeX);
          (core as any).setParameterValueById?.("ParamEyeBallY", eyeY);
          (core as any).setParameterValueById?.("ParamEyeLOpen", Math.max(0, Math.min(1, eyeOpen)));
          (core as any).setParameterValueById?.("ParamEyeROpen", Math.max(0, Math.min(1, eyeOpen)));
          const breath = Math.sin(t * (2 * Math.PI) / 5) * 2;
          (core as any).setParameterValueById?.("ParamBodyAngleY", breath);
        });
        // 解析模型设定的 Expressions，优先以文件名作为唯一来源（与资源真实文件一致）
        const settings: any = (model as any).internalModel?.settings;
        const defs: any[] =
          settings?.FileReferences?.Expressions ||
          settings?.expressions ||
          settings?.Expressions ||
          [];
        setExpressionDefs(defs);
        // 生成可读名称（移除路径与 .exp3.json 后缀）
        const names = defs
          .map((d: any) =>
            String(d?.File || d?.file || d?.Name || d?.name || "")
          )
          .map((s: string) =>
            s.replace(/\.exp3\.json$/i, "").replace(/^.*\//, "")
          )
          .filter((s: string) => !!s);
        setExpressionNames(names);
        // 建立小写文件名到索引的映射，便于通过字符串快速切换
        const map: Record<string, number> = {};
        defs.forEach((d: any, i: number) => {
          const key = String(d?.File || d?.file || d?.Name || d?.name || "")
            .replace(/\.exp3\.json$/i, "")
            .replace(/^.*\//, "")
            .toLowerCase();
          if (key) map[key] = i;
        });
        setExpressionMap(map);
      } catch {}
    })();
    const onMove = (ev: MouseEvent) => {
      updatePointerByClient(ev.clientX, ev.clientY);
      lastActivityRef.current = Date.now();
      idleRef.current = false;
      normalAppliedRef.current = false;
      pointerInWindowRef.current = true;
    };
    const onLeave = (ev: MouseEvent) => {
      if (!ev.relatedTarget) {
        pointerRef.current = { x: 0, y: 0 };
        idleRef.current = true;
        normalAppliedRef.current = false;
        pointerInWindowRef.current = false;
      }
    };
    const onDown = () => {
      lastActivityRef.current = Date.now();
      idleRef.current = false;
      normalAppliedRef.current = false;
    };
    const onKey = () => {
      lastActivityRef.current = Date.now();
      idleRef.current = false;
      normalAppliedRef.current = false;
    };
    const onWheel = () => {
      lastActivityRef.current = Date.now();
      idleRef.current = false;
      normalAppliedRef.current = false;
    };
    const onUp = () => { draggingRef.current = false; };
    const onBlur = () => { idleRef.current = true; normalAppliedRef.current = false; pointerInWindowRef.current = false; };
    const onFocus = () => { lastActivityRef.current = Date.now(); idleRef.current = false; normalAppliedRef.current = false; pointerInWindowRef.current = true; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseleave", onLeave);
    window.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("keydown", onKey);
    window.addEventListener("wheel", onWheel);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    return () => {
      disposed = true;
      if (appRef.current) {
        try {
          appRef.current.destroy(true);
        } catch {}
        appRef.current = null;
      }
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseleave", onLeave);
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
    };
  }, [width, height, modelPath]);

  // 监听外部传入的表情名，优先按映射索引切换，找不到则尝试名称回退
  useEffect(() => {
    const m: any = modelRef.current;
    if (!m) return;
    const key = (expressionName || "").toLowerCase();
    if (!key) return;
    const idx = expressionMap[key];
    if (typeof idx === "number") {
      try {
        m.expression(idx);
      } catch {}
    } else {
      try {
        m.expression(key);
      } catch {}
    }
    lastActivityRef.current = Date.now();
    idleRef.current = false;
    normalAppliedRef.current = false;
  }, [expressionName, expressionMap]);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (onFileDrop && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileDrop(e.dataTransfer.files);
    }
    if (onDragLeave) {
      try { onDragLeave(); } catch {}
    }
  };

  const handleMouseDown = async (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button === 0) {
      draggingRef.current = true;
      if (onDragStart) onDragStart();
      try {
        if (isTauri) {
          const w1 = tauriWindow.getCurrentWindow();
          if (typeof (w1 as any).startDragging === "function") {
            await (w1 as any).startDragging();
            return;
          }
          const w2 = tauriWebviewWindow.getCurrentWebviewWindow();
          if (typeof (w2 as any).startDragging === "function") {
            await (w2 as any).startDragging();
          }
        }
      } catch {}
    }
  };

  const notifyPointerRegion = (interactive: boolean) => {
    try {
      emit("ui_pointer_region", { interactive });
    } catch {}
  };

  const handleMouseEnter = () => {
    notifyPointerRegion(true);
  };

  const handleMouseLeave = () => {
    notifyPointerRegion(false);
  };

  return (
    <div
      style={{
        position: "relative",
        display: "inline-block",
        userSelect: "none",
        ...style,
      }}
      onDoubleClick={onDoubleClick}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div ref={containerRef} style={{ width, height }} />
      {dragArea === "bottom" && (
        <div
          style={{
            position: "absolute",
            left: 0,
            bottom: 0,
            width: "100%",
            height: 30,
            cursor: "grab",
            zIndex: 2,
          }}
          data-tauri-drag-region
          onMouseDown={handleMouseDown}
        />
      )}
      {dragArea === "all" && (
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: "100%",
            height: "100%",
            cursor: "grab",
            zIndex: 2,
          }}
          data-tauri-drag-region
          onMouseDown={handleMouseDown}
        />
      )}
    </div>
  );
};

export default Live2DModelView;
