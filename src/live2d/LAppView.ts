/**
 * Live2D视图类
 */

import { LAppModel } from './LAppModel';

export class LAppView {
  private _touchX: number = 0.0;
  private _touchY: number = 0.0;
  private _isInitialized: boolean = false;

  /**
   * 初始化
   */
  public initialize(): void {
    this._isInitialized = true;
  }

  /**
   * 渲染
   */
  public render(model: LAppModel): void {
    if (!this._isInitialized || !model.isInitialized()) return;
    
    // 渲染模型
    model.draw();
  }

  /**
   * 触摸开始事件
   */
  public onTouchesBegan(x: number, y: number): void {
    this._touchX = x;
    this._touchY = y;
  }

  /**
   * 触摸移动事件
   */
  public onTouchesMoved(x: number, y: number): void {
    this._touchX = x;
    this._touchY = y;
  }

  /**
   * 触摸结束事件
   */
  public onTouchesEnded(): void {
    // 触摸结束处理
  }

  /**
   * 释放资源
   */
  public release(): void {
    this._isInitialized = false;
  }

  /**
   * 获取触摸坐标X
   */
  public getTouchX(): number {
    return this._touchX;
  }

  /**
   * 获取触摸坐标Y
   */
  public getTouchY(): number {
    return this._touchY;
  }
} 