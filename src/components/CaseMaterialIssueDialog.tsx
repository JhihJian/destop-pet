import React, { useState, useRef, useEffect } from "react";
import "./CaseMaterialIssueDialog.scss";

interface ErrorItem {
  id?: string;
  type: "errorUpload" | "warningUpload" | "info" | "custom";
  content: string | React.ReactNode;
  hasType?: string;
  missingType?: { type: string; percent: number }[];
  onAction?: (actionType: string, payload?: any) => void;
}

interface CaseMaterialIssueDialogProps {
  name: string;
  errorContent: ErrorItem[];
  onNameChange?: (newName: string) => void;
  onFileUpload?: (file: File, errorId: string) => void;
  onAllUploaded?: () => void;
  onResolved?: () => void;
}

const CaseMaterialIssueDialog = (data: CaseMaterialIssueDialogProps) => {
  const {
    name: initialName,
    errorContent,
    onNameChange,
    onFileUpload,
    onAllUploaded,
    onResolved,
  } = data;
  const [name, setName] = useState(initialName);
  const [editing, setEditing] = useState(false);
  const [inputValue, setInputValue] = useState(initialName);
  const [nameChanged, setNameChanged] = useState(false);
  const [nameLoading, setNameLoading] = useState(false);
  const [nameError, setNameError] = useState("");

  // 每个 errorUpload 独立 reuploaded 状态和 loading、error
  const [reuploadedArr, setReuploadedArr] = useState<boolean[]>(
    errorContent.map(() => false)
  );
  const [uploadLoadingArr, setUploadLoadingArr] = useState<boolean[]>(
    errorContent.map(() => false)
  );
  const [uploadErrorArr, setUploadErrorArr] = useState<string[]>(
    errorContent.map(() => "")
  );
  // 每个 errorUpload 独立 ref
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  // warningUpload 全部上传状态
  const [allUploaded, setAllUploaded] = useState(false);

  useEffect(() => {
    // 判断所有 errorUpload 是否都已重新上传
    const allFilesOk = errorContent
      .filter((item) => item.type === "errorUpload")
      .every((_, idx) => reuploadedArr[idx]);
    // 判断所有 warningUpload 是否都已检查完整性
    const allWarningOk =
      errorContent.filter((item) => item.type === "warningUpload").length ===
        0 || allUploaded;
    // 名称校验通过且已变更
    const nameOk = nameChanged;
    if (nameOk && allFilesOk && allWarningOk) {
      if (onResolved) onResolved();
    }
  }, [nameChanged, reuploadedArr, allUploaded, errorContent, onResolved]);

  // 多次修改名称
  const handleEditClick = () => {
    setEditing(true);
    setInputValue(name);
    setNameChanged(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    setNameError("");
  };

  // 校验输入内容
  const validateName = (val: string) => {
    return /北京|上海|南京/.test(val);
  };

  // 模拟异步接口
  const handleSubmit = () => {
    if (!validateName(inputValue)) {
      setNameError("缺少行政区划！");
      return;
    }
    setNameLoading(true);
    setTimeout(() => {
      setName(inputValue);
      setEditing(false);
      setNameChanged(true);
      setNameLoading(false);
      if (onNameChange) {
        onNameChange(inputValue);
      } else {
        // 预留后续接口
        console.log("名称已修改为：", inputValue);
      }
    }, 1200);
  };

  // 重新上传：弹出文件选择框
  const handleReuploadClick = (idx: number) => {
    fileInputRefs.current[idx]?.click();
  };

  // 模拟文件校验
  const handleFileChange = (
    idx: number,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0]; // 立即保存，避免异步后 files 变空
      setUploadLoadingArr((arr) => {
        const newArr = [...arr];
        newArr[idx] = true;
        return newArr;
      });
      setUploadErrorArr((arr) => {
        const newArr = [...arr];
        newArr[idx] = "";
        return newArr;
      });
      setTimeout(() => {
        if (!file) {
          setUploadLoadingArr((arr) => {
            const newArr = [...arr];
            newArr[idx] = false;
            return newArr;
          });
          return;
        }
        // 假设文件名包含"处罚"即为正确
        if (file.name.includes("处罚")) {
          setReuploadedArr((arr) => {
            const newArr = [...arr];
            newArr[idx] = true;
            return newArr;
          });
          setUploadErrorArr((arr) => {
            const newArr = [...arr];
            newArr[idx] = "";
            return newArr;
          });
          if (onFileUpload)
            onFileUpload(file, errorContent[idx].id || String(idx));
        } else {
          setReuploadedArr((arr) => {
            const newArr = [...arr];
            newArr[idx] = false;
            return newArr;
          });
          setUploadErrorArr((arr) => {
            const newArr = [...arr];
            newArr[idx] = "文件校验失败，请上传正确的行政处罚决定书";
            // newArr[idx] = "";
            return newArr;
          });
        }
        setUploadLoadingArr((arr) => {
          const newArr = [...arr];
          newArr[idx] = false;
          return newArr;
        });
      }, 1200);
    }
    e.target.value = "";
  };

  // 点击已上传全部
  const handleAllUploaded = () => {
    setAllUploaded(true);
    if (onAllUploaded) onAllUploaded();
  };

  return (
    <div className="case-material-issue-dialog">
      {/* 第一块 */}
      {name && (
        <div className="case-material-issue-dialog-item">
          <div className="case-material-issue-dialog-title">
            一、涉案单位名称缺少行政区划
          </div>
          {/* 名称变更后展示 */}
          {nameChanged ? (
            <div className="case-material-issue-dialog-desc">
              涉案单位名称变更为
              <span className="case-material-issue-dialog-name-changed">
                {name}
              </span>
              <button
                className="case-material-issue-dialog-btn primary"
                style={{ marginLeft: 12 }}
                onClick={handleEditClick}
              >
                再次修改
              </button>
            </div>
          ) : editing ? (
            <div className="case-material-issue-dialog-edit-row">
              <input
                className="case-material-issue-dialog-input"
                value={inputValue}
                onChange={handleInputChange}
                maxLength={50}
                disabled={nameLoading}
              />
              <button
                className="case-material-issue-dialog-btn primary"
                onClick={handleSubmit}
                disabled={nameLoading || !inputValue.trim()}
              >
                {nameLoading ? "提交中..." : "提交"}
              </button>
            </div>
          ) : (
            <>
              <div className="case-material-issue-dialog-desc">
                涉案单位名称为
                <span className="case-material-issue-dialog-highlight">
                  {name}
                </span>
                ，缺少行政区划，建议进行补充
              </div>
              <button
                className="case-material-issue-dialog-btn primary"
                onClick={handleEditClick}
              >
                修改名称
              </button>
            </>
          )}
          {nameError && (
            <div className="case-material-issue-dialog-upload-error">
              {nameError}
            </div>
          )}
        </div>
      )}
      {/* 第二块 */}
      <div className="case-material-issue-dialog-item">
        <div className="case-material-issue-dialog-title">
          二、案件附件存在问题
        </div>
        {errorContent.map((item, index) => {
          if (item.type === "errorUpload") {
            return (
              <div key={index}>
                {/* 独立的文件选择 input */}
                <input
                  type="file"
                  ref={(el) => (fileInputRefs.current[index] = el)}
                  style={{ display: "none" }}
                  onChange={(e) => handleFileChange(index, e)}
                />
                <div className="case-material-issue-dialog-desc error">
                  {index + 1}.行政处罚决定书中的涉案单位名称与案件信息不符
                  {reuploadedArr[index] && `，已重新上传`}
                </div>
                {uploadErrorArr[index] && (
                  <div className="case-material-issue-dialog-upload-error">
                    {uploadErrorArr[index]}
                  </div>
                )}
                {!reuploadedArr[index] && (
                  <button
                    className="case-material-issue-dialog-btn primary"
                    style={{ marginBottom: 12 }}
                    onClick={() => handleReuploadClick(index)}
                    disabled={uploadLoadingArr[index]}
                  >
                    {uploadLoadingArr[index] ? "上传中..." : "重新上传"}
                  </button>
                )}
              </div>
            );
          } else if (item.type === "warningUpload") {
            return (
              <div key={index}>
                {allUploaded ? (
                  <div className="case-material-issue-dialog-desc">
                    {index + 1}. 已检查案件附件完整性
                  </div>
                ) : (
                  <>
                    <div className="case-material-issue-dialog-desc warning-upload">
                      {index + 1}.{item.content}
                    </div>
                    {item.missingType?.map((data, idx) => (
                      <div
                        key={idx}
                        className={
                          "case-material-issue-dialog-list" +
                          (data.type === item.hasType
                            ? " case-material-issue-dialog-list-highlight"
                            : "")
                        }
                      >
                        <span className="case-material-issue-dialog-list-type">
                          {data.type}
                        </span>{" "}
                        <span className="case-material-issue-dialog-list-percent">
                          {data.percent}%
                        </span>{" "}
                        <span className="case-material-issue-dialog-list-desc">
                          的案件包含
                        </span>
                      </div>
                    ))}
                    <button
                      className="case-material-issue-dialog-btn primary"
                      style={{ marginRight: 8 }}
                    >
                      上传附件
                    </button>
                    <button
                      className="case-material-issue-dialog-btn"
                      onClick={handleAllUploaded}
                    >
                      已上传全部
                    </button>
                  </>
                )}
              </div>
            );
          } else if (item.type === "info") {
            return (
              <div key={index} className="case-material-issue-dialog-desc info">
                {typeof item.content === "string" ? item.content : item.content}
              </div>
            );
          } else if (
            item.type === "custom" &&
            typeof item.content !== "string"
          ) {
            return (
              <div
                key={index}
                className="case-material-issue-dialog-desc custom"
              >
                {item.content}
              </div>
            );
          } else {
            return (
              <div className="case-material-issue-dialog-desc" key={index}>
                {typeof item.content === "string" ? item.content : item.content}
              </div>
            );
          }
        })}
      </div>
    </div>
  );
};

export default CaseMaterialIssueDialog;
