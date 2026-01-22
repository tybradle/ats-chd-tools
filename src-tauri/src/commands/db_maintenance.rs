use tauri::{AppHandle, Manager};
use sqlx::SqlitePool;

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

    // Write to temp file first, then rename on success (atomic operation)
    let temp_path = format!("{}.tmp", &to_path);

    // Execute VACUUM INTO to temp file
    sqlx::query("VACUUM INTO ?")
        .bind(&temp_path)
        .execute(&pool)
        .await
        .map_err(|e| {
            // Clean up temp file on failure
            let _ = std::fs::remove_file(&temp_path);
            format!("Failed to backup database: {}", e)
        })?;

    pool.close().await;

    // Rename temp file to final path (atomic on same filesystem)
    match std::fs::rename(&temp_path, &to_path) {
        Ok(_) => Ok(()),
        Err(e) if e.kind() == std::io::ErrorKind::CrossesDevices => {
            // Fallback for cross-volume moves: copy then delete
            std::fs::copy(&temp_path, &to_path)
                .map_err(|e| {
                    let _ = std::fs::remove_file(&temp_path);
                    format!("Failed to copy backup file across devices: {}", e)
                })?;
            std::fs::remove_file(&temp_path)
                .map_err(|e| format!("Failed to remove temporary file: {}", e))?;
            Ok(())
        }
        Err(e) => {
            // Clean up temp file on any other error
            let _ = std::fs::remove_file(&temp_path);
            Err(format!("Failed to finalize backup file: {}", e))
        }
    }
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

    // Check for WAL/SHM sidecar files (refuse to restore from live database)
    let source_wal = source.with_extension("db-wal");
    let source_shm = source.with_extension("db-shm");

    // Also check for -wal and -shm suffixes (SQLite naming convention)
    let source_wal_alt = format!("{}-wal", from_path);
    let source_shm_alt = format!("{}-shm", from_path);

    if source_wal.exists() || source_shm.exists() ||
       std::path::Path::new(&source_wal_alt).exists() || std::path::Path::new(&source_shm_alt).exists() {
        return Err(
            "Restore source appears to be a live WAL database. Please restore from an app-generated backup file (.sqlite).".to_string()
        );
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


