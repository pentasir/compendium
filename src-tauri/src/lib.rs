mod storage;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            storage::get_vault,
            storage::pick_vault,
            storage::read_settings,
            storage::write_settings,
            storage::list_entries,
            storage::read_entry,
            storage::write_entry,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Compendium");
}
