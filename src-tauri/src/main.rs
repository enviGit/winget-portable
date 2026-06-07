#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x08000000;

#[derive(serde::Serialize)]
struct CommandResponse {
    success: bool,
    text: String,
}

#[tauri::command]
#[allow(unused_variables)]
async fn scan_updates(include_unknown: bool, include_pinned: bool) -> String {
    #[cfg(target_os = "windows")]
    {
        let mut args = vec![
            "/C",
            "chcp",
            "65001",
            ">nul",
            "&",
            "winget",
            "upgrade",
            "--accept-source-agreements",
        ];

        if include_unknown {
            args.push("--include-unknown");
        }

        if include_pinned {
            args.push("--include-pinned");
        }

        let output = std::process::Command::new("cmd")
            .args(args)
            .env("WINGET_DISABLE_INTERACTIVITY", "1")
            .creation_flags(CREATE_NO_WINDOW)
            .output();

        match output {
            Ok(result) => {
                let text = String::from_utf8_lossy(&result.stdout).to_string();
                if text.trim().is_empty() {
                    String::from_utf8_lossy(&result.stderr).to_string()
                } else {
                    text
                }
            }
            Err(e) => e.to_string(),
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        r#"Name                                     Id               Version         Available      Source
        ------------------------------------------------------------------------------------------------------
        Discord                                  Discord.Discord  1.0.0            1.2.0          winget
        Spotify                                  Spotify.Spotify  2.1.0            3.0.0          winget
        Google Chrome                            Google.Chrome    114.0.0          115.0.0        winget
        Visual Studio Code                       Microsoft.VSCode 1.78.2           1.80.1         winget
        Mozilla Firefox                          Mozilla.Firefox  112.0.1          115.0.2        winget
        Slack                                    Slack.Slack      4.32.122         4.33.90        winget"#.to_string()
    }
}

#[tauri::command]
#[allow(unused_variables)]
async fn update_app(
    id: String,
    auto_accept: bool,
    include_unknown: bool,
    include_pinned: bool,
    uninstall_previous: bool,
) -> CommandResponse {
    #[cfg(target_os = "windows")]
    {
        let mut args = vec!["/C", "chcp", "65001", ">nul", "&", "winget", "upgrade"];

        if id != "ALL" {
            args.push("--id");
            args.push(&id);
            args.push("--exact");
        } else {
            args.push("--all");
        }

        if auto_accept {
            args.push("--accept-source-agreements");
            args.push("--accept-package-agreements");
            args.push("--silent");
        }

        if include_unknown {
            args.push("--include-unknown");
        }

        if include_pinned {
            args.push("--include-pinned");
        }

        if uninstall_previous {
            args.push("--uninstall-previous");
        }

        let output = std::process::Command::new("cmd")
            .args(args)
            .env("WINGET_DISABLE_INTERACTIVITY", "1")
            .creation_flags(CREATE_NO_WINDOW)
            .output();

        match output {
            Ok(result) => {
                let mut text = String::from_utf8_lossy(&result.stdout).to_string();
                if text.trim().is_empty() {
                    text = String::from_utf8_lossy(&result.stderr).to_string();
                }
                CommandResponse {
                    success: result.status.success(),
                    text,
                }
            }
            Err(e) => CommandResponse {
                success: false,
                text: e.to_string(),
            },
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        std::thread::sleep(std::time::Duration::from_millis(2500));

        CommandResponse {
                success: true,
                text: format!(
                    "Found {} [{}]\nThis application is licensed to you by its owner.\nSuccessfully verified installer hash\nStarting package install...\nSuccessfully installed",
                    id, id
                ),
            }
    }
}

#[tauri::command]
async fn get_pins() -> String {
    #[cfg(target_os = "windows")]
    use std::os::windows::process::CommandExt;

    let mut cmd = std::process::Command::new("winget");
    cmd.args(["pin", "list"]);

    #[cfg(target_os = "windows")]
    cmd.creation_flags(CREATE_NO_WINDOW);

    let output = cmd.output().unwrap_or_else(|_| std::process::Output {
        status: std::process::ExitStatus::default(),
        stdout: Vec::new(),
        stderr: Vec::new(),
    });
    String::from_utf8_lossy(&output.stdout).to_string()
}

#[tauri::command]
async fn pin_app(id: String) -> CommandResponse {
    #[cfg(target_os = "windows")]
    use std::os::windows::process::CommandExt;

    let mut cmd = std::process::Command::new("winget");
    cmd.args(["pin", "add", "--id", &id]);

    #[cfg(target_os = "windows")]
    cmd.creation_flags(CREATE_NO_WINDOW);

    let output = cmd.output().unwrap_or_else(|_| std::process::Output {
        status: std::process::ExitStatus::default(),
        stdout: Vec::new(),
        stderr: Vec::new(),
    });

    CommandResponse {
        success: output.status.success(),
        text: String::from_utf8_lossy(&output.stdout).to_string(),
    }
}

#[tauri::command]
async fn unpin_app(id: String) -> CommandResponse {
    #[cfg(target_os = "windows")]
    use std::os::windows::process::CommandExt;

    let mut cmd = std::process::Command::new("winget");
    cmd.args(["pin", "remove", "--id", &id]);

    #[cfg(target_os = "windows")]
    cmd.creation_flags(CREATE_NO_WINDOW);

    let output = cmd.output().unwrap_or_else(|_| std::process::Output {
        status: std::process::ExitStatus::default(),
        stdout: Vec::new(),
        stderr: Vec::new(),
    });

    CommandResponse {
        success: output.status.success(),
        text: String::from_utf8_lossy(&output.stdout).to_string(),
    }
}

#[tauri::command]
fn open_link(url: String) {
    #[cfg(target_os = "windows")]
    {
        let _ = std::process::Command::new("cmd")
            .args(["/C", "start", &url])
            .creation_flags(CREATE_NO_WINDOW)
            .spawn();
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = std::process::Command::new("open").arg(&url).spawn();
    }
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            scan_updates,
            update_app,
            open_link,
            get_pins,
            pin_app,
            unpin_app
        ])
        .run(tauri::generate_context!())
        .expect("Failed to run app");
}
