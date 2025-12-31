import { Outlet, NavLink } from "react-router-dom";
import { 
  Home,
  FileSpreadsheet, 
  Package, 
  Settings,
  Cpu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

const navItems = [
  { to: "/", icon: Home, label: "Home" },
  { to: "/bom", icon: FileSpreadsheet, label: "BOM Translation" },
  { to: "/parts", icon: Package, label: "Parts Library" },
  { to: "/glenair", icon: Cpu, label: "Glenair Builder" },
];

export function RootLayout() {
  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-56 border-r bg-muted/30 flex flex-col">
        {/* Logo/Title */}
        <div className="h-14 flex items-center px-4 border-b">
          <h1 className="font-semibold text-lg">ATS CHD Tools</h1>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 py-2">
          <nav className="space-y-1 px-2">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )
                }
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            ))}
          </nav>
        </ScrollArea>

        {/* Bottom section */}
        <Separator />
        <div className="p-2">
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )
            }
          >
            <Settings className="h-4 w-4" />
            Settings
          </NavLink>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <ScrollArea className="flex-1">
          <div className="p-6">
            <Outlet />
          </div>
        </ScrollArea>
      </main>
    </div>
  );
}
