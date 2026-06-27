// File-based storage for the desktop app: entries are Markdown files in a vault
// folder the user chooses, with the same frontmatter format as the web export.
// The web build does not use any of this; it keeps IndexedDB.

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use tauri::Manager;

#[derive(Serialize, Deserialize, Default)]
struct AppConfig {
    vault: Option<String>,
}

#[derive(Serialize, Deserialize)]
pub struct EntryFile {
    id: String,
    age: Option<i64>,
    words: Option<i64>,
    #[serde(default)]
    sealed: bool,
    text: String,
}

fn config_file(app: &tauri::AppHandle) -> PathBuf {
    let dir = app
        .path()
        .app_config_dir()
        .expect("no app config dir");
    let _ = fs::create_dir_all(&dir);
    dir.join("config.json")
}

// ── the vault: which folder holds the entries ───────────────────────────────
#[tauri::command]
pub fn get_vault(app: tauri::AppHandle) -> Option<String> {
    let txt = fs::read_to_string(config_file(&app)).ok()?;
    let cfg: AppConfig = serde_json::from_str(&txt).ok()?;
    cfg.vault.filter(|p| Path::new(p).is_dir())
}

#[tauri::command]
pub fn pick_vault(app: tauri::AppHandle) -> Option<String> {
    let folder = rfd::FileDialog::new()
        .set_title("Choose a folder for your Compendium entries")
        .pick_folder()?;
    let path = folder.to_string_lossy().to_string();
    let cfg = AppConfig { vault: Some(path.clone()) };
    let _ = fs::write(config_file(&app), serde_json::to_string_pretty(&cfg).ok()?);
    Some(path)
}

// ── settings (birthdate, tip dismissal): a small json in the vault ──────────
#[tauri::command]
pub fn read_settings(vault: String) -> Option<serde_json::Value> {
    let txt = fs::read_to_string(Path::new(&vault).join("settings.json")).ok()?;
    serde_json::from_str(&txt).ok()
}

#[tauri::command]
pub fn write_settings(vault: String, settings: serde_json::Value) -> Result<(), String> {
    let body = serde_json::to_string_pretty(&settings).map_err(|e| e.to_string())?;
    fs::write(Path::new(&vault).join("settings.json"), body).map_err(|e| e.to_string())
}

// ── entries: one Markdown file per day, with YAML frontmatter ────────────────
fn to_markdown(e: &EntryFile) -> String {
    let age = e.age.map(|a| a.to_string()).unwrap_or_default();
    let words = e.words.unwrap_or(0);
    format!(
        "---\ndate: {}\nage: {}\nwords: {}\nsealed: {}\n---\n\n{}\n",
        e.id, age, words, e.sealed, e.text
    )
}

fn from_markdown(id: &str, raw: &str) -> EntryFile {
    let mut age = None;
    let mut words = None;
    let mut sealed = false;
    let mut body = raw;

    if let Some(rest) = raw.strip_prefix("---") {
        if let Some(end) = rest.find("\n---") {
            let front = &rest[..end];
            for line in front.lines() {
                let line = line.trim();
                if let Some(v) = line.strip_prefix("age:") {
                    age = v.trim().parse::<i64>().ok();
                } else if let Some(v) = line.strip_prefix("words:") {
                    words = v.trim().parse::<i64>().ok();
                } else if let Some(v) = line.strip_prefix("sealed:") {
                    sealed = v.trim() == "true";
                }
            }
            body = &rest[end + 4..];
        }
    }

    EntryFile {
        id: id.to_string(),
        age,
        words,
        sealed,
        text: body.trim_start_matches('\n').trim_end().to_string(),
    }
}

#[tauri::command]
pub fn list_entries(vault: String) -> Vec<EntryFile> {
    let mut out = Vec::new();
    let dir = Path::new(&vault);
    if let Ok(entries) = fs::read_dir(dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            let name = entry.file_name().to_string_lossy().to_string();
            // only YYYY-MM-DD.md files
            if path.extension().and_then(|e| e.to_str()) == Some("md") {
                let id = name.trim_end_matches(".md").to_string();
                if id.len() == 10 && id.as_bytes()[4] == b'-' && id.as_bytes()[7] == b'-' {
                    if let Ok(raw) = fs::read_to_string(&path) {
                        out.push(from_markdown(&id, &raw));
                    }
                }
            }
        }
    }
    out
}

#[tauri::command]
pub fn read_entry(vault: String, id: String) -> Option<EntryFile> {
    let raw = fs::read_to_string(Path::new(&vault).join(format!("{id}.md"))).ok()?;
    Some(from_markdown(&id, &raw))
}

#[tauri::command]
pub fn write_entry(vault: String, entry: EntryFile) -> Result<(), String> {
    fs::write(
        Path::new(&vault).join(format!("{}.md", entry.id)),
        to_markdown(&entry),
    )
    .map_err(|e| e.to_string())
}
