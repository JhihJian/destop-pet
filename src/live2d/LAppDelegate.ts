/**
 * Live2D应用程序委托类 - 完整Demo版本
 */

import { CubismFramework, Option } from '../live2d-framework/live2dcubismframework';
import { CubismMatrix44 } from '../live2d-framework/math/cubismmatrix44';
import { LAppModel } from './LAppModel';
import { LAppSubdelegate } from './LAppSubdelegate';
import { LAppPal } from './LAppPal';
import * as LAppDefine from './LAppDefine';

export class LAppDelegate {
  private static _instance: LAppDelegate;
  private _cubismOption: Option = new Option();
  private _model: LAppModel | null = null;
  private _subdelegate: LAppSubdelegate | null = null;
  private _isInitialized: boolean = false;
  private _frameId: number | null = null;
  private _firstFrameRendered: boolean = false;

  public static getInstance(): LAppDelegate {
    if (!this._instance) {
      this._instance = new LAppDelegate();
    }
    return this._instance;
  }

  public static releaseInstance(): void {
    if (this._instance) {
      this._instance.release();
      this._instance = null as any;
    }
  }

  /**
   * 初始化应用程序
   */
  public async initialize(canvas: HTMLCanvasElement): Promise<boolean> {
    if (this._isInitialized) {
      console.log('LAppDelegate already initialized');
      return true;
    }

    try {
      // Cubism SDK 初始化
      this._cubismOption.logFunction = console.log;
      this._cubismOption.loggingLevel = LAppDefine.CubismLoggingLevel;
      
      if (!CubismFramework.isStarted()) {
        CubismFramework.startUp(this._cubismOption);
      }
      
      if (!CubismFramework.isInitialized()) {
        CubismFramework.initialize();
      }

      // 创建子委托
      this._subdelegate = new LAppSubdelegate();
      if (!this._subdelegate.initialize(canvas)) {
        console.error('Failed to initialize subdelegate');
        return false;
      }

      // 模型加载
      this.loadModel();

      this._isInitialized = true;
      console.log('Live2D initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize Live2D:', error);
      return false;
    }
  }

  /**
   * 加载模型
   */
  private loadModel(): void {
    const modelDir = LAppDefine.ModelDir[0]; // Haru
    const modelPath = `${LAppDefine.ResourcesPath}${modelDir}/`;
    
    this._model = new LAppModel();
    if (this._subdelegate) {
      this._model.setSubdelegate(this._subdelegate);
    }
    this._model.loadAssets(modelPath, 'Haru.model3.json');
  }

  /**
   * 开始渲染循环
   */
  public startRenderLoop(): void {
    if (!this._isInitialized) return;

    const loop = () => {
      this.run();
      this._frameId = requestAnimationFrame(loop);
    };
    
    this._frameId = requestAnimationFrame(loop);
  }

  /**
   * 停止渲染循环
   */
  public stopRenderLoop(): void {
    if (this._frameId !== null) {
      cancelAnimationFrame(this._frameId);
      this._frameId = null;
    }
  }

  /**
   * 执行一帧
   */
  private run(): void {
    if (!this._subdelegate || !this._model) return;

    // 更新时间
    LAppPal.updateTime();
    
    // 获取WebGL上下文
    const gl = this._subdelegate.getGlManager().getGl();
    if (!gl || gl.isContextLost()) {
      return;
    }

    // 获取Canvas
    const canvas = this._subdelegate.getGlManager().getCanvas();
    if (!canvas) {
      return;
    }

    // 只在第一次渲染时清除背景为透明
    if (!this._firstFrameRendered) {
      gl.clearColor(0.0, 0.0, 0.0, 0.0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      this._firstFrameRendered = true;
    }
    
    // 设置WebGL状态以保持透明度
    this.setupTransparentWebGLState(gl);
    
    // 模型更新
    this._model.update();
    
    // 设置视口
    gl.viewport(0, 0, canvas.width, canvas.height);
    
    // 绘制模型
    const projection = new CubismMatrix44();
    projection.scale(1.0, canvas.width / canvas.height);
    
    this._model.draw(projection);
  }

  /**
   * 设置WebGL状态以保持透明度
   */
  private setupTransparentWebGLState(gl: WebGLRenderingContext): void {
    // 禁用深度测试以避免深度缓冲区问题
    gl.disable(gl.DEPTH_TEST);
    
    // 启用透明度混合
    gl.enable(gl.BLEND);
    
    // 设置正确的混合函数以处理预乘alpha
    gl.blendFuncSeparate(
      gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA,  // RGB混合
      gl.ONE, gl.ONE_MINUS_SRC_ALPHA          // Alpha混合
    );
    
    // 确保颜色掩码允许所有通道写入
    gl.colorMask(true, true, true, true);
    
    // 禁用剔除以确保模型正确显示
    gl.disable(gl.CULL_FACE);
  }

  /**
   * 处理点击事件
   */
  public onTap(x: number, y: number): void {
    if (!this._model || !this._subdelegate) return;

    const canvas = this._subdelegate.getGlManager().getCanvas();
    if (!canvas) return;

    // 坐标转换: 屏幕坐标 -> 设备坐标 (-1 to 1)
    const deviceX = (x / canvas.width) * 2.0 - 1.0;
    const deviceY = -((y / canvas.height) * 2.0 - 1.0); // Y轴翻转
    
    console.log(`Tap at screen: ${x}, ${y} -> device: ${deviceX}, ${deviceY}`);

    // 获取点击区域信息
    const hitArea = this.getHitAreaName(deviceX, deviceY);
    if (hitArea) {
      console.log(`Hit area: ${hitArea}`);
      
      // 根据点击区域播放不同动作
      this.startInteractionMotion(hitArea);
    } else {
      // 如果没有点击到特定区域，播放随机动作
      this.startRandomInteractionMotion();
    }
  }

  /**
   * 获取点击区域名称
   */
  private getHitAreaName(x: number, y: number): string | null {
    if (!this._model) return null;

    const model = this._model.getModel();
    if (!model) return null;

    // 简化检测：检查是否点击到任何drawable
    const drawableCount = model.getDrawableCount();
    for (let i = 0; i < drawableCount; i++) {
      const drawableId = model.getDrawableId(i);
      if (drawableId && this._model.isHit(drawableId, x, y)) {
        console.log(`Hit model at drawable index: ${i}`);
        
        // 根据Y坐标位置判断区域（简单的启发式方法）
        if (y < 0.3) {
          return 'Head'; // 上半部分认为是头部
        } else {
          return 'Body'; // 下半部分认为是身体
        }
      }
    }

    return null;
  }

  /**
   * 根据点击区域播放交互动作
   */
  private startInteractionMotion(hitArea: string): void {
    if (!this._model) return;

    // 根据不同区域播放不同动作
    switch (hitArea.toLowerCase()) {
      case 'head':
      case 'face':
        // 点击头部时播放身体动作（Haru模型的交互动作）
        this._model.startRandomMotion(LAppDefine.MotionGroupTapBody, LAppDefine.PriorityNormal);
        break;
      case 'body':
        // 播放身体动作
        this._model.startRandomMotion(LAppDefine.MotionGroupTapBody, LAppDefine.PriorityNormal);
        break;
      default:
        // 默认播放空闲动作
        this._model.startRandomMotion(LAppDefine.MotionGroupIdle, LAppDefine.PriorityNormal);
        break;
    }
  }

  /**
   * 播放随机交互动作
   */
  private startRandomInteractionMotion(): void {
    if (!this._model) return;

    // 随机选择播放TapBody动作或Idle动作
    if (Math.random() < 0.7) {
      this._model.startRandomMotion(LAppDefine.MotionGroupTapBody, LAppDefine.PriorityNormal);
    } else {
      this._model.startRandomMotion(LAppDefine.MotionGroupIdle, LAppDefine.PriorityNormal);
    }
  }

  /**
   * 处理拖拽事件
   */
  public onDrag(x: number, y: number): void {
    if (!this._model || !this._subdelegate) return;

    const canvas = this._subdelegate.getGlManager().getCanvas();
    if (!canvas) return;

    // 坐标转换: 屏幕坐标 -> 设备坐标 (-1 to 1)
    const deviceX = (x / canvas.width) * 2.0 - 1.0;
    const deviceY = -((y / canvas.height) * 2.0 - 1.0); // Y轴翻转

    // 设置拖拽位置（进行平滑处理）
    this._model.setDragging(deviceX, deviceY);
  }

  /**
   * 释放资源
   */
  public release(): void {
    this.stopRenderLoop();

    try {
      if (this._model) {
        this._model.release();
        this._model = null;
      }

      if (this._subdelegate) {
        this._subdelegate.release();
        this._subdelegate = null;
      }
      
      // 只在确实需要时释放框架
      if (CubismFramework.isInitialized()) {
        CubismFramework.dispose();
      }
      
      this._isInitialized = false;
    } catch (error) {
      console.warn('Error during release:', error);
    }
  }

  /**
   * 获取模型实例
   */
  public getModel(): LAppModel | null {
    return this._model;
  }
} 