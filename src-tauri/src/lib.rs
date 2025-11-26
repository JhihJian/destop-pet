// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use tauri::{command, AppHandle};
use std::fs::{create_dir_all, OpenOptions};
use std::io::Write;
use aes_gcm::{Aes256Gcm, Key, Nonce};
use aes_gcm::aead::{Aead, KeyInit};
use rand_core::TryRngCore;
use rand_core::OsRng;
use base64::{engine::general_purpose, Engine as _};
use std::fs::File;
use std::io::{BufRead, BufReader};
use std::path::PathBuf;
use uuid::Uuid;
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::time::Instant;
use tauri::Listener; // <--- 关键改动 1
use tauri::Manager;
#[cfg(windows)]
use windows::Win32::Foundation::POINT;
#[cfg(windows)]
use windows::Win32::UI::WindowsAndMessaging::GetCursorPos;

mod api_server;

// 定义从前端返回的事件负载
#[derive(serde::Deserialize)]
struct UserInputResponsePayload {
    correlation_id: String,
    response: String,
}

// 从密码生成密钥
fn derive_key(password: &str) -> Key<Aes256Gcm> {
    let mut key_bytes = [0u8; 32];
    let hash = blake3::hash(password.as_bytes());
    key_bytes.copy_from_slice(&hash.as_bytes()[..32]);
    Key::<Aes256Gcm>::from_slice(&key_bytes).clone()
}

// 获取日记文件路径
fn get_diary_path(app: &AppHandle) -> Result<PathBuf, String> {
    let data_dir = get_app_data_dir(app)?;
    Ok(data_dir.join("diary.enc"))
}

#[command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

// 获取应用数据目录
fn get_app_data_dir(_app: &AppHandle) -> Result<PathBuf, String> {
    #[cfg(mobile)]
    {
        let path_result = _app.path().app_data_dir()
            .map_err(|e| format!("无法获取应用数据目录: {}", e))?;
        let mut data_dir = path_result;
        data_dir.push("data");
        Ok(data_dir)
    }
    #[cfg(not(mobile))]
    {
        let mut data_dir = std::env::current_dir().map_err(|e| e.to_string())?;
        data_dir.push("data");
        Ok(data_dir)
    }
}

#[command]
fn save_diary(
    app_handle: AppHandle,
    content: String, 
    datetime: String, 
    words: u32, 
    password: String
) -> Result<(), String> {
    let data_dir = get_app_data_dir(&app_handle)?;
    let key = derive_key(&password);
    let cipher = Aes256Gcm::new(&key);
    let mut nonce_bytes = [0u8; 12];
    let mut rng = OsRng;
    rng.try_fill_bytes(&mut nonce_bytes).map_err(|e| format!("生成随机数失败: {}", e))?;
    let nonce = Nonce::from_slice(&nonce_bytes);
    // 生成唯一id
    let id = Uuid::new_v4().to_string();
    // 明文格式：id|时间|字数|内容
    let plain = format!("{}|{}|{}|{}", id, datetime, words, content);
    let ciphertext = cipher.encrypt(nonce, plain.as_bytes()).map_err(|e| e.to_string())?;
    let mut out = Vec::new();
    out.extend_from_slice(&nonce_bytes);
    out.extend_from_slice(&ciphertext);
    let b64 = general_purpose::STANDARD.encode(&out);
    create_dir_all(&data_dir).map_err(|e| e.to_string())?;
    let file_path = data_dir.join("diary.enc");
    let mut f = OpenOptions::new()
        .create(true)
        .append(true)
        .open(&file_path)
        .map_err(|e| format!("打开文件失败: {:?} - {}", file_path, e))?;
    writeln!(f, "{}", b64).map_err(|e| format!("写入文件失败: {}", e))?;
    Ok(())
}

#[command]
fn load_diary(
    app_handle: AppHandle,
    password: String
) -> Result<Vec<(String, String, u32)>, String> {
    // 获取应用数据目录
    let data_dir = get_app_data_dir(&app_handle)?;
    let file_path = data_dir.join("diary.enc");
    
    println!("读取文件从路径: {:?}", file_path);
    
    let mut res = Vec::new();
    let key = derive_key(&password);
    let cipher = Aes256Gcm::new(&key);
    
    let f = match File::open(&file_path) {
        Ok(file) => file,
        Err(_) => return Ok(res), // 没有日记数据文件时返回空vec
    };
    let reader = BufReader::new(f);
    
    for line in reader.lines() {
        let line = line.map_err(|_| "读取文件失败".to_string())?;
        let data = general_purpose::STANDARD.decode(line).map_err(|_| "base64解码失败".to_string())?;
        if data.len() < 12 {
            continue;
        }
        let (nonce_bytes, ciphertext) = data.split_at(12);
        let nonce = Nonce::from_slice(nonce_bytes);
        let plain: Vec<u8> = match cipher.decrypt(nonce, ciphertext) {
            Ok(p) => p,
            Err(_) => return Err("密码错误或数据损坏".to_string()),
        };
        let plain_str = String::from_utf8_lossy(&plain);
        // 明文格式：id|时间|字数|内容
        let mut parts = plain_str.splitn(4, '|');
        let _id = parts.next().unwrap_or("");
        let datetime = parts.next().unwrap_or("").to_string();
        let words = parts.next().unwrap_or("0").parse::<u32>().unwrap_or(0);
        // 内容不返回
        let date = datetime.split(' ').next().unwrap_or("").to_string();
        let time = datetime.split(' ').nth(1).unwrap_or("").to_string();
        res.push((date, time, words));
    }
    Ok(res)
}

#[command]
fn export_diary(
    app_handle: AppHandle,
    password: String,
    _export_pwd: String
) -> Result<String, String> {
    let data_dir = get_app_data_dir(&app_handle)?;
    let file_path = data_dir.join("diary.enc");
    let mut res = Vec::new();
    let key = derive_key(&password);
    let cipher = Aes256Gcm::new(&key);
    let f = File::open(&file_path).map_err(|e| format!("没有日记数据: {}", e))?;
    let reader = BufReader::new(f);
    for line in reader.lines() {
        let line = line.map_err(|_| "读取文件失败".to_string())?;
        let data = general_purpose::STANDARD.decode(line).map_err(|_| "base64解码失败".to_string())?;
        if data.len() < 12 {
            continue;
        }
        let (nonce_bytes, ciphertext) = data.split_at(12);
        let nonce = Nonce::from_slice(nonce_bytes);
        let plain: Vec<u8> = match cipher.decrypt(nonce, ciphertext) {
            Ok(p) => p,
            Err(_) => return Err("密码错误或数据损坏".to_string()),
        };
        let plain_str = String::from_utf8_lossy(&plain);
        // 明文格式：id|时间|字数|内容
        let mut parts = plain_str.splitn(4, '|');
        let id = parts.next().unwrap_or("");
        let datetime = parts.next().unwrap_or("");
        let words = parts.next().unwrap_or("");
        let content = parts.next().unwrap_or("");
        res.push(format!("ID：{}
时间：{}
字数：{}
内容：
{}

", id, datetime, words, content));
    }
    Ok(res.join("---\n"))
}

#[command]
fn import_diary(
    app_handle: AppHandle,
    _password: String,
    _import_pwd: String,
    content: String
) -> Result<(), String> {
    let data_dir = get_app_data_dir(&app_handle)?;
    // 读取已有id集合
    let file_path = data_dir.join("diary.enc");
    let mut existing_ids = std::collections::HashSet::new();
    if let Ok(f) = File::open(&file_path) {
        let reader = BufReader::new(f);
        for line in reader.lines() {
            if let Ok(line) = line {
                if let Ok(data) = general_purpose::STANDARD.decode(&line) {
                    if data.len() >= 12 {
                        let (nonce_bytes, ciphertext) = data.split_at(12);
                        let nonce = Nonce::from_slice(nonce_bytes);
                        if let Ok(plain) = Aes256Gcm::new(&derive_key("dummy")).decrypt(nonce, ciphertext) {
                            let plain_str = String::from_utf8_lossy(&plain);
                            let mut parts = plain_str.splitn(4, '|');
                            if let Some(id) = parts.next() {
                                existing_ids.insert(id.to_string());
                            }
                        }
                    }
                }
            }
        }
    }
    // 生成密钥（用导入时的密码加密）
    let key = derive_key(&_import_pwd);
    let cipher = Aes256Gcm::new(&key);
    for entry in content.split("---\n") {
        let mut lines = entry.lines();
        let id_line = lines.next().unwrap_or("");
        let datetime_line = lines.next().unwrap_or("");
        let words_line = lines.next().unwrap_or("");
        let content_line = lines.skip(1).collect::<Vec<_>>().join("\n");
        let id = id_line.strip_prefix("ID：").unwrap_or("").trim();
        if id.is_empty() || existing_ids.contains(id) {
            continue;
        }
        let datetime = datetime_line.strip_prefix("时间：").unwrap_or("").trim();
        let words = words_line.strip_prefix("字数：").unwrap_or("").trim();
        // 明文格式：id|时间|字数|内容
        let plain = format!("{}|{}|{}|{}", id, datetime, words, content_line);
        let mut nonce_bytes = [0u8; 12];
        let mut rng = OsRng;
        rng.try_fill_bytes(&mut nonce_bytes).map_err(|e| format!("生成随机数失败: {}", e))?;
        let nonce = Nonce::from_slice(&nonce_bytes);
        let ciphertext = cipher.encrypt(nonce, plain.as_bytes()).map_err(|e| e.to_string())?;
        let mut out = Vec::new();
        out.extend_from_slice(&nonce_bytes);
        out.extend_from_slice(&ciphertext);
        let b64 = general_purpose::STANDARD.encode(&out);
        create_dir_all(&data_dir).map_err(|e| e.to_string())?;
        let mut f = OpenOptions::new()
            .create(true)
            .append(true)
            .open(&file_path)
            .map_err(|e| format!("打开文件失败: {:?} - {}", file_path, e))?;
        writeln!(f, "{}", b64).map_err(|e| format!("写入文件失败: {}", e))?;
        existing_ids.insert(id.to_string());
    }
    Ok(())
}

#[tauri::command]
async fn write_diary(
    app_handle: tauri::AppHandle,
    password: String,
    content: String,
) -> Result<(), String> {
    let diary_path = get_diary_path(&app_handle)?;
    let mut file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(diary_path)
        .map_err(|e| e.to_string())?;

    let mut nonce_bytes = [0u8; 12];
   let mut rng = OsRng;
    rng.try_fill_bytes(&mut nonce_bytes).map_err(|e| format!("生成随机数失败: {}", e))?;
    let nonce = Nonce::from_slice(&nonce_bytes);

    let key = derive_key(&password);
    let cipher = Aes256Gcm::new(&key);
    let encrypted = cipher.encrypt(nonce, content.as_bytes())
        .map_err(|e| e.to_string())?;

    let mut encrypted_data = nonce_bytes.to_vec();
    encrypted_data.extend_from_slice(&encrypted);
    let encoded = general_purpose::STANDARD.encode(encrypted_data);
    writeln!(file, "{}", encoded).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn read_diary(
    _app_handle: tauri::AppHandle,
    _password: String,
    _id: String,
) -> Result<String, String> {
    // ... function body
    Ok("".to_string())
}

#[tauri::command]
async fn update_diary(
    _app_handle: tauri::AppHandle,
    _password: String,
    _id: String,
    _new_content: String,
) -> Result<(), String> {
    // ... function body
    Ok(())
}

#[tauri::command]
async fn delete_diary(_app_handle: tauri::AppHandle, _password: String, _id: String) -> Result<(), String> {
    // ... function body
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // 创建用于在后端和前端之间传递回调的共享状态
    let waiting_requests: api_server::WaitingRequests = Arc::new(Mutex::new(HashMap::new()));
    
    // 克隆一份给 setup 闭包使用
    let waiting_requests_clone = waiting_requests.clone();

    tauri::Builder::default()
        .setup(move |app| {
            // 启动我们的 API 服务器，并传递共享状态
            api_server::start_server(app.handle().clone(), waiting_requests.clone());

            // 设置事件监听器，用于接收前端返回的用户输入
            println!("[backend] setup: registering event listeners");
            app.listen("user_input_response", move |event| {
                // <--- 关键改动 2
                let payload_str = event.payload();
                println!("[backend] user_input_response payload={}", payload_str);
                if let Ok(payload) = serde_json::from_str::<UserInputResponsePayload>(payload_str) {
                    let mut waiting = waiting_requests_clone.lock().unwrap();
                    if let Some(tx) = waiting.remove(&payload.correlation_id) {
                        if let Err(e) = tx.send(payload.response) {
                            eprintln!("Failed to send response: {}", e);
                        }
                    }
                } else {
                     eprintln!("Failed to deserialize user input response payload: {}", payload_str);
                }
            });

            // 监听前端对话框状态（不再调整主窗体尺寸，只记录打开状态并调整层级属性）
            let app_handle_for_resize = app.handle().clone();
            // 关键帧状态：(last_instant, last_open, current_txn_id, in_progress)
            let resize_state = Arc::new(Mutex::new((Instant::now(), None::<bool>, None::<String>, false)));
            // 记录主窗体的系统事件，便于定位闪烁的关键帧
            if let Some(main_win) = app.get_webview_window("main") {
                let resize_state_ev = resize_state.clone();
                main_win.on_window_event(move |ev| {
                    let txn = {
                        let g = resize_state_ev.lock().unwrap();
                        g.2.clone().unwrap_or_else(|| "-".to_string())
                    };
                    match ev {
                        tauri::WindowEvent::Resized(size) => {
                            println!("[KF] txn={} event=Resized size={}x{}", txn, size.width, size.height);
                        }
                        tauri::WindowEvent::Moved(pos) => {
                            println!("[KF] txn={} event=Moved pos=({}, {})", txn, pos.x, pos.y);
                        }
                        tauri::WindowEvent::ScaleFactorChanged { scale_factor, new_inner_size: _, .. } => {
                            println!("[KF] txn={} event=ScaleFactorChanged scale={}", txn, scale_factor);
                        }
                        _ => {}
                    }
                });
            }
            let resize_state_clone = resize_state.clone();
            app.listen("ui_dialog_state", move |event| {
                let payload_str = event.payload();
                println!("[backend] ui_dialog_state received payload={}", payload_str);
                let mut open = false;
                let s = payload_str.trim();
                if let Ok(v) = serde_json::from_str::<serde_json::Value>(s) {
                    if let Some(b) = v.as_bool() {
                        open = b;
                    } else if let Some(st) = v.as_str() {
                        open = st.eq_ignore_ascii_case("open");
                        if st.eq_ignore_ascii_case("close") { open = false; }
                    } else if let Some(b) = v.get("open").and_then(|x| x.as_bool()) {
                        open = b;
                    }
                } else {
                    let unquoted = if s.starts_with('"') && s.ends_with('"') && s.len() >= 2 { &s[1..s.len()-1] } else { s };
                    if unquoted.eq_ignore_ascii_case("open") { open = true; }
                    if unquoted.eq_ignore_ascii_case("close") { open = false; }
                }

                // 去抖与事务ID：同状态在 150ms 内重复触发则忽略
                let txn_id = Uuid::new_v4().to_string();
                {
                    let mut g = resize_state_clone.lock().unwrap();
                    let now = Instant::now();
                    let dt = now.duration_since(g.0).as_millis();
                    if g.1 == Some(open) && dt < 150 {
                        println!("[KF] skip txn: same open={} dt={}ms", open, dt);
                        return;
                    }
                    g.0 = now;
                    g.1 = Some(open);
                    g.2 = Some(txn_id.clone());
                    g.3 = true;
                }
                match app_handle_for_resize.get_webview_window("main") {
                    Some(win) => {
                        println!("[KF] txn={} begin open={}", txn_id, open);
                        // 固定窗体尺寸，不再变更；仅调整置顶/阴影
                        if open {
                            let _ = win.set_always_on_top(false);
                            let _ = win.set_shadow(false);
                            println!("[KF] txn={} shadow=off, alwaysOnTop=off", txn_id);
                        } else {
                            let _ = win.set_shadow(false);
                            let _ = win.set_always_on_top(true);
                            println!("[KF] txn={} shadow=off, alwaysOnTop=on", txn_id);
                        }
                        {
                            let mut g = resize_state_clone.lock().unwrap();
                            g.3 = false;
                            println!("[KF] txn={} end", txn_id);
                        }
                    }
                    None => {
                        eprintln!("[backend] main window not found; available: {:?}", app_handle_for_resize.webview_windows().keys().collect::<Vec<_>>());
                    }
                }
            });

            app.listen("ui_interaction", move |event| {
                println!("[backend] ui_interaction payload={}", event.payload());
            });

            // 鼠标所在区域：空白区穿透，交互区拦截
            let app_handle_for_pointer = app.handle().clone();
            let interactive_rects: Arc<Mutex<Vec<(i32, i32, i32, i32)>>> = Arc::new(Mutex::new(Vec::new()));
            let interactive_rects_update = interactive_rects.clone();
            app.listen("ui_pointer_region", move |event| {
                let payload_str = event.payload();
                let mut interactive = false;
                if let Ok(v) = serde_json::from_str::<serde_json::Value>(payload_str) {
                    if let Some(b) = v.get("interactive").and_then(|x| x.as_bool()) {
                        interactive = b;
                    }
                }
                match app_handle_for_pointer.get_webview_window("main") {
                    Some(win) => {
                        if interactive {
                            println!("[KF] pointer region interactive=true -> ignoreCursorEvents=false");
                            let _ = win.set_ignore_cursor_events(false);
                        } else {
                            println!("[KF] pointer region interactive=false -> keep previous ignore state");
                        }
                    }
                    None => {
                        eprintln!("[backend] main window not found for pointer region");
                    }
                }
            });

            app.listen("http_debug", move |event| {
                let raw = event.payload();
                let ts = std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .map(|d| d.as_millis())
                    .unwrap_or(0);
                if let Ok(v) = serde_json::from_str::<serde_json::Value>(raw) {
                    let phase = v.get("phase").and_then(|x| x.as_str()).unwrap_or("-");
                    let typ = v.get("type").and_then(|x| x.as_str()).unwrap_or("-");
                    let url = v.get("url").and_then(|x| x.as_str()).unwrap_or("-");
                    let status = v.get("status").and_then(|x| x.as_i64()).unwrap_or(-1);
                    println!(
                        "[http-debug] ts={} phase={} type={} url={} status={}",
                        ts, phase, typ, url, status
                    );
                    if let Some(h) = v.get("headers") {
                        println!("[http-debug] headers={}", h);
                    }
                } else {
                    println!("[http-debug] ts={} raw={}", ts, raw);
                }
            });

            // 前端传递交互区域（相对窗体的逻辑像素），用于后端命中测试
            app.listen("ui_interactive_rects", move |event| {
                let payload_str = event.payload();
                if let Ok(v) = serde_json::from_str::<serde_json::Value>(payload_str) {
                    let mut rects = Vec::new();
                    if let Some(arr) = v.as_array() {
                        for r in arr {
                            let x = r.get("x").and_then(|x| x.as_f64()).unwrap_or(0.0) as i32;
                            let y = r.get("y").and_then(|x| x.as_f64()).unwrap_or(0.0) as i32;
                            let w = r.get("w").and_then(|x| x.as_f64()).unwrap_or(0.0) as i32;
                            let h = r.get("h").and_then(|x| x.as_f64()).unwrap_or(0.0) as i32;
                            rects.push((x, y, w, h));
                        }
                    }
                    let mut g = interactive_rects_update.lock().unwrap();
                    *g = rects;
                    println!("[KF] interactive rects updated: {}", g.len());
                }
            });

            // 轮询鼠标位置进行命中测试（当无弹窗时：空白区穿透；有弹窗时：全窗体可交互）
            let app_handle_for_poll = app.handle().clone();
            let rects_for_poll = interactive_rects.clone();
            let resize_state_for_poll = resize_state.clone();
            tauri::async_runtime::spawn(async move {
                let mut last_ignore = false;
                loop {
                    tokio::time::sleep(std::time::Duration::from_millis(60)).await;
                    let dialog_open = {
                        let g = resize_state_for_poll.lock().unwrap();
                        g.1.unwrap_or(false)
                    };
                    if let Some(win) = app_handle_for_poll.get_webview_window("main") {
                        if dialog_open {
                            if last_ignore {
                                let _ = win.set_ignore_cursor_events(false);
                                last_ignore = false;
                                println!("[KF] poll: dialog open -> ignoreCursorEvents=false");
                            }
                            continue;
                        }
                        // 获取鼠标屏幕坐标
                        #[cfg(windows)]
                        let (cursor_x, cursor_y) = unsafe {
                            let mut p = POINT { x: 0, y: 0 };
                            let _ = GetCursorPos(&mut p);
                            (p.x, p.y)
                        };
                        #[cfg(not(windows))]
                        let (cursor_x, cursor_y) = (0, 0);
                        // 窗体位置与缩放
                        if let (Ok(pos), Ok(scale)) = (win.outer_position(), win.scale_factor()) {
                            let x_rel = cursor_x - pos.x;
                            let y_rel = cursor_y - pos.y;
                            // 命中交互区域
                            let rects = rects_for_poll.lock().unwrap().clone();
                            let mut hit = false;
                            for (x, y, w, h) in rects {
                                let xr = ((x as f64) * scale).round() as i32;
                                let yr = ((y as f64) * scale).round() as i32;
                                let wr = ((w as f64) * scale).round() as i32;
                                let hr = ((h as f64) * scale).round() as i32;
                                if x_rel >= xr && x_rel <= xr + wr && y_rel >= yr && y_rel <= yr + hr {
                                    hit = true;
                                    break;
                                }
                            }
                            let target_ignore = !hit;
                            if target_ignore != last_ignore {
                                let _ = win.set_ignore_cursor_events(target_ignore);
                                last_ignore = target_ignore;
                                println!("[KF] poll: set ignoreCursorEvents={} (hit={})", target_ignore, hit);
                            }
                        }
                    }
                }
            });

            // 默认启用可点击，避免因穿透导致无法进入交互区
            if let Some(win) = app.get_webview_window("main") {
                let _ = win.set_ignore_cursor_events(false);
                println!("[KF] init ignoreCursorEvents=false");
            }

            #[cfg(mobile)]
            {
                app.handle().plugin(tauri_plugin_fs::init())?;
                app.handle().plugin(tauri_plugin_dialog::init())?;
                app.handle().plugin(tauri_plugin_opener::init())?;
            }
            Ok(())
        })
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_http::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            save_diary,
            load_diary,
            export_diary,
            import_diary,
            write_diary,
            read_diary,
            update_diary,
            delete_diary,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
