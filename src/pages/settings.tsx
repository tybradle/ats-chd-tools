import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { invoke } from '@tauri-apps/api/core';
import { save, open } from '@tauri-apps/plugin-dialog';
import { isTauri, closeDb } from '@/lib/db/client';
import * as appSettings from '@/lib/settings/app-settings';

export function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [alwaysAskBackup, setAlwaysAskBackup] = useState(true);
  const [lastBackupPath, setLastBackupPath] = useState('');
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [appVersion, setAppVersion] = useState('');
  
  // Restore state
  const [alwaysAskRestore, setAlwaysAskRestore] = useState(true);
  const [lastRestorePath, setLastRestorePath] = useState('');
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreConfirmOpen, setRestoreConfirmOpen] = useState(false);
  const [restoreConfirmText, setRestoreConfirmText] = useState('');
  const [pendingRestorePath, setPendingRestorePath] = useState<string | null>(null);

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      const [alwaysAskBackup, lastPathBackup, alwaysAskRestore, lastPathRestore, theme] = await Promise.all([
        appSettings.getAlwaysAskBackup(),
        appSettings.getLastBackupPath(),
        appSettings.getAlwaysAskRestore(),
        appSettings.getLastRestorePath(),
        appSettings.getUiTheme(),
      ]);

      setAlwaysAskBackup(alwaysAskBackup);
      setLastBackupPath(lastPathBackup);
      setAlwaysAskRestore(alwaysAskRestore);
      setLastRestorePath(lastPathRestore);

      // Sync theme with next-themes
      setTheme(theme);
    };

    loadSettings();

    // Load app version
    const loadVersion = async () => {
      try {
        if (isTauri) {
          const { getVersion } = await import('@tauri-apps/api/app');
          const version = await getVersion();
          setAppVersion(version);
        } else {
          // From vite define in browser mode
          setAppVersion(__APP_VERSION__);
        }
      } catch (e) {
        console.warn('Failed to load app version:', e);
        setAppVersion('0.0.0');
      }
    };

    loadVersion();
  }, [setTheme]);

  const handleThemeChange = async (newTheme: 'system' | 'light' | 'dark') => {
    setTheme(newTheme);
    await appSettings.setUiTheme(newTheme);
    toast.success('Theme updated');
  };

  const handleAlwaysAskChange = async (checked: boolean) => {
    setAlwaysAskBackup(checked);
    await appSettings.setAlwaysAskBackup(checked);
  };

  const handleAlwaysAskRestoreChange = async (checked: boolean) => {
    setAlwaysAskRestore(checked);
    await appSettings.setAlwaysAskRestore(checked);
  };

  const handleBackup = async () => {
    if (!isTauri) {
      toast.error('Backup is only available in the desktop app');
      return;
    }

    try {
      setIsBackingUp(true);

      // Close database connection before backup
      await closeDb();

      // Generate default filename with timestamp
      const now = new Date();
      const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const defaultFilename = `ats-chd-tools-backup-${timestamp}.sqlite`;

      let filePath: string | null = null;

      if (alwaysAskBackup) {
        // Open save dialog
        filePath = await save({
          defaultPath: defaultFilename,
          title: 'Save Backup Database',
          filters: [{
            name: 'SQLite Database',
            extensions: ['sqlite', 'db']
          }]
        });
      } else if (lastBackupPath) {
        // Use last path with new filename
        const lastDir = lastBackupPath.replace(/[^/\\]*$/, '');
        filePath = `${lastDir}/${defaultFilename}`;
      } else {
        // Fallback to dialog if no last path
        filePath = await save({
          defaultPath: defaultFilename,
          title: 'Save Backup Database',
          filters: [{
            name: 'SQLite Database',
            extensions: ['sqlite', 'db']
          }]
        });
      }

      if (!filePath) {
        // User cancelled
        setIsBackingUp(false);
        return;
      }

      // Execute backup
      await invoke('backup_database', { toPath: filePath });

      // Update last backup path (store directory only)
      const pathObj = filePath;
      const lastSlashIndex = Math.max(pathObj.lastIndexOf('/'), pathObj.lastIndexOf('\\'));
      const dirPath = lastSlashIndex >= 0 ? pathObj.slice(0, lastSlashIndex) : pathObj;
      await appSettings.setLastBackupPath(dirPath);
      setLastBackupPath(dirPath);

      toast.success('Database backed up successfully');
    } catch (error) {
      console.error('Backup failed:', error);
      toast.error(`Backup failed: ${error}`);
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleRestore = async () => {
    if (!isTauri) {
      toast.error('Restore is only available in the desktop app');
      return;
    }

    try {
      setIsRestoring(true);

      let filePath: string | null = null;

      if (alwaysAskRestore) {
        // Open file dialog
        filePath = await open({
          multiple: false,
          title: 'Select Database File to Restore',
          filters: [{
            name: 'SQLite Database',
            extensions: ['sqlite', 'db']
          }]
        });
      } else if (lastRestorePath) {
        // Use last path - but we still need to pick the file
        // For simplicity, we'll still show dialog but default to that directory
        filePath = await open({
          multiple: false,
          title: 'Select Database File to Restore',
          filters: [{
            name: 'SQLite Database',
            extensions: ['sqlite', 'db']
          }]
        });
      } else {
        // Fallback to dialog if no last path
        filePath = await open({
          multiple: false,
          title: 'Select Database File to Restore',
          filters: [{
            name: 'SQLite Database',
            extensions: ['sqlite', 'db']
          }]
        });
      }

      if (!filePath || Array.isArray(filePath)) {
        // User cancelled or invalid selection
        setIsRestoring(false);
        return;
      }

      // Store the path for confirmation dialog
      setPendingRestorePath(filePath);
      setRestoreConfirmText('');
      setRestoreConfirmOpen(true);
      setIsRestoring(false);
    } catch (error) {
      console.error('Restore file selection failed:', error);
      toast.error(`Failed to select file: ${error}`);
      setIsRestoring(false);
    }
  };

  const confirmRestore = async () => {
    if (!pendingRestorePath) return;

    try {
      setIsRestoring(true);

      // Close database connection before restore
      await closeDb();

      // Execute restore
      await invoke('restore_database', { fromPath: pendingRestorePath });

      // Update last restore path (store directory only)
      const pathObj = pendingRestorePath;
      const lastSlashIndex = Math.max(pathObj.lastIndexOf('/'), pathObj.lastIndexOf('\\'));
      const dirPath = lastSlashIndex >= 0 ? pathObj.slice(0, lastSlashIndex) : pathObj;
      await appSettings.setLastRestorePath(dirPath);
      setLastRestorePath(dirPath);

      toast.success('Database restored successfully. Application will now exit.');

      // Close the window after a short delay to allow toast to show
      setTimeout(async () => {
        if (isTauri) {
          const { getCurrentWindow } = await import('@tauri-apps/api/window');
          await getCurrentWindow().close();
        }
      }, 1500);
    } catch (error) {
      console.error('Restore failed:', error);
      toast.error(`Restore failed: ${error}`);
      setIsRestoring(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Configure application preferences.
        </p>
      </div>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>
            Customize how the application looks.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="theme">Theme</Label>
            <Select value={theme} onValueChange={handleThemeChange}>
              <SelectTrigger id="theme" className="w-[200px]">
                <SelectValue placeholder="Select theme" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="system">System</SelectItem>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              {theme === 'system' && 'Follow your system theme preference'}
              {theme === 'light' && 'Always use light theme'}
              {theme === 'dark' && 'Always use dark theme'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Data Management */}
      <Card>
        <CardHeader>
          <CardTitle>Data Management</CardTitle>
          <CardDescription>
            Backup and manage your application data.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="always-ask-backup"
                checked={alwaysAskBackup}
                onCheckedChange={(checked) => handleAlwaysAskChange(checked === true)}
              />
              <Label htmlFor="always-ask-backup" className="cursor-pointer">
                Always ask where to save backup
              </Label>
            </div>
            <p className="text-sm text-muted-foreground ml-6">
              When enabled, you'll be prompted to choose a backup location each time.
            </p>
          </div>

          <div className="space-y-2">
            <Button
              onClick={handleBackup}
              disabled={isBackingUp || !isTauri}
              className="w-full sm:w-auto"
            >
              {isBackingUp ? 'Backing up...' : 'Backup database...'}
            </Button>
            {!isTauri && (
              <p className="text-sm text-muted-foreground">
                Backup is only available in the desktop app.
              </p>
            )}
            {lastBackupPath && isTauri && (
              <p className="text-sm text-muted-foreground">
                Last backup location: {lastBackupPath}
              </p>
            )}
          </div>

          <div className="border-t pt-4">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="always-ask-restore"
                  checked={alwaysAskRestore}
                  onCheckedChange={(checked) => handleAlwaysAskRestoreChange(checked === true)}
                />
                <Label htmlFor="always-ask-restore" className="cursor-pointer">
                  Always ask where to pick restore file
                </Label>
              </div>
              <p className="text-sm text-muted-foreground ml-6">
                When enabled, you'll be prompted to choose a restore file each time.
              </p>
            </div>

            <AlertDialog open={restoreConfirmOpen} onOpenChange={setRestoreConfirmOpen}>
              <AlertDialogTrigger asChild>
                <Button
                  onClick={handleRestore}
                  disabled={isRestoring || !isTauri}
                  variant="destructive"
                  className="w-full sm:w-auto"
                >
                  {isRestoring ? 'Restoring...' : 'Restore database...'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirm Database Restore</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action will <strong>replace</strong> your current database with the selected file.
                    The current database will be backed up as <code>.bak</code> file first.
                    <br /><br />
                    <strong>Warning:</strong> The application will exit immediately after restore.
                    <br /><br />
                    To confirm, type <span className="font-mono bg-muted px-1 rounded">RESTORE</span> below:
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="py-4">
                  <input
                    type="text"
                    value={restoreConfirmText}
                    onChange={(e) => setRestoreConfirmText(e.target.value)}
                    placeholder="Type RESTORE to confirm"
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-destructive"
                  />
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isRestoring}>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={confirmRestore}
                    disabled={restoreConfirmText !== 'RESTORE' || isRestoring}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {isRestoring ? 'Restoring...' : 'Restore and Exit'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {!isTauri && (
              <p className="text-sm text-muted-foreground">
                Restore is only available in the desktop app.
              </p>
            )}
            {lastRestorePath && isTauri && (
              <p className="text-sm text-muted-foreground">
                Last restore location: {lastRestorePath}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* About */}
      <Card>
        <CardHeader>
          <CardTitle>About</CardTitle>
          <CardDescription>
            Application information.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            <p className="text-sm font-medium">ATS CHD Tools</p>
            <p className="text-sm text-muted-foreground">
              Version {appVersion}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Unified platform for BOM translation, quoting, heat/load calculations, and label generation.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
