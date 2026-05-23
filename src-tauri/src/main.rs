#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x08000000;

#[tauri::command]
fn scan_updates() -> String {
    #[cfg(target_os = "windows")]
    {
        let output = std::process::Command::new("cmd")
            .args([
                "/C",
                "chcp",
                "65001",
                ">nul",
                "&",
                "winget",
                "upgrade",
                "--accept-source-agreements",
            ])
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
        "Name                                     Id               Version          Available      Source\n------------------------------------------------------------------------------------------------------\nDiscord                                  Discord.Discord  1.0.0            1.2.0          winget\nSpotify                                  Spotify.Spotify  2.1.0            3.0.0          winget".to_string()
    }
}

#[tauri::command]
#[allow(unused_variables)]
fn update_app(id: String, auto_accept: bool) -> String {
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
        format!("Mac OS simulation: Successfully updated {}.", id)
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
            open_link
        ])
        .run(tauri::generate_context!())
        .expect("Failed to run app");
}
