# 桌面宠物 API 文档

本文档介绍了如何通过 HTTP API 与桌面宠物应用程序进行交互。

## 基础 URL

API 服务器默认运行在 `http://127.0.0.1:8080`。

---

## 接口列表

### 1. 健康检查

检查 API 服务器是否正在运行。

-   **URL**: `/ping`
-   **Method**: `GET`
-   **Success Response**:
    -   **Code**: 200 OK
    -   **Content**: `pong`
-   **Example**:
    ```bash
    curl http://127.0.0.1:8080/ping
    ```
    **Response:**
    ```
    pong
    ```

### 2. 请求用户输入

向用户请求输入，可以是一个简单的是/否确认，也可以是带有预定义选项的选择，或者是自由文本输入。应用程序会弹出一个对话框来接收用户的输入。

-   **URL**: `/request_user_input`
-   **Method**: `POST`
-   **Headers**:
    -   `Content-Type: application/json`
-   **Request Body**:
    ```json
    {
      "message": "你想做什么？",
      "options": ["吃饭", "睡觉", "打豆豆"],
      "input_placeholder": "或者输入其他..."
    }
    ```
    -   `message` (string, **required**): 要在对话框中显示给用户的消息。
    -   `options` (array of strings, optional): 提供给用户的预定义选项按钮。如果提供，用户可以选择其中一个。
    -   `input_placeholder` (string, optional): 如果提供了此字段，对话框将显示一个文本输入框，此字段的值将作为输入框的占位符。

-   **Success Response**:
    -   **Code**: 200 OK
    -   **Content**:
        ```json
        {
          "status": "ok",
          "result": "用户选择的选项或输入的文本"
        }
        ```
        -   `result` (string):
            -   如果用户点击了一个选项按钮，`result` 的值就是该选项的文本。
            -   如果用户在文本框中输入了内容并点击了"确认"，`result` 的值就是输入的文本。

-   **Error Response**:
    -   **Code**: 408 Request Timeout
    -   **Content**:
        ```json
        {
          "status": "error",
          "message": "Request timed out"
        }
        ```
      如果用户在60秒内没有提供任何输入，请求将超时。

-   **Examples**:

    **Example 1: 带选项的请求**
    ```bash
    curl -X POST -H "Content-Type: application/json" -d '{
      "message": "你今天心情怎么样?",
      "options": ["开心", "一般", "不开心"]
    }' http://127.0.0.1:8080/request_user_input
    ```
    **Possible Response (if user clicks "开心"):**
    ```json
    {
      "status": "ok",
      "result": "开心"
    }
    ```

    **Example 2: 带文本输入的请求**
    ```bash
    curl -X POST -H "Content-Type: application/json" -d '{
      "message": "请输入你的名字:",
      "input_placeholder": "你的名字"
    }' http://127.0.0.1:8080/request_user_input
    ```
    **Possible Response (if user types "小明" and confirms):**
    ```json
    {
      "status": "ok",
      "result": "小明"
    }
    ```

    **Example 3: 既有选项又有文本输入的请求**
    ```bash
    curl -X POST -H "Content-Type: application/json" -d '{
      "message": "请选择或输入你想去的地方:",
      "options": ["北京", "上海"],
      "input_placeholder": "其他城市..."
    }' http://127.0.0.1:8080/request_user_input
    ```
    **Possible Response (if user types "深圳" and confirms):**
    ```json
    {
      "status": "ok",
      "result": "深圳"
    }
    ``` 