import { Link } from "react-router-dom";
import { 
  FileSpreadsheet, 
  Package, 
  QrCode, 
  Calculator, 
  FileText,
  ArrowRight,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const modules = [
  {
    to: "/bom",
    icon: FileSpreadsheet,
    title: "BOM Translation",
    description: "Convert Bills of Materials between formats. Import CSV, export to Excel, XML, or ZW1.",
    status: "active" as const,
  },
  {
    to: "/parts",
    icon: Package,
    title: "Parts Library",
    description: "Manage master parts database with manufacturers and categories.",
    status: "active" as const,
  },
  {
    to: "#",
    icon: QrCode,
    title: "QR Label Generator",
    description: "Generate QR code labels for parts and assets.",
    status: "coming" as const,
  },
  {
    to: "#",
    icon: FileText,
    title: "Quoting Workbook",
    description: "Create and manage project quotes with part pricing.",
    status: "coming" as const,
  },
  {
    to: "#",
    icon: Calculator,
    title: "Heat/Load Calculator",
    description: "Calculate electrical heat dissipation and load requirements.",
    status: "coming" as const,
  },
];

export function HomePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Engineering Support Dashboard</h1>
          <p className="text-muted-foreground mt-1">Welcome — Select a module to get started.</p>
        </div>
        <div>
          <span className="inline-flex items-center px-2 py-1 rounded-full bg-secondary text-secondary-foreground text-sm font-medium">System Online</span>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {modules.map((module) => (
            <Link
              key={module.title}
              to={module.to}
              className={module.status === "coming" ? "pointer-events-none" : ""}
            >
            <Card className={`h-full transition-colors hover:border-sidebar-ring hover:border hover:shadow-sm ${module.status === "coming" ? "opacity-60" : ""}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="p-2 bg-primary/10 rounded-lg w-fit">
                    <module.icon className="h-6 w-6 text-primary" />
                  </div>
                  {module.status === "coming" ? (
                    <Badge variant="secondary">Coming Soon</Badge>
                  ) : (
                    <ArrowRight className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <CardTitle className="mt-4">{module.title}</CardTitle>
                <CardDescription>{module.description}</CardDescription>
              </CardHeader>
              <CardContent />
            </Card>
          </Link>
          ))}
      </div>
    </div>
  );
}
