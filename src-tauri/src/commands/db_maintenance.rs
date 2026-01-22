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

/// Restore the database from a user-selected SQLite file
///
/// This command:
/// 1. Creates a timestamped backup of the existing database (.bak)
/// 2. Copies the selected file to the database location
/// 3. Cleans up WAL and SHM files
#[tauri::command]
pub async fn restore_database(app_handle: AppHandle, from_path: String) -> Result<(), String> {
    // Get the database path from the app config
    let db_dir = app_handle
        .path()
        .app_local_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;
    
    let db_path = db_dir.join("ats-chd-tools.db");

    // Verify source file exists
    let source = std::path::Path::new(&from_path);
    if !source.exists() {
        return Err(format!(
            "Source file not found: {}",
            from_path
        ));
    }

    // Create timestamped backup of existing database if it exists
    if db_path.exists() {
        let timestamp = chrono::Utc::now().format("%Y%m%d-%H%M%S");
        let backup_path = db_dir.join(format!("ats-chd-tools.db.bak-{}", timestamp));
        
        std::fs::rename(&db_path, &backup_path)
            .map_err(|e| format!("Failed to backup existing database: {}", e))?;
    }

    // Copy source file to database location
    std::fs::copy(source, &db_path)
        .map_err(|e| format!("Failed to copy database file: {}", e))?;

    // Remove WAL and SHM files if they exist
    let wal_path = db_dir.join("ats-chd-tools.db-wal");
    let shm_path = db_dir.join("ats-chd-tools.db-shm");

    if wal_path.exists() {
        let _ = std::fs::remove_file(&wal_path);
    }
    if shm_path.exists() {
        let _ = std::fs::remove_file(&shm_path);
    }

    Ok(())
}

/// Exit the application
#[tauri::command]
pub fn exit_app() {
    std::process::exit(0);
}
