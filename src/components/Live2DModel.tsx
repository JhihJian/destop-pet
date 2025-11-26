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
          const k = 0.15;
          const tx = pointerRef.current.x * 30;
          const ty = -pointerRef.current.y * 30;
          const tz = pointerRef.current.x * 10;
          const eyeX = pointerRef.current.x;
          const eyeY = -pointerRef.current.y;
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
    };
    const onLeave = (ev: MouseEvent) => {
      if (!ev.relatedTarget) {
        pointerRef.current = { x: 0, y: 0 };
      }
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseleave", onLeave);
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
