use tauri::{AppHandle, Manager};
use tauri_plugin_sql::SqlitePool;

/// Backup the database to a user-specified path using VACUUM INTO
///
/// This command uses SQLite's VACUUM INTO command to create a clean
/// backup of the database at the specified path.
#[tauri::command]
pub async fn backup_database(app_handle: AppHandle, to_path: String) -> Result<(), String> {
    // Get the database path from the app config
    let db_path = app_handle
        .path()
        .app_local_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?
        .join("ats-chd-tools.db");

    // Verify source database exists
    if !db_path.exists() {
        return Err(format!(
            "Source database not found at: {}",
            db_path.display()
        ));
    }

    // Ensure target directory exists
    if let Some(parent) = std::path::Path::new(&to_path).parent() {
        if !parent.exists() {
            std::fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create target directory: {}", e))?;
        }
    }

    // Open the database directly with sqlx for VACUUM INTO
    let db_url = format!("sqlite:{}", db_path.display());

    let pool = SqlitePool::connect(&db_url)
        .await
        .map_err(|e| format!("Failed to connect to database: {}", e))?;

    // Execute VACUUM INTO
    sqlx::query("VACUUM INTO ?")
        .bind(&to_path)
        .execute(&pool)
        .await
        .map_err(|e| format!("Failed to backup database: {}", e))?;

    pool.close().await;

    Ok(())
}
