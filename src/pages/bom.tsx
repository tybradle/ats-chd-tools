import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export function BomPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">BOM Translation</h1>
        <p className="text-muted-foreground mt-1">
          Convert Bills of Materials between formats.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>BOM Projects</CardTitle>
          <CardDescription>
            Create and manage BOM translation projects.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            BOM Translation module will be implemented here. Features include:
          </p>
          <ul className="mt-2 text-sm text-muted-foreground list-disc list-inside space-y-1">
            <li>Project management with locations</li>
            <li>CSV import from Eplan/AutoCAD</li>
            <li>Part matching with master database</li>
            <li>Export to Excel, XML, and ZW1 formats</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
