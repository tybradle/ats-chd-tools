/**
 * Application Settings Helper
 *
 * Typed helpers for get/set settings with defaults.
 * All settings persist to db.settings table.
 */

import { settings } from '@/lib/db/client';

// ============================================
// Types
// ============================================

export type UiTheme = 'system' | 'light' | 'dark';

// ============================================
// Settings Keys
// ============================================

const KEYS = {
  UI_THEME: 'ui.theme',
  PROMPTS_ALWAYS_ASK_BACKUP: 'prompts.alwaysAsk.backup',
  PATHS_LAST_BACKUP: 'paths.last.backup',
  PROMPTS_ALWAYS_ASK_RESTORE: 'prompts.alwaysAsk.restore',
  PATHS_LAST_RESTORE: 'paths.last.restore',
} as const;

// ============================================
// Default Values
// ============================================

const DEFAULTS = {
  [KEYS.UI_THEME]: 'system' as UiTheme,
  [KEYS.PROMPTS_ALWAYS_ASK_BACKUP]: 'true',
  [KEYS.PATHS_LAST_BACKUP]: '',
  [KEYS.PROMPTS_ALWAYS_ASK_RESTORE]: 'true',
  [KEYS.PATHS_LAST_RESTORE]: '',
};

// ============================================
// Theme Helpers
// ============================================

/**
 * Get the current UI theme setting
 */
export async function getUiTheme(): Promise<UiTheme> {
  const value = await settings.get(KEYS.UI_THEME);
  if (!value) return DEFAULTS[KEYS.UI_THEME];

  // Validate the value
  if (value === 'system' || value === 'light' || value === 'dark') {
    return value;
  }

  return DEFAULTS[KEYS.UI_THEME];
}

/**
 * Set the UI theme setting
 */
export async function setUiTheme(theme: UiTheme): Promise<void> {
  await settings.set(KEYS.UI_THEME, theme);
}

// ============================================
// Boolean Helpers
// ============================================

/**
 * Get a boolean setting value
 */
export async function getBool(key: string, defaultValue: boolean): Promise<boolean> {
  const value = await settings.get(key);
  if (!value) return defaultValue;

  // Parse as boolean
  const lower = value.toLowerCase();
  if (lower === 'true' || lower === '1' || lower === 'yes') return true;
  if (lower === 'false' || lower === '0' || lower === 'no') return false;

  return defaultValue;
}

/**
 * Set a boolean setting value
 */
export async function setBool(key: string, value: boolean): Promise<void> {
  await settings.set(key, value ? 'true' : 'false');
}

// ============================================
// String Helpers
// ============================================

/**
 * Get a string setting value
 */
export async function getString(key: string, defaultValue: string): Promise<string> {
  const value = await settings.get(key);
  return value ?? defaultValue;
}

/**
 * Set a string setting value
 */
export async function setString(key: string, value: string): Promise<void> {
  await settings.set(key, value);
}

// ============================================
// Specific Settings
// ============================================

/**
 * Get the "always ask before backup" setting
 */
export async function getAlwaysAskBackup(): Promise<boolean> {
  return getBool(KEYS.PROMPTS_ALWAYS_ASK_BACKUP, true);
}

/**
 * Set the "always ask before backup" setting
 */
export async function setAlwaysAskBackup(value: boolean): Promise<void> {
  await setBool(KEYS.PROMPTS_ALWAYS_ASK_BACKUP, value);
}

/**
 * Get the last backup path used
 */
export async function getLastBackupPath(): Promise<string> {
  return getString(KEYS.PATHS_LAST_BACKUP, '');
}

/**
 * Set the last backup path used
 */
export async function setLastBackupPath(path: string): Promise<void> {
  await setString(KEYS.PATHS_LAST_BACKUP, path);
}

/**
 * Get the "always ask before restore" setting
 */
export async function getAlwaysAskRestore(): Promise<boolean> {
  return getBool(KEYS.PROMPTS_ALWAYS_ASK_RESTORE, true);
}

/**
 * Set the "always ask before restore" setting
 */
export async function setAlwaysAskRestore(value: boolean): Promise<void> {
  await setBool(KEYS.PROMPTS_ALWAYS_ASK_RESTORE, value);
}

/**
 * Get the last restore path used
 */
export async function getLastRestorePath(): Promise<string> {
  return getString(KEYS.PATHS_LAST_RESTORE, '');
}

/**
 * Set the last restore path used
 */
export async function setLastRestorePath(path: string): Promise<void> {
  await setString(KEYS.PATHS_LAST_RESTORE, path);
}
