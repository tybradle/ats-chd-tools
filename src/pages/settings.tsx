import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { invoke } from '@tauri-apps/api/core';
import { save } from '@tauri-apps/plugin-dialog';
import { isTauri } from '@/lib/db/client';
import * as appSettings from '@/lib/settings/app-settings';

export function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [alwaysAskBackup, setAlwaysAskBackup] = useState(true);
  const [lastBackupPath, setLastBackupPath] = useState('');
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [appVersion, setAppVersion] = useState('');

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      const [alwaysAsk, lastPath, theme] = await Promise.all([
        appSettings.getAlwaysAskBackup(),
        appSettings.getLastBackupPath(),
        appSettings.getUiTheme(),
      ]);

      setAlwaysAskBackup(alwaysAsk);
      setLastBackupPath(lastPath);

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
          // From package.json in browser mode
          const pkg = await import('../../package.json');
          setAppVersion(pkg.version);
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

  const handleBackup = async () => {
    if (!isTauri) {
      toast.error('Backup is only available in the desktop app');
      return;
    }

    try {
      setIsBackingUp(true);

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
