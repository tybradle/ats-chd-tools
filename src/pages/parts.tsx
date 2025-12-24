import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export function PartsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Parts Library</h1>
        <p className="text-muted-foreground mt-1">
          Manage your master parts database.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Parts Database</CardTitle>
          <CardDescription>
            Search and manage parts, manufacturers, and categories.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Parts management interface will be implemented here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
