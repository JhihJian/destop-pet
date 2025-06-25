/**
 * WebGL管理器
 */

export class LAppGlManager {
  private static _instance: LAppGlManager;
  private _gl: WebGLRenderingContext | null = null;
  private _canvas: HTMLCanvasElement | null = null;
  private _frameBuffer: WebGLFramebuffer | null = null;

  public static getInstance(): LAppGlManager {
    if (!this._instance) {
      this._instance = new LAppGlManager();
    }
    return this._instance;
  }

  public static releaseInstance(): void {
    if (this._instance) {
      this._instance = null as any;
    }
  }

  /**
   * 初始化WebGL
   * @param canvas HTMLCanvasElement
   * @returns 是否成功初始化
   */
  public initialize(canvas: HTMLCanvasElement): boolean {
    // 启用alpha通道支持透明背景
    const contextOptions: WebGLContextAttributes = {
      alpha: true,
      premultipliedAlpha: true,
      antialias: true,
      depth: true,
      stencil: false,
      preserveDrawingBuffer: false
    };

    const gl = canvas.getContext('webgl2', contextOptions) || canvas.getContext('webgl', contextOptions);
    
    if (!gl) {
      console.error('Failed to get WebGL context');
      return false;
    }

    this._gl = gl as WebGLRenderingContext;
    this._canvas = canvas;

    // Get the default framebuffer
    this._frameBuffer = this._gl.getParameter(this._gl.FRAMEBUFFER_BINDING);

    // WebGL设置 - 确保正确的透明度混合
    this._gl.enable(this._gl.BLEND);
    this._gl.blendFuncSeparate(
      this._gl.SRC_ALPHA, this._gl.ONE_MINUS_SRC_ALPHA,  // RGB混合
      this._gl.ONE, this._gl.ONE_MINUS_SRC_ALPHA          // Alpha混合
    );
    this._gl.enable(this._gl.DEPTH_TEST);
    this._gl.depthFunc(this._gl.LEQUAL);

    console.log('WebGL context initialized with alpha support');

    return true;
  }

  /**
   * 获取WebGL上下文
   */
  public getGl(): WebGLRenderingContext | null {
    return this._gl;
  }

  /**
   * 获取Canvas元素
   */
  public getCanvas(): HTMLCanvasElement | null {
    return this._canvas;
  }

  /**
   * 获取默认帧缓冲区
   */
  public getFrameBuffer(): WebGLFramebuffer | null {
    return this._frameBuffer;
  }

  /**
   * 清除画面 - 使用透明背景
   */
  public clear(): void {
    if (!this._gl) return;
    
    // 清除为完全透明
    this._gl.clearColor(0.0, 0.0, 0.0, 0.0);
    this._gl.clear(this._gl.COLOR_BUFFER_BIT | this._gl.DEPTH_BUFFER_BIT);
  }

  /**
   * 设置视口
   */
  public setViewport(x: number, y: number, width: number, height: number): void {
    if (!this._gl) return;
    this._gl.viewport(x, y, width, height);
  }

  /**
   * 释放资源
   */
  public release(): void {
    this._gl = null;
    this._canvas = null;
    this._frameBuffer = null;
  }
} 