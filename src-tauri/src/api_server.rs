use axum::{extract::State, routing::{get, post}, Json, Router};
use serde::{Deserialize, Serialize};
use std::net::SocketAddr;
use std::thread;
use tauri::{AppHandle, Emitter};
use tokio::sync::oneshot;
use uuid::Uuid;
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use tower_http::cors::{Any, CorsLayer};

// 用于存储等待中的请求的回调
pub type WaitingRequests = Arc<Mutex<HashMap<String, oneshot::Sender<String>>>>;

#[derive(Clone)]
struct ApiServerState {
    app_handle: AppHandle,
    waiting_requests: WaitingRequests,
}

// 定义 request_user_input 的请求体
#[derive(Deserialize)]
pub struct UserInputRequest {
    message: String,
    options: Option<Vec<String>>,
}

// 定义发送给前端的事件负载
#[derive(Serialize, Clone)]
struct UserInputEventPayload {
    correlation_id: String,
    message: String,
    options: Option<Vec<String>>,
}

/// 启动 HTTP API 服务器
pub fn start_server(app_handle: AppHandle, waiting_requests: WaitingRequests) {
    // 使用 std::thread::spawn 创建一个独立的 OS 线程
    thread::spawn(move || {
        // 在新线程中，为我们的服务器创建一个专用的 Tokio 运行时
        let rt = tokio::runtime::Builder::new_multi_thread()
            .enable_all()
            .build()
            .unwrap();
        
        // 在这个运行时上阻塞式地运行我们的 async server 逻辑
        rt.block_on(async {
            // 设置 CORS
            let cors = CorsLayer::new()
                .allow_origin(Any)
                .allow_methods(Any)
                .allow_headers(Any);
                
            let state = ApiServerState { app_handle, waiting_requests };

            // 定义我们的路由
            let app = Router::new()
                .route("/ping", get(ping_handler))
                .route("/request_user_input", post(request_user_input_handler))
                .with_state(state)
                .layer(cors);

            // 定义服务器监听的地址和端口
            let addr = SocketAddr::from(([127, 0, 0, 1], 8080));
            println!("API server listening on {}", addr);

            // 绑定服务器并运行
            if let Ok(listener) = tokio::net::TcpListener::bind(addr).await {
                axum::serve(listener, app).await.unwrap();
            } else {
                eprintln!("Failed to bind API server to port 8080");
            }
        });
    });
}

/// 一个简单的处理函数，用于测试服务器是否正常运行
async fn ping_handler() -> &'static str {
    "pong"
}

// request_user_input 的处理函数
async fn request_user_input_handler(
    State(state): State<ApiServerState>,
    Json(payload): Json<UserInputRequest>,
) -> Result<String, String> {
    let correlation_id = Uuid::new_v4().to_string();
    let (tx, rx) = oneshot::channel();

    // 将发送端存储在 waiting_requests 哈希图中
    {
        let mut waiting = state.waiting_requests.lock().unwrap();
        waiting.insert(correlation_id.clone(), tx);
    }

    // 向前端发送事件
    state.app_handle.emit("request_user_input", UserInputEventPayload {
        correlation_id: correlation_id.clone(),
        message: payload.message,
        options: payload.options,
    }).map_err(|e| e.to_string())?;

    // 等待前端的响应
    match tokio::time::timeout(std::time::Duration::from_secs(300), rx).await {
        Ok(Ok(result)) => Ok(result),
        Ok(Err(_)) => Err("Failed to receive response from frontend.".to_string()),
        Err(_) => {
            // 超时后，从哈希图中移除
            let mut waiting = state.waiting_requests.lock().unwrap();
            waiting.remove(&correlation_id);
            Err("Request timed out after 5 minutes.".to_string())
        }
    }
} 