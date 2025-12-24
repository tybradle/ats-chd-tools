import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Configure application preferences.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Application Settings</CardTitle>
          <CardDescription>
            Settings will be available here once implemented.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Coming soon: default export paths, theme preferences, and more.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
