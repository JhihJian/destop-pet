/**
 * Live2D模型类 - 基于官方Demo
 */

import { CubismUserModel } from '../live2d-framework/model/cubismusermodel';
import { CubismModelSettingJson } from '../live2d-framework/cubismmodelsettingjson';
import { ICubismModelSetting } from '../live2d-framework/icubismmodelsetting';
import { CubismLogError, CubismLogInfo } from '../live2d-framework/utils/cubismdebug';
import { CubismMatrix44 } from '../live2d-framework/math/cubismmatrix44';
import { CubismEyeBlink } from '../live2d-framework/effect/cubismeyeblink';
import { CubismBreath } from '../live2d-framework/effect/cubismbreath';
import { CubismPhysics } from '../live2d-framework/physics/cubismphysics';
import { CubismPose } from '../live2d-framework/effect/cubismpose';
import { CubismMotion } from '../live2d-framework/motion/cubismmotion';
import { ACubismMotion } from '../live2d-framework/motion/acubismmotion';
import { CubismMotionQueueEntryHandle, CubismMotionQueueManager } from '../live2d-framework/motion/cubismmotionqueuemanager';
import { CubismIdHandle } from '../live2d-framework/id/cubismid';
import { csmVector } from '../live2d-framework/type/csmvector';
import { csmMap } from '../live2d-framework/type/csmmap';
import { InvalidMotionQueueEntryHandleValue } from '../live2d-framework/motion/cubismmotionqueuemanager';
import { FinishedMotionCallback, BeganMotionCallback } from '../live2d-framework/motion/acubismmotion';
import { CubismDefaultParameterId } from '../live2d-framework/cubismdefaultparameterid';
import { LAppSubdelegate } from './LAppSubdelegate';
import { LAppPal } from './LAppPal';
import { TextureInfo } from './LAppTextureManager';
import * as LAppDefine from './LAppDefine';
import { CubismRenderer_WebGL } from '../live2d-framework/rendering/cubismrenderer_webgl';

enum LoadStep {
  LoadAssets,
  LoadModel,
  WaitLoadModel,
  LoadExpression,
  WaitLoadExpression,
  LoadPhysics,
  WaitLoadPhysics,
  LoadPose,
  WaitLoadPose,
  SetupEyeBlink,
  SetupBreath,
  LoadUserData,
  WaitLoadUserData,
  SetupEyeBlinkIds,
  SetupLipSyncIds,
  SetupLayout,
  LoadMotion,
  WaitLoadMotion,
  CompleteInitialize,
  CompleteSetupModel,
  LoadTexture,
  WaitLoadTexture,
  CompleteSetup
}

/**
 * Live2D模型管理类 - 完整Demo版本
 */
export class LAppModel extends CubismUserModel {
  private _modelSetting: ICubismModelSetting;
  private _modelHomeDir: string;
  private _userTimeSeconds: number;
  private _eyeBlinkIds: csmVector<CubismIdHandle>;
  private _lipSyncIds: csmVector<CubismIdHandle>;
  private _motions: csmMap<string, ACubismMotion>;
  private _expressions: csmMap<string, ACubismMotion>;
  private _idParamAngleX: CubismIdHandle;
  private _idParamAngleY: CubismIdHandle;
  private _idParamAngleZ: CubismIdHandle;
  private _idParamEyeBallX: CubismIdHandle;
  private _idParamEyeBallY: CubismIdHandle;
  private _idParamBodyAngleX: CubismIdHandle;
  private _state: LoadStep;
  private _expressionCount: number;
  private _textureCount: number;
  private _motionCount: number;
  private _allMotionCount: number;
  private _subdelegate: LAppSubdelegate;

  /**
   * コンストラクタ
   */
  public constructor() {
    super();
    this._modelSetting = null;
    this._modelHomeDir = '';
    this._userTimeSeconds = 0.0;
    this._eyeBlinkIds = new csmVector<CubismIdHandle>();
    this._lipSyncIds = new csmVector<CubismIdHandle>();
    this._motions = new csmMap<string, ACubismMotion>();
    this._expressions = new csmMap<string, ACubismMotion>();
    this._state = LoadStep.LoadAssets;
    this._expressionCount = 0;
    this._textureCount = 0;
    this._motionCount = 0;
    this._allMotionCount = 0;
    // Initialize parameter IDs
    this._idParamAngleX = CubismDefaultParameterId.ParamAngleX;
    this._idParamAngleY = CubismDefaultParameterId.ParamAngleY;
    this._idParamAngleZ = CubismDefaultParameterId.ParamAngleZ;
    this._idParamEyeBallX = CubismDefaultParameterId.ParamEyeBallX;
    this._idParamEyeBallY = CubismDefaultParameterId.ParamEyeBallY;
    this._idParamBodyAngleX = CubismDefaultParameterId.ParamBodyAngleX;
  }

  /**
   * 设置子委托
   */
  public setSubdelegate(subdelegate: LAppSubdelegate): void {
    this._subdelegate = subdelegate;
  }

  /**
   * model3.jsonからモデルを生成する。
   * model3.jsonの記述に従ってモデル生成、モーション、物理演算などのコンポーネント生成を行う。
   *
   * @param dir モデルの配置されたディレクトリ
   * @param fileName model3.jsonのファイル名
   */
  public loadAssets(dir: string, fileName: string): void {
    this._modelHomeDir = dir;

    fetch(`${this._modelHomeDir}${fileName}`)
      .then(response => response.arrayBuffer())
      .then(arrayBuffer => {
        const setting: ICubismModelSetting = new CubismModelSettingJson(
          arrayBuffer,
          arrayBuffer.byteLength
        );

        this.setupModel(setting);
      });
  }

  /**
   * model3.jsonからモデルを生成する。
   * model3.jsonの記述に従ってモデル生成、モーション、物理演算などのコンポーネント生成を行う。
   *
   * @param setting ICubismModelSettingのインスタンス
   */
  private setupModel(setting: ICubismModelSetting): void {
    this.setUpdating(true);
    this.setInitialized(false);

    this._modelSetting = setting;

    // CubismModel
    if (this._modelSetting.getModelFileName() != '') {
      const modelFileName = this._modelSetting.getModelFileName();

      fetch(`${this._modelHomeDir}${modelFileName}`)
        .then(response => response.arrayBuffer())
        .then(arrayBuffer => {
          this.loadModel(arrayBuffer, false);

          this._state = LoadStep.LoadExpression;

          // callback
          loadCubismExpression();
        });

      this._state = LoadStep.WaitLoadModel;
    } else {
      LAppPal.printMessage('Model data does not exist.');
    }

    // Expression
    const loadCubismExpression = (): void => {
      if (this._state == LoadStep.LoadExpression) {
        if (this._modelSetting.getExpressionCount() > 0) {
          const count: number = this._modelSetting.getExpressionCount();

          for (let i = 0; i < count; i++) {
            const expressionName = this._modelSetting.getExpressionName(i);
            const expressionFileName = this._modelSetting.getExpressionFileName(i);

            fetch(`${this._modelHomeDir}${expressionFileName}`)
              .then(response => response.arrayBuffer())
              .then(arrayBuffer => {
                const motion: ACubismMotion = this.loadExpression(
                  arrayBuffer,
                  arrayBuffer.byteLength,
                  expressionName
                );

                if (this._expressions.getValue(expressionName) != null) {
                  ACubismMotion.delete(
                    this._expressions.getValue(expressionName)
                  );
                  this._expressions.setValue(expressionName, null);
                }

                this._expressions.setValue(expressionName, motion);

                this._expressionCount++;

                if (this._expressionCount >= count) {
                  this._state = LoadStep.LoadPhysics;

                  // callback
                  loadCubismPhysics();
                }
              });
          }
          this._state = LoadStep.WaitLoadExpression;
        } else {
          this._state = LoadStep.LoadPhysics;

          // callback
          loadCubismPhysics();
        }
      }
    };

    // Physics
    const loadCubismPhysics = (): void => {
      if (this._state == LoadStep.LoadPhysics) {
        if (this._modelSetting.getPhysicsFileName() != '') {
          const physicsFileName = this._modelSetting.getPhysicsFileName();

          fetch(`${this._modelHomeDir}${physicsFileName}`)
            .then(response => response.arrayBuffer())
            .then(arrayBuffer => {
              this.loadPhysics(arrayBuffer, arrayBuffer.byteLength);

              this._state = LoadStep.LoadPose;

              // callback
              loadCubismPose();
            });
          this._state = LoadStep.WaitLoadPhysics;
        } else {
          this._state = LoadStep.LoadPose;

          // callback
          loadCubismPose();
        }
      }
    };

    // Pose
    const loadCubismPose = (): void => {
      if (this._state == LoadStep.LoadPose) {
        if (this._modelSetting.getPoseFileName() != '') {
          const poseFileName = this._modelSetting.getPoseFileName();

          fetch(`${this._modelHomeDir}${poseFileName}`)
            .then(response => response.arrayBuffer())
            .then(arrayBuffer => {
              this.loadPose(arrayBuffer, arrayBuffer.byteLength);

              this._state = LoadStep.SetupEyeBlink;

              // callback
              setupEyeBlink();
            });
          this._state = LoadStep.WaitLoadPose;
        } else {
          this._state = LoadStep.SetupEyeBlink;

          // callback
          setupEyeBlink();
        }
      }
    };

    // EyeBlink
    const setupEyeBlink = (): void => {
      if (this._state == LoadStep.SetupEyeBlink) {
        if (this._modelSetting.getEyeBlinkParameterCount() > 0) {
          this._eyeBlink = CubismEyeBlink.create(this._modelSetting);
        }

        this._state = LoadStep.SetupBreath;

        // callback
        setupBreath();
      }
    };

    // Breath
    const setupBreath = (): void => {
      if (this._state == LoadStep.SetupBreath) {
        this._breath = CubismBreath.create();

        const breathParameters: csmVector<BreathParameterData> = new csmVector();
        breathParameters.pushBack(
          new BreathParameterData(this._idParamAngleX, 0.0, 15.0, 6.5345, 0.5)
        );
        breathParameters.pushBack(
          new BreathParameterData(this._idParamAngleY, 0.0, 8.0, 3.5345, 0.5)
        );
        breathParameters.pushBack(
          new BreathParameterData(this._idParamAngleZ, 0.0, 10.0, 5.5345, 0.5)
        );
        breathParameters.pushBack(
          new BreathParameterData(this._idParamBodyAngleX, 0.0, 4.0, 15.5345, 0.5)
        );

        this._breath.setParameters(breathParameters);

        this._state = LoadStep.LoadUserData;

        // callback
        loadUserData();
      }
    };

    // UserData
    const loadUserData = (): void => {
      if (this._state == LoadStep.LoadUserData) {
        if (this._modelSetting.getUserDataFile() != '') {
          const userDataFileName = this._modelSetting.getUserDataFile();

          fetch(`${this._modelHomeDir}${userDataFileName}`)
            .then(response => response.arrayBuffer())
            .then(arrayBuffer => {
              this.loadUserData(arrayBuffer, arrayBuffer.byteLength);

              this._state = LoadStep.SetupEyeBlinkIds;

              // callback
              setupEyeBlinkIds();
            });

          this._state = LoadStep.WaitLoadUserData;
        } else {
          this._state = LoadStep.SetupEyeBlinkIds;

          // callback
          setupEyeBlinkIds();
        }
      }
    };

    // EyeBlinkIds
    const setupEyeBlinkIds = (): void => {
      if (this._state == LoadStep.SetupEyeBlinkIds) {
        const eyeBlinkIdCount: number = this._modelSetting.getEyeBlinkParameterCount();

        for (let i = 0; i < eyeBlinkIdCount; ++i) {
          this._eyeBlinkIds.pushBack(this._modelSetting.getEyeBlinkParameterId(i));
        }

        this._state = LoadStep.SetupLipSyncIds;

        // callback
        setupLipSyncIds();
      }
    };

    // LipSyncIds
    const setupLipSyncIds = (): void => {
      if (this._state == LoadStep.SetupLipSyncIds) {
        const lipSyncIdCount = this._modelSetting.getLipSyncParameterCount();

        for (let i = 0; i < lipSyncIdCount; ++i) {
          this._lipSyncIds.pushBack(this._modelSetting.getLipSyncParameterId(i));
        }

        this._state = LoadStep.SetupLayout;

        // callback
        setupLayout();
      }
    };

    // Layout
    const setupLayout = (): void => {
      if (this._state == LoadStep.SetupLayout) {
        const layout: csmMap<string, number> = new csmMap<string, number>();
        this._modelSetting.getLayoutMap(layout);
        this._modelMatrix.setupFromLayout(layout);

        this._state = LoadStep.LoadMotion;

        // callback
        loadCubismMotion();
      }
    };

    // Motion
    const loadCubismMotion = (): void => {
      if (this._state == LoadStep.LoadMotion) {
        this._state = LoadStep.WaitLoadMotion;
        this._model.saveParameters();

        this._allMotionCount = 0;
        this._motionCount = 0;

        // motion3.jsonをロードしてモーションを生成する。
        const group: string[] = [];

        const motionGroupCount: number = this._modelSetting.getMotionGroupCount();

        // モーションの総数を求める
        for (let i = 0; i < motionGroupCount; i++) {
          group[i] = this._modelSetting.getMotionGroupName(i);
          this._allMotionCount += this._modelSetting.getMotionCount(group[i]);
        }

        // モーションの読み込み
        for (let i = 0; i < motionGroupCount; i++) {
          this.preLoadMotionGroup(group[i]);
        }

        // モーションがない場合
        if (motionGroupCount == 0) {
          this._state = LoadStep.LoadTexture;

          // 全てのモーションを停止する
          this._motionManager.stopAllMotions();

          this.setUpdating(false);
          this.setInitialized(true);

          this.createRenderer();
          this.setupTextures();
          this.getRenderer().startUp(this._subdelegate.getGlManager().getGl());
        }
      }
    };
  }

  /**
   * テクスチャユニットにテクスチャをロードする
   */
  private setupTextures(): void {
    // iPhoneでのアルファ品質向上のためTypescriptではpremultipliedAlphaを採用
    const usePremultiply = true;

    if (this._state == LoadStep.LoadTexture) {
      // テクスチャ読み込み用
      const textureCount: number = this._modelSetting.getTextureCount();

      for (
        let modelTextureNumber = 0;
        modelTextureNumber < textureCount;
        modelTextureNumber++
      ) {
        // テクスチャ名が空文字だった場合はロード・バインド処理をスキップ
        if (this._modelSetting.getTextureFileName(modelTextureNumber) == '') {
          console.log('getTextureFileName null');
          continue;
        }

        // WebGLのテクスチャユニットにテクスチャをロードする
        let texturePath =
          this._modelSetting.getTextureFileName(modelTextureNumber);
        texturePath = this._modelHomeDir + texturePath;

        // ロード完了時に呼び出すコールバック関数
        const onLoad = (textureInfo: TextureInfo): void => {
          this.getRenderer().bindTexture(modelTextureNumber, textureInfo.id);

          this._textureCount++;

          if (this._textureCount >= textureCount) {
            // ロード完了
            this._state = LoadStep.CompleteSetup;
          }
        };

        // 読み込み
        this._subdelegate
          .getTextureManager()
          .createTextureFromPngFile(texturePath, usePremultiply, onLoad);
        this.getRenderer().setIsPremultipliedAlpha(usePremultiply);
      }

      this._state = LoadStep.WaitLoadTexture;
    }
  }

  /**
   * 更新
   */
  public update(): void {
    if (this._state != LoadStep.CompleteSetup) return;

    const deltaTimeSeconds: number = LAppPal.getDeltaTime();
    this._userTimeSeconds += deltaTimeSeconds;

    this._dragManager.update(deltaTimeSeconds);
    this._dragX = this._dragManager.getX();
    this._dragY = this._dragManager.getY();

    // モーションによるパラメータ更新の有無
    let motionUpdated = false;

    //--------------------------------------------------------------------------
    this._model.loadParameters(); // 前回セーブされた状態をロード
    if (this._motionManager.isFinished()) {
      // モーションの再生がない場合、待機モーションの中からランダムで再生する
      this.startRandomMotion(
        LAppDefine.MotionGroupIdle,
        LAppDefine.PriorityIdle
      );
    } else {
      motionUpdated = this._motionManager.updateMotion(
        this._model,
        deltaTimeSeconds
      ); // モーションを更新
    }
    this._model.saveParameters(); // 状態を保存
    //--------------------------------------------------------------------------

    // まばたき
    if (!motionUpdated) {
      if (this._eyeBlink != null) {
        // メインモーションの更新がないとき
        this._eyeBlink.updateParameters(this._model, deltaTimeSeconds); // 目パチ
      }
    }

    if (this._expressionManager != null) {
      this._expressionManager.updateMotion(this._model, deltaTimeSeconds); // 表情でパラメータ更新（相対変化）
    }

    // ドラッグによる変化
    // ドラッグによる顔の向きの調整
    this._model.addParameterValueById(this._idParamAngleX, this._dragX * 30); // -30から30の値を加える
    this._model.addParameterValueById(this._idParamAngleY, this._dragY * 30);
    this._model.addParameterValueById(
      this._idParamAngleZ,
      this._dragX * this._dragY * -30
    );

    // ドラッグによる体の向きの調整
    this._model.addParameterValueById(
      this._idParamBodyAngleX,
      this._dragX * 10
    ); // -10から10の値を加える

    // ドラッグによる目の向きの調整
    this._model.addParameterValueById(this._idParamEyeBallX, this._dragX); // -1から1の値を加える
    this._model.addParameterValueById(this._idParamEyeBallY, this._dragY);

    // 呼吸など
    if (this._breath != null) {
      this._breath.updateParameters(this._model, deltaTimeSeconds);
    }

    // 物理演算の設定
    if (this._physics != null) {
      this._physics.evaluate(this._model, deltaTimeSeconds);
    }

    // ポーズの設定
    if (this._pose != null) {
      this._pose.updateParameters(this._model, deltaTimeSeconds);
    }

    this._model.update();
  }

  /**
   * 引数で指定したモーションの再生を開始する
   * @param group モーショングループ名
   * @param no グループ内の番号
   * @param priority 優先度
   * @param onFinishedMotionHandler モーション再生終了時に呼び出されるコールバック関数
   * @return 開始したモーションの識別番号を返す。個別のモーションが終了したか否かを判定するisFinished()の引数で使用する。開始できない時は[-1]
   */
  public startMotion(
    group: string,
    no: number,
    priority: number,
    onFinishedMotionHandler?: FinishedMotionCallback,
    onBeganMotionHandler?: BeganMotionCallback
  ): CubismMotionQueueEntryHandle {
    if (priority == LAppDefine.PriorityForce) {
      this._motionManager.setReservePriority(priority);
    } else if (!this._motionManager.reserveMotion(priority)) {
      LAppPal.printMessage('[APP]can\'t start motion.');
      return InvalidMotionQueueEntryHandleValue;
    }

    const motionFileName = this._modelSetting.getMotionFileName(group, no);

    // ex) idle_0
    const name = `${group}_${no}`;
    let motion: CubismMotion = this._motions.getValue(name) as CubismMotion;
    let autoDelete = false;

    if (motion == null) {
      fetch(`${this._modelHomeDir}${motionFileName}`)
        .then(response => {
          if (response.ok) {
            return response.arrayBuffer();
          } else if (response.status >= 400) {
            CubismLogError(
              `Failed to load file ${this._modelHomeDir}${motionFileName}`
            );
            return new ArrayBuffer(0);
          }
        })
        .then(arrayBuffer => {
          motion = this.loadMotion(
            arrayBuffer,
            arrayBuffer.byteLength,
            null,
            onFinishedMotionHandler,
            onBeganMotionHandler
          );
        });

      if (motion) {
        motion.setEffectIds(this._eyeBlinkIds, this._lipSyncIds);
        autoDelete = true; // 終了時にメモリから削除
      } else {
        CubismLogError('Can\'t start motion {0} .', motionFileName);
        // ロードできなかったモーションのReservePriorityをリセットする
        this._motionManager.setReservePriority(LAppDefine.PriorityNone);
        return InvalidMotionQueueEntryHandleValue;
      }
    } else {
      motion.setBeganMotionHandler(onBeganMotionHandler);
      motion.setFinishedMotionHandler(onFinishedMotionHandler);
    }

    LAppPal.printMessage(`[APP]start motion: [${group}_${no}]`);
    return this._motionManager.startMotionPriority(
      motion,
      autoDelete,
      priority
    );
  }

  /**
   * ランダムに選ばれたモーションの再生を開始する。
   * @param group モーショングループ名
   * @param priority 優先度
   * @param onFinishedMotionHandler モーション再生終了時に呼び出されるコールバック関数
   * @return 開始したモーションの識別番号を返す。個別のモーションが終了したか否かを判定するisFinished()の引数で使用する。開始できない時は[-1]
   */
  public startRandomMotion(
    group: string,
    priority: number,
    onFinishedMotionHandler?: FinishedMotionCallback,
    onBeganMotionHandler?: BeganMotionCallback
  ): CubismMotionQueueEntryHandle {
    if (this._modelSetting.getMotionCount(group) == 0) {
      return InvalidMotionQueueEntryHandleValue;
    }

    const no: number = Math.floor(
      Math.random() * this._modelSetting.getMotionCount(group)
    );

    return this.startMotion(
      group,
      no,
      priority,
      onFinishedMotionHandler,
      onBeganMotionHandler
    );
  }

  /**
   * 指定した名前のモーショングループのモーションを予め読み込む。
   * モーショングループ名が無効の場合は何もしない。
   * @param group モーショングループ名
   */
  public preLoadMotionGroup(group: string): void {
    for (let i = 0; i < this._modelSetting.getMotionCount(group); i++) {
      const motionFileName = this._modelSetting.getMotionFileName(group, i);

      // ex) idle_0
      const name = `${group}_${i}`;
      LAppPal.printMessage(`[APP]load motion: ${motionFileName} => [${name}]`);

      fetch(`${this._modelHomeDir}${motionFileName}`)
        .then(response => response.arrayBuffer())
        .then(arrayBuffer => {
          const tmpMotion: CubismMotion = this.loadMotion(
            arrayBuffer,
            arrayBuffer.byteLength,
            name
          );

          let fadeTime = this._modelSetting.getMotionFadeInTimeValue(group, i);
          if (fadeTime >= 0.0) {
            tmpMotion.setFadeInTime(fadeTime);
          }

          fadeTime = this._modelSetting.getMotionFadeOutTimeValue(group, i);
          if (fadeTime >= 0.0) {
            tmpMotion.setFadeOutTime(fadeTime);
          }
          tmpMotion.setEffectIds(this._eyeBlinkIds, this._lipSyncIds);

          if (this._motions.getValue(name) != null) {
            ACubismMotion.delete(this._motions.getValue(name));
          }

          this._motions.setValue(name, tmpMotion);

          this._motionCount++;

          if (this._motionCount >= this._allMotionCount) {
            this._state = LoadStep.LoadTexture;

            // 全てのモーションを停止する
            this._motionManager.stopAllMotions();

            this.setUpdating(false);
            this.setInitialized(true);

            this.createRenderer();
            this.setupTextures();
            this.getRenderer().startUp(this._subdelegate.getGlManager().getGl());
          }
        });
    }
  }

  /**
   * 描画オブジェクト（アートメッシュ）を描画する。
   * ポリゴンメッシュとテクスチャ番号をセットで渡す。
   */
  public draw(matrix: CubismMatrix44): void {
    if (this._model == null) return;

    // 各読み込み完了のチェック
    if (this._state == LoadStep.CompleteSetup) {
      matrix.multiplyByMatrix(this._modelMatrix);

      this.getRenderer().setMvpMatrix(matrix);

      this.getRenderer().setRenderState(
        this._subdelegate.getGlManager().getFrameBuffer(),
        [0, 0, this._subdelegate.getGlManager().getCanvas().width, this._subdelegate.getGlManager().getCanvas().height]
      );
      this.getRenderer().drawModel();
    }
  }

  /**
   * モデル設定を取得する
   */
  public getModelSetting(): ICubismModelSetting | null {
    return this._modelSetting;
  }

  /**
   * デストラクタ相当の処理
   */
  public release(): void {
    super.release();
  }


}

/**
 * 呼吸のパラメータ情報
 */
class BreathParameterData {
  public constructor(
    parameterId: CubismIdHandle = null,
    offset: number = 0.0,
    peak: number = 0.0,
    cycle: number = 0.0,
    weight: number = 0.0
  ) {
    this.parameterId = parameterId;
    this.offset = offset;
    this.peak = peak;
    this.cycle = cycle;
    this.weight = weight;
  }

  parameterId: CubismIdHandle; // パラメータID
  offset: number; // 正弦波の角度のオフセット
  peak: number; // 正弦波の振幅の倍率
  cycle: number; // 正弦波の周期
  weight: number; // パラメータへの重み
} 