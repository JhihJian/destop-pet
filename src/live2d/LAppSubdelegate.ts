import { LAppGlManager } from './LAppGlManager';
import { LAppTextureManager } from './LAppTextureManager';

/**
 * 简化版子委托类，管理WebGL和纹理
 */
export class LAppSubdelegate {
  private _glManager: LAppGlManager;
  private _textureManager: LAppTextureManager;

  /**
   * コンストラクタ
   */
  public constructor() {
    this._glManager = new LAppGlManager();
    this._textureManager = new LAppTextureManager();
  }

  /**
   * 初始化
   */
  public initialize(canvas: HTMLCanvasElement): boolean {
    if (!this._glManager.initialize(canvas)) {
      return false;
    }

    this._textureManager.setGlManager(this._glManager);
    return true;
  }

  /**
   * 释放资源
   */
  public release(): void {
    if (this._textureManager) {
      this._textureManager.release();
      this._textureManager = null;
    }

    if (this._glManager) {
      this._glManager.release();
      this._glManager = null;
    }
  }

  /**
   * 获取WebGL管理器
   */
  public getGlManager(): LAppGlManager {
    return this._glManager;
  }

  /**
   * 获取纹理管理器
   */
  public getTextureManager(): LAppTextureManager {
    return this._textureManager;
  }
} 