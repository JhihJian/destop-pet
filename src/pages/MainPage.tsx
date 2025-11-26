import React, { useState, useRef } from "react";
import CharacterImage from "../components/CharacterImage";
import ErrorBoundary from "../components/ErrorBoundary";
import UnifiedDialog from "../components/UnifiedDialog";
import styles from "./MainPage.module.css";
import CaseMaterialIssueDialog from "../components/CaseMaterialIssueDialog";

const MainPage: React.FC = () => {
  // 通用弹窗状态
  const [dialogTitle, setDialogTitle] = useState<string | undefined>(undefined);
  const [dialogContent, setDialogContent] = useState<React.ReactNode>("");
  const [dialogActions, setDialogActions] = useState<React.ReactNode>(null);
  const [dialogLoading, setDialogLoading] = useState(false);

  // 状态管理：小人当前状态
  const [characterState, setCharacterState] = useState<string>("waitting");
  // 状态名到图片路径的映射
  const characterStatesMap = {
    error: "/img/error.png",
    success: "/img/success.png",
    think: "/img/think.png",
    waitting: "/img/waitting.png",
  };

  // 小人图片ref
  const imageRef = useRef<HTMLDivElement>(null);
  interface ActionButton {
    text: string;
    action?: string;
  }

  const fileContent = (files: FileList) => (
    <div className="file-content">
      <div className="file-title">收到文件：{files[0].name}</div>
      <div className="file-progress">处理中...</div>
    </div>
  );

  const actionButtons: ActionButton[] = [
    { text: "上传案件到安全行政执法系统" },
    { text: "提取文档关键字段" },
    { text: "总结文档内容" },
  ];

  const errorButtons: ActionButton[] = [
    { text: "一、涉案单位名称缺少行政区划", action: "去处理" },
    { text: "二、案件附件存在问题", action: "去处理" },
  ];

  // 拖拽文件到小人物时的处理逻辑
  const handleFileDrop = (files: FileList) => {
    if (files.length > 0) {
      setDialogTitle("");
      setDialogContent(fileContent(files));
      setCharacterState("think");
      setTimeout(() => {
        setDialogLoading(true);
        setTimeout(() => {
          setDialogLoading(false);
          setDialogTitle("您需要我做什么？");
          setDialogContent(renderActionButtons(actionButtons, files));
        }, 1000);
      }, 1000);
    }
  };

  const handleActionButtonClick = (
    text: string,
    _action?: string,
    files?: FileList
  ) => {
    switch (_action) {
      case "去处理":
        const data = {
          name: "万得信息技术股份有限公司",
          errorContent: [
            {
              content: "行政处罚决定书的涉案单位名称与案件信息中的名称不符",
              type: "errorUpload" as const,
            },
            {
              content:
                "当前只上传了行政处罚决定书，是否需要上传其他附件，以下为常见附件：",
              type: "warningUpload" as const,
              hasType: "行政处罚决定书",
              missingType: [
                { type: "检查通知书", percent: 79 },
                { type: "限期整改通知书", percent: 83 },
                { type: "行政处罚决定书", percent: 79 },
                { type: "整改通知书", percent: 68 },
                { type: "受案登记表", percent: 65 },
                { type: "整改报告", percent: 61 },
                { type: "当场处罚决定书", percent: 57 },
              ],
            },
          ],
        };
        setDialogContent(
          <CaseMaterialIssueDialog
            {...data}
            onResolved={() => {
              setDialogTitle("案件材料相关问题已经全部解决");
              const content = () => {
                return (
                  <div className="case-material-issue-dialog-resolved">
                    <div className="case-material-issue-dialog-resolved-box">
                      <span>需要立即提交到安全行政执法系统？</span>
                      <button
                        className="case-material-issue-dialog-btn primary"
                        onClick={handleSubmitSuccess}
                      >
                        立即提交
                      </button>
                    </div>
                  </div>
                );
              };
              setDialogContent(content);
            }}
          />
        );
        break;
      default:
        setDialogContent(<div>正在处理"{text}"...</div>);
        setTimeout(() => {
          setDialogTitle("您提交的材料存在以下问题:");
          setDialogContent(renderActionButtons(errorButtons, files));
        }, 1500);
        break;
    }
  };

  const renderActionButtons = (
    actionButtons: ActionButton[],
    files?: FileList
  ) => (
    <div className="action-buttons">
      {actionButtons.map((text, index) => (
        <button
          key={index}
          onClick={() => handleActionButtonClick(text.text, text.action, files)}
        >
          <span className="action-button-text">{text.text}</span>
          {text.action ? (
            <span className="action-button-action">{text.action}</span>
          ) : (
            <span style={{ width: 60 }}></span>
          )}
        </button>
      ))}
    </div>
  );

  // 双击小人时弹窗
  const handleDoubleClick = () => {
    setDialogTitle(undefined);
    setDialogContent("你干嘛~");
    setDialogActions(null);
    setCharacterState("error");
    setTimeout(() => {
      setCharacterState("waitting");
      setDialogContent("");
    }, 2000);
  };

  // 拓展：可操作弹窗示例
  // const showActionDialog = () => {
  //   setDialogTitle("操作确认");
  //   setDialogContent("你确定要执行此操作吗？");
  //   setDialogActions(
  //     <>
  //       <button onClick={() => setDialogContent("")}>取消</button>
  //       <button onClick={() => setDialogContent("")}>确认</button>
  //     </>
  //   );
  // };

  // 拖拽窗口时切换小人状态
  const handleDragStart = () => {
    setCharacterState("success");
    setTimeout(() => setCharacterState("waitting"), 5000);
  };

  const handleSubmitSuccess = () => {
    setDialogTitle("");
    setCharacterState("success");
    setDialogContent(
      <div className="case-material-issue-dialog-success">
        <div className="case-material-issue-dialog-success-title">
          <span className="case-material-issue-dialog-success-title-content-text">
            提交成功
          </span>
          <span className="case-material-issue-dialog-success-title-content">
            您的案件已经提交成功，案件编号为：
            <b className="case-material-issue-dialog-success-title-content-number">
              AJ0000003
            </b>
          </span>
          <button className="case-material-issue-dialog-btn primary">
            查看详情
          </button>
        </div>
        <div className="case-material-issue-dialog-success-box">
          <div className="case-material-issue-dialog-success-box-part">
            <div className="case-material-issue-dialog-success-box-title">
              以下为案件的考评结果：
            </div>
            <div className="case-material-issue-dialog-success-box-content">
              <div className="case-material-issue-dialog-success-box-content-item">
                案件定性：
                <span>属于网络安全行政执法案件</span>
              </div>
              <div className="case-material-issue-dialog-success-box-content-item">
                案件考评：
                <span className="case-material-issue-dialog-success-box-content-item-number">
                  ★★★★★
                </span>
              </div>
            </div>
            <div className="case-material-issue-dialog-success-box-content-tag">
              <span className="case-material-issue-dialog-success-tag">
                典型案件
              </span>
              <span className="case-material-issue-dialog-success-tag">
                资料详细
              </span>
              <span className="case-material-issue-dialog-success-tag">
                办案及时
              </span>
              <span className="case-material-issue-dialog-success-tag">
                处罚得当
              </span>
              <span className="case-material-issue-dialog-success-tag">
                证据齐全
              </span>
            </div>
            <div className="case-material-issue-dialog-success-box-content-text">
              经过本部门调查取证，此案件已确定为本市黑客攻击行为，黑客具体资料和攻击证据截图已经上传附件，责任单位可以进一步进行处理。如果需要进一步提供资料请联系系统负责人黑客具体资料和攻击证据截图已经上传附件，责任单位可以进一步进行处理。如果需要我方进一步提供资料请联系系统负责人王伟
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={styles.container}>
      {/* 通用弹窗 */}
      <UnifiedDialog
        open={!!dialogContent || dialogLoading}
        title={dialogTitle}
        content={
          dialogLoading ? (
            <div
              className="dialog-loading"
              style={{ textAlign: "center", padding: 48 }}
            >
              <span
                className="loading-spinner"
                style={{
                  display: "inline-block",
                  width: 32,
                  height: 32,
                  border: "4px solid #eee",
                  borderTop: "4px solid #409eff",
                  borderRadius: "50%",
                  animation: "spin 1s linear infinite",
                  marginBottom: 12,
                }}
              />
              <div>处理中...</div>
            </div>
          ) : (
            dialogContent
          )
        }
        actions={dialogActions}
        onClose={() => {
          setDialogContent("");
          setCharacterState("waitting");
          setDialogLoading(false);
        }}
      />
      {/* 下方模型区域 */}
      <div className={styles.modelContainer}>
        <ErrorBoundary>
          <div ref={imageRef} style={{ display: "inline-block" }}>
            <CharacterImage
              state={characterState}
              statesMap={characterStatesMap}
              width={120}
              height={180}
              alt="智能助手"
              onDoubleClick={handleDoubleClick}
              onDragStart={handleDragStart}
              onFileDrop={handleFileDrop}
              dragArea="bottom"
            />
          </div>
        </ErrorBoundary>
      </div>
      {/* 示例：可操作弹窗按钮 */}
      {/* <button onClick={showActionDialog}>显示操作弹窗</button> */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default MainPage;
