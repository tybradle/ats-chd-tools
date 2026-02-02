mod commands;

use tauri::Manager;
use tauri_plugin_sql::{Migration, MigrationKind};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Define database migrations
    let migrations = vec![
        Migration {
            version: 1,
            description: "Initial schema - parts, manufacturers, categories",
            sql: include_str!("../migrations/001_initial.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "BOM Translation tables - projects, locations, items, exports",
            sql: include_str!("../migrations/002_bom_tables.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "Glenair Catalog tables",
            sql: include_str!("../migrations/003_glenair_tables.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 4,
            description: "Project/Package scoping (job projects + packages)",
            sql: include_str!("../migrations/004_project_package_scoping.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 5,
            description: "Load Calculator tables + part_electrical rebuild",
            sql: include_str!("../migrations/005_load_calc_tables.sql"),
            kind: MigrationKind::Up,
        },
    ];

    tauri::Builder::default()
        .plugin(
            tauri_plugin_sql::Builder::new()
                .add_migrations("sqlite:ats-chd-tools.db", migrations)
                .build(),
        )
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(
            tauri_plugin_log::Builder::default()
                .level(log::LevelFilter::Info)
                .target(tauri_plugin_log::Target::new(
                    tauri_plugin_log::TargetKind::Stdout,
                ))
                .target(tauri_plugin_log::Target::new(
                    tauri_plugin_log::TargetKind::LogDir {
                        file_name: Some("ats-chd-tools".to_string()),
                    },
                ))
                .build(),
        )
        .setup(|app| {
            #[cfg(debug_assertions)]
            {
                let window = app.get_webview_window("main").unwrap();
                window.open_devtools();
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::db_maintenance::backup_database,
            commands::db_maintenance::restore_database
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
